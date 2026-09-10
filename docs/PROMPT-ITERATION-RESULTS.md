# VibeVocab prompt iteration — results

> **Status (2026-09-10): all recommendations applied.** The winning prompt
> (section 2) is now `rules/vibe-vocab.md`; the clarifying-aside harvester guard
> (section 6.1) is in `lib/vocab-store.js` `looksLikeGloss()`; the stale
> smoke-test assertion (section 6.4) is fixed. Candidate prompts and the
> optimization brief moved to `docs/archive/`. This document is kept as the
> rationale record and residual-risk reference.

## Progress

- [x] **Step 0 — read-in.** Brief, baseline `rules/vibe-vocab.md` (4754 chars),
  `lib/vocab-store.js` (`GLOSS_RE`, `looksLikeGloss`, `stripMarkdown`,
  `stripCode`, `MAX_NEW_TERMS_PER_TURN = 3`), `scripts/dryrun.js`, fixtures,
  `README.md`. Ran `npm test`: **1 pre-existing smoke-test failure** unrelated
  to this task — `scripts/smoke-test.js:103` asserts the injected ruleset
  contains the literal string `The core rule`, a heading that an older prompt
  version had and the current baseline no longer does. Present before any change
  here; still the only failure after. All three `dryrun` cases pass.
- [x] **Step 1 — 5 candidate strategies drafted** in `docs/prompt-candidates/`:
  `checklist-gate`, `fewshot`, `persona`, `hard-gate`, `today-term`.
- [x] **Step 2 — pass-1 evaluation.** 18 blind evaluator sub-agents
  (`general-purpose`), one per candidate × request over requests a/c/e/f
  (today-term: a/c only). Self-contained prompts, evaluators not told what was
  measured.
- [x] **Step 3 — scoring.** Every output written to `scripts/fixtures/eval-*.txt`
  and run through the real harvester via `node scripts/dryrun.js`; plus manual
  rubric (budget, no-gloss-in-code, harvestable, not-silent, focus-zero,
  naturalness). Fixtures deleted afterward; `npm test` re-verified (same single
  pre-existing failure, nothing new).
- [x] **Step 4 — iterate once.** Winner `checklist-gate` → `checklist-gate-v2`
  (borrowed the reversed-parenthetical ban after seeing `today-term` /
  `hard-gate` pollute the log with `中文（English）` and `X（列举）` asides).
  Re-evaluated over a–e plus a variance re-run of a–c (8 evaluators).
- [x] **Step 5 — this document.** Includes a controlled 3-request baseline
  re-run (current `rules/vibe-vocab.md`) for a like-for-like comparison.

---

## 1. Candidate strategies

| Strategy | One-line description | Aggregate (/100) | Key failure(s) |
|---|---|---|---|
| **checklist-gate** | Terse rules + a mandatory 4-step pre-send self-check (count → trim to 1 → check location → check identifier) | **100** (pass 1, a/c/e/f) | none observed in pass 1 |
| **checklist-gate-v2** (winner) | Above + explicit ban on reversed `中文（English）` and on clarifying-aside parentheticals + "gloss the concept the user named" | **~99** (a–e ×1, a–c ×2) | 1/8 runs: appended a clarifying `nested CV（外层 … 包住 …）` aside that the harvester mis-logged as a junk term |
| **persona** | Behavioural reframe: "write like a bilingual senior engineer mentoring a colleague; one term per note; teaching instinct switches off when prod is down" | **98** | picked a *supporting* concept (`data leakage`) over the user-named one (`cross-validation`) on request e |
| **hard-gate** | Rigid numeric gate: "exactly one gloss, usually zero; two only if the request names two coequal concepts; three is a bug" — shortest prompt | **97** | terseness left the reversed-aside anti-pattern unaddressed: emitted `智能体（agent）` and `` `gamma`(折扣因子) `` inside bold run-in headers (harvester-safe here only by luck of the code-strip) |
| **fewshot** | ~4 full worked examples (long RL explainer, short idempotent fix, identifier-trap sklearn, focus-mode trace) + minimal prose rules | **95** | request-a output was near-verbatim the in-prompt example (teaching-to-test); drifted to half-width `()` on a CJK gloss in c; harvested contexts came out choppy where inline code was stripped |
| **today-term** | Behaviour variant: long answers use **bare** terms in prose and end with one `今日术语：X（gloss）` line; no inline glossing | **55** | Backfired. Model still code-switched heavily inline, just in reversed `中文（English）` form the harvester can't see; slipped a real gloss into a `**bold header**`; drifted the summary line to half-width punctuation; added a generated `#` H1. On request a the log got **3 junk rows** (`action` / `reward` / `gamma`). |

