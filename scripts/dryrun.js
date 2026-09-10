#!/usr/bin/env node
// End-to-end dry run: feed a canned assistant reply through the REAL Stop-hook
// script (log-vocab.js) against a fake transcript, then print the resulting
// vocab-log.md. Lets us test prompt-compliant output + the harvester together
// without a live Claude Code session.
//
//   node scripts/dryrun.js [name]
// where a .txt fixture lives in scripts/fixtures/<name>.txt (default: iris)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const name = process.argv[2] || 'iris';
const fixture = path.join(__dirname, 'fixtures', name + '.txt');
if (!fs.existsSync(fixture)) {
  console.error('no fixture: ' + fixture);
  process.exit(2);
}
const reply = fs.readFileSync(fixture, 'utf8');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-dryrun-'));
const transcript = path.join(tmp, 't.jsonl');
fs.writeFileSync(
  transcript,
  [
    JSON.stringify({ type: 'user', message: { role: 'user', content: '（see fixture prompt）' } }),
    JSON.stringify({
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'text', text: reply }] },
    }),
  ].join('\n') + '\n',
  'utf8'
);

execFileSync('node', [path.join(root, 'scripts/log-vocab.js')], {
  input: JSON.stringify({ cwd: tmp, transcript_path: transcript, session_id: 'dry' }),
  encoding: 'utf8',
});

const logPath = path.join(tmp, 'vocab-log.md');
console.log('=== assistant reply under test ===\n');
console.log(reply.trim());
console.log('\n=== resulting vocab-log.md ===\n');
console.log(fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '(nothing logged)');

// quick automated checks
const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
const rows = (log.match(/^\| [^|].*\|$/gm) || []).filter((l) => !/术语|---/.test(l));
const problems = [];
const warns = [];
if (rows.length > 3) problems.push(`logged ${rows.length} terms — the harvester safety cap (3) is broken`);
else if (rows.length > 2) warns.push(`model glossed ${rows.length} new terms; rules say max 2 per reply (prompt-compliance, not a lib bug)`);
for (const r of rows) {
  const cells = r.split('|').map((s) => s.trim());
  const ctx = cells[3] || '';
  if (/\\\||[（(]/.test(ctx)) problems.push(`context still has table/paren noise: ${ctx}`);
  if (/[*#`~]|\*\*/.test(ctx)) problems.push(`context still has markdown markup: ${ctx}`);
  if (ctx.length < 4) problems.push(`context is degenerate: "${ctx}"`);
  if (/[→←|/\\=]/.test(cells[2] || '')) problems.push(`gloss has junk symbols: ${cells[2]}`);
}
// terms that appear only inside a fenced code block must NOT be logged
const codeBlocks = (reply.match(/```[\s\S]*?```/g) || []).join('\n');
for (const r of rows) {
  const term = r.split('|')[1].trim();
  const inProse = reply.replace(/```[\s\S]*?```/g, '').includes(term);
  if (!inProse && codeBlocks.includes(term)) problems.push(`term "${term}" was only in code, should not be logged`);
}

console.log('\n=== checks ===');
if (problems.length) console.log(problems.map((p) => 'FAIL  ' + p).join('\n'));
else console.log('PASS  ' + rows.length + ' term(s), contexts clean, nothing from code');
if (warns.length) console.log(warns.map((w) => 'WARN  ' + w).join('\n'));

fs.rmSync(tmp, { recursive: true, force: true });
process.exit(problems.length ? 1 : 0);
