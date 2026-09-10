#!/usr/bin/env node
// SessionStart hook: if VibeVocab is enabled, print its ruleset to stdout so
// Claude Code injects it into the session context. Enabled means either:
//   - global opt-in:   $CLAUDE_CONFIG_DIR/.vibe-vocab-always   (default ~/.claude)
//   - this project:    <cwd>/.vibe-vocab-on
// Never blocks session start: any failure exits 0 silently.
const fs = require('fs');
const os = require('os');
const path = require('path');

try {
  const input = (() => {
    try {
      const raw = fs.readFileSync(0, 'utf8');
      return raw && raw.trim() ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  })();

  const cwd = input.cwd || process.cwd();
  const claudeDir =
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const globalFlag = path.join(claudeDir, '.vibe-vocab-always');
  const projectFlag = path.join(cwd, '.vibe-vocab-on');

  const globalOn = fs.existsSync(globalFlag);
  const projectOn = fs.existsSync(projectFlag);
  if (!globalOn && !projectOn) process.exit(0);

  const rulesPath = path.join(__dirname, '..', 'rules', 'vibe-vocab.md');
  const body = fs
    .readFileSync(rulesPath, 'utf8')
    .replace(/^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/, '')
    .replace(/(?:\r?\n)+$/, '');

  // Per-reply gloss budget. The ruleset is written for 1; when the user has
  // raised it with `/vocab rate <n>`, append an override rather than rewriting
  // the (blind-eval-tuned) rules text.
  let rate = 1;
  let override = '';
  try {
    rate = require('../lib/vocab-store').readRate(cwd);
  } catch (e) {
    /* lib unavailable -- fall back to the default budget */
  }
  if (rate > 1) {
    override =
      `\n\n## Per-reply budget override (user set \`/vocab rate ${rate}\`)\n\n` +
      `The checklist above is written for one gloss per reply. The user has raised ` +
      `the budget to **${rate}**. Wherever it says "more than 1 is a bug" or "keep ` +
      `only the single most central concept", read the limit as **${rate}**: pick the ` +
      `up-to-${rate} most central concepts that each independently clear the "which ` +
      `concept gets the slot" bar, gloss each once on first use, and rewrite the rest ` +
      `in the user's language. Fewer than ${rate} is fine when the reply doesn't ` +
      `genuinely turn on that many. Every other rule is unchanged — never in code, ` +
      `comments, headings, or identifiers; one gloss per concept; bare on reuse.\n`;
  }

  const scope = globalOn ? 'always-on' : 'this project';
  const budgetNote = rate > 1 ? ` Per-reply gloss budget: ${rate}.` : '';
  process.stdout.write(
    `VIBEVOCAB ACTIVE (${scope}).${budgetNote} The rules below apply to every reply this session. ` +
      'Say "别标注" / "focus" to pause for the session; ' +
      `run \`/vocab off\` to disable it for this project.\n\n${body}${override}\n`
  );
} catch (e) {
  process.exit(0);
}
