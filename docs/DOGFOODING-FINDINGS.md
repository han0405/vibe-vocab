# Dogfooding findings

Issues found by actually using VibeVocab, kept here until they're fixed or
consciously accepted. Newest session first. See `DOGFOODING.md` for the method.

---

## Session 2026-09-10 (b) — second run on v0.3.0, but VibeVocab was OFF

**Context.** Plugin updated to `0.3.0`. Same two prompts as session (a): a SFT
walkthrough then an RL follow-up, in Chinese, started from `D:\project`. After
the run, `/vocab` reported **`Enabled: OFF`**, `mid`, rate 1, Passive — no
`.vibe-vocab-on` in the dir and no global `.vibe-vocab-always`. So
`session-start.js` injected **nothing**: the two replies were plain Claude Code
with no VibeVocab rules. The v0.3.0 prompt patch could not be evaluated from
this run.

`vocab-log.md` in `D:\project` nonetheless gained 2 rows
(`Reward Model | 经典 RLHF`, `Reward hacking | 奖励攻击`) — which is Finding 5.

### Finding 5 — the Stop hook harvests even when VibeVocab is disabled — FIXED 2026-09-10

`scripts/log-vocab.js` never checked the enable flag — only `session-start.js`
did. So in any project, enabled or not, each assistant turn was scanned and any
naturally-occurring `英文（中文）` first-mention (very common in Chinese ML
prose) was written to `vocab-log.md`. A user who never ran `/vocab on` still got
a growing log, populated by un-ruled, un-budgeted asides — including
false-positive-prone shapes the injected rules would have suppressed.

→ **Fixed.** `lib/vocab-store.js` gains `isEnabled(cwd)` (global
`.vibe-vocab-always` OR project `.vibe-vocab-on`, the same test
`session-start.js` uses). `log-vocab.js` calls it first and `process.exit(0)`s
when off. `smoke-test.js` section 16 covers both directions;
`smoke-test.js`/`dryrun.js` now set `.vibe-vocab-on` in their temp dirs since
the harvest path is gated. `contextIsThin` / harvest behaviour unchanged.

### Finding 6 — `Reward Model（经典 RLHF）` false positive — NOTED, minor

One of the two rows logged this run: `经典 RLHF` ("classic RLHF") is the
**column label** of the PPO / DPO / GRPO comparison table
(`│ PPO + Reward Model(经典 RLHF) │ DPO(直接偏好优化) │ …`), not a gloss of
"Reward Model". `DPO` / `GRPO` in the same header row were correctly skipped by
the Finding 1 bare-acronym rule (`^[A-Z][A-Z0-9]{1,5}$`), but `Reward Model` is
two words with lowercase, so it slipped. Box-drawing verticals bound the
*context* (Finding 1) but don't make the line ineligible — and `smoke-test.js`
13b deliberately asserts a gloss inside a box-drawing row still harvests, so
blanket-rejecting those lines would reverse a prior decision.

Low priority now that Finding 5 stops the log filling while disabled, and an
injected `mid` ruleset pushes the model away from `term(label)` comparison
tables toward prose. Revisit only if it recurs with VibeVocab actually ON.
Candidate: reject a gloss whose text is `<≤2 CJK chars> <all-caps run ≥3>`
(label shape) when the term is multi-word capitalized.

---

## Session 2026-09-10 (c) — v0.3.0, VibeVocab ON, `mid` — Finding 2 patch looks good

**Context.** `D:\Project\vibe-vocab`, `/vocab on` → `Enabled: ON (this
project)`, `mid`, rate 1. One prompt — "写一段 sft 微调的示例代码和讲解" — but
the reply ran long: SFT walkthrough → RL section covering classic RLHF / DPO /
PPO / GRPO → DPO variants (ORPO, IPO). ~6 concepts, several bold run-in header
list items (`**学习率和 epoch 要保守。**`, `**显存不够就上 LoRA。**`, …).

**Result: exactly one gloss — `reward model（奖励模型）`, in a prose sentence,
first use, then bare on all four later mentions.** No `- **term（释义）** —`
glossary. The bold run-in header list carried zero glosses (`epoch`, `batch`,
`LoRA`, `gradient_accumulation_steps` all bare). No box-drawing comparison
table this run — the PPO/DPO/GRPO contrast was a plain bullet list. No reversed
`中文（English）` aside spotted.

So the v0.3.0 "glossary-bullet trap" paragraph (plus Finding 3 making the
ruleset actually reach the session) did what session (a) needed: a long
multi-concept, list-heavy reply resolved to one prose gloss. `SFT` itself
wasn't glossed — correct: it's a bare acronym and the user wrote "sft 微调" in
the prompt, so 微调 is theirs. Spending the slot on `reward model` (the most
central *new* concept, from the RL half) is a defensible pick.

**Finding 2 → considered addressed.** Keep watching over more real runs; if an
over-glossed key-points list reappears, reopen with the sample.

