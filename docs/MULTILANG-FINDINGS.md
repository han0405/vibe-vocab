# Multi-language findings

VibeVocab was built and tuned for Chinese. This is what happens in other
popular native languages, tested by running compliant first-use glosses
(`EnglishTerm（gloss）`, gloss in the user's language) through the real
harvester in `lib/vocab-store.js` (`harvestGlossedTerms`).

Date: 2026-09-10. Languages probed: Japanese, Korean, Hindi, Arabic.

**Scope:** the harvester keys on `hasNonAscii(gloss)` to tell a real gloss from
an English aside like `SLA (service level agreement)`, so VibeVocab targets
**non-Latin scripts** — CJK, Devanagari, Arabic, and the like. Findings 1–3 below are fixed.

## Summary

| Language | Script | Gloss harvested? | Notes |
|---|---|---|---|
| Chinese | Han | ✅ first-class | The language it was tuned on. |
| Japanese | Kanji/Kana | ✅ first-class | `（冪等）` → `idempotent \| 冪等`. Full-width parens, `。！？` boundaries handled. |
| Korean | Hangul | ✅ first-class | `(멱등성)` → clean. ASCII parens fine. |
| Hindi | Devanagari | ✅ supported | Multi-word glosses now fit (cap raised to 40); context stops at the `।` danda. |
| Arabic | Arabic (RTL) | ✅ supported | Longer glosses now fit. Log row renders bidi-mixed but readable. |

## Findings, most to least fundamental

### 1. The 14-character gloss cap was calibrated for CJK density  *(fixed 2026-09-10)*

`GLOSS_RE` capped the gloss at `[^）)]{1,14}`. Chinese fits a concept in ≤5
characters; Devanagari and Arabic need more code points (combining marks,
longer words, spaces between words) for the same meaning:

- Hindi `cache penetration (कैश में सीधी पहुँच)` — was lost, gloss is >14.
- Arabic `cache penetration (اختراق التخزين المؤقت)` — was lost, gloss is >14.

**Applied:** cap raised to `{1,40}` (both in `GLOSS_RE` and in the
context-cleanup replace). To keep the wider window from swallowing a clarifying
aside, `looksLikeGloss` now also rejects any gloss containing CJK sentence /
clause punctuation (`，、。；：！？…「」『』（）`) — a real noun-phrase gloss
(`幂等`, `反向传播`, `最终一致性`) never has these; an enumeration or aside
(`服务等级协议，不是别的`) does. Chinese smoke suite re-run: all green, plus a
new negative assertion for the comma-aside case.

### 2. Non-Latin sentence boundaries are missing from `CTX_MARKS`  *(fixed 2026-09-10)*

The context sentence stored in the log broke only on `\n 。！？；. ! ? | ： :`.
Hindi ends sentences with `।` (danda) and Urdu with `۔`; Arabic questions end
with `؟`. Without those, a Hindi gloss pulled its whole 3-sentence paragraph
into the context cell.

**Applied:** added `।`, `۔`, `؟` to `CTX_MARKS`. Arabic comma `،` deliberately
left out, matching the existing decision not to break on the Chinese comma.

### 3. Acronym inside a CJK/Hangul gloss was rejected  *(fixed 2026-09-10)*

`idempotent(같은 HTTP 결과)` and the Chinese equivalent `幂等（同一 HTTP 请求）`
were dropped because today's `/[A-Za-z]{2,}/` guard treated `HTTP` as a leaked
code identifier.

**Applied:** the guard now allows a short (≤5) all-caps ASCII run (`HTTP`,
`API`, `JSON`, `CV`, `ML`, `SQL`) and still rejects a lowercase/mixed-case run
of any length ≥2 and any run longer than 5 (`cross_val_score`, `Pipeline`,
`GridSearchCV`, `nested`). The documented risk-6.1 case
(`nested CV（外层 \`cross_val_score\` 包住 …）`) is still caught by the
consecutive-space check, which is the more precise signal for a stripped
inline-code token.

### 4. Single-character CJK gloss needs 2+ non-ASCII chars

`looksLikeGloss` ends with `letters >= 2`. A rare one-kanji gloss
(`cache（網）`) is rejected. Left as-is — raising this risks matching stray
single particles; a one-character gloss is uncommon enough to accept the loss.

## What was changed vs. only noted

- **Fixed** (`lib/vocab-store.js`, all covered by `npm test`):
  - Finding 1 — gloss length cap 14 → 40, plus CJK-punctuation reject in
    `looksLikeGloss` as the backstop.
  - Finding 2 — `।` `۔` `؟` added to `CTX_MARKS`.
  - Finding 3 — acronym-aware ASCII-run guard (short ALL-CAPS runs survive).
- **Accepted**: finding 4 (single-character CJK gloss) — too rare to justify
  the false-positive risk of loosening `letters >= 2`.

## Bottom line

Supported: **Chinese, Japanese, Korean** (first-class) and **Hindi, Arabic**
and other non-Latin scripts.