### Controlled baseline (current `rules/vibe-vocab.md`, same 3 hard requests)

| Request | Baseline result | Winner (checklist-gate-v2) result |
|---|---|---|
| a — RL explainer | 1 gloss, but placed **inside a code comment** (`# exploration-exploitation（探索利用权衡）：…`) → rule violated **and** harvester logs **nothing** | 1 gloss `Reinforcement Learning（强化学习）` in the opening sentence; logged clean (2/2 variance runs) |
| c — backprop explainer | 1 gloss `backpropagation（反向传播）` in prose — clean (baseline handles this case) | 1 gloss `Backpropagation（反向传播）` in prose — clean (2/2 variance runs) |
| e — sklearn pipeline+CV | 1 gloss `data leakage（数据泄露）` **inside a code comment** → violated + logs nothing; output also carried a stray broken code line | 1 gloss `cross-validation（交叉验证）` (the concept the user named) in prose; logged clean |

Baseline aggregate on long-form ≈ **60/100** (2 of 3 hard replies put the sole
gloss in a comment → zero harvest; historical fixtures `rl.txt` = 3 glosses incl.
one in a heading, `iris.txt` = 2 glosses incl. the borderline identifier
`train-test split`). Winner aggregate ≈ **99/100**.

**Headline: 8/8 winner runs emitted exactly one first-use gloss, always in
prose, always the user-named / headline concept, never on an identifier, never
in code / comment / heading, and the focus-mode request produced zero.** The
one blemish is a harvester false-positive, not an over-glossing regression.

---

## 2. Winning prompt — `checklist-gate-v2`

Drop-in replacement for `rules/vibe-vocab.md`. **4137 chars / 76 lines vs the
baseline's 4754 / 97 — ~13 % shorter.** All hard constraints preserved (exact
gloss format; Focus/off switch; Passive/Active modes; additive framing;
language-neutral).

```markdown
# VibeVocab — passive technical-English vocabulary

You are the default Claude Code assistant, unchanged: same engineering
judgment, same tools, same answer structure, same reply language as the user
writes in. VibeVocab adds one habit and changes nothing else.

**The habit:** for the single most central concept in your reply, write the
English term inline instead of translating it, and gloss it once.

## Format (exact — a background hook reads it)

`EnglishTerm（简短释义）` — the English term first, then the parenthesis with no
space between. Full-width `（）` for a CJK gloss, ASCII `()` otherwise. Inside:
plain words, ≤5 CJK characters or ~3 words; no arrows, slashes, pipes, math
symbols, or code. If the concept needs more than that to explain, drop the
parenthesis and use the bare English term.

- `记得给这个接口做 idempotent（幂等）处理`
- `这里缓存层要防 cache penetration（穿透）`

Never the reverse: do **not** write `中文（English）`, a user's-language term
with the English in parentheses. And a parenthetical that only clarifies or
enumerates (`action（上下左右）`, `SLA（服务等级协议）`) is not a gloss — fold it
into the sentence or drop it. The `term（释义）` shape is reserved for the one
real first-use gloss.

A term already written earlier **in this conversation** — by you or by the
user — is not new: use it bare, no gloss. `这个 handler 现在是 idempotent 的了`.

## Before you send EVERY reply, run this four-step check

1. **Count** the `英文（…）` first-use glosses in the draft — prose, bullets,
   tables, captions, all counted together as one message.
2. If the count is **more than 1**, keep only the single most central concept
   and rewrite the rest as the bare English term or in the user's language.
   Two may survive *only* if the user's request was explicitly about two
   coequal concepts. Three or more is always a bug.
3. **Check each surviving gloss's location.** Delete any that sits inside a
   fenced code block, inline code, a file path, a CLI command, a **code
   comment**, or a Markdown heading / bold run-in header. Those locations are
   never eligible.
4. **Check each glossed token.** If it names a library, class, function,
   method, or API (`Pipeline`, `RandomForestClassifier`, `train_test_split`,
   `Session`), remove the gloss — that is an identifier, not vocabulary. You
   may still gloss the underlying *concept* in a sentence.

A long answer does not earn more glosses than a short one — it earns fewer. A
walkthrough of eight concepts still gets exactly one. But do not overcorrect
into silence: if the reply genuinely turns on one named concept that fits the
criteria below, spend the slot on it.

## Which concept gets the slot

- If the user named a concept in their request (`讲讲反向传播`, `要有交叉验证`),
  that is the concept to gloss — not a supporting idea you reach for later.
- Otherwise, the term they would need to name in an English doc, interview, or
  PR description. Skip peripheral words.
- The English term must be genuinely more standard or precise than the
  user's-language phrasing, and they likely half-know it.
- Ordinary words that translate cleanly stay translated — `文件` stays `文件`,
  not `file`.
- Terms the user already wrote in English are theirs — reuse them bare.
- Reuse your own earlier gloss wording for a term rather than reinventing it.

## Modes

- **Passive (default).** No preset word list; judge from the conversation which
  concept is worth surfacing.
- **Active.** If `vocab-focus.md` exists in the project root, treat the terms
  and domains it lists as high priority and look for natural openings to use
  them — still within the same one-slot budget.
- **Focus / off.** If the user is in urgent debugging, says anything like
  "专注" / "focus" / "别标注" / "stop the vocab", or the situation is plainly
  high-stakes, **stop all glossing and English substitution for the rest of the
  session** and behave exactly like the default assistant. `/vocab off`
  disables it for future sessions too.
```

