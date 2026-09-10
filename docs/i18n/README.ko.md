<p align="center">
  <strong>VibeVocab</strong>
</p>
<p align="center">
  <strong>모국어로 vibe coding 하면서, 기술 영어를 자연스럽게 익히세요.</strong>
</p>
<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat" alt="라이선스"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-6b4fbb?style=flat" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=flat" alt="Node >= 18">
</p>

<p align="center">
  🌐 <strong>언어</strong>:
  <a href="../../README.md#中文">🇨🇳 中文</a> ·
  <a href="../../README.md#english">🇬🇧 English</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <strong>🇰🇷 한국어</strong>
</p>

---

### 한 줄로 말하면

**vibe coding을 할 때** 당신은 평소처럼 모국어로 요청하고, Claude는 평소처럼 작업합니다. 유일한 차이는 각 답변에서 **가장 핵심적인 개념 하나**를 Claude가 영어 용어로 표현하고, 그 용어가 처음 등장할 때만 짧은 주석을 붙인다는 것입니다. 그 이후로는 그 단어를 그대로 사용하며 더 이상 설명하지 않습니다 —— 문맥에서 스스로 파악하시면 됩니다.

실제 맥락 속에서 진짜 영어 전문 용어를 익히세요!

### 무엇이 달라지는가

같은 질문으로 비교해 보겠습니다: **"모델이 훈련 데이터에서는 99%, 테스트 데이터에서는 70%밖에 안 나와요. 어떻게 해야 하나요?"**

<table>
<tr>
<td width="50%">

#### 일반 Claude Code

> 전형적인 **过拟合(과적합)**입니다. 훈련 데이터에서는 잘 나오는데 테스트 데이터에서 이렇게 떨어진다는 건, 모델이 훈련 데이터의 노이즈까지 외워버렸다는 뜻입니다. **正则化(정규화)**를 추가하거나 **早停(조기 종료)**를 켜거나 **数据增强(데이터 증강)**을 시도해볼 수 있습니다. 훈련 데이터와 테스트 데이터의 분포가 일치하는지도 확인해볼 가치가 있습니다……

진단도 맞고 코드도 잘 동작합니다. 하지만 용어가 전부 한국어로 남아있어서, 다음에 영어 문서나 에러 로그, 컨퍼런스 발표를 볼 때 또 처음부터 찾아봐야 합니다.

</td>
<td width="50%">

#### VibeVocab을 켜면

> 전형적인 **overfitting(과적합)**입니다. 모델이 훈련 데이터의 노이즈까지 외워버렸습니다.
>
> 1. 해당 레이어에 L2 정규화를 추가하세요. `weight_decay=1e-4`부터 시작
> 2. 조기 종료를 켜고, train loss가 아니라 validation loss를 지켜보세요
> 3. 그래도 안 되면 data augmentation을 시도하세요
>
> 다음 단계: 지금의 train/val loss 그래프를 붙여넣어 주세요.

같은 진단 내용에 더해 `overfitting`이라는 단어와 그 단어가 등장한 실제 문장이 그대로 `vocab-log.md`에 저장됩니다.
다음번에는 Claude가 바로 `overfitting`이라고 씁니다 —— 이미 한 번 봤으니까요.

</td>
</tr>
</table>

오른쪽에서는 **단어 하나에만** 주석이 붙어 있다는 점을 눈여겨보세요: `正则化`, `早停`, `数据增强`은 그대로입니다. 이건 **기본값**입니다 ——
한 답변당 가장 핵심적인 개념 하나만 고릅니다. 전부 주석을 달면 단어장이 되어버리고, 아무도 읽지 않게 됩니다. 한 답변에서 더 배우고 싶다면 `/vocab rate`로 최대 5개까지 늘릴 수 있습니다 (아래 「답변당 주석 개수」 참고).

별도의 앱도, 단어 암기 시간도 없습니다. 작업 흐름도 끊기지 않습니다. 백그라운드 hook이 `용어(주석)`을
조용히 모아서 프로젝트 루트의 `vocab-log.md`에 기록합니다.

### 왜 효과가 있는가

- **추가 시간이 전혀 들지 않음** —— 단어를 외우는 게 아니라 코드를 짜고 있을 뿐입니다.
- **맥락과 함께 기억함** —— "overfitting = 과적합"이 아니라 "모델이 노이즈까지 외워버렸다, 이게 overfitting이다"를 기억하게 됩니다.
- **습득 원리에 맞음** —— 처음 한 번만 설명하고, 그 다음부터는 실제 사용 속에서 떠올리도록 만듭니다. 플래시카드를 넘기는 것과는 다릅니다.
- **복습 가능** —— `vocab-log.md`는 그냥 Markdown 표입니다. 간격 반복 학습을 하고 싶다면 직접 Anki로 내보내면 됩니다.

### 규칙

전문은 `rules/vibe-vocab.md`에 있습니다 (hook이 세션에 주입). 핵심은 한 문장입니다:

> 답변마다 **가장 핵심적인** 개념 하나만 영어로 남기고, 처음 등장할 때 짧은 주석을 한 번 달고, 이후로는 그대로 사용한다.
> 모든 용어에 다는 게 아니다 —— 그러면 단어장이 된다. 코드, 주석, 제목에는 절대 달지 않는다.

