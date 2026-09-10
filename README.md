<p align="center">
  <strong>VibeVocab</strong>
</p>
<p align="center">
  <strong>用母语 vibe coding，顺手把技术英语记下来。</strong><br>
  <em>Vibe-code in your own language. Pick up the English for free.</em>
</p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat" alt="License"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-6b4fbb?style=flat" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=flat" alt="Node >= 18">
</p>

<p align="center">
  <a href="#中文"><strong>🇨🇳 中文</strong></a> ·
  <a href="#english"><strong>🇬🇧 English</strong></a> ·
  <a href="docs/i18n/README.ja.md">🇯🇵 日本語</a> ·
  <a href="docs/i18n/README.ko.md">🇰🇷 한국어</a> ·
  <a href="docs/i18n/README.pt-BR.md">🇧🇷 Português (Brasil)</a> ·
  <a href="docs/i18n/README.vi.md">🇻🇳 Tiếng Việt</a>
</p>

---

## 中文

### 一句话

**Vibe coding 的时候**，你照常用中文提需求，Claude 照常干活。唯一的区别是每条回复里**最关键的概念**，Claude 用英文术语讲，并在它第一次出现时补一句极简中文注释。之后这个词就直接裸用，不再解释，你来靠上下文认出它。

在真实语境里学会英语术语！

### 有什么变化

同一个问题：**「我的模型训练集 99%，测试集只有 70%，怎么办？」**

<table>
<tr>
<td width="50%">

#### 普通 Claude Code

> 这是典型的**过拟合**。训练集表现好、测试集掉这么多，说明模型把训练数据里的噪声也学进去了。可以加**正则化**、开**早停**，或者做**数据增强**，另外也建议检查一下训练集和测试集的分布是否一致……

诊断没问题，代码也能用。但术语全是中文——下次读英文文档、看报错、听 podcast，还是得从头查一遍。

</td>
<td width="50%">

#### 开了 VibeVocab

> 这是典型的 **overfitting（过拟合）**：模型把训练集的噪声也背下来了。
>
> 1. 给这几层加 L2 正则，`weight_decay=1e-4` 起步
> 2. 开早停，盯 validation loss 而不是 train loss
> 3. 还不行就上数据增强
>
> 下一步：把现在的 train/val loss 曲线贴给我。

同样的诊断 + `overfitting` 这个词，连同它出现的那句真话一起进 `vocab-log.md`。
下次 Claude 直接写 `overfitting`，因为你已经见过了。

</td>
</tr>
</table>

注意右边**只有一个词**被标注了：`正则化`、`早停`、`数据增强` 都还是中文。这是故意的——
一条回复只挑最核心的那个概念，标满了就成单词表了，没人看得进去。

没有独立 App，没有背单词时段，不打断心流。后台一个 hook 把 `术语（注释）`
悄悄收进项目根目录的 `vocab-log.md`。

### 为什么这样有用

- **零额外时间** —— 你不是在背单词，你在写代码。
- **带语境** —— 你记住的不是「overfitting = 过拟合」，是「模型把噪声也背下来了，这叫 overfitting」。
- **符合习得规律** —— 只在第一次解释，之后逼你在真实使用里回忆，而不是刷卡片。
- **可复习** —— `vocab-log.md` 就是一张 Markdown 表，想要间隔重复自己导进 Anki 就行。

### 规则

完整版在 `rules/vibe-vocab.md`（由 hook 注入会话）。核心就一句：

> 每条回复，只给**最核心的一个**概念保留英文 + 首次一句简短注释，之后裸用。
> 不是每个术语都标——那样就成了单词表。代码、注释、标题里永远不标。

### 组成

| 部分 | 作用 |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | `SessionStart` hook，启用时把规则注入会话。 |
| `hooks/hooks.json` + `scripts/log-vocab.js` | `Stop` hook，每轮回复后收割新术语进 `vocab-log.md`，从不阻塞回复。 |
| `commands/vocab.md` | `/vocab on`、`/vocab off`、`/vocab`（看生词本）、`/vocab focus <领域>`（主动模式）、`/vocab rate <1-5>`（每段标几个词）。 |
| `wordpacks/*.md` | 精选词表：`frontend`、`backend`、`ml`、`or-stats`、`devops`。 |

### 启用

