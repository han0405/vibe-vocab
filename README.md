# VibeVocab

**用母语 vibe coding，顺手记住技术英语。**

*Vibe-code in your own language. Pick up the English terms for free.*

---

## 中文

### 一句话

你用中文写代码，Claude 照常干活。区别只有一个：每次改动**最关键的那一个概念**，
Claude 用**英文术语**、并在它第一次出现时给一句简短中文注释。之后这个词就裸用，
不再解释。你没花额外时间，却在真实语境里把它记住了。

### 有什么变化

同样一句需求：`帮我把这个订阅接口改成幂等的`

| | 回复开头 | 你得到什么 |
|---|---|---|
| **普通 Claude Code** | 「好的，我把这个接口改成**幂等**的：加唯一约束，重复请求直接返回已存在的记录……」 | 一段能用的代码。术语还是中文，下次还得再查。 |
| **开了 VibeVocab** | 「好的，我把这个接口改成 **idempotent（幂等）** 的：加唯一约束，重复请求直接返回已存在的记录……」 | 同一段代码 + `idempotent` 这个词，连同它出现的真实句子自动进 `vocab-log.md`。下次 Claude 直接写 `idempotent`，因为你已经见过了。 |

没有独立 App，没有背单词时段，不打断心流。后台一个 hook 把 `术语（注释）`
收割进项目根目录的 `vocab-log.md` 生词本。

### 为什么这样有用

- **零额外时间** —— 你不是在背单词，你在写代码。
- **带语境** —— 你记住的不是「idempotent = 幂等」，是「把订阅接口改成 idempotent」这句话。
- **符合习得规律** —— 只在第一次解释；之后逼你在真实使用中回忆，而不是刷卡片。
- **可复习** —— `vocab-log.md` 是纯 Markdown 表格，想要间隔重复自己导进 Anki。

### 规则（骨架）

完整版在 `rules/vibe-vocab.md`（会被 hook 注入会话）。核心就一句：

> 每条回复，只给**最核心的一个**概念保留英文 + 首次加一次简短注释，之后裸用。
> 不是每个术语都标——那样就成了单词表。代码、注释、标题里永远不标。

### 组成

| 部分 | 作用 |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | `SessionStart` hook，启用时把规则注入会话。 |
| `hooks/hooks.json` + `scripts/log-vocab.js` | `Stop` hook，每轮回复后收割新术语进 `vocab-log.md`，从不阻塞回复。 |
| `commands/vocab.md` | `/vocab on`、`/vocab off`、`/vocab`（看生词本）、`/vocab focus <领域>`（主动模式）。 |
| `wordpacks/*.md` | 精选词表：`frontend`、`backend`、`ml`、`or-stats`、`devops`。 |

### 启用

Claude Code v2 没有 `/output-style`，所以用「flag 文件 + hook」激活。

```
/plugin marketplace add D:/Project/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` —— 对当前项目启用，当前会话立即生效。
- `/vocab on always` —— 全局启用。
- `/vocab off` —— 关闭。说「别标注」/「focus」可暂停当前会话。

改了插件文件后用 `/plugin` → update 生效。端到端验证步骤见 `docs/DOGFOODING.md`。

### 模式

- **被动（默认）** —— 无词表，Claude 从对话里自己挑。每条回复 1 个注释。
- **主动** —— `/vocab focus backend` 把该词包写进 `vocab-focus.md`，Claude 主动找机会用上。`/vocab focus off` 回到被动。
- **静音** —— 「别标注」/「focus」暂停本会话；`/vocab off` 对以后也关。

### 语言支持

为**中文**打造，**日语、韩语**同为一等公民。**印地语、阿拉伯语**等非拉丁文字已支持
（注释长度上限已放宽、断句已适配，见 `docs/MULTILANG-FINDINGS.md`）。
**拉丁文字**的母语（西班牙语、葡萄牙语、越南语……）**不支持**——收割器靠「注释含
非 ASCII 字符」区分真注释和 `SLA (service level agreement)` 这类英文括注，拉丁文字
注释绕不过这一条。

### 测试

```
npm test
```

离线跑收割 + 去重 + 报告 + 多语言的全套检查，不需要 Claude Code。

### 已知限制（v0.1）

