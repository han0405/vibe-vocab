// Shared logic for the vibe-vocab plugin: read the transcript, harvest the
// terms Claude glossed on first use, and append the new ones to vocab-log.md.
// Dependency-free (Node builtins only) so `npm install` is never required.

const fs = require('fs');
const os = require('os');
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

// Directories that may hold the GLOBAL opt-in files (.vibe-vocab-always and the
// `always`-scoped rate / level / known files). Claude Code writes them under
// $CLAUDE_CONFIG_DIR (default ~/.claude); the Codex adapter has no equivalent
// env, so ~/.codex ($CODEX_HOME) is searched too. All candidates are consulted
// on read, so one runtime's global opt-in is visible to the other.
//
// $CLAUDE_CONFIG_DIR keeps its original "override, and override ONLY" meaning
// (Claude Code's own contract, and how the test suite isolates itself): when it
// is set, it is the sole global dir, give or take an explicit
// $VIBE_VOCAB_CONFIG_DIR. It is only when it is unset that the ~/.codex + ~/.claude
// fallback search kicks in.
function configDirs() {
  const uniq = (arr) => {
    const seen = new Set();
    const out = [];
    for (const d of arr) {
      if (!d) continue;
      const r = path.resolve(d);
      if (seen.has(r)) continue;
      seen.add(r);
      out.push(r);
    }
    return out;
  };
  if (process.env.CLAUDE_CONFIG_DIR) {
    return uniq([
      process.env.VIBE_VOCAB_CONFIG_DIR,
      process.env.CLAUDE_CONFIG_DIR,
    ]);
  }
  return uniq([
    process.env.VIBE_VOCAB_CONFIG_DIR,
    process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
    path.join(os.homedir(), '.claude'),
  ]);
}

// --- Enabled state -------------------------------------------------------------
// VibeVocab is on for a directory when either flag file exists:
//   - global opt-in:  $CLAUDE_CONFIG_DIR/.vibe-vocab-always  (default ~/.claude)
//   - this project:    <cwd>/.vibe-vocab-on
// Both the SessionStart hook (inject rules) and the Stop hook (harvest into
// vocab-log.md) gate on this -- when it's off, neither touches anything.
const ON_FILE = '.vibe-vocab-on';
const ALWAYS_FILE = '.vibe-vocab-always';

function isEnabled(cwd) {
  const dir = canonicalCwd(cwd);
  const files = [path.join(dir, ON_FILE)];
  for (const d of configDirs()) files.push(path.join(d, ALWAYS_FILE));
  for (const f of files) {
    try {
      if (fs.existsSync(f)) return true;
    } catch (e) {
      /* unreadable -- treat as absent */
    }
  }
  return false;
}

// --- Per-reply gloss budget -------------------------------------------------
// How many concepts a reply may gloss on first use. The VibeVocab design is
// "one concept per reply"; the user can raise it with `/vocab rate <n>`, which
// writes a plain integer to `.vibe-vocab-rate` -- in the project root, or in
// $CLAUDE_CONFIG_DIR when set with `always`. Capped low on purpose: past a
// handful of glosses a reply is a glossary, not a habit.
const RATE_FILE = '.vibe-vocab-rate';
const RATE_MIN = 1;
const RATE_MAX = 5;
const RATE_DEFAULT = 1;

function clampRate(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n)) return RATE_DEFAULT;
  return Math.min(RATE_MAX, Math.max(RATE_MIN, n));
}

// Resolve the effective budget for a directory: the project flag wins over the
// global opt-in; absent both, RATE_DEFAULT. Never throws.
function readRate(cwd) {
  const dir = canonicalCwd(cwd);
  const files = [path.join(dir, RATE_FILE)];
  for (const d of configDirs()) files.push(path.join(d, RATE_FILE));
  for (const f of files) {
    try {
      const raw = fs.readFileSync(f, 'utf8').trim();
      if (raw) return clampRate(raw);
    } catch (e) {
      /* not set at this scope -- try the next */
    }
  }
  return RATE_DEFAULT;
}

