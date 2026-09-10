// Shared logic for the vibe-vocab plugin: read the transcript, harvest the
// terms Claude glossed on first use, and append the new ones to vocab-log.md.
// Dependency-free (Node builtins only) so `npm install` is never required.

const fs = require('fs');
const path = require('path');

function readStdinJSON() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    // Opt-in raw-payload capture for verifying the real Claude Code hook
    // contract against what this script assumes. Set VV_DEBUG_CAPTURE=<file>
    // before a session; unset it after.
    if (process.env.VV_DEBUG_CAPTURE) {
      try {
        const tag = `\n=== ${new Date().toISOString()} ===\n`;
        fs.appendFileSync(process.env.VV_DEBUG_CAPTURE, tag + raw + '\n', 'utf8');
      } catch (e) {
        /* debug capture must never break a hook */
      }
    }
    if (!raw || !raw.trim()) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

// Canonicalize a directory path so every spelling of the SAME directory
// (\ vs /, drive-letter case, trailing separator, symlinks) collapses to one
// string. The hook gets `cwd` from the payload; `/vocab` gets a path through a
// shell -- without this they can disagree on where vocab-log.md lives.
function canonicalCwd(cwd) {
  let p = cwd || process.cwd();
  p = path.resolve(p);
  try {
    p = fs.realpathSync.native(p);
  } catch (e) {
    try {
      p = fs.realpathSync(p);
    } catch (e2) {
      /* directory may not exist yet -- fall back to the resolved string */
    }
  }
  return p.replace(/[\\/]+$/, '');
}

// Pull the text of the most recent assistant turn out of a Claude Code
// transcript (JSONL, one event per line). Falls back to an empty string on any
// shape we don't recognize -- a hook must never throw.
function readLastAssistantText(transcriptPath) {
  if (!transcriptPath) return '';
  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, 'utf8');
  } catch (e) {
    return '';
  }
  const lines = raw.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    let evt;
    try {
      evt = JSON.parse(lines[i]);
    } catch (e) {
      continue;
    }
    const msg = evt && evt.message ? evt.message : evt;
    const role = (msg && msg.role) || evt.type;
    if (role !== 'assistant') continue;
    const content = msg && msg.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const text = content
        .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
        .map((c) => c.text)
        .join('\n')
        .trim();
      if (text) return text;
      // assistant turn was tool-use only -- keep looking further back
      continue;
    }
  }
  return '';
}

// Strip fenced and inline code so we never harvest a term that only appeared
// inside a code sample.
function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

// Remove Markdown formatting so a term used in a heading or a **bold** span
// yields a clean context sentence instead of "cross-validation**" or
// "environment 函数**". Length is not preserved, so this must run on the SAME
// string that GLOSS_RE matches against (see harvestGlossedTerms).
function stripMarkdown(text) {
  return text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // ATX headings
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, '') // list bullets
    .replace(/\*\*|~~|\*(?=\S)|(?<=\S)\*|`/g, ''); // bold / italic / strike / stray backtick
}

// A "glossed term" is the signal the VibeVocab rules produce on FIRST use:
//   <english term><full-width or half-width parens><short gloss>
// e.g. "idempotent（幂等）". We require the gloss to contain a non-ASCII
// character (the user's language) and be short, so ordinary English
// parentheticals like "SLA (service level agreement)" don't match.
const GLOSS_RE =
  /([A-Za-z][A-Za-z0-9]*(?:[ /_-][A-Za-z0-9]+){0,3})\s*[（(]\s*([^）)]{1,14})\s*[）)]/g;

function hasNonAscii(s) {
  return /[^\x00-\x7F]/.test(s);
}

// A real gloss is a short run of words in the user's language. Reject anything
// with arrows / pipes / math / code punctuation in it (that's almost always our
// regex latching onto a parenthetical that isn't a gloss -- e.g. a diagram
// caption or a "(收割 -> log)" aside), and require at least two CJK/CJK-ish
// letters so bare punctuation or a lone particle doesn't qualify.
function looksLikeGloss(gloss) {
  if (/[→←↔⇒<>=|/\\*_`~^{}[\]#@]/.test(gloss)) return false;
  // A genuine gloss is pure user-language. An ASCII letter run is a code
  // identifier that leaked into a clarifying aside -- e.g.
  // "nested CV（外层 cross_val_score 包住 GridSearchCV）", which is not a
  // first-use gloss. Two or more consecutive spaces are the scar left when
  // stripCode already removed such an inline-code token from the middle
  // ("外层  包住"). Either shape means this parenthetical is an aside, not a
  // gloss.
  if (/[A-Za-z]{2,}/.test(gloss)) return false;
  if (/\s{2,}/.test(gloss)) return false;
  const letters = (gloss.match(/[^\s\x00-\x7F]/g) || []).length;
  return letters >= 2;
}

