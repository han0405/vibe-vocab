---
name: vocab
description: Turn VibeVocab on/off for this project, show the word log, or switch the active-mode word pack.
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
rules for the rest of this session. If `.vibe-vocab-rate` exists in the project
root (or `$CLAUDE_CONFIG_DIR`), treat the integer in it as the per-reply gloss
budget instead of 1. Then tell the user, in one line, that VibeVocab is now
active for this session.

## Step 2 — only if the argument is `rate`

`report.js` saved the new budget for future sessions. To apply it now, re-read
`${CLAUDE_PLUGIN_ROOT}/rules/vibe-vocab.md` and for the rest of this session
treat the per-reply gloss limit as the number the user just set (clamped to
1–5), not 1 — pick that many of the most central concepts, gloss each once, all
other rules unchanged. Tell the user in one line.

## Step 2 — only if the argument is `off`

Stop following the VibeVocab rules for the rest of this session (behave as the
default assistant). The `report.js` call already removed the flag for future
sessions.

## Argument reference (for your understanding; don't explain unless asked)

- (no args) — print log summary, current mode, gloss budget, and enabled state
- `on` — enable for this project. `on always` — enable globally for every project
- `off` — disable for this project. `off always` — disable the global opt-in
- `rate <1-5>` — how many concepts to gloss per reply (default 1). `rate <n>
  always` sets it for every project; `rate off` resets to 1
- `focus <domain>` — copy that word pack into `vocab-focus.md` (Active mode).
  Domains: frontend, backend, ml, or-stats, devops
- `focus off` — delete `vocab-focus.md`, back to Passive mode
