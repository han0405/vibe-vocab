#!/usr/bin/env node
// Backs the /vocab command.
//
//   node report.js <projectDir>                 -> print the vocab-log summary
//   node report.js <projectDir> focus <domain>  -> copy a word pack into vocab-focus.md
//   node report.js <projectDir> focus off       -> remove vocab-focus.md
//   node report.js <projectDir> rate <1-5>      -> set the per-reply gloss budget
//   node report.js <projectDir> rate off        -> reset the budget to the default (1)
//   node report.js <projectDir> level <name>    -> set the vocabulary level (beginner|mid|advanced)
//   node report.js <projectDir> know <terms>    -> add terms to the "already known" list
//   node report.js <projectDir> forget <terms>  -> remove terms from that list
//   node report.js <projectDir> export          -> write vocab-anki.csv
//
// Prints a plain-text report to stdout; the command file tells Claude to relay
// it verbatim.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  canonicalCwd,
  readRate,
  clampRate,
  readLevel,
  normalizeLevel,
  readKnownTerms,
  parseTermList,
  localDate,
  LOG_NAME,
  LOG_ROW_RE,
  RATE_FILE,
  RATE_MIN,
  RATE_MAX,
  RATE_DEFAULT,
  KNOWN_FILE,
  LEVEL_FILE,
  LEVEL_VALUES,
  LEVEL_DEFAULT,
} = require('../lib/vocab-store');

const projectDir = canonicalCwd(process.argv[2] || process.cwd());
const sub = (process.argv[3] || '').toLowerCase();
const arg = (process.argv[4] || '').toLowerCase();
const packDir = path.join(__dirname, '..', 'wordpacks');
const focusFile = path.join(projectDir, 'vocab-focus.md');
const logFile = path.join(projectDir, LOG_NAME);
const projectFlag = path.join(projectDir, '.vibe-vocab-on');
// Where `/vocab ... always` writes the global opt-in files. Prefer an explicit
// $VIBE_VOCAB_CONFIG_DIR (set by the Codex adapter) so its reads and these
// writes agree; otherwise the historical $CLAUDE_CONFIG_DIR / ~/.claude.
const claudeCfgDir =
  process.env.VIBE_VOCAB_CONFIG_DIR ||
  process.env.CLAUDE_CONFIG_DIR ||
  path.join(os.homedir(), '.claude');
const globalFlag = path.join(claudeCfgDir, '.vibe-vocab-always');

if (sub === 'on' || sub === 'off') {
  const wantGlobal = arg === 'always' || arg === 'global' || arg === '--always';
  const target = wantGlobal ? globalFlag : projectFlag;
  const label = wantGlobal ? 'always-on (all projects)' : 'this project';
  if (sub === 'on') {
    try {
      fs.writeFileSync(target, 'enabled\n', 'utf8');
      console.log(`VibeVocab enabled for ${label}.`);
      console.log('It injects the rules at the start of each new session.');
      if (!wantGlobal) console.log('Global opt-in instead:  /vocab on always');
    } catch (e) {
      console.log('Could not write the flag file: ' + e.message);
    }
  } else {
    try {
      fs.unlinkSync(target);
      console.log(`VibeVocab disabled for ${label}.`);
    } catch (e) {
      console.log(`VibeVocab was not enabled for ${label}.`);
    }
  }
  process.exit(0);
}

if (sub === 'rate') {
  const wantGlobal = (process.argv[5] || '').toLowerCase() === 'always';
  const target = wantGlobal
    ? path.join(claudeCfgDir, RATE_FILE)
    : path.join(projectDir, RATE_FILE);
  const label = wantGlobal ? 'always-on (all projects)' : 'this project';

  if (!arg) {
    console.log(`Per-reply gloss budget: ${readRate(projectDir)} (default ${RATE_DEFAULT}).`);
    console.log(`Change it:  /vocab rate <${RATE_MIN}-${RATE_MAX}>   (add "always" for every project)`);
    console.log('Reset it :  /vocab rate off');
    process.exit(0);
  }

  if (arg === 'off' || arg === 'none' || arg === 'default' || arg === String(RATE_DEFAULT)) {
    let removed = false;
    try {
      fs.unlinkSync(target);
      removed = true;
    } catch (e) {
      /* nothing to reset at this scope */
    }
    console.log(
      removed
        ? `Per-reply gloss budget reset to the default (${RATE_DEFAULT}) for ${label}.`
        : `Per-reply gloss budget for ${label} was already at the default (${RATE_DEFAULT}).`
    );
    process.exit(0);
  }

  const requested = parseInt(arg, 10);
  if (!Number.isFinite(requested) || requested < 1) {
    console.log(`Usage: /vocab rate <${RATE_MIN}-${RATE_MAX}>   (or  /vocab rate off  to reset)`);
    process.exit(0);
  }
  const n = clampRate(requested);
  try {
    fs.writeFileSync(target, n + '\n', 'utf8');
    console.log(`Per-reply gloss budget set to ${n} for ${label}.`);
    if (n !== requested) {
      console.log(`(Requested ${requested}; capped at ${RATE_MAX} — VibeVocab is a habit, not a glossary.)`);
    }
    console.log('Applies from the next session. To apply it now, run  /vocab on  again this session.');
  } catch (e) {
    console.log('Could not write the rate file: ' + e.message);
  }
  process.exit(0);
}