Claude Code v2 没有 `/output-style`，所以用「flag 文件 + hook」来激活。

```
/plugin marketplace add /path/to/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` —— 对当前项目启用，当前会话立刻生效。
- `/vocab on always` —— 全局启用。
- `/vocab off` —— 关掉。想临时安静一会儿，说句「别标注」或「focus」就行。

改了插件文件之后 `/plugin` → update 生效。端到端的验证步骤见 `docs/DOGFOODING.md`。

### 三种模式

- **被动（默认）** —— 不带词表，Claude 从对话里自己挑。每条回复一个注释。
- **主动** —— `/vocab focus backend` 把该词包写进 `vocab-focus.md`，Claude 会主动找机会用上这些词。`/vocab focus off` 回到被动。
- **静音** —— 「别标注」/「focus」暂停当前会话；`/vocab off` 对以后也一并关掉。

### 一段回复标几个词

默认一段回复只标 **1** 个最核心的概念。想放宽：

```
/vocab rate 3         # 当前项目，每段最多 3 个
/vocab rate 3 always  # 所有项目
/vocab rate off       # 回到默认的 1
```

上限 5——再多就成单词表了。写进项目根目录的 `.vibe-vocab-rate`，下次会话生效；
想当场生效再跑一次 `/vocab on`。后台收割器的安全上限也会跟着抬高，多标的词不会漏收。

### 语言支持

为**中文**打造，**日语、韩语**同样是一等公民。**印地语、阿拉伯语**等非拉丁文字也已支持
（注释长度上限放宽了，断句也做了适配，见 `docs/MULTILANG-FINDINGS.md`）。

**拉丁文字**的母语（西班牙语、葡萄牙语、越南语……）暂时**不支持**：收割器靠「注释里含
非 ASCII 字符」来区分真注释和 `SLA (service level agreement)` 这类英文括注，拉丁文字的
注释过不了这一关。

### 测试

```
npm test
```

离线跑一遍收割、去重、报告和多语言的全套检查，不需要 Claude Code。

### 已知限制（v0.1）

- 只收割严格符合 `术语（短注释）`、且注释含非 ASCII 字符的首次提及。换个说法点出术语就不入库（不过你还是读到了）。
- 术语提取会抓括号前最多 4 个词，措辞不寻常时可能把多词术语截断。
- 每段标几个词由 `/vocab rate` 调（默认 1，上限 5）；具体选哪个词仍全靠 prompt 控制，还需要在真实使用里继续调——见 `docs/DOGFOODING.md`。

### 这条 prompt 是怎么选出来的

`rules/vibe-vocab.md` 用的是 `checklist-gate-v2`，是在盲评里从六种策略里选出来的。
过程、打分和遗留风险都写在 `docs/PROMPT-ITERATION-RESULTS.md`，落选的候选冻结在 `docs/archive/`。

---

## English

### In one line

While **vibe coding**, you ask in your own language as usual, and Claude works as usual. The only difference: for the single **most central concept** in each reply, Claude uses the English term and glosses it once, the first time it appears. After that the term goes bare, no more explaining — you pick it up from context.

Pick up real English terms, in real context!

### What changes

Same question: **"my model hits 99% on train and 70% on test — what now?"**

<table>
<tr>
<td width="50%">

#### Plain Claude Code

> That's classic **过拟合**. A gap that big means the model memorised the noise in your training data. Add **正则化**, turn on **早停**, or try **数据增强** — and it's worth checking that train and test come from the same distribution…

The diagnosis is fine and the code works. But every term stays in your language,
so the next English doc, stack trace, or conference talk sends you back to a
dictionary.

</td>
<td width="50%">

#### With VibeVocab

> Classic **overfitting（过拟合）**: the model memorised the noise in your training set.
>
> 1. Add L2 regularisation on these layers, start at `weight_decay=1e-4`
> 2. Turn on early stopping, watch validation loss, not train loss
> 3. Still stuck? Bring in data augmentation
>
> Next: paste your current train/val loss curves.

Same diagnosis, plus the word `overfitting` and the real sentence it lived in,
saved straight to `vocab-log.md`. Next time Claude just writes `overfitting` —
you've already seen it.

</td>
</tr>
</table>

