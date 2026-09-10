#!/usr/bin/env node
// Offline smoke test for the vibe-vocab hook + report, no Claude Code needed.
//   node scripts/smoke-test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = __dirname + '/..';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-vocab-test-'));
let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + msg);
  if (!cond) failures++;
};

// 1. fake transcript: two assistant turns, second one has the real payload
const transcript = path.join(tmp, 'transcript.jsonl');
fs.writeFileSync(
  transcript,
  [
    JSON.stringify({ type: 'user', message: { role: 'user', content: '帮我改一下这个接口' } }),
    JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text:
              '好的。这个写入要做成 idempotent（幂等）的，重复提交不会重复扣款。\n' +
              '另外读取路径加一层保护，防止 cache penetration（穿透）打到数据库。\n' +
              '示例代码里 `const file = "x"` 不应该被采集。\n' +
              '英文缩写 SLA (service level agreement) 也不该被当成生词。\n' +
              '这里说明一下 Stop hook（收割 -> 写 log）不是词汇，不该入库。\n' +
              '调参时可以再套一层 nested CV（外层 `cross_val_score` 包住 `GridSearchCV`），这是澄清不是生词。\n' +
              '| 标准化 | 让特征公平 | 整个数据集上 fit，导致 data leakage（数据泄漏） 高估性能 |',
          },
        ],
      },
    }),
  ].join('\n') + '\n',
  'utf8'
);

const runHook = () =>
  execFileSync('node', [path.join(root, 'scripts/log-vocab.js')], {
    input: JSON.stringify({ cwd: tmp, transcript_path: transcript, session_id: 't1' }),
    encoding: 'utf8',
  });

// 2. first run creates the log with both terms
runHook();
const logPath = path.join(tmp, 'vocab-log.md');
const log1 = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
ok(/\|\s*idempotent\s*\|/.test(log1), 'idempotent logged');
ok(/\|\s*cache penetration\s*\|/.test(log1), 'cache penetration logged');
ok(!/\bfile\b/.test(log1), 'term inside code block was NOT logged');
ok(!/service level agreement/.test(log1) && !/\|\s*SLA\s*\|/.test(log1), 'plain English parenthetical was NOT logged');
ok((log1.match(/幂等/g) || []).length === 1, 'gloss captured once');
ok(!/Stop hook/.test(log1), 'arrow/pipe pseudo-gloss was NOT logged');
ok(!/\|\s*nested CV\s*\|/.test(log1), 'clarifying aside with stripped inline-code tokens was NOT logged');
ok(/\|\s*data leakage\s*\|/.test(log1), 'data leakage in a table row was logged');
const dlRow = (log1.split('\n').find((l) => /\|\s*data leakage\s*\|/.test(l)) || '');
ok(!/\\\|/.test(dlRow) && dlRow.split('|').length === 6, 'table-row context is clean (no escaped pipes, single cell)');

// 3. second run must not duplicate
runHook();
const log2 = fs.readFileSync(logPath, 'utf8');
ok((log2.match(/\|\s*idempotent\s*\|/g) || []).length === 1, 'dedupe: no duplicate row on re-run');

// 4. report: summary
const summary = execFileSync('node', [path.join(root, 'scripts/report.js'), tmp], { encoding: 'utf8' });
ok(/Total terms logged : 3/.test(summary), 'report counts 3 terms');
ok(/Mode\s+: Passive/.test(summary), 'report shows Passive mode');

// 5. report: focus on / off
const focusOn = execFileSync('node', [path.join(root, 'scripts/report.js'), tmp, 'focus', 'backend'], { encoding: 'utf8' });
ok(fs.existsSync(path.join(tmp, 'vocab-focus.md')), 'focus backend writes vocab-focus.md');
ok(/Active mode on/.test(focusOn), 'focus on reports success');
const summary2 = execFileSync('node', [path.join(root, 'scripts/report.js'), tmp], { encoding: 'utf8' });
ok(/Mode\s+: Active/.test(summary2), 'report shows Active mode after focus');
execFileSync('node', [path.join(root, 'scripts/report.js'), tmp, 'focus', 'off'], { encoding: 'utf8' });
ok(!fs.existsSync(path.join(tmp, 'vocab-focus.md')), 'focus off removes vocab-focus.md');

// 6. session-start hook: silent unless a flag is present
const runStart = (extraEnv) =>
  execFileSync('node', [path.join(root, 'scripts/session-start.js')], {
    input: JSON.stringify({ cwd: tmp, hook_event_name: 'SessionStart' }),
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: tmp }, extraEnv || {}),
  });

ok(runStart().trim() === '', 'session-start silent when not enabled');

// /vocab on writes the project flag
execFileSync('node', [path.join(root, 'scripts/report.js'), tmp, 'on'], {
  encoding: 'utf8',
  env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: tmp }),
});
ok(fs.existsSync(path.join(tmp, '.vibe-vocab-on')), '/vocab on creates .vibe-vocab-on');

const injected = runStart();
ok(/VIBEVOCAB ACTIVE \(this project\)/.test(injected), 'session-start injects rules when project flag set');
ok(/^# VibeVocab/m.test(injected) && !/^---$/m.test(injected), 'injected body is the ruleset without frontmatter');

// /vocab off removes it
execFileSync('node', [path.join(root, 'scripts/report.js'), tmp, 'off'], {
  encoding: 'utf8',
  env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: tmp }),
});
ok(!fs.existsSync(path.join(tmp, '.vibe-vocab-on')), '/vocab off removes .vibe-vocab-on');
ok(runStart().trim() === '', 'session-start silent again after /vocab off');

// 7. non-Chinese scripts: harvest the gloss straight from the library
const { harvestGlossedTerms } = require(path.join(root, 'lib/vocab-store.js'));
const ja = harvestGlossedTerms('このエンドポイントは idempotent（冪等）にする必要があります。');
ok(ja.length === 1 && ja[0].term === 'idempotent' && ja[0].gloss === '冪等', 'Japanese gloss harvested');
const ko = harvestGlossedTerms('이 엔드포인트는 retry(재시도)로 처리해야 합니다.');
ok(ko.length === 1 && ko[0].term === 'retry' && ko[0].gloss === '재시도', 'Korean gloss harvested');
const acr = harvestGlossedTerms('这个接口要保证 idempotent（同一 HTTP 请求）的效果。');
ok(acr.length === 1 && acr[0].term === 'idempotent', 'gloss with a short all-caps acronym (HTTP) survives');
const hi = harvestGlossedTerms('यह फ़ंक्शन अब idempotent (एक जैसा असर) है। आगे टेस्ट जोड़ें।');
ok(hi.length === 1 && !/जोड़ें/.test(hi[0].context), 'Hindi context stops at the danda, not the paragraph');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll green.');
process.exit(failures ? 1 : 0);
