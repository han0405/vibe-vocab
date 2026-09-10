#!/usr/bin/env node
// Backs the /vocab command.
//
//   node report.js <projectDir>                 -> print the vocab-log summary
//   node report.js <projectDir> focus <domain>  -> copy a word pack into vocab-focus.md
//   node report.js <projectDir> focus off       -> remove vocab-focus.md
//
// Prints a plain-text report to stdout; the command file tells Claude to relay
// it verbatim.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { canonicalCwd, existingTerms, localDate, LOG_NAME } = require('../lib/vocab-store');

const projectDir = canonicalCwd(process.argv[2] || process.cwd());
const sub = (process.argv[3] || '').toLowerCase();
const arg = (process.argv[4] || '').toLowerCase();
const packDir = path.join(__dirname, '..', 'wordpacks');
const focusFile = path.join(projectDir, 'vocab-focus.md');
const logFile = path.join(projectDir, LOG_NAME);
const projectFlag = path.join(projectDir, '.vibe-vocab-on');
const globalFlag = path.join(
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  '.vibe-vocab-always'
);

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
  console.log('Claude will now look for natural openings to use those terms (still max 2 new / reply).');
  console.log('Turn it off with: /vocab focus off');
  process.exit(0);
}

// default: summary
let logText = '';
try {
  logText = fs.readFileSync(logFile, 'utf8');
} catch (e) {
  console.log('No vocab-log.md yet in this project.');
  console.log('VibeVocab is ' + enabledStatus() + '.');
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
console.log(`Enabled           : ${enabledStatus()}`);

const recent = rows.slice(-12).reverse();
if (recent.length) {
  console.log('\nMost recent:');
  for (const r of recent) {
    console.log(`  ${r.date}  ${r.term}  (${r.gloss})`);
  }
}
console.log('\nFull list with context is in vocab-log.md. Export to Anki yourself if you want spaced repetition.');