if (sub === 'level') {
  const wantGlobal = (process.argv[5] || '').toLowerCase() === 'always';
  const target = wantGlobal
    ? path.join(claudeCfgDir, LEVEL_FILE)
    : path.join(projectDir, LEVEL_FILE);
  const label = wantGlobal ? 'always-on (all projects)' : 'this project';

  if (!arg) {
    console.log(`Vocabulary level: ${readLevel(projectDir)} (default ${LEVEL_DEFAULT}).`);
    console.log(`  beginner  — gloss everyday engineering terms too`);
    console.log(`  mid       — a term you likely half-know (the default)`);
    console.log(`  advanced  — only genuinely specialized terms; most replies gloss nothing`);
    console.log(`Change it:  /vocab level <${LEVEL_VALUES.join('|')}>   (add "always" for every project)`);
    console.log('Reset it :  /vocab level off');
    process.exit(0);
  }

  if (arg === 'off' || arg === 'none' || arg === 'reset') {
    let removed = false;
    try {
      fs.unlinkSync(target);
      removed = true;
    } catch (e) {
      /* nothing to reset at this scope */
    }
    console.log(
      removed
        ? `Vocabulary level reset to the default (${LEVEL_DEFAULT}) for ${label}.`
        : `Vocabulary level for ${label} was already at the default (${LEVEL_DEFAULT}).`
    );
    process.exit(0);
  }

  const lv = normalizeLevel(arg);
  if (!lv) {
    console.log(`Usage: /vocab level <${LEVEL_VALUES.join('|')}>   (or  /vocab level off  to reset)`);
    process.exit(0);
  }
  try {
    if (lv === LEVEL_DEFAULT) {
      try {
        fs.unlinkSync(target);
      } catch (e) {
        /* already default */
      }
      console.log(`Vocabulary level set to ${lv} (the default) for ${label}.`);
    } else {
      fs.writeFileSync(target, lv + '\n', 'utf8');
      console.log(`Vocabulary level set to ${lv} for ${label}.`);
    }
    console.log('Applies from the next session. To apply it now, run  /vocab on  again this session.');
  } catch (e) {
    console.log('Could not write the level file: ' + e.message);
  }
  process.exit(0);
}

function enabledStatus() {
  const g = fs.existsSync(globalFlag);
  const p = fs.existsSync(projectFlag);
  if (g) return 'ON (always-on, all projects)';
  if (p) return 'ON (this project)';
  return 'OFF — run  /vocab on  to enable';
}

function listPacks() {
  try {
    return fs
      .readdirSync(packDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''));
  } catch (e) {
    return [];
  }
}

if (sub === 'focus') {
  if (arg === 'off' || arg === 'none') {
    try {
      fs.unlinkSync(focusFile);
      console.log('Active mode off: removed vocab-focus.md. Back to passive mode.');
    } catch (e) {
      console.log('Active mode was not on (no vocab-focus.md to remove).');
    }
    process.exit(0);
  }
  const packs = listPacks();
  if (!arg || !packs.includes(arg)) {
    console.log('Usage: /vocab focus <domain>');
    console.log('Available word packs: ' + (packs.join(', ') || '(none found)'));
    process.exit(0);
  }
  const body = fs.readFileSync(path.join(packDir, arg + '.md'), 'utf8');
  fs.writeFileSync(focusFile, body, 'utf8');
  console.log(`Active mode on: "${arg}" word pack written to vocab-focus.md.`);
  console.log(
    `Claude will now look for natural openings to use those terms (still within your per-reply gloss budget: ${readRate(projectDir)}).`
  );
  console.log('Turn it off with: /vocab focus off');
  process.exit(0);
}

