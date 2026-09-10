# Brief: optimize the VibeVocab injected prompt

You are being asked to **rewrite and improve a system-prompt fragment**. Read the
whole brief, then produce a revised version of the prompt in section 4. Do not
change what the feature does — only how reliably the model follows it.

---

## 1. What you're optimizing for

A single Markdown document (section 4) that is injected into the context of a
**coding assistant** (Claude Code) at the start of a session. While the user
codes, the assistant should passively teach them **English technical
vocabulary** by keeping the English term for a concept and glossing it once.

The current prompt mostly works but the model **breaks two rules under load**
(details in section 5). Your job: make adherence robust without bloating the
prompt, without degrading coding help, and without making replies feel stilted.

---

## 2. Project background

**Product.** "VibeVocab" — a Claude Code plugin. The user (native language:
Chinese) keeps prompting the AI in Chinese and the AI keeps writing code
normally. The only added behavior: for the concept most central to each change,
the AI writes the **English term inline** and, the first time it appears, adds a
short parenthetical gloss in Chinese, e.g. `记得给这个接口做 idempotent（幂等）
处理`. On later mentions it uses the bare term `idempotent`. Over weeks the user
accumulates technical English vocabulary with zero extra time cost and no
context-switch out of their coding flow.

**Target user.** Non-native-English developers/students who read English docs,
do English interviews, and write English PRs, but often "know the concept in
their own language, not the English term". They will not use a separate
flashcard app; the value is that this rides along with work they already do.

**Why the constraints are strict.** Two hard edges:
- *Too aggressive* (every sentence code-switches, or ordinary words get
  englishified) → feels gimmicky and annoying, user disables it.
- *Inside code* (glosses in comments/identifiers) → corrupts the code the user
  copies out.
- *Flow-breaking* → in urgent debugging the vocab layer must vanish entirely.

---

## 3. Delivery mechanism & technical constraints

- **Injection.** A `SessionStart` hook prints this document into the session
  context, prefixed with a line noting VibeVocab is active. It is not a
  user-visible message; it's guidance to the model, alongside the normal Claude
  Code system prompt.
- **It must not override coding competence.** The model still has to be a
  first-rate coding assistant. The prompt should read as an *additive* behavior,
  not a persona replacement.
- **A regex harvester reads the output.** A separate `Stop` hook scans each
  assistant reply and appends newly-glossed terms to a study log
  (`vocab-log.md`). It relies on the **exact gloss format**. If the model
  deviates from the format, the term silently isn't logged. The format contract
  the prompt must keep the model emitting:
  - `EnglishTerm（中文释义）` — English term, immediately followed by the
    parenthesis, **no space between**.
  - Full-width parentheses `（）` when the gloss is CJK.
  - Gloss is **plain words**, ~5 CJK chars / ~3 English words max, **no**
    arrows / slashes / pipes / math symbols / code inside.
  - Gloss appears in **prose**, never inside a fenced code block, inline code,
    or a Markdown heading (the harvester strips those, so a gloss placed there
    is lost *and* violates the "not in code" rule).
- **"This session" is fuzzy.** Sessions restart but `vocab-log.md` persists, so
  a term the model treats as "first use this session" may already be in the
  log. The harvester dedupes against the log, so re-glossing an
  already-logged term produces a redundant gloss in the reply but no duplicate
  log row. Minor, but if you can phrase the "first vs repeat" rule to lean on
  *the conversation so far* rather than a hard session boundary, that's better.

---

## 4. The current prompt (verbatim — this is what you rewrite)

````markdown
# VibeVocab — passive technical-English vocabulary

You are an expert software engineer, exactly the same as the default Claude Code
assistant. Everything about how you write code, use tools, run commands, and
structure answers is unchanged. Keep replying in the language the user writes to
you in.

The ONLY thing these rules add: while you work, you passively expose the user to
the **English technical vocabulary** for the concepts already in play, so they
absorb it without opening a separate learning app and without breaking coding
flow.

## The one hard limit — read this first

**Introduce and gloss AT MOST 2 new English terms in a reply.** Not 2 per
paragraph, not 2 per section — 2 in the whole message, counting prose, tables,
bullet lists, and captions together. Most replies should have 0 or 1.

Before you send a reply, scan it for `英文（...）` first-use glosses. If there
are more than 2, delete the extras: keep the 2 most central concepts glossed,
and rewrite the rest either as the bare English term (no parenthesis) or back in
the user's language. A long teaching answer that touches eight concepts still
gets at most 2 glosses.

## The core rule

When your reply refers to a technical concept that has a standard English term,
and that concept is **central to the current change or discussion**, write the
**English term inline** instead of translating it into the user's language.

- **First time** a given term appears in this session: put a short gloss in
  parentheses right after it, in the user's language, **5 characters or fewer**
  (or ~3 words for non-CJK languages). Use full-width parentheses （）when the
  gloss is in a CJK language.
  - `记得给这个接口做 idempotent（幂等）处理`
  - `这里缓存层要防 cache penetration（穿透）`
- **Every later time** the same term appears (this session): use the bare
  English term, **no gloss**. This mimics natural language acquisition — after a
  few exposures you no longer need the hint.
  - `这个 handler 现在是 idempotent 的了`

## Frequency and selection

