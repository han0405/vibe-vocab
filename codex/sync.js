#!/usr/bin/env node
// Refresh the VibeVocab block in <project>/AGENTS.md from the current settings.
//
// Called by:
//   - codex/notify.js       after every turn (keeps the learned-term list fresh)
//   - the Codex `/vocab` prompt   after a setting change (on / rate / level / ...)
//   - by hand:  node codex/sync.js [projectDir]
//
// Prints one status line. Always exits 0 -- a sync failure must not stop a turn.
const { buildInjectedRules } = require('../lib/vocab-store');
const { writeAgentsBlock } = require('./agents-md');

try {
  const cwd = process.argv[2] || process.env.CODEX_PROJECT_DIR || process.cwd();
  const rules = buildInjectedRules(cwd); // '' when VibeVocab is off for cwd
  const res = writeAgentsBlock(cwd, rules);
  if (rules) {
    console.log(
      `VibeVocab: AGENTS.md block ${res.changed ? 'updated' : 'already current'} — ${res.path}`
    );
  } else {
    console.log(
      `VibeVocab: not enabled for this project; AGENTS.md block ${
        res.changed ? 'removed' : 'absent'
      }. Run \`/vocab on\` to enable it.`
    );
  }
} catch (e) {
  console.log('VibeVocab sync skipped: ' + (e && e.message ? e.message : e));
}
process.exit(0);
