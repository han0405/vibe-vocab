# Dogfooding VibeVocab

How to verify the plugin works end-to-end on your machine, then shake out
prompt / harvester issues by using it for real.

## A. Install locally

In an interactive `claude` terminal:

```
/plugin marketplace add D:/Project/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
```

`/plugin` should now list `vibe-vocab` as enabled. After editing plugin files,
pick up changes with `/plugin` → update, or reinstall.

## B. Smoke check (~5 min) — confirm both hooks fire

1. `cd` into a throwaway directory, start `claude`, run `/vocab on`
   (writes `.vibe-vocab-on` there).
2. **SessionStart hook.** `/clear` or reopen the session, then ask:
   *"你现在有没有 VibeVocab 的规则？简述一下"*. It should paraphrase the habit
   (keep the English term for the one central concept, gloss it once on first
   use).
3. **Stop hook harvest.** Ask something conceptual in your language, e.g.
   *"用 Python 写个带重试的 HTTP 客户端，讲一下幂等和退避"*. When the reply
   finishes, check that `vocab-log.md` appeared in that directory with a row
   like `| idempotent | 幂等 | … |`.
4. **Dedupe.** In the same session, ask a follow-up that reuses `idempotent`.
   Confirm **no** duplicate row is added.
5. **Silence.** Say *"专注，别标注"*, then ask about a new concept. Confirm this
   reply carries no gloss and `vocab-log.md` gains no row.

If any step does nothing: check the plugin is enabled in `/plugin`, then
capture the real payload (section C).

## C. Verify the real hook payload

`lib/vocab-store.js` has a built-in capture switch. In PowerShell:

```powershell
$env:VV_DEBUG_CAPTURE = "D:\Project\vibe-vocab\_payload-capture.txt"
claude
```

Chat for a few turns, exit, then open `_payload-capture.txt`. Each block is one
raw Stop-hook payload. Confirm it contains **`cwd`** and **`transcript_path`** —
`scripts/log-vocab.js` reads exactly those two keys. If the field names or
nesting differ, note the actual shape; it is a ~3-line fix.

Clean up afterwards:

```powershell
Remove-Item Env:\VV_DEBUG_CAPTURE
Remove-Item D:\Project\vibe-vocab\_payload-capture.txt
```

## D. Real-project trial (1–2 weeks)

Run `/vocab on` in a project where you actually code in your native language,
then work normally — don't perform for it. Watch for:

- **Term selection.** Is the gloss (or, above `/vocab rate 1`, each gloss) the
  concept your request was really about, not a supporting idea picked up
  mid-explanation?
- **Missed / bogus captures.** Skim `vocab-log.md`: anything that should have
  been logged but wasn't (gloss hidden in a code comment or heading)? Any junk
  rows (a clarifying parenthetical mistaken for a gloss)?
- **Frequency feel.** At the default rate, long replies should still carry
  exactly one gloss; at a higher `/vocab rate`, no more than that many, and
  fewer when the reply doesn't turn on that many. Does it ever feel like a
  vocabulary quiz?
- **Silence reliability.** Mid-debug, does "focus" / "别标注" actually stop it
  for the rest of the session?

## E. Record and decide

Keep a scratch `vibe-vocab-notes.md` in the trial project: paste the original
sentence for every selection miss and every missed capture. After the trial,
use that data to decide:

1. Whether to swap the shipped `checklist-gate-v2` prompt for the runner-up
   `persona` (`docs/archive/prompt-candidates/persona.md`) — if rule-based
   selection reads too mechanically.
2. Whether residual risks 6.2 / 6.3 in `PROMPT-ITERATION-RESULTS.md` (gloss
   wording drift, occasional reversed asides) actually bother you or can keep
   being tolerated.
3. For a non-CJK native language, see `MULTILANG-FINDINGS.md` first — VibeVocab
   is built for CJK and other non-Latin scripts (Devanagari, Arabic, …).
