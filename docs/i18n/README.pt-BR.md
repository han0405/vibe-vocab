<p align="center">
  <strong>VibeVocab</strong>
</p>
<p align="center">
  <strong>Faça vibe coding no seu idioma e aprenda inglês técnico de graça.</strong>
</p>
<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat" alt="Licença"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-6b4fbb?style=flat" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=flat" alt="Node >= 18">
</p>

<p align="center">
  🌐 <strong>Idiomas</strong>:
  <a href="../../README.md#中文">🇨🇳 中文</a> ·
  <a href="../../README.md#english">🇬🇧 English</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <a href="README.ko.md">🇰🇷 한국어</a> ·
  <strong>🇧🇷 Português (Brasil)</strong> ·
  <a href="README.vi.md">🇻🇳 Tiếng Việt</a>
</p>

---

### Em uma frase

**Ao fazer vibe coding**, você pede o que precisa no seu idioma, como sempre, e o Claude trabalha normalmente. A única diferença: para o **conceito mais central** de cada resposta, o Claude usa o termo em inglês e explica com uma nota curta na primeira vez que ele aparece. Depois disso, o termo passa a ser usado sem explicação — você reconhece pelo contexto.

Aprenda termos técnicos em inglês de verdade, no contexto real!

### O que muda

Mesma pergunta: **"meu modelo bate 99% no treino e só 70% no teste — e agora?"**

<table>
<tr>
<td width="50%">

#### Claude Code normal

> Isso é um **过拟合 (overfitting/sobreajuste)** clássico. Um desempenho tão bom no treino e essa queda no teste indica que o modelo decorou até o ruído dos dados de treino. Dá para adicionar **正则化 (regularização)**, ativar **早停 (early stopping)**, ou tentar **数据增强 (data augmentation)** — também vale checar se treino e teste vêm da mesma distribuição…

O diagnóstico está certo e o código funciona. Mas os termos ficam todos no seu idioma — na próxima vez que você ler uma doc em inglês, um stack trace ou assistir a uma palestra, vai ter que procurar tudo de novo.

</td>
<td width="50%">

#### Com o VibeVocab

> Um **overfitting（过拟合）** clássico: o modelo decorou até o ruído do conjunto de treino.
>
> 1. Adicione regularização L2 nessas camadas, comece com `weight_decay=1e-4`
> 2. Ative o early stopping e acompanhe o validation loss, não o train loss
> 3. Se ainda não resolver, use data augmentation
>
> Próximo passo: me mande as curvas atuais de train/val loss.

O mesmo diagnóstico, mais a palavra `overfitting` e a frase real em que ela apareceu, salvos direto no `vocab-log.md`.
Da próxima vez, o Claude já escreve `overfitting` direto — você já viu esse termo.

</td>
</tr>
</table>

Repare que **só um termo** foi anotado do lado direito: `正则化`, `早停` e `数据增强` continuam no idioma original. Esse é o **padrão** —
um conceito por resposta, o mais central. Anotar tudo vira um glossário, e ninguém lê glossário. Quer aprender mais por resposta? O `/vocab rate` aumenta o limite para no máximo 5 (veja "Termos por resposta" abaixo).

Sem aplicativo separado, sem sessão de estudo, sem interromper seu fluxo. Um hook em segundo plano coleta os pares `termo（nota）`
silenciosamente para o `vocab-log.md`, na raiz do seu projeto.

### Por que funciona

- **Zero tempo extra** — você não está estudando, está programando.
- **Com contexto** — você não lembra "overfitting = sobreajuste", lembra "o modelo decorou até o ruído, isso é overfitting".
- **Alinhado com como se aprende de verdade** — a explicação aparece só na primeira vez; depois disso você é forçado a lembrar em uso real, em vez de repetir flashcards.
- **Revisável** — o `vocab-log.md` é uma tabela Markdown simples. Exporte para o Anki se quiser repetição espaçada.

### A regra

Texto completo em `rules/vibe-vocab.md` (injetado na sessão pelo hook). O núcleo é uma frase só:

> A cada resposta, mantenha o inglês + uma nota curta apenas para o conceito **mais central**, e use sem explicação depois disso.
> Não é para marcar todo termo — isso vira glossário. Nunca em código, comentários ou títulos.

(O `/vocab rate` pode elevar esse "um" para no máximo 5 — veja abaixo.)

