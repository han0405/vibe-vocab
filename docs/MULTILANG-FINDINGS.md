# Multi-language findings

VibeVocab was built and tuned for Chinese. This is what happens in other
popular native languages, tested by running compliant first-use glosses
(`EnglishTerm（gloss）`, gloss in the user's language) through the real
harvester in `lib/vocab-store.js` (`harvestGlossedTerms`).

Date: 2026-09-10. Languages probed: Japanese, Korean, Hindi, Arabic, Spanish,
plus Vietnamese / Portuguese for the Latin-script edge.

## Summary

| Language | Script | Basic gloss harvested? | Notes |
|---|---|---|---|
| Japanese | Kanji/Kana | ✅ yes | `（冪等）` → `idempotent \| 冪等`. Full-width parens, `。！？` boundaries all handled. |
| Korean | Hangul | ✅ yes | `(멱등성)` → clean. ASCII parens fine. |
| Hindi | Devanagari | ⚠️ partial | 1–2 word gloss works; 3-word gloss exceeds the 14-char cap and is lost; sentence context over-runs the `।` danda. |
| Arabic | Arabic (RTL) | ⚠️ partial | Short gloss works; longer gloss hits the 14-char cap. Log row renders bidi-mixed but readable. |
| Spanish / Portuguese / Vietnamese / any **Latin script** | Latin | ❌ no | Gloss is (mostly) ASCII letters → dropped by design. See finding 1. |

Japanese and Korean are effectively first-class. Hindi and Arabic work for
short glosses. Latin-script languages do not work.

## Findings, most to least fundamental

### 1. Latin-script glosses are dropped — by design, and now doubly so

The entire "this parenthetical is a real gloss, not an English aside like
`SLA (service level agreement)`" signal is **`hasNonAscii(gloss)`**. A Spanish
gloss `idempotent (idempotente)` has no non-ASCII character, so it is
indistinguishable from an aside and never logged.

Languages with diacritics (Portuguese `sem repetição`, Vietnamese `bất biến`,
accented Spanish `función`) *used* to squeak through on the accented
characters. **Today's clarifying-aside guard (`/[A-Za-z]{2,}/` in
`looksLikeGloss`) now rejects them too**, because Latin text is full of
2+-letter ASCII runs. So the Latin-script story regressed from "works if the
gloss happens to contain an accent" to "never works".

**This is not a small fix.** Distinguishing a Spanish gloss from an English
clarifying aside needs a real signal — most likely an explicit
`userLanguage` / locale setting (from `/vocab` or a config file) that switches
the harvester into a mode where an ASCII gloss *is* expected, plus a small
English-stopword check to still reject `(service level agreement)`. Until then,
Latin-script native languages should be considered **unsupported**, and the
README / rules should say so rather than implying "any language".

### 2. The 14-character gloss cap is calibrated for CJK density

`GLOSS_RE` caps the gloss at `[^）)]{1,14}`. Chinese fits a concept in ≤5
characters; Devanagari and Arabic need more code points (combining marks,
longer words, spaces) for the same meaning:

- Hindi `cache penetration (कैश में सीधी पहुँच)` — **lost**, gloss is >14.
- Arabic `cache penetration (اختراق التخزين المؤقت)` — **lost**, gloss is >14.

The prompt tells the model `≤5 CJK characters or ~3 words`; the "~3 words"
branch routinely produces a >14-char gloss that the harvester then silently
drops — prompt and harvester disagree.

**Suggested fix:** raise the cap to ~40 and lean on `looksLikeGloss` +
the junk-symbol / space checks to reject non-glosses. Needs a re-run of the
Chinese smoke tests to confirm no new false positives (a longer window could
catch more sentence fragments).

### 3. Non-Latin sentence boundaries are missing from `CTX_MARKS`  *(fixed 2026-09-10)*

The context sentence stored in the log broke only on `\n 。！？；. ! ? | ： :`.
Hindi ends sentences with `।` (danda) and Urdu with `۔`; Arabic questions end
with `؟`. Without those, a Hindi gloss pulled its whole 3-sentence paragraph
into the context cell.

**Applied:** added `।`, `۔`, `؟` to `CTX_MARKS`. Arabic comma `،` deliberately
left out, matching the existing decision not to break on the Chinese comma.

### 4. Acronym inside a CJK/Hangul gloss was rejected  *(fixed 2026-09-10)*

`idempotent(같은 HTTP 결과)` and the Chinese equivalent `幂等（同一 HTTP 请求）`
were dropped because today's `/[A-Za-z]{2,}/` guard treated `HTTP` as a leaked
code identifier.

**Applied:** the guard now allows a short (≤5) all-caps ASCII run (`HTTP`,
`API`, `JSON`, `CV`, `ML`, `SQL`) and still rejects a lowercase/mixed-case run
of any length ≥2 and any run longer than 5 (`cross_val_score`, `Pipeline`,
`GridSearchCV`, `nested`). The documented risk-6.1 case
(`nested CV（外层 \`cross_val_score\` 包住 …）`) is still caught by the
consecutive-space check, which is the more precise signal for a stripped
inline-code token. This does **not** rescue Latin-script languages (finding 1).

### 5. Single-character CJK gloss needs 2+ non-ASCII chars

`looksLikeGloss` ends with `letters >= 2`. A rare one-kanji gloss
(`cache（網）`) is rejected. Left as-is — raising this risks matching stray
single particles; a one-character gloss is uncommon enough to accept the loss.

## What was changed vs. only noted

- **Changed** (`lib/vocab-store.js`): findings 3 and 4 — additive, and covered
  by `npm test` plus two new Japanese/Korean assertions.
- **Noted only**: findings 1, 2, 5 — each needs a product decision (locale
  setting; cap raise + Chinese re-test; accept the edge). None applied yet.

## Bottom line

Ship-ready today for **Chinese, Japanese, Korean**. Usable with the cap raise
(finding 2) for **Hindi, Arabic** and other non-Latin scripts. **Latin-script**
native languages (Spanish, Portuguese, French, Vietnamese, Indonesian, …) need
finding 1's locale work before they can be claimed as supported.