// Extract the term column from a wordpack markdown table.
function packTerms(packName) {
  let body;
  try {
    body = fs.readFileSync(path.join(packDir, packName + '.md'), 'utf8');
  } catch (e) {
    return [];
  }
  const out = [];
  const re = /^\|\s*([^|]+?)\s*\|/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    const cell = m[1].trim();
    if (!cell || /^-+$/.test(cell) || cell.toLowerCase() === 'term') continue;
    out.push(cell);
  }
  return out;
}

if (sub === 'know' || sub === 'forget') {
  const rawArgs = process.argv.slice(4);
  let wantGlobal = false;
  if ((rawArgs[0] || '').toLowerCase() === 'always') {
    wantGlobal = true;
    rawArgs.shift();
  }
  const joined = rawArgs.join(' ').trim();
  const target = wantGlobal
    ? path.join(claudeCfgDir, KNOWN_FILE)
    : path.join(projectDir, KNOWN_FILE);
  const label = wantGlobal ? 'all projects' : 'this project';

  if (sub === 'know' && !joined) {
    const cur = readKnownTerms(projectDir);
    console.log(`Known terms (never glossed): ${cur.length ? cur.join(', ') : '(none yet)'}`);
    console.log('');
    console.log('Add one or many:  /vocab know idempotent, mutex, back-pressure');
    console.log('Add a word pack:  /vocab know backend       (packs: ' + (listPacks().join(', ') || 'none') + ')');
    console.log('Remove:           /vocab forget mutex');
    console.log('Reset the list:   /vocab forget all         (add "always" after know/forget for the global list)');
    console.log('');
    console.log("Note: terms already in vocab-log.md are treated as known automatically — you rarely need this.");
    process.exit(0);
  }

  if ((sub === 'know' || sub === 'forget') && /^(all|off|none)$/i.test(joined)) {
    let removed = false;
    try {
      fs.unlinkSync(target);
      removed = true;
    } catch (e) {
      /* nothing there */
    }
    console.log(removed ? `Cleared the known-terms list for ${label}.` : `No known-terms list for ${label} to clear.`);
    process.exit(0);
  }

  // Expand a bare word-pack name; otherwise treat the argument as a term list.
  let incoming;
  if (!joined.includes(',') && listPacks().includes(joined.toLowerCase())) {
    incoming = packTerms(joined.toLowerCase());
  } else {
    incoming = parseTermList(joined);
  }
  if (!incoming.length) {
    console.log(`Usage: /vocab ${sub} <term, term, ...>   or   /vocab ${sub} <word-pack>`);
    process.exit(0);
  }

  // Read the current file body verbatim so we preserve the user's spelling and
  // order; dedupe case-insensitively.
  let existing = [];
  try {
    existing = parseTermList(fs.readFileSync(target, 'utf8'));
  } catch (e) {
    /* file doesn't exist yet */
  }
  const lc = new Set(existing.map((t) => t.toLowerCase()));
  const touched = [];

  if (sub === 'know') {
    for (const t of incoming) {
      if (lc.has(t.toLowerCase())) continue;
      lc.add(t.toLowerCase());
      existing.push(t);
      touched.push(t);
    }
  } else {
    const drop = new Set(incoming.map((t) => t.toLowerCase()));
    existing = existing.filter((t) => {
      const hit = drop.has(t.toLowerCase());
      if (hit) touched.push(t);
      return !hit;
    });
  }

  try {
    if (existing.length) {
      fs.writeFileSync(target, existing.join('\n') + '\n', 'utf8');
    } else {
      try {
        fs.unlinkSync(target);
      } catch (e) {
        /* already gone */
      }
    }
  } catch (e) {
    console.log('Could not write ' + target + ': ' + e.message);
    process.exit(0);
  }

  if (sub === 'know') {
    console.log(
      touched.length
        ? `Added to the known list (${label}): ${touched.join(', ')}`
        : 'Nothing new — every term given was already on the list.'
    );
  } else {
    console.log(
      touched.length
        ? `Removed from the known list (${label}): ${touched.join(', ')}`
        : 'Nothing removed — none of those terms were on the list.'
    );
  }
  console.log(`Known terms now: ${existing.length ? existing.join(', ') : '(none)'}`);
  console.log('Takes effect at the start of the next session.');
  process.exit(0);
}