### O que tem dentro

| Peça | O que faz |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | Hook de `SessionStart`. Injeta as regras na sessão quando ativado. |
| `hooks/hooks.json` + `scripts/log-vocab.js` | Hook de `Stop`. Coleta novos termos para o `vocab-log.md` depois de cada resposta. Nunca bloqueia a resposta. |
| `commands/vocab.md` | `/vocab on` / `off`, `/vocab` (ver o glossário), `/vocab focus <área>` (modo Ativo), `/vocab rate <1-5>` (termos por resposta). |
| `wordpacks/*.md` | Listas selecionadas: `frontend`, `backend`, `ml`, `or-stats`, `devops`. |

### Ativando

O Claude Code v2 não tem `/output-style`, então a ativação é feita com um arquivo de flag + hook.

```
/plugin marketplace add /path/to/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` — ativa no projeto atual, valendo já na sessão atual.
- `/vocab on always` — ativa globalmente.
- `/vocab off` — desativa. Diga "sem anotações" ou "focus" para pausar só nesta sessão.

Depois de editar os arquivos do plugin, rode `/plugin` → update para aplicar. A verificação ponta a ponta está em `docs/DOGFOODING.md`.

### Três modos

- **Passivo (padrão).** Sem lista de palavras; o Claude escolhe a partir da conversa. Uma nota por resposta (o padrão; o `/vocab rate` ajusta).
- **Ativo.** `/vocab focus backend` grava aquele pacote de termos em `vocab-focus.md`, e o Claude procura oportunidades naturais de usá-los. `/vocab focus off` volta ao modo passivo.
- **Mudo.** "sem anotações" / "focus" pausa a sessão atual; `/vocab off` desativa também para as próximas.

### Termos por resposta

Por padrão, cada resposta anota só **um** conceito, o mais central. Para permitir mais:

```
/vocab rate 3         # neste projeto, até 3 por resposta
/vocab rate 3 always  # em todos os projetos
/vocab rate off       # volta ao padrão de 1
```

O limite é 5 — acima disso, a resposta vira um glossário. O valor fica salvo em `.vibe-vocab-rate`, na raiz do projeto, e passa a valer na próxima sessão; rode `/vocab on` de novo para aplicar na hora. O limite de segurança do coletor também sobe junto, então os termos extras não ficam de fora do registro.

### Suporte a idiomas

Criado e ajustado para o **chinês**; **japonês e coreano** também são cidadãos de primeira classe. Escritas não latinas como **hindi e árabe** já são suportadas
(o limite de tamanho da nota foi ampliado e a divisão de frases foi adaptada — veja `docs/MULTILANG-FINDINGS.md`).

Idiomas de **escrita latina** (espanhol, português, vietnamita…) **ainda não são suportados**: o coletor usa "a nota contém caractere não ASCII" para distinguir
uma nota de verdade de um aparte em inglês como `SLA (service level agreement)`, e uma nota em escrita latina não passa nesse teste. Isso inclui o português — por enquanto, esta tradução do README serve para você entender o projeto, não para usá-lo no seu idioma.

### Testes

```
npm test
```

Roda offline a checagem completa de coleta, deduplicação, relatório e suporte multilíngue. Não precisa do Claude Code.

### Limitações conhecidas (v0.1)

- Só é coletada a primeira menção que segue exatamente o padrão `termo（nota curta）` com um caractere não ASCII na nota. Um termo introduzido de outro jeito não entra no registro (mas você ainda assim leu).
- A extração do termo pega até 4 palavras antes do parêntese, então frases fora do padrão podem cortar um termo composto.
- Quantos termos por resposta é controlado por `/vocab rate` (padrão 1, limite 5); *qual* termo escolher ainda depende inteiramente do prompt e precisa de ajuste no uso real — veja `docs/DOGFOODING.md`.

### Como o prompt foi escolhido

`rules/vibe-vocab.md` é o prompt `checklist-gate-v2`, escolhido entre outras cinco estratégias numa avaliação cega.
Detalhes, pontuação e riscos residuais em `docs/PROMPT-ITERATION-RESULTS.md`. Candidatos descartados em `docs/archive/`.

## Licença

MIT — deixe uma estrela ⭐ se isso te ensinou uma palavra que você já usa sem pensar.