// --- Vocabulary level ------------------------------------------------------------
// How specialized a term has to be before it's worth a gloss. Default `mid`
// matches the shipped rule ("a term they likely half-know"). `/vocab level`
// writes one of LEVEL_VALUES to `.vibe-vocab-level` (project root, or
// $CLAUDE_CONFIG_DIR with `always`); session-start turns a non-default value
// into a prompt override.
const LEVEL_FILE = '.vibe-vocab-level';
const LEVEL_VALUES = ['beginner', 'mid', 'advanced'];
const LEVEL_DEFAULT = 'mid';

// Accept a few friendly spellings; anything unknown -> null (caller decides).
function normalizeLevel(s) {
  const v = String(s || '').trim().toLowerCase();
  if (!v) return null;
  if (LEVEL_VALUES.includes(v)) return v;
  const alias = {
    beginner: 'beginner', new: 'beginner', novice: 'beginner', basic: 'beginner',
    intermediate: 'mid', medium: 'mid', middle: 'mid', normal: 'mid', default: 'mid',
    advanced: 'advanced', expert: 'advanced', senior: 'advanced', pro: 'advanced',
  };
  return alias[v] || null;
}

// Project flag wins over the global opt-in; absent both, LEVEL_DEFAULT. Never throws.
function readLevel(cwd) {
  const dir = canonicalCwd(cwd);
  const files = [path.join(dir, LEVEL_FILE)];
  for (const d of configDirs()) files.push(path.join(d, LEVEL_FILE));
  for (const f of files) {
    try {
      const raw = fs.readFileSync(f, 'utf8').trim();
      const lv = normalizeLevel(raw);
      if (lv) return lv;
    } catch (e) {
      /* not set at this scope -- try the next */
    }
  }
  return LEVEL_DEFAULT;
}

// --- Already-learned terms ------------------------------------------------------
// The SessionStart hook tells Claude which terms are already learned so it stops
// re-glossing them in later sessions. Two sources feed that list:
//   - every term row in vocab-log.md (harvested from earlier replies)
//   - `.vibe-vocab-known`, a plain list the user curates via `/vocab know`
//     (project root, or $CLAUDE_CONFIG_DIR when set with `always`)
const KNOWN_FILE = '.vibe-vocab-known';

// One markdown table row -> its four cells, for both vocab-log.md and wordpacks.
const LOG_ROW_RE =
  /^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/gm;

// Terms already in vocab-log.md, oldest first. `limit` keeps only the most
// recent N (the injected context has a budget). Never throws.
function readLoggedTerms(cwd, limit) {
  const file = path.join(canonicalCwd(cwd), LOG_NAME);
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    return [];
  }
  const out = [];
  let m;
  LOG_ROW_RE.lastIndex = 0;
  while ((m = LOG_ROW_RE.exec(text)) !== null) {
    const term = m[1].trim();
    if (!term || term === '术语' || /^-+$/.test(term)) continue;
    out.push({
      term,
      gloss: m[2].trim(),
      context: m[3].trim(),
      date: m[4].trim(),
    });
  }
  if (Number.isFinite(limit) && limit > 0 && out.length > limit) {
    return out.slice(out.length - limit);
  }
  return out;
}

