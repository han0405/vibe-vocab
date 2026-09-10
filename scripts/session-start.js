#!/usr/bin/env node
// SessionStart hook: if VibeVocab is enabled, print its ruleset to stdout so
// Claude Code injects it into the session context. Enabled means either:
//   - global opt-in:   $CLAUDE_CONFIG_DIR/.vibe-vocab-always   (default ~/.claude)
//   - this project:    <cwd>/.vibe-vocab-on
// Never blocks session start: any failure exits 0 silently.
//
// Also invoked on demand by `/vocab` (see commands/vocab.md): when a setting is
// changed mid-session the SessionStart hook has already run, so the command
// re-runs this script with the project dir as argv[2] to re-emit the current
// override blocks. Hence the `process.argv[2]` fallback for `cwd` below.
//
// All of the "what to inject" logic lives in lib/vocab-store.js
// (`buildInjectedRules`) so the Codex adapter (codex/) can reuse it verbatim.
const { readStdinJSON, buildInjectedRules } = require('../lib/vocab-store');

try {
  const input = readStdinJSON();
  const cwd = input.cwd || process.argv[2] || process.cwd();
  const out = buildInjectedRules(cwd);
  if (out) process.stdout.write(out);
} catch (e) {
  /* never block session start */
}
process.exit(0);
