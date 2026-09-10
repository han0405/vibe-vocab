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
const hiLong = harvestGlossedTerms('हमें cache penetration (कैश में सीधी पहुँच) से बचना ज़रूरी है।');
ok(hiLong.length === 1 && hiLong[0].term === 'cache penetration', 'Hindi multi-word gloss (>14 chars) now harvested');
const arLong = harvestGlossedTerms('يجب تجنب cache penetration (اختراق التخزين المؤقت) لحماية قاعدة البيانات.');
ok(arLong.length === 1 && arLong[0].term === 'cache penetration', 'Arabic longer gloss now harvested');
const aside = harvestGlossedTerms('这个接口有 SLA（服务等级协议，不是别的东西）的要求。');
ok(aside.length === 0, 'long CJK clarifying aside with a comma is still rejected');

// 8. per-reply gloss budget: /vocab rate, session-start override, harvester cap
const { readRate } = require(path.join(root, 'lib/vocab-store.js'));
const runReport = (args) =>
  execFileSync('node', [path.join(root, 'scripts/report.js'), tmp, ...args], {
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: tmp }),
  });

ok(readRate(tmp) === 1, 'readRate defaults to 1 with no flag');

runReport(['on']); // session-start only emits when enabled
const rateSet = runReport(['rate', '3']);
ok(fs.readFileSync(path.join(tmp, '.vibe-vocab-rate'), 'utf8').trim() === '3', '/vocab rate 3 writes the flag');
ok(/budget set to 3/.test(rateSet), 'rate report confirms the new budget');
ok(readRate(tmp) === 3, 'readRate picks up 3');

const injectedRate = runStart();
ok(/rate 3/.test(injectedRate) && /budget override/i.test(injectedRate), 'session-start appends the budget override at rate 3');
ok(/Per-reply gloss budget: 3\./.test(injectedRate), 'session-start header notes the budget');

const clamp = runReport(['rate', '99']);
ok(fs.readFileSync(path.join(tmp, '.vibe-vocab-rate'), 'utf8').trim() === '5', 'rate 99 is clamped to 5');
ok(/capped at 5/.test(clamp), 'rate report notes the cap');
ok(/Gloss budget\s+: 5 per reply/.test(runReport([])), 'summary shows the configured budget');

runReport(['rate', 'off']);
ok(!fs.existsSync(path.join(tmp, '.vibe-vocab-rate')), '/vocab rate off removes the flag');
ok(readRate(tmp) === 1 && !/budget override/i.test(runStart()), 'back to the default once reset');
runReport(['off']);

// harvester cap scales with the explicit limit it is handed
const fourGloss = '这是 alpha（甲类）和 beta（乙类）和 gamma（丙类）和 delta（丁类）';
ok(harvestGlossedTerms(fourGloss).length === 3, 'default harvest cap stays 3');
ok(harvestGlossedTerms(fourGloss, 5).length === 4, 'harvest honours a higher cap');
ok(harvestGlossedTerms(fourGloss, 2).length === 2, 'harvest honours a lower cap');

// 9. already-learned terms: readLoggedTerms + session-start injection
const { readLoggedTerms } = require(path.join(root, 'lib/vocab-store.js'));
ok(readLoggedTerms(tmp).length === 3, 'readLoggedTerms reads every log row');
ok(readLoggedTerms(tmp, 2).length === 2, 'readLoggedTerms respects the limit');
ok(
  readLoggedTerms(tmp, 2)[1].term === readLoggedTerms(tmp)[2].term,
  'the limit keeps the most-recent rows'
);