(`/vocab rate`로 이 "하나"를 최대 5개까지 늘릴 수 있습니다. 자세한 내용은 아래 참고.)

### 구성

| 구성 요소 | 역할 |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | `SessionStart` hook. 활성화 시 규칙을 세션에 주입합니다. |
| `hooks/hooks.json` + `scripts/log-vocab.js` | `Stop` hook. 매 턴이 끝난 후 새 용어를 `vocab-log.md`에 수집합니다. 답변을 절대 막지 않습니다. |
| `commands/vocab.md` | `/vocab on` / `off`, `/vocab` (단어장 보기), `/vocab focus <분야>` (액티브 모드), `/vocab rate <1-5>` (답변당 주석 개수). |
| `wordpacks/*.md` | 선별된 단어 목록: `frontend`, `backend`, `ml`, `or-stats`, `devops`. |

### 활성화하기

Claude Code v2에는 `/output-style`이 없어서, 플래그 파일 + hook 방식으로 활성화합니다.

```
/plugin marketplace add /path/to/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` —— 현재 프로젝트에 활성화, 현재 세션에서 바로 적용됩니다.
- `/vocab on always` —— 전역적으로 활성화합니다.
- `/vocab off` —— 비활성화합니다. 잠시 멈추고 싶다면 "주석 달지 마" 또는 "focus"라고 말하면 해당 세션만 일시 정지됩니다.

플러그인 파일을 수정한 뒤에는 `/plugin` → update로 적용합니다. 엔드투엔드 검증 절차는 `docs/DOGFOODING.md`를 참고하세요.

### 세 가지 모드

- **패시브 (기본값)** —— 단어 목록 없이, Claude가 대화에서 직접 고릅니다. 답변당 주석 1개 (기본값이며 `/vocab rate`로 조정 가능).
- **액티브** —— `/vocab focus backend`로 해당 단어팩을 `vocab-focus.md`에 기록하면, Claude가 그 용어들을 자연스럽게 쓸 기회를 적극적으로 찾습니다. `/vocab focus off`로 패시브로 돌아갑니다.
- **뮤트** —— "주석 달지 마" / "focus"라고 하면 현재 세션만 일시 정지됩니다. `/vocab off`는 이후 세션까지 함께 끕니다.

### 답변당 주석 개수

기본값은 답변당 **가장 핵심적인 개념 하나**만 주석을 답니다. 늘리고 싶다면:

```
/vocab rate 3         # 현재 프로젝트, 답변당 최대 3개
/vocab rate 3 always  # 모든 프로젝트
/vocab rate off       # 기본값 1로 되돌리기
```

상한은 5개입니다 —— 그 이상이면 단어장이 되어버립니다. 설정값은 프로젝트 루트의 `.vibe-vocab-rate`에 저장되며 다음 세션부터 적용됩니다. 바로 적용하고 싶다면 `/vocab on`을 다시 실행하세요. 백그라운드 수집기의 안전 상한도 함께 올라가서, 늘어난 주석도 빠짐없이 기록됩니다.

### 지원 언어

**중국어**를 기준으로 만들어지고 다듬어졌습니다. **일본어와 한국어**도 마찬가지로 1급 지원 언어입니다. **힌디어, 아랍어**같은 비라틴 문자 언어도 지원됩니다
(주석 길이 상한을 넓히고 문장 경계 처리도 맞췄습니다. 자세한 내용은 `docs/MULTILANG-FINDINGS.md` 참고).

### 테스트

```
npm test
```

수집, 중복 제거, 리포트, 다국어 처리 로직을 오프라인으로 한 번에 검증합니다. Claude Code가 필요 없습니다.

### 알려진 제한 사항 (v0.1)

- `용어(짧은 주석)` 형식에 정확히 맞고 주석에 비 ASCII 문자가 포함된 첫 등장만 수집됩니다. 다른 식으로 용어가 소개되면 기록에는 남지 않습니다 (그래도 읽은 건 유효합니다).
- 용어 추출은 괄호 앞 최대 4단어까지만 가져옵니다. 흔치 않은 표현에서는 여러 단어로 된 용어가 잘릴 수 있습니다.
- 답변당 주석 개수는 `/vocab rate`로 조정합니다 (기본값 1, 상한 5). 어떤 용어를 고를지는 여전히 프롬프트에 맡겨져 있고, 실제 사용 속에서 계속 다듬어야 합니다 —— 자세한 내용은 `docs/DOGFOODING.md` 참고.

### 이 프롬프트가 선택된 과정

`rules/vibe-vocab.md`는 `checklist-gate-v2` 프롬프트로, 블라인드 평가에서 다른 5가지 전략과 비교해 선택되었습니다.
과정, 점수, 남은 리스크는 `docs/PROMPT-ITERATION-RESULTS.md`에, 탈락한 후보는 `docs/archive/`에 정리되어 있습니다.

## 라이선스

MIT —— 무의식적으로 쓰게 된 단어를 하나라도 가르쳐줬다면 Star ⭐ 부탁드립니다.