if (sub === 'export') {
  let text = '';
  try {
    text = fs.readFileSync(logFile, 'utf8');
  } catch (e) {
    console.log('No vocab-log.md in this project yet — nothing to export.');
    process.exit(0);
  }
  const recs = [];
  let m;
  LOG_ROW_RE.lastIndex = 0;
  while ((m = LOG_ROW_RE.exec(text)) !== null) {
    const term = m[1].trim();
    if (!term || term === '术语' || /^-+$/.test(term)) continue;
    recs.push([term, m[2].trim(), m[3].trim(), m[4].trim()]);
  }
  if (!recs.length) {
    console.log('vocab-log.md has no term rows yet — nothing to export.');
    process.exit(0);
  }
  const csvCell = (s) => {
    s = String(s);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv =
    ['Term,Gloss,Context,Date']
      .concat(recs.map((r) => r.map(csvCell).join(',')))
      .join('\r\n') + '\r\n';
  const outFile = path.join(projectDir, 'vocab-anki.csv');
  try {
    fs.writeFileSync(outFile, csv, 'utf8');
  } catch (e) {
    console.log('Could not write ' + outFile + ': ' + e.message);
    process.exit(0);
  }
  console.log(`Exported ${recs.length} term(s) to  ${outFile}`);
  console.log('');
  console.log('Anki (a free spaced-repetition flashcard app, https://apps.ankiweb.net):');
  console.log('  File -> Import -> pick vocab-anki.csv, "Fields separated by: Comma"');
  console.log('  Field 1 -> Front (English term), Field 2 -> Back (gloss); 3 = context, 4 = date');
  console.log('The same file opens directly in Excel / Google Sheets / Numbers.');
  process.exit(0);
}

// default: summary
let logText = '';
try {
  logText = fs.readFileSync(logFile, 'utf8');
} catch (e) {
  console.log('No vocab-log.md yet in this project.');
  console.log('VibeVocab is ' + enabledStatus() + '.');
  console.log(`Gloss budget: ${readRate(projectDir)} per reply  (change with  /vocab rate <${RATE_MIN}-${RATE_MAX}>).`);
  console.log(`Vocabulary level: ${readLevel(projectDir)}  (change with  /vocab level <${LEVEL_VALUES.join('|')}>).`);
  console.log('The log is created automatically the first time Claude glosses a new term.');
  const packs = listPacks();
  if (packs.length) console.log('\nWord packs you can activate: ' + packs.join(', '));
  console.log('Activate one with:  /vocab focus <domain>');
  process.exit(0);
}

const rowRe = /^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([0-9-]+)\s*\|/gm;
const rows = [];
let m;
while ((m = rowRe.exec(logText)) !== null) {
  if (m[1].toLowerCase() === '术语' || /^-+$/.test(m[1])) continue;
  rows.push({ term: m[1], gloss: m[2], context: m[3], date: m[4] });
}

const today = localDate();
const weekAgo = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return localDate(d);
})();
const thisWeek = rows.filter((r) => r.date >= weekAgo);

console.log(`VibeVocab 生词本 — ${logFile}`);
console.log('');
console.log(`Total terms logged : ${rows.length}`);
console.log(`Added in last 7 d  : ${thisWeek.length}`);
console.log(`Today             : ${rows.filter((r) => r.date === today).length}`);

let focusName = null;
try {
  const f = fs.readFileSync(focusFile, 'utf8');
  const h = f.match(/^#\s*Word pack:\s*(.+)$/m);
  focusName = h ? h[1].trim() : 'vocab-focus.md';
} catch (e) {
  /* passive mode */
}
console.log(`Mode              : ${focusName ? 'Active (' + focusName + ')' : 'Passive'}`);
console.log(`Gloss budget      : ${readRate(projectDir)} per reply  (change with  /vocab rate <${RATE_MIN}-${RATE_MAX}>)`);
console.log(`Vocabulary level  : ${readLevel(projectDir)}  (change with  /vocab level <${LEVEL_VALUES.join('|')}>)`);
const knownCount = readKnownTerms(projectDir).length;
console.log(`Marked known      : ${knownCount} term(s)  (manage with  /vocab know | forget)`);
console.log(`Enabled           : ${enabledStatus()}`);

const recent = rows.slice(-12).reverse();
if (recent.length) {
  console.log('\nMost recent:');
  for (const r of recent) {
    console.log(`  ${r.date}  ${r.term}  (${r.gloss})`);
  }
}
console.log('\nFull list with context is in vocab-log.md.');
console.log('Run  /vocab export  to write vocab-anki.csv (Anki / spreadsheet ready).');
