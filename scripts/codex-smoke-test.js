#!/usr/bin/env node
// Offline smoke test for the Codex adapter (codex/), no Codex CLI needed.
//   node scripts/codex-smoke-test.js
//
// Covers: the AGENTS.md managed-block read/write, the `notify` program's
// harvest + AGENTS.md refresh, its enabled-gating and event-type filter, and
// codex/sync.js.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');

// Isolate from any real global opt-in: an explicit (empty) CLAUDE_CONFIG_DIR
// makes configDirs() consult that dir alone, so ~/.claude and ~/.codex on this
// machine can't flip a test. Set it before requiring the library, and pass it
// to every child process.
const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-codex-cfg-'));
process.env.CLAUDE_CONFIG_DIR = cfg;
const childEnv = Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: cfg });

const { writeAgentsBlock, readAgentsBlock } = require(path.join(
  root,
  'codex/agents-md.js'
));
const { buildInjectedRules } = require(path.join(root, 'lib/vocab-store.js'));

let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + msg);
  if (!cond) failures++;
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-codex-'));
const agents = path.join(tmp, 'AGENTS.md');
const logPath = path.join(tmp, 'vocab-log.md');
const enable = () =>
  fs.writeFileSync(path.join(tmp, '.vibe-vocab-on'), 'enabled\n', 'utf8');
const disable = () => {
  try {
    fs.unlinkSync(path.join(tmp, '.vibe-vocab-on'));
  } catch (e) {}
};
const runNotify = (evt) =>
  execFileSync('node', [path.join(root, 'codex/notify.js'), JSON.stringify(evt)], {
    encoding: 'utf8',
    env: childEnv,
  });
const runSync = () =>
  execFileSync('node', [path.join(root, 'codex/sync.js'), tmp], {
    encoding: 'utf8',
    env: childEnv,
  });

// 1. writeAgentsBlock: create a new AGENTS.md ------------------------------
let res = writeAgentsBlock(tmp, 'RULE TEXT ONE\n\nsecond line');
ok(res.changed && fs.existsSync(agents), 'writeAgentsBlock creates AGENTS.md');
let doc = fs.readFileSync(agents, 'utf8');
ok(/VIBEVOCAB:START/.test(doc) && /VIBEVOCAB:END/.test(doc), 'markers are present');
ok(/RULE TEXT ONE/.test(doc), 'rule text is inside the block');
ok(readAgentsBlock(tmp).startsWith('RULE TEXT ONE'), 'readAgentsBlock returns the body');

// 2. update in place, preserving the user's own content ------------------
fs.writeFileSync(
  agents,
  '# My project\n\nHand-written guidance the user cares about.\n\n' + doc.match(/<!-- VIBEVOCAB:START[\s\S]*END -->\n/)[0],
  'utf8'
);
res = writeAgentsBlock(tmp, 'RULE TEXT TWO');
doc = fs.readFileSync(agents, 'utf8');
ok(res.changed, 'writeAgentsBlock reports a change on new content');
ok(/Hand-written guidance/.test(doc), 'user content above the block is preserved');
ok(/RULE TEXT TWO/.test(doc) && !/RULE TEXT ONE/.test(doc), 'block content is replaced');
ok((doc.match(/VIBEVOCAB:START/g) || []).length === 1, 'still exactly one managed block');

// 3. idempotent: same text -> no rewrite -------------------------------
res = writeAgentsBlock(tmp, 'RULE TEXT TWO');
ok(!res.changed, 'writeAgentsBlock is a no-op when the block already matches');

// 4. empty rule text removes the block, keeps the user's file ---------
res = writeAgentsBlock(tmp, '');
doc = fs.readFileSync(agents, 'utf8');
ok(res.changed && !/VIBEVOCAB/.test(doc), 'empty text removes the block');
ok(/Hand-written guidance/.test(doc), 'the rest of AGENTS.md survives block removal');

// 5. block-only AGENTS.md is deleted when the block is removed --------
fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '', 'utf8');
writeAgentsBlock(tmp, 'SOLE BLOCK');
writeAgentsBlock(tmp, '');
ok(!fs.existsSync(agents), 'a block-only AGENTS.md is deleted with the block');

// 6. notify.js is a no-op when VibeVocab is disabled -----------------
disable();
runNotify({ type: 'agent-turn-complete', cwd: tmp, 'last-assistant-message': '这里用 reward model（奖励模型）打分。' });
ok(!fs.existsSync(logPath), 'notify.js writes no vocab-log.md when disabled');
ok(!fs.existsSync(agents), 'notify.js writes no AGENTS.md when disabled');

// 7. enabled: notify.js harvests the gloss AND refreshes AGENTS.md ---
enable();
runNotify({
  type: 'agent-turn-complete',
  cwd: tmp,
  'last-assistant-message':
    '这个写入要做成 idempotent（幂等）的，重复提交不会重复扣款。\n' +
    '示例里 `const x = 1` 不该被采集。',
});
ok(fs.existsSync(logPath), 'notify.js creates vocab-log.md when enabled');
const log1 = fs.readFileSync(logPath, 'utf8');
ok(/\|\s*idempotent\s*\|/.test(log1), 'the glossed term is logged');
ok(!/\bconst x\b/.test(log1), 'a term inside inline code is not logged');
ok(fs.existsSync(agents) && /VIBEVOCAB:START/.test(fs.readFileSync(agents, 'utf8')), 'notify.js seeds the AGENTS.md block');
ok(/Already learned[\s\S]*idempotent/.test(fs.readFileSync(agents, 'utf8')), 'the just-logged term shows up in the AGENTS.md learned block');

// 8. dedupe on a second identical turn -------------------------------
runNotify({ type: 'agent-turn-complete', cwd: tmp, 'last-assistant-message': '再提一次 idempotent（幂等）。' });
const log2 = fs.readFileSync(logPath, 'utf8');
ok((log2.match(/\|\s*idempotent\s*\|/g) || []).length === 1, 'no duplicate row on a second turn');

// 9. non-turn event types are ignored ------------------------------
const before = fs.readFileSync(logPath, 'utf8');
runNotify({ type: 'session-start', cwd: tmp, 'last-assistant-message': '忽略我 backoff（退避）。' });
ok(fs.readFileSync(logPath, 'utf8') === before, 'notify.js ignores a non agent-turn-complete event');

// 10. sync.js writes and then removes the block with the flag ------
fs.rmSync(agents, { force: true });
let out = runSync();
ok(/updated|already current/.test(out) && fs.existsSync(agents), 'sync.js writes the AGENTS.md block when enabled');
disable();
out = runSync();
ok(/not enabled/.test(out) && !/VIBEVOCAB/.test(fs.existsSync(agents) ? fs.readFileSync(agents, 'utf8') : ''), 'sync.js drops the block once disabled');

// 11. buildInjectedRules force flag -------------------------------
ok(buildInjectedRules(tmp) === '', 'buildInjectedRules is empty when disabled');
ok(/VIBEVOCAB ACTIVE/.test(buildInjectedRules(tmp, { force: true })), 'buildInjectedRules({force:true}) builds anyway');

fs.rmSync(tmp, { recursive: true, force: true });
fs.rmSync(cfg, { recursive: true, force: true });
console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll green.');
process.exit(failures ? 1 : 0);