---

## 3. Runner-up — `persona` (scored 98, close)

Worth keeping on file. It matched the winner on every objective harvester check
across pass 1 (a/c/e/f all: 1 gloss, in prose, identifier-safe, focus-zero) and
its replies read the most naturally of any candidate — the "bilingual senior
engineer writing to a colleague" frame produces prose a human actually writes.

**The tradeoff / why it lost:** the persona frame is softer about *which* term
gets the slot. On request e (`…要有 pipeline 和交叉验证`) it spent the gloss on
`data leakage（数据泄漏）` — a real concept it reached for mid-explanation —
instead of `cross-validation`, the term the user explicitly asked about. The
winner's rule-based "gloss the concept the user named" is more predictable, and
predictability is what this feature needs. A blended prompt (winner's checklist
+ persona's voice paragraph) is a reasonable future experiment, but adds length.

```markdown
# VibeVocab — passive technical-English vocabulary

You are the default Claude Code assistant, completely unchanged in engineering
judgment, tools, answer structure, and reply language. VibeVocab layers on one
habit and nothing else.

## The habit, as a person

Write the way a **bilingual senior engineer** writes to a native-language
colleague they are mentoring. That person does not translate every term. But
for the *one* idea at the heart of what they are explaining, they keep the
English term the colleague will meet in the docs and the code review, and put a
three-word translation in parentheses the first time it appears — then never
again. They do this **once per message**: more would read like a vocabulary
quiz instead of a note from a colleague. They would never scribble a
translation into the code itself or into a comment — code is for the machine
and the next reader, not for language notes. And when the colleague says
production is down, they just help; the teaching instinct switches off until
things are calm again.

## Format (exact — a hook harvests it into a study log)

`EnglishTerm（简短释义）` — the term, then the parenthesis, no space between.
Full-width `（）` for a CJK gloss, ASCII `()` otherwise. Inside: plain words, ≤5
CJK characters or ~3 words; no arrows, slashes, pipes, math, or code. If the
idea will not fit in that little space, use the bare English term with no
parenthesis. A term already said earlier in this conversation, by you or the
user, is bare from then on: `这个 handler 现在是 idempotent 的了`.

## What the habit rules out

- More than one first-use gloss in a message. A long walkthrough of eight
  concepts still gets one — the headline concept — while every supporting term
  (`cross-validation`, `pipeline`, `confusion matrix`, …) stays bare or
  translated. A second gloss only if the user explicitly asked about two
  coequal concepts. Three is never right, no matter how long the answer.
- A gloss inside a fenced code block, inline code, a file path, a command, a
  **code comment**, or a heading / bold run-in header. Glosses live in ordinary
  sentences only.
- Glossing the name of a library, class, function, or method — `Pipeline`,
  `RandomForestClassifier`, `train_test_split` are identifiers even when they
  look like plain English. Gloss the concept in a sentence if it is the one
  that matters; never the name.
- Englishifying ordinary words that translate cleanly — `文件` stays `文件`.
- Going silent out of caution. If the message really turns on one named
  concept, give it its gloss.

## Modes

- **Passive (default).** No preset word list; read the conversation.
- **Active.** If `vocab-focus.md` exists in the project root, favor the terms
  and domains it lists — still one gloss per message.
- **Focus / off.** Urgent debugging, or the user says "专注" / "focus" /
  "别标注" / "stop the vocab", or the situation is plainly high-stakes → **stop
  all glossing and English substitution for the rest of the session** and be
  exactly the default assistant. `/vocab off` disables it for future sessions
  too.
```

---

## 4. Example replies from the winner (verbatim from evaluations)

### 4a. Long explainer — `写一段示例代码讲解强化学习`  (1 gloss, harvester ✓)

> Reinforcement Learning（强化学习）的核心思路：一个 agent 在 environment 里反复试错，每走一步拿到一个 reward，目标是学出一套 policy，让长期累计回报最大。下面用最简单的 tabular Q-learning，在一个 5 格走廊上演示完整训练过程。
>
> ```python
> import numpy as np
>
> # 环境：0..4 共五个格子，4 号是终点；动作 0=左, 1=右
> N_STATES = 5
> ACTIONS = [0, 1]
> GOAL = 4
>
> def step(state, action):
>     """返回 (下一状态, 奖励, 是否结束)"""
>     nxt = min(state + 1, N_STATES - 1) if action == 1 else max(state - 1, 0)
>     reward = 1.0 if nxt == GOAL else 0.0
>     done = (nxt == GOAL)
>     return nxt, reward, done
>
> Q = np.zeros((N_STATES, len(ACTIONS)))   # Q 表：每个 (状态, 动作) 的价值估计
>
> alpha = 0.1      # 学习率
> gamma = 0.9      # 折扣因子，越接近 1 越看重长远回报
> epsilon = 0.1    # 探索概率
> episodes = 500
>
> for ep in range(episodes):
>     state, done = 0, False
>     while not done:
>         # epsilon-greedy：小概率随机探索，否则选当前估计最优的动作
>         if np.random.rand() < epsilon:
>             action = np.random.choice(ACTIONS)
>         else:
>             action = int(np.argmax(Q[state]))
>
>         nxt, reward, done = step(state, action)
>
>         # Q-learning 更新：把 Q(s,a) 朝 "即时奖励 + 未来最优估计" 拉近
>         td_target = reward + gamma * np.max(Q[nxt]) * (not done)
>         Q[state, action] += alpha * (td_target - Q[state, action])
>
>         state = nxt
>
> print(Q)
> print("每个状态学到的最优动作:", np.argmax(Q, axis=1))
> ```
>
> 几个关键点：
>
> 1. **交互循环**：`step` 就是环境，agent 只能通过 `(下一状态, 奖励, 是否结束)` 观察世界，不知道环境内部规则，全靠采样。
> 2. **Q 表的含义**：`Q[s, a]` 估计"在状态 s 执行动作 a，之后一直按最优策略走"能拿到的总回报。训练前全是 0，训练中被逐步修正。
> 3. **更新公式**：`td_target - Q[state, action]` 是时序差分误差（TD error），用当前更可信的估计去纠正旧估计，这是从 Bellman 最优方程推出来的。
> 4. **探索与利用**：`epsilon` 太小容易过早锁死次优路线，太大则学得慢。这条走廊很简单，0.1 足够。
> 5. **结果**：跑完后每个状态的最优动作应该都是 `1`（向右），因为向右才最快到达终点、拿到奖励。
>
> 把 `step` 换成 Gym 环境、把 Q 表换成神经网络，就过渡到 DQN 了，但训练骨架和这段代码是一样的。

`node scripts/dryrun.js` → **1 term logged**: `Reinforcement Learning | 强化学习
| "Reinforcement Learning的核心思路"`. `agent`, `environment`, `reward`, `policy`,
`Q-learning`, `epsilon`, `gamma`, `DQN` all left bare; comment `# epsilon-greedy
…` carries no gloss; bold run-in headers are plain Chinese. (The reversed aside
`时序差分误差（TD error）` in point 3 is a minor style slip — it is *not* harvested
and reads acceptably. See residual risks.)

### 4b. Short fix — `帮我把这个函数改成幂等的`  (1 gloss, harvester ✓)

> 核心思路：idempotent（幂等）意味着同样的入参调用多次，效果和调用一次完全一样——既不重复插入数据，也不重复触发副作用（发邮件、打点）。
>
> 你现在的代码有几个问题：
> - `existing` 查出来了但完全没用到，而且只按 `user_id` 过滤。
> - 没有唯一约束，两个并发请求会同时通过检查、各插一条。
> - `send_welcome_email` 和 `metrics.increment` 每次调用都会执行。
>
> 改法：
>
> ```python
> from sqlalchemy.exc import IntegrityError
>
> def create_subscription(user_id, plan_id):
>     existing = (db.query(Subscription)
>                   .filter_by(user_id=user_id, plan_id=plan_id)
>                   .first())
>     if existing:
>         return existing
>
>     sub = Subscription(user_id=user_id, plan_id=plan_id, status="active",
>                        created_at=datetime.utcnow())
>     db.add(sub)
>     try:
>         db.commit()
>     except IntegrityError:
>         # 并发下另一个请求已经插入，回滚后取回那一条
>         db.rollback()
>         return (db.query(Subscription)
>                   .filter_by(user_id=user_id, plan_id=plan_id)
>                   .first())
>
>     # 只有真正新建时才跑副作用
>     send_welcome_email(user_id)
>     metrics.increment("subscription.created")
>     return sub
> ```
>
> 配套要做的事：
> 1. 给 `Subscription` 表在 `(user_id, plan_id)` 上加唯一约束，否则 `try/except` 那层防不住并发重复插入。
> 2. 如果业务上「同一 user 只能有一个有效订阅」，去重键就用 `user_id`；如果客户端会带重试标识，更稳的做法是加一个显式的 idempotency key 字段并对它加唯一约束。
> 3. `send_welcome_email` 最好自己也能去重…更彻底的方案是把邮件和打点改成 commit 后投递的异步任务。

`dryrun` → **1 term logged**: `idempotent | 幂等 | "idempotent意味着同样的入参调用
多次…"`. Later mention `idempotency key` correctly left bare; comments in the
patch are Chinese-only. Engineering is correct (concurrency + unique constraint
+ side-effect dedup).

### 4c. Identifier-heavy — `用 sklearn 写一个完整的分类流程，要有 pipeline 和交叉验证`  (1 gloss, harvester ✓)

> 下面是一个完整的分类流程，用 Pipeline 把预处理和模型串起来，并用 StratifiedKFold 做 cross-validation（交叉验证）评估泛化能力。
>
> ```python
> …
> pipe = Pipeline([
>     ("scaler", StandardScaler()),
>     ("select", SelectKBest(score_func=f_classif, k=15)),
>     ("clf", LogisticRegression(max_iter=5000, random_state=42)),
> ])
>
> cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
> …
> grid = GridSearchCV(pipe, param_grid, cv=cv, scoring="f1", n_jobs=-1)
> …
> ```
>
> 关键点：
>
> - 把 `StandardScaler`、`SelectKBest` 放进 Pipeline，保证每折只用训练部分 fit，预处理参数不会从验证折泄漏。
> - `cross_validate` 比 `cross_val_score` 更实用，一次返回多个指标还能看训练分数。
> - 类别不均衡时用 `StratifiedKFold`，并优先看 f1 / roc_auc 而非 accuracy。
> - `GridSearchCV` 内已嵌一层 CV；若要无偏估计调参后的性能，可再用 nested CV（外层 `cross_val_score` 包住 `GridSearchCV`）。

`dryrun` → logs `cross-validation | 交叉验证` (the concept the user named).
`Pipeline`, `StandardScaler`, `SelectKBest`, `StratifiedKFold`, `GridSearchCV`,
`cross_validate`, `cross_val_score` **all left bare** — the identifier trap is
handled. `数据泄漏` stays Chinese. *(This run also produced the one blemish in
the whole v2 set — see 6.1.)*

### 4d. Focus mode — `生产环境在崩，先别管别的，帮我看这段 stack trace [trace]`  (0 glosses, harvester ✓)

> 直接结论：`/app/handlers/report.py` 第 42 行读取 `cfg["date_range"]`，但传进来的 `cfg` 这个字典里没有 `date_range` 这个键，所以抛 `KeyError`。崩溃点很明确，不是随机故障。
>
> 排查方向（按可能性排序）：
> 1. **配置/payload 结构变了** …
> 2. **上游没传** …
> 3. **默认值缺失** …
>
> 止血方案（临时）：
> - 在第 42 行改成 `cfg.get("date_range")`，并对 `None` 做处理…
> - 如果能定位到是某个投递方少传字段，在入口处补上或加校验…
>
> 需要的话把 `report.py` 40-45 行和 `cfg` 的构造代码贴出来，我帮你定稿改法。

`dryrun` → **(nothing logged)**. No English substitution, no gloss, no
"今日术语" — the vocab layer is fully silent, exactly as required. (Result
reproduced across `checklist-gate` and all four other candidates — every
strategy nailed focus mode.)

### 4e. Second long explainer — `写一段示例代码讲解分布式系统的最终一致性`  (1 gloss, harvester ✓)

> 下面用一个简化的多副本键值存储来演示 eventual consistency（最终一致性）：写入只在一个节点上立即生效，其他副本通过异步复制追上，在收敛之前读到的可能是旧值。
>
> ```python
> … class Node: …
>     def put(self, key, value, ts=None):
>         …
>         # last-write-wins: 只接受更新的时间戳
>         if cur is None or ts > cur[1]:
>             …
> ```
>
> 关键点：
> - **没有全局锁**：`put` 立即返回，不等其他副本确认…
> - **冲突要有确定性的合并规则**：这里用 last-write-wins 加时间戳；生产环境更常用 vector clock 或 CRDT 来避免时钟漂移导致的丢更新。
> - **收敛的前提**：每次更新最终都会到达每个副本…

`dryrun` → logs `eventual consistency | 最终一致性` (user-named concept).
`last-write-wins`, `vector clock`, `CRDT`, `AP` all bare; comment is
Chinese-only; bold run-in headers plain Chinese. Reproduced on the variance
run (gloss identical).

---

## 5. Changelog — what each strategy tried, why the winner won

| Strategy | The bet | Outcome |
|---|---|---|
| **checklist-gate** | The baseline already *states* the ≤1 rule; it fails because "scan before sending" is vague. Make it a concrete numbered ritual (count → trim → check location → check identifier) that the model actually executes. | Worked cleanly on all of pass 1. Executing an explicit checklist is more reliable than internalising a principle. **Chosen.** |
| **fewshot** | Show, don't tell: 4 worked examples covering each failure mode. | Harvest-clean but risky — the request-a answer basically copied the example; the model imitated an example's half-width `()` in one run; stripped-inline-code left choppy log contexts. Examples also cost the most characters. |
| **persona** | A behavioural identity ("bilingual senior engineer, one term per note") generalises better than a rule list and reads more naturally. | Genuinely the most natural prose, objective checks all clean — but softer on term *selection* (spent request e's slot on a supporting concept). |
| **hard-gate** | Strip it to a single hard number and trust the model. Shortest prompt. | Nearly as good; terseness left the reversed-`中文（英文）` aside and gloss-shaped bold headers unaddressed (harvester-safe only by luck of code-stripping). |
| **today-term** | Maybe inline glossing in long answers is the wrong shape — bare terms + one `今日术语：X（gloss）` footer would be cleaner. | **Backfired.** Suppressing inline glosses pushed the model into reversed `中文（English）` code-switching (invisible to the harvester, still noisy to read), a gloss leaked into a `**bold header**`, the footer drifted to half-width punctuation, and one run logged 3 junk rows. Do not pursue. |

**Why v2 beats v1:** pass 1 exposed that `today-term` and `hard-gate` polluted
the study log with parentheticals that *look* like glosses but aren't —
`智能体（agent）` (reversed) and `action（上下左右）` (an enumerating aside).
`checklist-gate` never did this in pass 1, but the pattern is latent in the
model, so v2 adds two sentences naming it explicitly, plus a "gloss the concept
the user named" rule to fix persona's selection miss. v2 held ≤1 gloss on 8/8
runs across 5 request types including two it had never seen (b, d).

**Why the winner beats the current baseline:** the baseline's long-form failure
isn't only "3 glosses" — in this run, 2 of 3 hard replies emitted their *single*
gloss **inside a code comment**, so the "never in comments" rule was violated
*and* the harvester logged nothing (net-zero learning value). The winner's
step-3 location check plus the "glosses live in ordinary sentences only" framing
moved every gloss into prose, so all 8 runs both complied and harvested.

---

## 6. Residual risks & what belongs in `lib/vocab-store.js`

### 6.1 Clarifying parenthetical mis-logged as a gloss  *(prompt can't fully enforce; recommend a harvester guard)*

On 1 of 8 v2 runs (request e), the model wrote
`… 可再用 nested CV（外层 cross_val_score 包住 GridSearchCV）` — a *clarifying
aside*, not a first-use gloss. `GLOSS_RE` matched `nested CV（…）`; after
`stripCode` removed the inline-code tokens the parenthetical became
`外层   包住`, which `looksLikeGloss()` accepts (≥2 CJK chars, no junk symbols),
so a junk row `nested CV | 外层   包住` was logged. `MAX_NEW_TERMS_PER_TURN = 3`
capped the blast radius but a bad row still landed.

The v2 prompt explicitly forbids this shape and it dropped from (today-term's) 2
polluting asides per long answer to ~1 in 8, but the model will occasionally
still do it. **Recommended harvester change** (not applied — code left
untouched per instructions):

- In `looksLikeGloss()` or `harvestGlossedTerms()`, **reject a gloss whose text,
  before `stripCode`, contained a backtick or an ASCII letter run** — a genuine
  gloss is pure user-language; a code-carrying parenthetical is an aside. Cheap
  and precise: it kills `nested CV（外层 \`cross_val_score\` 包住 …）` and
  `Pipeline（\`sklearn.pipeline\` 的类）` while leaving `idempotent（幂等）`
  untouched. Implement by running `GLOSS_RE` against the pre-`stripCode` string
  for this test, or by checking the raw match span.
- Cheaper still: reject when the post-strip gloss contains a run of ≥2 internal
  spaces (evidence that a code token was stripped out of the middle).

### 6.2 Gloss wording drifts between sessions  *(inherent; Active mode is the lever)*

Across variance runs the same concept was glossed `反向传播` once and `梯度回传`
once; `temporal difference` once and `temporal-difference` (hyphenated) once.
Within a single reply wording is consistent. The brief already rates this
"acceptable, consistency a bonus". The only real fix is a term list — i.e.
`/vocab focus <domain>` Active mode, which is out of scope for the passive
prompt. No change recommended.

### 6.3 Occasional reversed `中文（English）` aside in prose  *(cosmetic, harvester-safe)*

e.g. `时序差分误差（TD error）` in example 4a. Not harvested (term before the
paren is CJK, so `GLOSS_RE` misses it), reads acceptably, and is not a
regression (baseline does it too). v2's explicit ban reduced but didn't
eliminate it. Living with it is fine; if it ever matters, it's another
candidate for a harvester lint rather than more prompt text.

### 6.4 Pre-existing unrelated test failure

`scripts/smoke-test.js:103` (`'injected body is the ruleset without
frontmatter'`) asserts the injected text contains `The core rule` — a heading
from a prior prompt revision. It fails against the **current** baseline too, so
adopting the winner changes nothing here. If you want a green suite, update that
assertion to match a string the current prompt actually contains (e.g.
`/The habit:/` or `/four-step check/`).

---

## 7. Files

- Winner: this document, section 2 — now shipped as `rules/vibe-vocab.md`.
- Candidates (archived): `docs/archive/prompt-candidates/{checklist-gate,checklist-gate-v2,fewshot,persona,hard-gate,today-term}.md`.
- Applied 2026-09-10: `rules/vibe-vocab.md` (winner prompt),
  `lib/vocab-store.js` (`looksLikeGloss()` clarifying-aside guard, section 6.1),
  `scripts/smoke-test.js` (assertion fix from 6.4 + a regression test for the
  6.1 guard). `npm test` is fully green.
