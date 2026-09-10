#!/usr/bin/env node
// Stop hook: after each assistant turn, harvest the terms Claude glossed on
// first use (the "term（释义）" format the VibeVocab rules produce) and
// append the new ones to vocab-log.md in the project directory.
//
// The "gloss only on first mention" rule IS the novelty signal
// -- this hook does no history-diffing of its own, it just collects glossed
// terms and lets appendTerms() dedupe against the log file.
//
// Always exits 0. A vocabulary logger must never block or delay a turn.
const {
  readStdinJSON,
  readLastAssistantText,
  harvestGlossedTerms,
  appendTerms,
} = require('../lib/vocab-store');

try {
  const input = readStdinJSON();
  const cwd = input.cwd || process.cwd();
  const transcriptPath = input.transcript_path || input.transcriptPath;
  const text = readLastAssistantText(transcriptPath);
  const terms = harvestGlossedTerms(text);
  appendTerms(cwd, terms);
} catch (e) {
  /* swallow -- never break the turn */
}
process.exit(0);
