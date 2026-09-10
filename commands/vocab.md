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

## Step 2 — only if the argument is `on`

The `report.js` call above wrote the persistence flag, but that only injects the
rules at the *start* of future sessions. To make VibeVocab take effect **right
now**, also read `${CLAUDE_PLUGIN_ROOT}/rules/vibe-vocab.md` and follow those
rules for the rest of this session. Check the project root (and
`$CLAUDE_CONFIG_DIR`) for these flag files and honour them too:

- `.vibe-vocab-rate` — the integer is the per-reply gloss budget (else 1).
- `.vibe-vocab-level` — `beginner` / `advanced` shifts the "which concept gets
  the slot" bar (see the `level` step below); absent or `mid` = the shipped rule.
- `.vibe-vocab-known` — treat every term listed there (and every term already in
  `vocab-log.md`) as already-learned: use it bare, no gloss.

Then tell the user, in one line, that VibeVocab is now active for this session.

Note: a brand-new session is the reliable way to pick up flag changes — the
SessionStart hook re-reads all of them and re-injects the override blocks.

## Step 2 — only if the argument is `rate`

`report.js` saved the new budget for future sessions. To apply it now, re-read
`${CLAUDE_PLUGIN_ROOT}/rules/vibe-vocab.md` and for the rest of this session
treat the per-reply gloss limit as the number the user just set (clamped to
1–5), not 1 — pick that many of the most central concepts, gloss each once, all
other rules unchanged. Tell the user in one line.

## Step 2 — only if the argument is `level`

`report.js` saved the level for future sessions. To apply it now, shift the
"which concept gets the slot" bar for the rest of this session:

- `beginner` — an everyday engineering term (`deploy`, `dependency`, `cache`,
  `race condition`, `endpoint`, …) is worth the one gloss slot when it's central
  to the reply, not only the rare ones.
- `mid` — the shipped rule, unchanged: a term the user likely half-knows.
- `advanced` — only a genuinely specialized or precise term earns the slot;
  ordinary vocabulary they already use fluently does not. Most replies gloss
  nothing, which is correct.

The one-gloss-per-reply budget (or the `/vocab rate` value) and every other rule
are unchanged. Tell the user in one line.

## Step 2 — only if the argument is `off`

Stop following the VibeVocab rules for the rest of this session (behave as the
default assistant). The `report.js` call already removed the flag for future
sessions.

## Step 2 — only if the argument is `know` or `forget`

`report.js` updated `.vibe-vocab-known` for future sessions. For the rest of
**this** session, adjust your working set of already-learned terms to match:
after `know`, treat the named terms (or every term in the named word pack) as
already-learned — use them bare, no gloss. After `forget`, they become eligible
for a first-use gloss again. Tell the user in one line what changed.

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