**Minor, this run:** `/vocab` still listed two junk rows —
`Finding 5 | 已修`, `Refresh | 或卸载重装` — harvested from an *earlier turn in
that same session*, where the assistant was discussing these findings and wrote
e.g. "Finding 5（已修）". Dogfooding VibeVocab inside the vibe-vocab repo logs
the project's own meta-jargon. Not worth a code change; either `/vocab off`
while working on this repo, or `/vocab forget all` + delete the stray rows.
(Finding 5's fix is in the working tree, not yet in the installed plugin, so
that gate wasn't active for this session anyway.)

---

## Session 2026-09-10 — first real run on v0.2.0

**Context.** Plugin reinstalled at `0.2.0` (commit `bc295ab`). Two long
technical replies in Chinese: "写一段 SFT 微调的示例代码和讲解" then the RL
follow-up. `claude` was started from `D:\Project` (the parent of all repos), so
`vocab-log.md` and the `.vibe-vocab-*` flags landed there, not in a project.
Mid-session the user set `/vocab level advanced`, `/vocab rate 3`,
`/vocab know idempotent, mutex`, `/vocab export`.

Install, command plumbing, and the `Stop` hook all worked (log grew 11 → 18
rows). The problems were in *what* got harvested and in *when* settings take
effect.

### Finding 1 — harvester false positives — FIXED 2026-09-10

Rows that should never have been logged:

| term | gloss | where it came from |
|---|---|---|
| `DPO` | 离线 | a box-drawing comparison table — `│ DPO（离线） │ PPO / GRPO（在线） │`; `（离线）`/`（在线）` are the *column labels* "offline"/"online" |
| `GRPO` | 在线 | same table |
| `chat template` | 对话模板 | `- **chat template（对话模板）** — apply_chat_template …` (bold run-in header) |
| `loss masking` | 只训练回答 | `1. **loss masking（只训练回答）**：…` |
| `LoRA` | 低秩适配 | `**LoRA（低秩适配）** — …` |
| `reward model` | 打分模型 | `**reward model（打分模型）** — …` |
| `KL penalty` | 防止跑偏 | `**KL penalty（防止跑偏）**：…` |

Three root causes, all in `lib/vocab-store.js`:

1. **Box-drawing table cells weren't a context boundary.** `CTX_MARKS` had the
   Markdown pipe `|` but not `│ ║ ┃` (U+2502 etc.), so a gloss in a `┌─┬─┐`
   table pulled the neighbouring cell into its context.
   → added `│ ║ ┃` to `CTX_MARKS`.
2. **A bare all-caps acronym term wasn't rejected.** `DPO（离线）`,
   `SLA（服务等级协议）` — the rules already class the parenthetical after an
   acronym as an expansion / clarification, "fold it into the sentence or drop
   it", not a first-use vocab gloss.
   → `harvestGlossedTerms` now skips a term matching `^[A-Z][A-Z0-9]{1,5}$`
   (`Reinforcement Learning`, `LoRA`, `data leakage` are unaffected — not bare
   acronyms).
3. **Bold run-in headers weren't stripped.** The rules make a gloss in a
   `**term（gloss）** — explanation` bullet lead-in (or a bold-only line)
   ineligible, but `stripMarkdown` only removed the `**` and then harvested the
   term anyway.
   → new `stripBoldRunIn()` runs before `stripMarkdown` and drops the gloss
   parenthetical on run-in-header lines.

Covered by `smoke-test.js` section 13. `LoRA` and `reward model` are real terms
with fine glosses — losing them here is the right call because they were part of
a 4-plus-gloss glossary dump in one reply (see Finding 2); a normal first-use
mention in prose still logs them.

### Finding 2 — prompt compliance: glossary-style layout defeats the one-gloss rule — ADDRESSED 2026-09-10 (patched + re-checked ON at `mid`, see session (c))

The "关键点讲解" section of the SFT reply was a bulleted glossary:

```
- **chat template（对话模板）** — …
- **loss masking（只训练回答）** — …
- **LoRA（低秩适配）** — …
- **reward model（打分模型）** — …
```

That's 4+ first-use glosses in one reply, in bold run-in headers, with
`/vocab rate 3` and `/vocab level advanced` both set. The rules say exactly one
gloss per reply, never in a bold run-in header, and `advanced` says "most
replies gloss nothing". None of that held.

Finding 1 stops these from reaching the log, but the underlying behaviour — the
model reaching for a term-by-term glossary whenever it explains several
concepts — is a `rules/vibe-vocab.md` / level-override wording problem, not a
harvester one. Also seen: `session（会话）` was glossed in an earlier session,
an ordinary word the rules say should stay translated.

**Next:** collect 5–10 more real over-glossing samples (paste the offending
sentence) before touching the prompt, per `DOGFOODING.md` section E. Candidate
fixes: strengthen the "walkthrough of eight concepts still gets exactly one"
line; make the `advanced` override explicitly name the glossary-bullet
anti-pattern.

**Patched 2026-09-10 (ahead of the 5–10-sample bar — see caveat).** Both
candidate fixes applied, because Finding 3 was the bigger reason `advanced` /
`rate 3` didn't hold and it is now fixed, so the prompt change can actually be
evaluated on the next run:

- `rules/vibe-vocab.md` — step 2 now points at a new **"The glossary-bullet
  trap"** paragraph under the checklist. It names the trigger (a "关键点 / 要点
  / key points" list, a numbered walkthrough, a `- **term** — 解释` breakdown),
  says the whole list gets **zero** glosses of its own, and says a draft whose
  only glosses are in a `**bold（释义）** —` list has already failed — cut them
  all and re-introduce the one central term in a sentence if it belongs.
- `rules/vibe-vocab.md` — the "ordinary words stay translated" bullet now lists
  `会话`/`session` and `目录`/`directory` alongside `文件`/`file`, and adds that
  the English has to be the term they'd reach for in a doc/interview, not the
  dictionary equivalent (covers the `session（会话）` slip).
- `scripts/session-start.js` — the `advanced` override block now tells the model
  a key-points list "almost always warrants **no** gloss at all" at that level;
  the `rate > 1` override block now says the higher budget does **not** license
  a term-by-term glossary.

**Caveat:** this is a prompt change with no offline test (the harvester already
drops these rows per Finding 1). It needs a real dogfood run — ideally the same
SFT / RL explainer prompts — to confirm the model stops *reaching for* the
glossary layout, not just that the rows don't get logged. Still worth collecting
more over-glossing samples; revert or iterate the wording if the next run shows
no change.

### Finding 3 — settings changed mid-session don't re-inject — FIXED 2026-09-10

`/vocab level` / `/vocab rate` / `/vocab know` write their flag files, but the
`SessionStart` hook only runs at session start, so the override blocks they
produce were **not** in context for the rest of that session. The model
"applied" them only by reading `report.js` stdout and using its judgment — which
is why Finding 2 slipped through even with `advanced` set.

`report.js` already prints "Applies from the next session. To apply it now, run
`/vocab on` again" — but `commands/vocab.md`'s `on` step only tells the model to
re-read `rules/vibe-vocab.md`; it doesn't mention re-applying level / rate /
known. So even the documented "apply now" path is incomplete.

**Options:**
- Cheapest: make `commands/vocab.md`'s `rate` / `level` / `know` steps fully
  self-contained (they mostly are now) and add a line to the `on` step to also
  honour the three flags. Document that a **new session** is the reliable path.
- Better but more work: have the `on` command re-emit the override blocks (run
  `session-start.js` logic on demand), or add a `UserPromptSubmit` hook that
  keeps the blocks fresh.

**Fixed 2026-09-10 — took the "re-emit the override blocks" option, no new
hook.**

- `scripts/session-start.js` — `cwd` now also falls back to `process.argv[2]`,
  so the script can be run directly with the project dir as an argument (it was
  stdin/env only). Behaviour under the real `SessionStart` payload is unchanged.
- `commands/vocab.md` — the per-subcommand Step 2 blocks are replaced by one:
  after `report.js`, for `on` / `rate` / `level` / `know` / `forget` / `focus`
  the command runs
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/session-start.js" "${CLAUDE_PROJECT_DIR}"`
  and treats its stdout as the authoritative ruleset for the rest of the
  session. That stdout is the *same* text — full rules + the current rate /
  level / learned-terms override blocks — a fresh session would inject, so a
  mid-session `/vocab rate 3` now really does put the rate-3 block in context
  instead of relying on the model reading `report.js` prose and using judgment.
- `smoke-test.js` section 15 covers the arg path and that the re-inject carries
  the current override block.

A brand-new session still does all this via the hook; the re-inject just removes
the restart requirement. `commands/vocab.md` and both READMEs say so.

### Finding 4 — smaller stuff — FIXED 2026-09-10

- **Degenerate contexts.** `| idempotent | 幂等 | 关于 idempotent |`,
  `| backoff | 退避 | 关于 backoff |` — the context is just "关于 <term>".
  `dryrun.js` flags a context under 4 chars; "关于 idempotent" clears that but
  is still useless. Consider rejecting a context that is only the term plus one
  stop-word, or widening the window past a leading `关于` / `about`.
  → **Fixed** in `lib/vocab-store.js`: new `contextIsThin(ctx, term)` — strips a
  leading filler phrase (`关于` / `讲讲` / `什么是` / `about` / …) and the
  headword, and if <2 letters/digits remain the context is thin. When the
  harvested window is thin, `harvestGlossedTerms` steps past the delimiter run
  the model put after the gloss (`：` `。` `. ` a pipe) and takes the next
  clause instead. The term is still logged either way. `smoke-test.js` section
  14 covers it.
- **Flag & log location.** Running `claude` from a directory that isn't a
  project root (here `D:\Project`) drops `vocab-log.md` and the `.vibe-vocab-*`
  flags there, and they don't inherit into subdirectories. Not a bug, but worth
  a note in the README's "Enabling it" section, and the stray
  `D:\Project\vocab-log.md` / `.vibe-vocab-*` from this session can be moved or
  deleted.
  → **Fixed:** note added to both READMEs' "Enabling it" / "启用" sections
  ("start `claude` at the project root, not a directory above it"). The stray
  `D:\Project\vocab-log.md` / `.vibe-vocab-*` are already gone.