// Split a `/vocab know` argument or a `.vibe-vocab-known` file body into terms.
// Accepts commas (ASCII or CJK) and newlines as separators.
function parseTermList(s) {
  return String(s || '')
    .split(/[\r\n,、，]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// The user's curated known list (project flag first, then the global one),
// de-duplicated case-insensitively with the first spelling kept. Never throws.
function readKnownTerms(cwd) {
  const dir = canonicalCwd(cwd);
  const seen = new Set();
  const out = [];
  const files = [path.join(dir, KNOWN_FILE)];
  for (const d of configDirs()) files.push(path.join(d, KNOWN_FILE));
  for (const f of files) {
    let raw = '';
    try {
      raw = fs.readFileSync(f, 'utf8');
    } catch (e) {
      continue;
    }
    for (const t of parseTermList(raw)) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
  }
  return out;
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

// The VibeVocab rules make a gloss inside a **bold run-in header** ineligible
// ("**term（gloss）** — explanation" as a bullet lead-in, or a bold-only line).
// The model still slips into that glossary-style layout, so strip the gloss
// parenthetical on those lines before harvesting. A line counts as a run-in
// header when a **bold** span sits at its very start (after an optional list
// marker) and is followed by a header separator (— – : ：), an immediately
// trailing (gloss), or the end of the line. Runs BEFORE stripMarkdown while the
// `**` fences are still there; newlines and line structure are preserved.
function stripBoldRunIn(text) {
  const dropParen = (s) => s.replace(/[（(][^）)]*[）)]/g, '');
  return text.replace(
    /^([ \t]{0,3}(?:[-*+]|\d+[.)])?[ \t]*)\*\*([^\n*]+?)\*\*([ \t]*[（(][^）)\n]{1,40}[）)])?([ \t]*(?:[—–:：]|-[ \t])|[ \t]*$)/gm,
    (full, lead, inner, _trailingGloss, sep) =>
      lead + dropParen(inner) + ' ' + sep.replace(/^[ \t]+/, '')
  );
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
//
// The length window is 40, not 5-CJK-chars' worth: Devanagari and Arabic need
// more code points (combining marks, spaces between words) to say the same
// thing, and a 14-char cap silently dropped their glosses. A too-long
// clarifying aside that slips through the wider window is caught downstream by
// looksLikeGloss (junk symbols, stripped-code spacing, leaked identifiers).
const GLOSS_RE =
  /([A-Za-z][A-Za-z0-9]*(?:[ /_-][A-Za-z0-9]+){0,3})\s*[（(]\s*([^）)]{1,40})\s*[）)]/g;

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
  // Sentence / clause punctuation means we caught a clarifying aside or an
  // enumeration ("服务等级协议，不是别的"), not a noun-phrase gloss. Matters
  // more now that the length window is 40.
  if (/[，、。；：！？…「」『』（）]/.test(gloss)) return false;
  // Two or more consecutive spaces are the scar left when stripCode removed an
  // inline-code token from the middle of a clarifying aside -- e.g.
  // "nested CV（外层 `cross_val_score` 包住 …）" -> "外层  包住". Not a gloss.
  if (/\s{2,}/.test(gloss)) return false;
  // A leaked code identifier (`cross_val_score`, `GridSearchCV`, `Pipeline`,
  // `nested`) is an ASCII letter run that is not a short acronym. A short
  // all-caps run (HTTP, API, JSON, CV, ML, SQL) is legitimate inside a
  // user-language gloss and must survive.
  const asciiRuns = gloss.match(/[A-Za-z]{2,}/g) || [];
  if (asciiRuns.some((r) => r.length > 5 || r !== r.toUpperCase())) return false;
  const letters = (gloss.match(/[^\s\x00-\x7F]/g) || []).length;
  return letters >= 2;
}

// Boundaries that end the "sentence" we quote as context. Includes table-cell
// pipes and colons so a term used inside a Markdown table row doesn't drag the
// whole row (and its escaped `\|`s) into the log. `│ ║ ┃` are the box-drawing
// verticals used in ASCII/Unicode comparison tables (`┌─┬─┐` … `│ a │ b │`).
// `।` / `۔` (Hindi/Urdu danda) and `؟` (Arabic question mark) keep non-Latin
// scripts from over-running; mid-clause commas (`，` `،`) are deliberately out.
const CTX_MARKS = ['\n', '。', '！', '？', '；', '।', '۔', '؟', '. ', '! ', '? ', '|', '│', '║', '┃', '：', ':'];

