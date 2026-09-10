# VibeVocab

Learn technical English vocabulary **passively**, while you vibe-code in your
native language.

You keep prompting Claude Code in Chinese (or any language). Claude keeps
writing code the same way. The only change: for the concept most central to
each change, Claude uses the **English term** inline and glosses it **once**,
the first time it appears in the session — `记得给这个接口做 idempotent（幂等）
处理`. Next time that term comes up, it's just `idempotent`, no gloss —
the way real language acquisition works.

No separate app, no study sessions, no interruption to flow.

## What's in the box

| Piece | What it does |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | A `SessionStart` hook injects the vocabulary rules into the session — but only when VibeVocab is enabled (see below). |
| `hooks/hooks.json` + `scripts/log-vocab.js` | A `Stop` hook. After each turn it harvests the terms Claude glossed and appends new ones to `vocab-log.md` in your project. Never blocks the turn. |
| `commands/vocab.md` | `/vocab on` / `/vocab off`, `/vocab` shows your word log + stats, `/vocab focus <domain>` switches to Active mode. |
| `wordpacks/*.md` | Curated term lists: `frontend`, `backend`, `ml`, `or-stats`, `devops`. |

## Enabling it

Claude Code v2 has no `/output-style`, so activation is a flag file + a
`SessionStart` hook.

- `/vocab on` — enable for the current project (writes `.vibe-vocab-on`). Also
  takes effect immediately in the session you run it in.
- `/vocab on always` — enable globally for every project (writes
  `~/.claude/.vibe-vocab-always`).
- `/vocab off` (or `/vocab off always`) — disable.

## Modes

- **Passive (default).** No word list. Claude picks the term worth surfacing
  from the conversation. Max 2 new terms per reply.
- **Active.** `/vocab focus backend` copies that word pack into
  `vocab-focus.md` in your project root; Claude then looks for natural
  openings to use those terms. `/vocab focus off` returns to passive.
- **Focus (off).** Say "别标注" / "focus" to pause for the current session;
  `/vocab off` disables it for future sessions.

## Install (local dev)

From an interactive `claude` terminal:

```
/plugin marketplace add D:/Project/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

After editing plugin files, pick up the changes with `/plugin` → update, or
reinstall. Run `/vocab` after a few turns to see the log.

## The word log

`vocab-log.md` is a plain Markdown table: term, gloss, the sentence it appeared
in, date. The first column is the dedupe key; edit the rest freely. Export it
to Anki yourself if you want spaced repetition — that's deliberately not built
in.

## Test

```
node scripts/smoke-test.js
```

Offline check of the harvest + dedupe + report logic, no Claude Code needed.

## Known limitations (v0.1)

- The hook only logs terms that match the exact gloss format
  `term（短释义）` with a non-ASCII gloss. If Claude phrases a first mention
  differently, it won't be logged (but you still saw it).
- Term extraction grabs up to 4 words before the parenthesis; an unusual
  phrasing can clip a multi-word term.
- Frequency ("1–2 per reply") and term-selection judgement are prompt-only and
  need real-use tuning — see the idea doc's "risk points".