Note that **only one term** is glossed on the right. That's deliberate: one
concept per reply, the most central one. Gloss everything and you've written a
glossary, and nobody reads glossaries.

No separate app, no study sessions, nothing that breaks your flow. A background
hook quietly harvests the `term（gloss）` pairs into `vocab-log.md` at the root of
your project.

### Why it works

- **Zero extra time** — you're not studying, you're coding.
- **In context** — you remember "the model memorised the noise, that's overfitting", not "overfitting = 过拟合".
- **Matches how acquisition works** — glossed on first use only; after that you have to recall it in real use instead of drilling flashcards.
- **Reviewable** — `vocab-log.md` is a plain Markdown table. Export it to Anki if you want spaced repetition.

### The rule

Full text in `rules/vibe-vocab.md`, injected into the session by the hook. The
core is one sentence:

> Per reply, keep English + one short gloss for the **single** most central
> concept, bare after that. Not every term — that's a glossary. Never in code,
> comments, or headings.

### What's in the box

| Piece | What it does |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | `SessionStart` hook injects the rules when enabled. |
| `hooks/hooks.json` + `scripts/log-vocab.js` | `Stop` hook harvests new terms into `vocab-log.md` after each turn. Never blocks a reply. |
| `commands/vocab.md` | `/vocab on` / `off`, `/vocab` (word log), `/vocab focus <domain>` (Active mode), `/vocab rate <1-5>` (glosses per reply). |
| `wordpacks/*.md` | Curated lists: `frontend`, `backend`, `ml`, `or-stats`, `devops`. |

### Enabling it

Claude Code v2 has no `/output-style`, so activation is a flag file plus a hook.

```
/plugin marketplace add /path/to/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` — enable for the current project, live in the current session.
- `/vocab on always` — enable globally.
- `/vocab off` — disable. Say "focus" or "别标注" to pause for a while.

Pick up file edits with `/plugin` → update. End-to-end verification lives in
`docs/DOGFOODING.md`.

### Three modes

- **Passive (default).** No word list; Claude picks from the conversation. One gloss per reply.
- **Active.** `/vocab focus backend` writes that pack to `vocab-focus.md` and Claude looks for natural openings to use those terms. `/vocab focus off` to go back.
- **Muted.** "别标注" / "focus" pauses the current session; `/vocab off` turns it off for future ones too.

### Terms per reply

By default each reply glosses the **single** most central concept. To allow more:

```
/vocab rate 3         # this project, up to 3 per reply
/vocab rate 3 always  # every project
/vocab rate off       # back to the default of 1
```

Capped at 5 — past that a reply is a glossary. The number lives in
`.vibe-vocab-rate` at the project root and applies from the next session; run
`/vocab on` again to apply it immediately. The harvester's safety cap rises with
it, so the extra glosses still get logged.

### Language support

Built and tuned for **Chinese**; **Japanese** and **Korean** are first-class too.
Non-Latin scripts like **Hindi** and **Arabic** work as well — the gloss-length
cap is widened and sentence boundaries are adapted (see
`docs/MULTILANG-FINDINGS.md`).

**Latin-script** native languages (Spanish, Portuguese, Vietnamese, …) are **not
supported** for now: the harvester uses "the gloss contains a non-ASCII
character" to tell a real gloss from an English aside like
`SLA (service level agreement)`, and a Latin-script gloss can't clear that bar.

### Test

```
npm test
```

Runs harvest, dedupe, report, and multi-language checks offline. No Claude Code
needed.

### Known limits (v0.1)

- Only first mentions that match `term（short gloss）` with a non-ASCII character in the gloss get harvested. Terms introduced some other way stay out of the log — though you still read them.
- Term extraction grabs up to 4 words before the parenthesis, so unusual phrasing can clip a multi-word term.
- How many terms per reply is set by `/vocab rate` (default 1, capped at 5); *which* term still rides on prompt control and needs tuning against real use — see `docs/DOGFOODING.md`.

### How the prompt was chosen

`rules/vibe-vocab.md` is the `checklist-gate-v2` prompt, picked over five other
strategies in a blind evaluation. Write-up, scoring, and residual risks:
`docs/PROMPT-ITERATION-RESULTS.md`. Frozen candidates: `docs/archive/`.

## License

MIT — star ⭐ if it taught you a word you now use without thinking.