// Boundaries that end the "sentence" we quote as context. Includes table-cell
// pipes and colons so a term used inside a Markdown table row doesn't drag the
// whole row (and its escaped `\|`s) into the log.
const CTX_MARKS = ['\n', '。', '！', '？', '；', '. ', '! ', '? ', '|', '：', ':'];

function sentenceAround(text, index) {
  let start = 0;
  for (const mark of CTX_MARKS) {
    const at = text.lastIndexOf(mark, index);
    if (at !== -1 && at + mark.length > start) start = at + mark.length;
  }
  let end = text.length;
  for (const mark of CTX_MARKS) {
    const at = text.indexOf(mark, index);
    if (at !== -1 && at < end) end = at;
  }
  return text
    .slice(start, end)
    .replace(/\\\|/g, ' ')
    .replace(/^[\s\n。！？；.!?|：:#*`~>-]+/, '')
    .replace(/[\s#*`~]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

// The rules tell the model to introduce at most 2 new terms per reply. This is
// a slightly looser safety net in case it doesn't: never log more than this
// many new terms from a single turn.
const MAX_NEW_TERMS_PER_TURN = 3;

function harvestGlossedTerms(assistantText) {
  const text = stripMarkdown(stripCode(assistantText || ''));
  const out = [];
  const seenInThisTurn = new Set();
  let m;
  GLOSS_RE.lastIndex = 0;
  while ((m = GLOSS_RE.exec(text)) !== null) {
    const term = m[1].trim();
    const gloss = m[2].trim();
    if (!hasNonAscii(gloss) || !looksLikeGloss(gloss)) continue; // real gloss only
    if (hasNonAscii(term)) continue; // term must be the English form
    if (term.length < 2) continue;
    const key = term.toLowerCase();
    if (seenInThisTurn.has(key)) continue;
    seenInThisTurn.add(key);
    // Show the context sentence the way it reads AFTER acquisition -- without
    // the first-use gloss cluttering it up.
    const context = sentenceAround(text, m.index).replace(
      /\s*[（(]\s*[^）)]{1,14}[）)]/g,
      (p) => (hasNonAscii(p) ? '' : p)
    );
    out.push({ term, gloss, context });
  }
  return out.slice(0, MAX_NEW_TERMS_PER_TURN);
}

const LOG_NAME = 'vocab-log.md';
const LOG_HEADER = [
  '# VibeVocab 生词本',
  '',
  '<!-- Auto-appended by the vibe-vocab plugin on each assistant turn.',
  '     The first table column is the dedupe key; edit freely otherwise. -->',
  '',
  '| 术语 | 释义 | 出现语境 | 日期 |',
  '|---|---|---|---|',
  '',
].join('\n');

function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function existingTerms(logText) {
  const set = new Set();
  const re = /^\|\s*([^|]+?)\s*\|/gm;
  let m;
  while ((m = re.exec(logText)) !== null) {
    const cell = m[1].trim().toLowerCase();
    if (cell && cell !== '术语' && !/^-+$/.test(cell)) set.add(cell);
  }
  return set;
}

function escapeCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

// Append any terms not already in vocab-log.md. Returns the list actually
// written (may be empty). Never throws.
function appendTerms(cwd, terms) {
  if (!terms || !terms.length) return [];
  const dir = canonicalCwd(cwd);
  const file = path.join(dir, LOG_NAME);
  let logText = '';
  try {
    logText = fs.readFileSync(file, 'utf8');
  } catch (e) {
    /* file doesn't exist yet */
  }
  const known = existingTerms(logText);
  const fresh = [];
  const seen = new Set();
  for (const t of terms) {
    const key = t.term.toLowerCase();
    if (known.has(key) || seen.has(key)) continue;
    seen.add(key);
    fresh.push(t);
  }
  if (!fresh.length) return [];
  const date = localDate();
  const rows = fresh
    .map(
      (t) =>
        `| ${escapeCell(t.term)} | ${escapeCell(t.gloss)} | ${escapeCell(
          t.context
        )} | ${date} |`
    )
    .join('\n');
  try {
    if (!logText) {
      fs.writeFileSync(file, LOG_HEADER + rows + '\n', 'utf8');
    } else {
      const sep = logText.endsWith('\n') ? '' : '\n';
      fs.appendFileSync(file, sep + rows + '\n', 'utf8');
    }
  } catch (e) {
    return [];
  }
  return fresh;
}

module.exports = {
  readStdinJSON,
  canonicalCwd,
  readLastAssistantText,
  harvestGlossedTerms,
  appendTerms,
  existingTerms,
  localDate,
  LOG_NAME,
};
