# Dogfooding findings

Issues found by actually using VibeVocab, kept here until they're fixed or
consciously accepted. Newest session first. See `DOGFOODING.md` for the method.

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

### Finding 2 — prompt compliance: glossary-style layout defeats the one-gloss rule — OPEN

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

### Finding 3 — settings changed mid-session don't re-inject — OPEN

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

### Finding 4 — smaller stuff — OPEN

- **Degenerate contexts.** `| idempotent | 幂等 | 关于 idempotent |`,
  `| backoff | 退避 | 关于 backoff |` — the context is just "关于 <term>".
  `dryrun.js` flags a context under 4 chars; "关于 idempotent" clears that but
  is still useless. Consider rejecting a context that is only the term plus one
  stop-word, or widening the window past a leading `关于` / `about`.
- **Flag & log location.** Running `claude` from a directory that isn't a
  project root (here `D:\Project`) drops `vocab-log.md` and the `.vibe-vocab-*`
  flags there, and they don't inherit into subdirectories. Not a bug, but worth
  a note in the README's "Enabling it" section, and the stray
  `D:\Project\vocab-log.md` / `.vibe-vocab-*` from this session can be moved or
  deleted.