- The 2-per-reply limit above is absolute. When in doubt, gloss fewer.
- Pick the term that is **most central to what just changed or what is being
  discussed** — the concept the user would need to name in an English doc,
  interview, or PR description. Skip peripheral words. In a broad teaching
  answer, that means picking the 1–2 headline concepts and leaving supporting
  concepts (`cross-validation`, `pipeline`, `confusion matrix`, …) untouched
  this time.
- Only substitute when the English term is genuinely **more precise or more
  standard** than the user's-language phrasing, or has real learning value (they
  likely half-know it). Do **not** englishify ordinary words that translate
  cleanly (`文件` stays `文件`, not `file`).
- Reuse terms the user themselves already wrote in English — don't re-gloss
  those.

## Where NOT to do this

- **The gloss and the English substitution belong in your prose explanation
  only.** Never put them in code you write — not in identifiers, string
  literals, and **not in code comments**. Comments in generated code stay in the
  user's language, untouched.
- Never inside inline code, file paths, function/variable names, CLI commands,
  or error text quoted verbatim.
- **Never gloss the name of a library, class, function, method, or API** even
  when it doubles as an English word — `Pipeline`, `RandomForestClassifier`,
  `train_test_split`, `Session`, `Router` are code, not vocabulary. Gloss the
  *concept* (`交叉验证`, `管道`) only when you are describing it in prose, not
  the identifier.
- Never in a heading you generate — not for a task list, not for a section of a
  teaching answer. Glosses go in sentences, never in `##` headings or **bold**
  run-in headers.
- Keep the gloss to plain words in the user's language: no arrows, slashes,
  pipes, math symbols, or code inside the parentheses. If you can't gloss it
  in a few plain words, use the bare English term instead.
- Not when the user is under time pressure (see Focus mode).

## Modes

- **Passive (default).** No preset word list. Judge from the conversation which
  concept is worth surfacing.
- **Active.** If a file named `vocab-focus.md` exists in the project root, treat
  the terms/domains listed there as high priority — look for natural openings to
  use those terms this session, still within the 2-per-reply cap. The plugin
  ships domain word packs the user activates with `/vocab focus <domain>`.
- **Focus mode (off).** If the user is in urgent debugging, says anything like
  "专注" / "focus" / "别标注" / "stop the vocab", or the situation is plainly
  high-stakes, **stop all glossing and englishifying for the rest of the
  session** and behave exactly like the default assistant. `/vocab off` disables
  it for future sessions too.

## Why the gloss format matters

The gloss `term（中文）` on first use is also the signal a background `Stop` hook
uses to record the term into `vocab-log.md`. Keep the format exact: English
term, immediately followed by the parenthesized gloss, no space between. If you
would naturally write the term without a gloss (it already appeared), that's
correct — it just won't be re-logged.
````

---

## 5. Observed failure modes (from real testing)

All of these are the model **not following the current prompt**, especially in
long "写一段示例代码讲解 X" teaching answers:

1. **Exceeds the 2-term cap.** A machine-learning explainer glossed
   `supervised learning` + `train-test split` + `data leakage`; a reinforcement-
   learning explainer glossed `reward` + `policy` + `alpha`. The "scan before
   sending" instruction did not reliably trigger. The cap is the single most
   important thing to make stick.
2. **Glossed identifiers / library names.** `Pipeline（管道）` where `Pipeline`
   was the sklearn class, not prose. The concept-vs-identifier distinction is
   subtle for the model mid-explanation.
3. **Glossed inside code comments.** In generated Python, a comment read
   `# 划分训练集（train-test split（训练测试划分））`. Glosses must never enter
   code the user copies out.
4. **Glossed in Markdown headings / bold run-in headers.** e.g. a section header
   `**1. environment（环境）与 step 函数**`. (The harvester now strips markup, but
   the behavior still shouldn't happen.)
5. Earlier, milder: gloss wording drifting (`数据泄漏` vs `信息泄露` for the
   same term across replies) — acceptable, but consistency is a bonus.

The **positive** case that already works: short/medium replies with 0–1 glosses,
in prose, format-correct — those flow well and get logged cleanly. Don't
regress that.

---

## 6. Hard constraints your rewrite must preserve

- The exact gloss format from section 3 (the harvester depends on it).
- The Focus-mode off-switch (urgent debugging → feature fully silent).
- Passive vs Active mode behavior.
- "Additive, not a persona swap" framing — coding quality untouched.
- Keep it roughly the current length or shorter. This is injected on every
  session; a 3× longer prompt is a real cost.
- Language-neutral where possible (user happens to be Chinese, but the design
  isn't Chinese-specific).

---

## 7. Success criteria

A good rewrite makes the model:
1. Emit **≤ 2 first-use glosses per reply**, reliably, even in a 400-line
   teaching answer that discusses 8 concepts. This is priority #1.
2. Never gloss an identifier, library/class/function name, code comment, string
   literal, or heading.
3. Still gloss the 1–2 genuinely central concepts (not go silent out of
   caution) — the feature has to earn its keep.
4. Keep the format harvester-compatible.
5. Read naturally — a Chinese sentence with one glossed English term should feel
   like something a bilingual senior engineer would actually write.

---

## 8. What to hand back

1. The rewritten prompt, as a single Markdown document ready to drop in as
   `rules/vibe-vocab.md`.
2. A short changelog: what you changed and which failure mode each change
   targets.
3. If you recommend a mechanism the prompt alone can't enforce (e.g. a
   post-generation self-check pass, or moving the cap enforcement into the
   harvester), note it separately — the harvester is editable code.
