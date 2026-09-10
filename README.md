# VibeVocab

用母语 vibe coding，顺带**被动**积累技术英语词汇。

*Learn technical English vocabulary passively, while you vibe-code in your
native language.*

---

## 中文说明

### 它做什么

你照常用中文给 Claude Code 提需求，Claude 照常写代码。唯一的变化：对每次改动
**最核心的那一个概念**，Claude 保留**英文术语**并在**首次出现**时加一次极简注释
——`记得给这个接口做 idempotent（幂等）处理`。同一个词之后再出现就是裸词
`idempotent`，不再注释——这正是语言习得的方式。

没有独立 App，没有背单词时段，不打断心流。后台一个 hook 把
`术语（注释）` 收割进项目根目录的 `vocab-log.md` 生词本。

### 组成

| 部分 | 作用 |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | `SessionStart` hook，在 VibeVocab 启用时把词汇规则注入会话上下文。 |
| `hooks/hooks.json` + `scripts/log-vocab.js` | `Stop` hook。每轮回复后收割 Claude 注释过的术语，把新词追加进 `vocab-log.md`。从不阻塞回复。 |
| `commands/vocab.md` | `/vocab on` / `/vocab off`；`/vocab` 看生词本和统计；`/vocab focus <领域>` 切到主动模式。 |
| `wordpacks/*.md` | 精选词表：`frontend`、`backend`、`ml`、`or-stats`、`devops`。 |

### 启用

Claude Code v2 没有 `/output-style`，所以用「flag 文件 + `SessionStart` hook」激活。

- `/vocab on` —— 对当前项目启用（写 `.vibe-vocab-on`），当前会话立即生效。
- `/vocab on always` —— 全局启用（写 `~/.claude/.vibe-vocab-always`）。
- `/vocab off`（或 `/vocab off always`）—— 关闭。

### 模式

- **被动（默认）**：无词表，Claude 从对话里自己挑值得点出的术语。每条回复最多 1 个注释。
- **主动**：`/vocab focus backend` 把该词包复制进项目根的 `vocab-focus.md`，
  Claude 会主动找机会用上这些词。`/vocab focus off` 回到被动。
- **静音**：说「别标注」/「focus」暂停当前会话；`/vocab off` 对以后的会话也关闭。

### 本地安装（开发用）

在交互式 `claude` 终端里：

```
/plugin marketplace add D:/Project/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

改了插件文件后，用 `/plugin` → update 或重装来生效。几轮之后运行 `/vocab` 看生词本。

### 生词本

`vocab-log.md` 是一张纯 Markdown 表：术语、注释、出现的句子、日期。第一列是去重键，
其余随便改。想要间隔重复自己导进 Anki——那是刻意没做进来的。

### 测试

```
npm test
```

离线跑收割 + 去重 + 报告 + 多语言的全套检查，不需要 Claude Code。

### 语言支持

为**中文**打造和调过。**日语、韩语**同样是一等公民。**印地语、阿拉伯语**等
非拉丁文字在短注释下可用（见 `docs/MULTILANG-FINDINGS.md`）。**拉丁文字**的母语
（西班牙语、葡萄牙语、越南语……）目前**不支持**——收割器靠「注释含非 ASCII 字符」
来区分真注释和 `SLA (service level agreement)` 这类英文括注，拉丁文字注释绕不过这一条。

### 已知限制（v0.1）

- hook 只收割严格符合 `术语（短注释）` 格式、且注释含非 ASCII 字符的首次提及。
  Claude 换个说法点出术语，就不会入库（但你还是读到了）。
- 术语提取抓括号前最多 4 个词；不寻常的措辞可能截断多词术语。
- 频率（「每条 1 个」）和选词判断是纯 prompt 控制的，需要真实使用来调——
  见 `docs/DOGFOODING.md`。

---

## English

### What it does

You keep prompting Claude Code in Chinese (or another language). Claude keeps
writing code the same way. The only change: for the concept most central to
each change, Claude uses the **English term** inline and glosses it **once**,
the first time it appears in the session — `记得给这个接口做 idempotent（幂等）
处理`. Next time that term comes up it's just `idempotent`, no gloss — the way
real language acquisition works.

No separate app, no study sessions, no interruption to flow. A background hook
harvests the glossed `term（gloss）` pairs into `vocab-log.md` in your project.

### What's in the box

| Piece | What it does |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | A `SessionStart` hook injects the vocabulary rules into the session — only when VibeVocab is enabled. |
| `hooks/hooks.json` + `scripts/log-vocab.js` | A `Stop` hook. After each turn it harvests the terms Claude glossed and appends new ones to `vocab-log.md`. Never blocks the turn. |
| `commands/vocab.md` | `/vocab on` / `/vocab off`, `/vocab` shows your word log + stats, `/vocab focus <domain>` switches to Active mode. |
| `wordpacks/*.md` | Curated term lists: `frontend`, `backend`, `ml`, `or-stats`, `devops`. |

### Enabling it

Claude Code v2 has no `/output-style`, so activation is a flag file + a
`SessionStart` hook.

- `/vocab on` — enable for the current project (writes `.vibe-vocab-on`). Takes
  effect immediately in the session you run it in.
- `/vocab on always` — enable globally (writes `~/.claude/.vibe-vocab-always`).
- `/vocab off` (or `/vocab off always`) — disable.

### Modes

- **Passive (default).** No word list. Claude picks the term worth surfacing
  from the conversation. One gloss per reply.
- **Active.** `/vocab focus backend` copies that word pack into `vocab-focus.md`
  in your project root; Claude then looks for natural openings to use those
  terms. `/vocab focus off` returns to passive.
- **Focus (off).** Say "别标注" / "focus" to pause for the current session;
  `/vocab off` disables it for future sessions.

### Install (local dev)

From an interactive `claude` terminal:

```
/plugin marketplace add D:/Project/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

After editing plugin files, pick up changes with `/plugin` → update, or
reinstall. Run `/vocab` after a few turns to see the log. Full end-to-end
verification steps are in `docs/DOGFOODING.md`.

### The word log

`vocab-log.md` is a plain Markdown table: term, gloss, the sentence it appeared
in, date. The first column is the dedupe key; edit the rest freely. Export it
to Anki yourself if you want spaced repetition — that's deliberately not built
in.

### Test

```
npm test
```

Offline check of harvest + dedupe + report + multi-language logic, no Claude
Code needed.

### Language support

Built and tuned for **Chinese**. **Japanese** and **Korean** are first-class
too. Non-Latin scripts like **Hindi** and **Arabic** work for short glosses
(see `docs/MULTILANG-FINDINGS.md`). **Latin-script** native languages (Spanish,
Portuguese, Vietnamese, …) are **not supported yet** — the harvester uses
"the gloss contains a non-ASCII character" to tell a real gloss from an English
aside like `SLA (service level agreement)`, and a Latin-script gloss can't clear
that bar.

### Known limitations (v0.1)

- The hook only logs first mentions that match the exact `term（short gloss）`
  format with a non-ASCII gloss. A differently phrased first mention won't be
  logged (but you still saw it).
- Term extraction grabs up to 4 words before the parenthesis; an unusual
  phrasing can clip a multi-word term.
- Frequency ("one per reply") and term-selection judgement are prompt-only and
  need real-use tuning — see `docs/DOGFOODING.md`.

### How the prompt was chosen

`rules/vibe-vocab.md` is the `checklist-gate-v2` prompt, picked over five other
strategies in a blind evaluation pass. Write-up, scoring, and residual risks:
`docs/PROMPT-ITERATION-RESULTS.md`. Frozen candidates: `docs/archive/`.

## License

MIT
