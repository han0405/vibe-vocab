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
  🌐 <strong>Languages · 语言</strong>:
  <a href="#中文"><strong>🇨🇳 中文</strong></a> ·
  <a href="#english"><strong>🇬🇧 English</strong></a> ·
  <a href="docs/i18n/README.ja.md">🇯🇵 日本語</a> ·
  <a href="docs/i18n/README.ko.md">🇰🇷 한국어</a>
</p>

---

## 中文

### 一句话

用中文 vibe coding，Claude 照常干活。唯一的区别：每条回复里**最关键的那个概念**，Claude 保留英文术语，第一次出现时补一句极简中文注释，之后就直接裸用——你靠上下文认它。在真实语境里学技术英语，零额外时间。

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

右边**只标了一个词**：`正则化`、`早停`、`数据增强` 都还是中文。默认一条回复只挑最核心的那个概念；想多学几个，`/vocab rate` 可放宽到最多 5 个。

没有独立 App，没有背单词时段，不打断心流——后台一个 hook 把 `术语（注释）` 悄悄收进项目根目录的 `vocab-log.md`。

### 为什么有用

- **零额外时间** —— 你在写代码，不是在背单词。
- **带语境** —— 记住的是「模型把噪声也背下来了，这叫 overfitting」，不是「overfitting = 过拟合」。
- **符合习得规律** —— 只在第一次解释，之后逼你在真实使用里回忆，而不是刷卡片。
- **可复习** —— `vocab-log.md` 是一张 Markdown 表，`/vocab export` 一键导进 Anki。

完整规则在 `rules/vibe-vocab.md`（启用时自动注入会话）：每条回复只给**最核心的**概念保留英文 + 首次一句注释，之后裸用；代码、注释、标题里永远不标。

### 安装

```
/plugin marketplace add /path/to/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` 对当前项目启用，当前会话立即生效；`/vocab on always` 全局启用。
- `/vocab off` 关闭。想临时安静一会儿，直接说「别标注」或「focus」。
- 从**项目根目录**启动 `claude`——`vocab-log.md` 和配置文件都落在启动目录，不向子目录继承。
- 改了插件文件后 `/plugin` → update。

### 调节

| 命令 | 作用 |
|---|---|
| `/vocab` | 看生词本摘要：数量、模式、当前设置 |
| `/vocab rate <1-5>` | 一条回复标几个词（默认 1，上限 5——再多就成单词表） |
| `/vocab level <beginner\|mid\|advanced>` | 门槛：日常工程词也标 / 你「大概见过」的词（默认）/ 只标真正专业的词 |
| `/vocab know <词…>` · `/vocab forget <词…>` | 标记「早就会了、永不标注」/ 撤销；`/vocab know backend` 可标记整个词包 |
| `/vocab focus <领域>` | 主动模式：Claude 主动找机会用该词包的词（`frontend` `backend` `ml` `or-stats` `devops`）；`/vocab focus off` 退出 |
| `/vocab export` | 写出 `vocab-anki.csv`，导入 Anki / Excel / Google Sheets |

设置写在项目根目录，下次会话生效；想当场生效，把对应 `/vocab` 命令再跑一次。命令后加 `always` 存为所有项目的默认。进过 `vocab-log.md` 的词下次会话自动裸用，一般不用手动 `know`。

---

## English

### In one line

You vibe-code in your own language and Claude works as usual. The only difference: for the single **most central concept** in each reply, Claude keeps the English term and glosses it once, the first time it appears — after that it goes bare and you pick it up from context. Real terms, real context, zero extra time.

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

**Only one term** is glossed on the right — `正则化`, `早停`, `数据增强` stay in your language. One reply, one concept, the most central; `/vocab rate` raises that to at most 5.

No separate app, no study sessions, nothing that breaks your flow — a background hook quietly harvests the `term（gloss）` pairs into `vocab-log.md` at your project root.

### Why it works

- **Zero extra time** — you're coding, not studying.
- **In context** — you remember "the model memorised the noise, that's overfitting", not "overfitting = 过拟合".
- **Matches how acquisition works** — glossed on first use only; after that you recall it in real use instead of drilling flashcards.
- **Reviewable** — `vocab-log.md` is a plain Markdown table; `/vocab export` sends it to Anki.

Full rules in `rules/vibe-vocab.md` (injected into the session when enabled): each reply keeps English + one short gloss for the **single** most central concept, bare after that; never in code, comments, or headings.

### Install

```
/plugin marketplace add /path/to/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` enables it for the current project, live in the current session; `/vocab on always` enables it globally.
- `/vocab off` disables it. To go quiet for a bit, just say "focus" or "别标注".
- Start `claude` at the **project root** — `vocab-log.md` and the config files land in the directory you start from and don't inherit into subdirectories.
- After editing plugin files, `/plugin` → update.

### Tuning

| Command | What it does |
|---|---|
| `/vocab` | Word-log summary: count, mode, current settings |
| `/vocab rate <1-5>` | Glosses per reply (default 1, capped at 5 — more is a glossary) |
| `/vocab level <beginner\|mid\|advanced>` | The bar: everyday terms too / a term you half-know (default) / only genuinely specialized ones |
| `/vocab know <terms…>` · `/vocab forget <terms…>` | Mark "already knew this, never gloss it" / undo; `/vocab know backend` marks a whole word pack |
| `/vocab focus <domain>` | Active mode: Claude looks for openings to use that pack's terms (`frontend` `backend` `ml` `or-stats` `devops`); `/vocab focus off` to exit |
| `/vocab export` | Writes `vocab-anki.csv` for Anki / Excel / Google Sheets |

Settings live at the project root and apply from the next session; to apply one now, re-run that `/vocab` command. Add `always` to make it the default for every project. Terms already in `vocab-log.md` go bare automatically next session — you rarely need `know`.

## License

MIT — star ⭐ if it taught you a word you now use without thinking.
