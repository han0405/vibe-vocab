---
name: vocab
description: Turn VibeVocab on/off, show or export the word log, set the per-reply gloss rate, mark terms known, or switch the active-mode word pack.
---

The user invoked `/vocab` with arguments: `$ARGUMENTS`

## Step 1 — always run this

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/report.js" "${CLAUDE_PROJECT_DIR}" $ARGUMENTS
```

Print its stdout to the user verbatim — no summarizing, no rephrasing, no extra
commentary. If it errors, show the raw error and suggest running the same
command by hand from a regular terminal.

## Step 2 — re-apply the settings to THIS session

`report.js` only writes flag files; the `SessionStart` hook that turns them into
context has already run, so a bare `report.js` call would not take effect until
the next session. Close that gap now.

**If the argument is `on`, `rate`, `level`, `know`, `forget`, or `focus`:** run

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/session-start.js" "${CLAUDE_PROJECT_DIR}"
```

This re-emits the full VibeVocab ruleset plus the current override blocks
(per-reply budget, vocabulary level, already-learned terms) — exactly what the
next session would start with. Treat its stdout as the **authoritative**
VibeVocab instructions for the rest of this session, replacing anything injected
at session start. If it prints nothing, VibeVocab is not enabled for this
project (only `/vocab on` changes that) — say so.

Then tell the user, in one line, what is now in effect (e.g. "VibeVocab active,
gloss budget 3, level advanced").

**If the argument is `off`:** stop following the VibeVocab rules for the rest of
this session and behave as the default assistant. `report.js` already removed
the flag for future sessions. (No re-inject — there is nothing to apply.)

Note: starting a brand-new session does all of the above automatically; the
re-inject just spares you the restart.

## Argument reference (for your understanding; don't explain unless asked)

- (no args) — print log summary, mode, gloss budget, known-term count, enabled state
- `on` — enable for this project. `on always` — enable globally for every project
- `off` — disable for this project. `off always` — disable the global opt-in
- `rate <1-5>` — how many concepts to gloss per reply (default 1). `rate <n>
  always` sets it for every project; `rate off` resets to 1
- `level <beginner|mid|advanced>` — how specialized a term must be to earn the
  gloss (default `mid`). `level <name> always` for every project; `level off`
  resets to `mid`
- `know <term, term, ...>` — mark terms as already known so they're never
  glossed. `know <word-pack>` marks a whole pack. `know` alone lists the set.
  Prefix the args with `always` for the cross-project list
- `forget <term, ...>` — undo `know`. `forget all` clears the list
- `export` — write `vocab-anki.csv` (Anki / spreadsheet import)
- `focus <domain>` — copy that word pack into `vocab-focus.md` (Active mode).
  Domains: frontend, backend, ml, or-stats, devops
- `focus off` — delete `vocab-focus.md`, back to Passive mode

Note: terms already in `vocab-log.md` are treated as known automatically at the
next session start — `know` is only for terms the user knew *before* VibeVocab
glossed them, or a whole pack they want to skip.
