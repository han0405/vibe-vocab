#!/usr/bin/env node
// Codex `notify` program (wired up in ~/.codex/config.toml). Codex runs it once
// after every agent turn with a SINGLE argument: a JSON string describing the
// event. For `agent-turn-complete` this does the Claude Code Stop-hook job --
// harvest the terms Codex glossed on first use into <cwd>/vocab-log.md -- then
// refreshes the AGENTS.md block so the next session starts from the updated
// learned-term list.
//
// `notify` is user-level and global (Codex ignores a project-local one), so
// this gates on isEnabled(cwd): a project that never ran `/vocab on` is left
// completely untouched. Always exits 0 -- a notifier must never make Codex wait
// or fail.
const fs = require('fs');
const {
  readRate,
  isEnabled,
  harvestGlossedTerms,
  appendTerms,
  buildInjectedRules,
} = require('../lib/vocab-store');
const { writeAgentsBlock } = require('./agents-md');

function parseEvent() {
  // Normal path: the JSON is argv[2]. Fall back to stdin for manual testing.
  let raw = process.argv[2];
  if (!raw) {
    try {
      raw = fs.readFileSync(0, 'utf8');
    } catch (e) {
      raw = '';
    }
  }
  try {
    return raw && raw.trim() ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

try {
  const evt = parseEvent();
  const type = evt.type || evt['type'];
  if (!type || type === 'agent-turn-complete') {
    const cwd = evt.cwd || evt['cwd'] || process.cwd();
    if (isEnabled(cwd)) {
      const text =
        evt['last-assistant-message'] ||
        evt.last_assistant_message ||
        evt.lastAssistantMessage ||
        '';
      if (text) {
        // Same safety cap as the Claude Stop hook: configured budget + 1 slack
        // slot, never below the historical floor of 3.
        const terms = harvestGlossedTerms(text, Math.max(3, readRate(cwd) + 1));
        appendTerms(cwd, terms);
      }
      try {
        writeAgentsBlock(cwd, buildInjectedRules(cwd));
      } catch (e) {
        /* AGENTS.md refresh is best-effort */
      }
    }
  }
} catch (e) {
  /* swallow -- never break Codex */
}
process.exit(0);
