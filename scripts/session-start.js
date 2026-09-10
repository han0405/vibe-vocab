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

  const scope = globalOn ? 'always-on' : 'this project';
  process.stdout.write(
    `VIBEVOCAB ACTIVE (${scope}). The rules below apply to every reply this session. ` +
      'Say "别标注" / "focus" to pause for the session; ' +
      `run \`/vocab off\` to disable it for this project.\n\n${body}\n`
  );
} catch (e) {
  process.exit(0);
}
