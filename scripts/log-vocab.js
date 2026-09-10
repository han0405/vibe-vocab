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
  readRate,
  isEnabled,
  readLastAssistantText,
  harvestGlossedTerms,
  appendTerms,
} = require('../lib/vocab-store');

try {
  const input = readStdinJSON();
  const cwd = input.cwd || process.cwd();
  // VibeVocab off for this project -> don't create or touch vocab-log.md. The
  // model's natural bilingual asides are not ours to harvest when disabled.
  if (!isEnabled(cwd)) process.exit(0);
  const transcriptPath = input.transcript_path || input.transcriptPath;
  const text = readLastAssistantText(transcriptPath);
  // Safety cap: the configured per-reply budget plus one slack slot, but never
  // below the historical floor of 3.
  const terms = harvestGlossedTerms(text, Math.max(3, readRate(cwd) + 1));
  appendTerms(cwd, terms);
} catch (e) {
  /* swallow -- never break the turn */
}
process.exit(0);