// A context sentence that is only a lead-in phrase plus the headword itself
// ("关于 idempotent", "about backoff", "什么是 mutex") records nothing useful --
// the real explanation is in the next clause, past a "：" the model put after
// the gloss. Detect that so harvestGlossedTerms can reach forward for it.
const CTX_LEAD_FILLER =
  /^(?:关于|讲讲|说说|聊聊|谈谈|讲一下|说一下|讲下|说下|介绍一下|简单(?:说|讲)(?:一?下)?|什么是|about|regarding)[\s:：]*/i;

function contextIsThin(ctx, term) {
  if (!ctx) return true;
  let s = ctx.replace(CTX_LEAD_FILLER, '');
  if (term) {
    s = s.replace(
      new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'),
      ''
    );
  }
  // keep only letters/digits of any script; a real context has at least a
  // couple beyond the (removed) headword.
  s = s.replace(/[^\p{L}\p{N}]/gu, '');
  return s.length < 2;
}

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

// Safety net in case the model overshoots the per-reply budget: never log more
// than this many new terms from a single turn. `harvestGlossedTerms` takes an
// explicit cap (the Stop hook passes one derived from the configured rate);
// this constant is the fallback when it doesn't.
const MAX_NEW_TERMS_PER_TURN = 3;

function harvestGlossedTerms(assistantText, maxNewTerms) {
  const cap =
    Number.isFinite(maxNewTerms) && maxNewTerms > 0
      ? Math.floor(maxNewTerms)
      : MAX_NEW_TERMS_PER_TURN;
  const text = stripMarkdown(stripBoldRunIn(stripCode(assistantText || '')));
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
    // A bare all-caps acronym (DPO, GRPO, SLA, API): the parenthetical after it
    // is an expansion or a category label ("DPO（离线）", "SLA（服务等级协议）"),
    // which the rules class as clarification, not a first-use vocab gloss.
    if (/^[A-Z][A-Z0-9]{1,5}$/.test(term)) continue;
    const key = term.toLowerCase();
    if (seenInThisTurn.has(key)) continue;
    seenInThisTurn.add(key);
    // Show the context sentence the way it reads AFTER acquisition -- without
    // the first-use gloss cluttering it up.
    const cleanCtx = (at) =>
      sentenceAround(text, at).replace(/\s*[（(]\s*[^）)]{1,40}[）)]/g, (p) =>
        hasNonAscii(p) ? '' : p
      );
    let context = cleanCtx(m.index);
    // "关于 idempotent（幂等）：<真正的解释>" leaves only "关于 idempotent" in the
    // window -- the "：" bounded it. Reach past the gloss for the next clause.
    if (contextIsThin(context, term)) {
      // step past the delimiter run the model put right after the gloss
      // ("：", "。", ". ", a table pipe) before looking for the next clause.
      let fwd = m.index + m[0].length;
      while (fwd < text.length && /[\s：:。！？；.!?|│║┃।۔؟]/.test(text[fwd])) fwd++;
      const after = cleanCtx(fwd);
      if (after && !contextIsThin(after, term)) context = after;
    }
    out.push({ term, gloss, context });
  }
  return out.slice(0, cap);
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
  try {
    for (const t of readKnownTerms(dir)) known.add(t.toLowerCase());
  } catch (e) {
    /* known list is optional */
  }
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