runReport(['on']);
const injectedLearned = runStart();
ok(/## Already learned/.test(injectedLearned), 'session-start carries an "already learned" block');
ok(
  /idempotent/.test(injectedLearned) && /cache penetration/.test(injectedLearned),
  'logged terms show up in the learned block'
);
ok(/3 terms already learned\./.test(injectedLearned), 'session-start header notes the learned count');

// 10. /vocab know and /vocab forget
const know1 = runReport(['know', 'mutex, back-pressure']);
ok(/Added to the known list/.test(know1) && /mutex/.test(know1), '/vocab know adds terms');
ok(fs.existsSync(path.join(tmp, '.vibe-vocab-known')), '/vocab know writes .vibe-vocab-known');
const knownBody = fs.readFileSync(path.join(tmp, '.vibe-vocab-known'), 'utf8');
ok(/mutex/.test(knownBody) && /back-pressure/.test(knownBody), 'both terms land in the file');

ok(/Nothing new/.test(runReport(['know', 'mutex'])), '/vocab know dedupes case-insensitively');
ok(/idempotent/.test(runReport(['know', 'backend'])), '/vocab know <pack> expands the word pack');

const injectedKnown = runStart();
ok(/## Already learned[\s\S]*mutex/.test(injectedKnown), 'user-marked terms reach the session-start block');

const forget1 = runReport(['forget', 'mutex']);
ok(/Removed from the known list/.test(forget1) && /mutex/.test(forget1), '/vocab forget removes a term');
ok(!/\bmutex\b/.test(fs.readFileSync(path.join(tmp, '.vibe-vocab-known'), 'utf8')), 'mutex is gone from the file');
ok(/Marked known\s+: \d+ term/.test(runReport([])), 'summary reports the known-term count');

runReport(['forget', 'all']);
ok(!fs.existsSync(path.join(tmp, '.vibe-vocab-known')), '/vocab forget all clears the list');

// 11. /vocab export -> vocab-anki.csv
const exp = runReport(['export']);
ok(/Exported 3 term\(s\)/.test(exp), '/vocab export reports the row count');
const csvPath = path.join(tmp, 'vocab-anki.csv');
ok(fs.existsSync(csvPath), 'vocab-anki.csv is written');
const csv = fs.readFileSync(csvPath, 'utf8');
ok(/^Term,Gloss,Context,Date\r\n/.test(csv), 'csv starts with the header row');
ok(csv.trim().split(/\r\n/).length === 4, 'csv is header + 3 data rows');
ok(/idempotent/.test(csv) && /幂等/.test(csv), 'csv carries the term and its gloss');

// 12. /vocab level: default, set, session-start override, aliases, reset
const { readLevel } = require(path.join(root, 'lib/vocab-store.js'));
ok(readLevel(tmp) === 'mid', 'readLevel defaults to mid');
ok(!/## Vocabulary level:/.test(runStart()), 'no level override block at the default');

const lvSet = runReport(['level', 'advanced']);
ok(fs.readFileSync(path.join(tmp, '.vibe-vocab-level'), 'utf8').trim() === 'advanced', '/vocab level advanced writes the flag');
ok(/level set to advanced/.test(lvSet), 'level report confirms advanced');
ok(readLevel(tmp) === 'advanced', 'readLevel picks up advanced');

const injectedAdv = runStart();
ok(/## Vocabulary level: advanced/.test(injectedAdv), 'session-start injects the advanced override');
ok(/Raise the bar/.test(injectedAdv), 'advanced override tells the model to raise the bar');
ok(/Vocabulary level: advanced\./.test(injectedAdv), 'session-start header notes the level');

runReport(['level', 'senior']); // alias -> advanced
ok(readLevel(tmp) === 'advanced', '"senior" is accepted as an alias for advanced');
runReport(['level', 'novice']); // alias -> beginner
ok(readLevel(tmp) === 'beginner', '"novice" is accepted as an alias for beginner');
ok(/## Vocabulary level: beginner/.test(runStart()), 'session-start injects the beginner override');

ok(/Usage: \/vocab level/.test(runReport(['level', 'wat'])), 'an unknown level is rejected with usage');
ok(readLevel(tmp) === 'beginner', 'a rejected level leaves the previous one intact');

runReport(['level', 'off']);
ok(!fs.existsSync(path.join(tmp, '.vibe-vocab-level')), '/vocab level off removes the flag');
ok(readLevel(tmp) === 'mid' && !/Vocabulary level: (beginner|advanced)/.test(runStart()), 'back to mid once reset');
ok(/Vocabulary level  : mid/.test(runReport([])), 'summary shows the vocabulary level');
runReport(['off']);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll green.');
process.exit(failures ? 1 : 0);