- 只收割严格符合 `术语（短注释）` 且注释含非 ASCII 字符的首次提及。换个说法点出术语就不入库（但你还是读到了）。
- 术语提取抓括号前最多 4 个词，不寻常措辞可能截断多词术语。
- 频率和选词是纯 prompt 控制的，需要真实使用调——见 `docs/DOGFOODING.md`。

---

## English

### In one line

You write code in your language; Claude works as usual. The only difference:
for the **single most central concept** of each change, Claude uses the
**English term** and glosses it once, the first time it appears. After that the
term is bare. You spent no extra time and picked it up in real context.

### What changes

Same request: *"make this subscription endpoint idempotent"* (asked in Chinese).

| | Reply opens with | What you get |
|---|---|---|
| **Plain Claude Code** | "…I'll make it **幂等**: add a unique constraint, return the existing row on a repeat request…" | Working code. The term stays in your language; next time you look it up again. |
| **With VibeVocab** | "…I'll make it **idempotent（幂等）**: add a unique constraint, return the existing row on a repeat request…" | The same code + the word `idempotent` and the real sentence it appeared in, auto-saved to `vocab-log.md`. Next time Claude just writes `idempotent` — you've seen it. |

No separate app, no study sessions, no interruption to flow. A background hook
harvests the glossed `term（gloss）` pairs into `vocab-log.md` in your project.

### Why it works

- **Zero extra time** — you're not studying, you're coding.
- **In context** — you remember "make the endpoint idempotent", not
  "idempotent = 幂等".
- **Matches acquisition** — glossed only on first use; after that you're made
  to recall it in real use instead of drilling flashcards.
- **Reviewable** — `vocab-log.md` is a plain Markdown table; export to Anki
  yourself if you want spaced repetition.

### The rule (skeleton)

Full text in `rules/vibe-vocab.md` (injected into the session by the hook). The
core is one sentence:

> Per reply, keep English + one short gloss for the **single** most central
> concept, bare after that. Not every term — that's a glossary. Never in code,
> comments, or headings.

### What's in the box

| Piece | What it does |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | `SessionStart` hook injects the rules when enabled. |
| `hooks/hooks.json` + `scripts/log-vocab.js` | `Stop` hook harvests new terms into `vocab-log.md` after each turn. Never blocks. |
| `commands/vocab.md` | `/vocab on` / `off`, `/vocab` (word log), `/vocab focus <domain>` (Active mode). |
| `wordpacks/*.md` | Curated lists: `frontend`, `backend`, `ml`, `or-stats`, `devops`. |

### Enabling it

Claude Code v2 has no `/output-style`, so activation is a flag file + a hook.

```
/plugin marketplace add D:/Project/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` — enable for the current project; effective immediately.
- `/vocab on always` — enable globally.
- `/vocab off` — disable. Say "focus" / "别标注" to pause for the session.

Pick up file edits with `/plugin` → update. End-to-end verification:
`docs/DOGFOODING.md`.

### Modes

- **Passive (default).** No word list; Claude picks from the conversation. One
  gloss per reply.
- **Active.** `/vocab focus backend` writes that pack to `vocab-focus.md`;
  Claude looks for natural openings to use those terms. `/vocab focus off` to
  return.
- **Focus (off).** "别标注" / "focus" pauses for the session; `/vocab off`
  disables it for future sessions.

### Language support

Built and tuned for **Chinese**; **Japanese** and **Korean** are first-class
too. Non-Latin scripts like **Hindi** and **Arabic** are supported (gloss-length
cap widened, sentence boundaries adapted — see `docs/MULTILANG-FINDINGS.md`).
**Latin-script** native languages (Spanish, Portuguese, Vietnamese, …) are
**not supported** — the harvester uses "the gloss contains a non-ASCII
character" to tell a real gloss from an English aside like
`SLA (service level agreement)`, and a Latin-script gloss can't clear that bar.

### Test

```
npm test
```

Offline check of harvest + dedupe + report + multi-language logic. No Claude
Code needed.

### How the prompt was chosen

`rules/vibe-vocab.md` is the `checklist-gate-v2` prompt, picked over five other
strategies in a blind evaluation. Write-up, scoring, residual risks:
`docs/PROMPT-ITERATION-RESULTS.md`. Frozen candidates: `docs/archive/`.

## License

MIT — star ⭐ if it taught you a word you now use without thinking.