// --- Injected ruleset ---------------------------------------------------------
// The complete text VibeVocab puts into a session: the ruleset from
// rules/vibe-vocab.md, minus its frontmatter, plus the per-reply-budget /
// vocabulary-level / already-learned override blocks the user's settings call
// for. Runtime-neutral -- Claude Code's SessionStart hook prints it to stdout;
// the Codex adapter writes it into a marked block in AGENTS.md. Returns '' when
// VibeVocab is not enabled for `cwd`; pass { force: true } to build it anyway.
// Never throws.
function buildInjectedRules(cwd, opts) {
  opts = opts || {};
  try {
    const dir = canonicalCwd(cwd);
    if (!opts.force && !isEnabled(dir)) return '';

    const globalOn = configDirs().some((d) => {
      try {
        return fs.existsSync(path.join(d, ALWAYS_FILE));
      } catch (e) {
        return false;
      }
    });

    const rulesPath = path.join(__dirname, '..', 'rules', 'vibe-vocab.md');
    const body = fs
      .readFileSync(rulesPath, 'utf8')
      .replace(/^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/, '')
      .replace(/(?:\r?\n)+$/, '');

    // Per-reply gloss budget. The ruleset is written for 1; when the user has
    // raised it with `/vocab rate <n>`, append an override rather than
    // rewriting the (blind-eval-tuned) rules text.
    let rate = RATE_DEFAULT;
    try {
      rate = readRate(dir);
    } catch (e) {
      /* fall back to the default budget */
    }
    let override = '';
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
        `comments, headings, or identifiers; one gloss per concept; bare on reuse. In ` +
        `particular the higher budget does **not** license a term-by-term glossary: ` +
        `the "glossary-bullet trap" note still holds, glosses go in prose, and a ` +
        `\`- **term（释义）** — …\` list is still zero glosses no matter the budget.\n`;
    }

    // Vocabulary level: shifts the "which concept gets the slot" bar. Default
    // `mid` == the shipped rule, so only beginner/advanced produce an override.
    let level = LEVEL_DEFAULT;
    try {
      level = readLevel(dir);
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
        `all other rules are unchanged. Watch the "glossary-bullet trap" especially: ` +
        `at this level a "关键点 / key points" list explaining several ideas almost ` +
        `always warrants **no** gloss at all — leave the whole list in the user's ` +
        `language.\n`;
    }

    // Already-learned terms: everything in vocab-log.md (most recent first) plus
    // the user's `/vocab know` list. Telling the model to use these bare stops
    // it re-glossing a term across sessions and wasting the reply's budget.
    const LEARNED_IN_CONTEXT = 120;
    let learned = [];
    try {
      const seen = new Set();
      const logged = readLoggedTerms(dir, LEARNED_IN_CONTEXT)
        .map((t) => t.term)
        .reverse();
      for (const t of readKnownTerms(dir).concat(logged)) {
        const k = t.toLowerCase();
        if (!t || seen.has(k)) continue;
        seen.add(k);
        learned.push(t);
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
      (level !== LEVEL_DEFAULT ? ` Vocabulary level: ${level}.` : '') +
      (learned.length ? ` ${learned.length} terms already learned.` : '');
    return (
      `VIBEVOCAB ACTIVE (${scope}).${notes} The rules below apply to every reply this session. ` +
      'Say "别标注" / "focus" to pause for the session; ' +
      `run \`/vocab off\` to disable it for this project.\n\n${body}${override}${levelBlock}${learnedBlock}\n`
    );
  } catch (e) {
    return '';
  }
}

module.exports = {
  readStdinJSON,
  canonicalCwd,
  configDirs,
  buildInjectedRules,
  readRate,
  clampRate,
  readLevel,
  normalizeLevel,
  readLoggedTerms,
  readKnownTerms,
  parseTermList,
  readLastAssistantText,
  isEnabled,
  contextIsThin,
  harvestGlossedTerms,
  appendTerms,
  existingTerms,
  localDate,
  LOG_NAME,
  LOG_ROW_RE,
  ON_FILE,
  ALWAYS_FILE,
  RATE_FILE,
  RATE_MIN,
  RATE_MAX,
  RATE_DEFAULT,
  KNOWN_FILE,
  LEVEL_FILE,
  LEVEL_VALUES,
  LEVEL_DEFAULT,
};
