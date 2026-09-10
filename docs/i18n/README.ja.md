<p align="center">
  <img src="../../vocab.png" alt="VibeVocab" width="820">
</p>
<p align="center">
  慣れた言語で Vibe Coding、ついでに技術英語も身につける<br>
  <em>Vibe-code in your own language. Pick up the English along the way</em>
</p>
<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat" alt="ライセンス"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-6b4fbb?style=flat" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=flat" alt="Node >= 18">
</p>

<p align="center">
  🌐 <strong>言語</strong>:
  <a href="../../README.md#中文">🇨🇳 中文</a> ·
  <a href="../../README.md#english">🇬🇧 English</a> ·
  <strong>🇯🇵 日本語</strong> ·
  <a href="README.ko.md">🇰🇷 한국어</a>
</p>

---

### ひとことで言うと

母国語で vibe coding し、Claude はいつも通り作業します。違いはひとつだけ：各回答の中で**もっとも中心的な概念**を、Claude は英語の専門用語のまま残し、初めて出てきたときだけ短い注釈を添えます。その後はそのまま使い、あなたは文脈から意味を掴みます。本物の用語を、実際の文脈で、追加の時間ゼロで。

### 何が変わるか

同じ質問で比べてみます：**「モデルの訓練データでは99%、テストデータでは70%しか出ません。どうすればいいですか？」**

<table>
<tr>
<td width="50%">

#### 通常の Claude Code

> これは典型的な**过拟合（過学習）**です。訓練データでの成績が良く、テストデータでこれだけ落ちるのは、モデルが訓練データのノイズまで覚えてしまった証拠です。**正则化（正則化）**を加える、**早停（早期終了）**を使う、あるいは**数据增强（データ拡張）**を試す、といった対策が考えられます。訓練データとテストデータの分布が揃っているかも確認する価値があります……

診断もコードも問題ありません。ただし専門用語はすべて日本語のまま——次に英語のドキュメントやエラーログ、カンファレンスの発表を読むときは、また一から調べ直すことになります。

</td>
<td width="50%">

#### VibeVocab を有効にすると

> 典型的な **overfitting（過学習）** です。モデルが訓練データのノイズまで覚えてしまっています。
>
> 1. 該当する層に L2 正則化を加える。`weight_decay=1e-4` から始める
> 2. 早期終了を有効にし、train loss ではなく validation loss を監視する
> 3. それでも改善しなければ data augmentation を試す
>
> 次のステップ：今の train/val loss のグラフを貼ってください。

同じ診断内容に加えて、`overfitting` という単語と、それが登場した実際の一文がそのまま `vocab-log.md` に記録されます。
次回、Claude は迷わず `overfitting` と書きます——あなたはもう見たことがあるからです。

</td>
</tr>
</table>

右側で**注釈が付いているのは1つの単語だけ**——`正则化`、`早停`、`数据增强` は日本語のままです。1回の回答につき、もっとも中心的な概念をひとつだけ。`/vocab rate` で最大5個まで緩められます。

専用アプリなし、単語学習の時間なし、作業の流れも妨げません——バックグラウンドの hook が `用語（注釈）` を静かに拾い、プロジェクトルートの `vocab-log.md` に記録します。

### なぜ効果があるのか

- **追加の時間がゼロ** —— 単語を覚えているのではなく、コードを書いているだけです。
- **文脈込みで覚えられる** —— 覚えるのは「overfitting = 過学習」ではなく、「モデルがノイズまで覚えてしまった、これが overfitting」という文脈です。
- **習得の仕組みに合っている** —— 説明は最初の1回だけ。その後は実際の使用の中で思い出すことになります。単語カードをめくるのとは違います。
- **見直せる** —— `vocab-log.md` はただの Markdown 表。`/vocab export` で Anki に送れます。

完全なルールは `rules/vibe-vocab.md`（有効化時にセッションへ注入）：各回答につき**もっとも中心的な**概念ひとつだけ英語表記＋初出時に短い注釈、以降はそのまま使う。コード・コメント・見出しには絶対に付けない。

### インストール

```
/plugin marketplace add han0405/vibe-vocab
/plugin install vibe-vocab@han0405
/vocab on
```

- `/vocab on` は現在のプロジェクトで有効化し、現在のセッションから即反映。`/vocab on always` は全プロジェクトで有効化。
- `/vocab off` で無効化。少し静かにしたいときは「注釈は要らない」や "focus" と言うだけ。
- `claude` は**プロジェクトルート**で起動してください——`vocab-log.md` と設定ファイルは起動したディレクトリに置かれ、サブディレクトリには継承されません。
- プラグインをいじるなら、ローカルの clone を追加：`/plugin marketplace add /path/to/vibe-vocab`、編集後は `/plugin` → update。

### 調整

| コマンド | 役割 |
|---|---|
| `/vocab` | 単語帳の概要：件数・モード・現在の設定 |
| `/vocab rate <1-5>` | 1回答あたりの注釈数（デフォルト1、上限5——それ以上は単語帳） |
| `/vocab level <beginner\|mid\|advanced>` | 基準：日常的な用語も対象 / だいたい知っている用語（デフォルト）/ 本当に専門的な用語だけ |
| `/vocab know <用語…>` · `/vocab forget <用語…>` | 「元々知っている、注釈不要」と登録 / 取り消し。`/vocab know backend` で単語パックごと登録 |
| `/vocab focus <分野>` | アクティブモード：Claude がそのパックの用語を使う機会を積極的に探す（`frontend` `backend` `ml` `or-stats` `devops`）。`/vocab focus off` で解除 |
| `/vocab export` | `vocab-anki.csv` を書き出し（Anki / Excel / Google Sheets 用） |

設定はプロジェクトルートに保存され、次のセッションから有効になります。すぐ反映したいときは、その `/vocab` コマンドをもう一度実行してください。コマンドに `always` を付けると全プロジェクトのデフォルトになります。`vocab-log.md` にある用語は次のセッションから自動でそのまま使われるので、`know` はほとんど不要です。

### なぜ作ったか

Vibe coding のおかげで、ほとんどコードを書かずにものを作れるようになりました。それでも一日中、技術英語には触れ続けます——ドキュメント、エラー、API 名、モデルが自分のプロジェクトを説明するときの言葉。「overfitting = 過学習」と暗記する代わりに、実際に問題を解決している最中にその単語と出会い、翌日また出会い、やがて訳さなくなる。ものを作る。ついでに言葉も身につく。

## ライセンス

MIT —— 意識せずに使える単語をひとつでも教えてくれたら、Star ⭐ をお願いします。
