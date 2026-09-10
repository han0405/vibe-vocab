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

  // vocab-store feeds two optional additions below (budget override, learned
  // terms). Load it once; if it's somehow unavailable, both degrade to nothing.
  let vocabStore = null;
  try {
    vocabStore = require('../lib/vocab-store');
  } catch (e) {
    /* both additions below become no-ops */
  }

  // Per-reply gloss budget. The ruleset is written for 1; when the user has
  // raised it with `/vocab rate <n>`, append an override rather than rewriting
  // the (blind-eval-tuned) rules text.
  let rate = 1;
  let override = '';
  try {
    if (vocabStore) rate = vocabStore.readRate(cwd);
  } catch (e) {
    /* fall back to the default budget */
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

  // Vocabulary level: shifts the "which concept gets the slot" bar. Default
  // `mid` == the shipped rule, so only beginner/advanced produce an override.
  let level = 'mid';
  try {
    if (vocabStore) level = vocabStore.readLevel(cwd);
  } catch (e) {
    /* fall back to the default level */
  }
  let levelBlock = '';
  if (level === 'beginner') {
    levelBlock =
      `\n\n## Vocabulary level: beginner (user set \`/vocab level beginner\`)\n\n` +
      `Lower the bar in "Which concept gets the slot". The user is early in ` +
      `technical English, so an everyday engineering term is worth the slot even ` +
      `if it is not especially specialized: build/runtime/CS basics like ` +
      `\`deploy\`, \`dependency\`, \`rollback\`, \`cache\`, \`race condition\`, ` +
      `\`environment variable\`, \`payload\`, \`endpoint\` all qualify when one is ` +
      `central to the reply. Still exactly one gloss per reply (or the ` +
      `\`/vocab rate\` budget), still never in code, comments, headings, or ` +
      `identifiers, still first use only. Prefer the most useful everyday term ` +
      `over a rare one the user will not meet again soon.\n`;
  } else if (level === 'advanced') {
    levelBlock =
      `\n\n## Vocabulary level: advanced (user set \`/vocab level advanced\`)\n\n` +
      `Raise the bar in "Which concept gets the slot". The user already reads and ` +
      `writes technical English fluently, so ordinary terms (\`deploy\`, ` +
      `\`cache\`, \`dependency\`, \`race condition\`) are NOT worth a gloss — they ` +
      `know them. Spend the slot only on a genuinely specialized or precise term ` +
      `they are unlikely to already use without thinking (\`idempotent\`, ` +
      `\`back-pressure\`, \`quorum\`, \`monomorphization\`, \`bitemporal\`, ` +
      `\`referential transparency\`). Most replies will gloss nothing, and that is ` +
      `correct — do not reach for a term just to fill the slot. When you do gloss, ` +
      `all other rules are unchanged.\n`;
  }

  // Already-learned terms: everything in vocab-log.md (most recent first) plus
  // the user's `/vocab know` list. Telling Claude to use these bare stops it
  // re-glossing a term across sessions and wasting the reply's budget.
  const LEARNED_IN_CONTEXT = 120;
  let learned = [];
  try {
    if (vocabStore) {
      const seen = new Set();
      const logged = vocabStore
        .readLoggedTerms(cwd, LEARNED_IN_CONTEXT)
        .map((t) => t.term)
        .reverse();
      for (const t of vocabStore.readKnownTerms(cwd).concat(logged)) {
        const k = t.toLowerCase();
        if (!t || seen.has(k)) continue;
        seen.add(k);
        learned.push(t);
      }
    }
  } catch (e) {
    /* no learned block */
  }
  let learnedBlock = '';
  if (learned.length) {
    learnedBlock =
      `\n\n## Already learned — write these bare, with no gloss\n\n` +
      `These terms are already in the user's vocab log or marked known. Treat ` +
      `each exactly like a term introduced earlier in the conversation: use the ` +
      `English bare, no parenthetical gloss, and don't spend the reply's budget ` +
      `re-explaining one. A term **not** on this list is still eligible for its ` +
      `gloss.\n\n` +
      learned.join(', ') +
      '\n';
  }

  const scope = globalOn ? 'always-on' : 'this project';
  const notes =
    (rate > 1 ? ` Per-reply gloss budget: ${rate}.` : '') +
    (level !== 'mid' ? ` Vocabulary level: ${level}.` : '') +
    (learned.length ? ` ${learned.length} terms already learned.` : '');
  process.stdout.write(
    `VIBEVOCAB ACTIVE (${scope}).${notes} The rules below apply to every reply this session. ` +
      'Say "别标注" / "focus" to pause for the session; ' +
      `run \`/vocab off\` to disable it for this project.\n\n${body}${override}${levelBlock}${learnedBlock}\n`
  );
} catch (e) {
  process.exit(0);
}
