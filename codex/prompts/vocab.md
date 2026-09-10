---
description: VibeVocab — turn it on/off, show or export the word log, set the per-reply gloss rate or level, mark terms known, or switch the Active-mode word pack.
---

The user ran `/vocab` with arguments: `$ARGUMENTS`

## Step 1 — always run this, then show its stdout verbatim

Run in the current project directory:

`node "__VIBE_VOCAB_ROOT__/scripts/report.js" "$(pwd)" $ARGUMENTS`

Print the stdout to the user exactly as-is — no summary, no rephrasing, no extra
commentary. If it errors, show the raw error and suggest running the same command
by hand in a terminal.

## Step 2 — apply the change to THIS session

`report.js` only writes the setting files. To make a change take effect now
(Codex loads `AGENTS.md` once per session), regenerate the managed block.

**If the argument is `on`, `rate`, `level`, `know`, `forget`, or `focus`:** run

`node "__VIBE_VOCAB_ROOT__/codex/sync.js" "$(pwd)"`

It rewrites the `VIBEVOCAB` block in `AGENTS.md` with the current ruleset plus the
per-reply budget / vocabulary level / already-learned overrides — exactly what
the next session would start with. Then re-read `AGENTS.md` and treat that block
as the **authoritative** VibeVocab instructions for the rest of this session,
replacing anything loaded at session start. Tell the user in one line what is now
in effect (e.g. "VibeVocab active, gloss budget 3, level advanced"). If `sync.js`
reports VibeVocab is not enabled for this project, say so — only `/vocab on`
changes that.

**If the argument is `off`:** stop following the VibeVocab rules for the rest of
this session and behave as the default assistant. `report.js` already cleared the
flag; also run the `sync.js` command above to drop the `AGENTS.md` block now.

## Argument reference (for you; don't recite unless asked)

- (no args) — log summary, mode, gloss budget, known-term count, enabled state
- `on` / `on always` — enable for this project / for every project
- `off` / `off always` — disable for this project / disable the global opt-in
- `rate <1-5>` / `rate <n> always` / `rate off` — concepts glossed per reply (default 1)
- `level <beginner|mid|advanced>` / `level <name> always` / `level off` — how specialized a term must be to earn a gloss (default `mid`)
- `know <term, term, ...>` / `know <word-pack>` / `know` (lists) / `forget <term, ...>` / `forget all` — manage the never-gloss list
- `export` — write `vocab-anki.csv`
- `focus <frontend|backend|ml|or-stats|devops>` / `focus off` — Active-mode word pack
