<p align="center">
  <strong>VibeVocab</strong>
</p>
<p align="center">
  <strong>Vibe coding bằng tiếng mẹ đẻ, học tiếng Anh chuyên ngành miễn phí.</strong>
</p>
<p align="center">
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat" alt="Giấy phép"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-6b4fbb?style=flat" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=flat" alt="Node >= 18">
</p>

<p align="center">
  🌐 <strong>Ngôn ngữ</strong>:
  <a href="../../README.md#中文">🇨🇳 中文</a> ·
  <a href="../../README.md#english">🇬🇧 English</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <a href="README.ko.md">🇰🇷 한국어</a> ·
  <a href="README.pt-BR.md">🇧🇷 Português (Brasil)</a> ·
  <strong>🇻🇳 Tiếng Việt</strong>
</p>

---

### Tóm gọn trong một câu

**Khi vibe coding**, bạn vẫn yêu cầu bằng ngôn ngữ mẹ đẻ như bình thường, Claude vẫn làm việc như bình thường. Điểm khác biệt duy nhất: với **khái niệm trung tâm nhất** trong mỗi câu trả lời, Claude sẽ dùng thuật ngữ tiếng Anh và chú thích ngắn gọn ngay lần đầu tiên nó xuất hiện. Sau đó từ này được dùng trần trụi, không giải thích lại — bạn tự nhận ra nhờ ngữ cảnh.

Học từ vựng tiếng Anh chuyên ngành thật sự, trong ngữ cảnh thật!

### Điều gì thay đổi

Cùng một câu hỏi: **"mô hình của mình đạt 99% trên tập train nhưng chỉ 70% trên tập test — giờ sao?"**

<table>
<tr>
<td width="50%">

#### Claude Code bình thường

> Đây là **过拟合 (overfitting)** kinh điển. Kết quả tốt trên train nhưng tụt mạnh trên test nghĩa là mô hình đã học thuộc cả nhiễu trong dữ liệu train. Có thể thêm **正则化 (regularization)**, bật **早停 (early stopping)**, hoặc thử **数据增强 (data augmentation)** — cũng nên kiểm tra xem phân phối của train và test có giống nhau không…

Chẩn đoán đúng, code cũng chạy được. Nhưng thuật ngữ vẫn giữ nguyên tiếng mẹ đẻ — lần sau đọc tài liệu tiếng Anh, xem stack trace, hay nghe một buổi nói chuyện chuyên ngành, bạn lại phải tra lại từ đầu.

</td>
<td width="50%">

#### Khi bật VibeVocab

> Đây là **overfitting（过拟合）** kinh điển: mô hình đã học thuộc cả nhiễu trong tập train.
>
> 1. Thêm L2 regularization vào các lớp này, bắt đầu với `weight_decay=1e-4`
> 2. Bật early stopping, theo dõi validation loss chứ không phải train loss
> 3. Vẫn chưa ổn thì thử data augmentation
>
> Bước tiếp theo: gửi mình đồ thị train/val loss hiện tại.

Cùng một chẩn đoán, cộng thêm từ `overfitting` và đúng câu nó xuất hiện, được lưu thẳng vào `vocab-log.md`.
Lần sau Claude sẽ viết thẳng `overfitting` — vì bạn đã thấy từ này rồi.

</td>
</tr>
</table>

Để ý rằng bên phải **chỉ có một từ** được chú thích: `正则化`, `早停`, `数据增强` vẫn giữ nguyên. Đây là **mặc định** —
mỗi câu trả lời chỉ chọn một khái niệm trung tâm nhất. Chú thích hết thì thành một bảng từ vựng, và chẳng ai đọc bảng từ vựng cả. Muốn học nhiều hơn mỗi câu trả lời? Dùng `/vocab rate` để nâng giới hạn lên tối đa 5 (xem "Số từ chú thích mỗi câu trả lời" bên dưới).

Không cần app riêng, không có giờ học từ vựng, không làm gián đoạn mạch làm việc của bạn. Một hook chạy nền âm thầm thu thập các cặp `thuật ngữ（chú thích）`
vào file `vocab-log.md` ở gốc dự án.

### Vì sao cách này hiệu quả

- **Không tốn thêm thời gian** — bạn không học từ vựng, bạn đang lập trình.
- **Có ngữ cảnh đi kèm** — bạn không nhớ "overfitting = quá khớp", bạn nhớ "mô hình học thuộc cả nhiễu, đó gọi là overfitting".
- **Đúng với cách não bộ tiếp thu ngôn ngữ** — chỉ giải thích lần đầu; sau đó bạn buộc phải nhớ lại khi dùng thật, chứ không phải lật thẻ ghi nhớ.
- **Có thể xem lại** — `vocab-log.md` chỉ là một bảng Markdown thuần. Muốn ôn tập giãn cách thì tự export sang Anki.

### Quy tắc

Bản đầy đủ ở `rules/vibe-vocab.md` (được hook đưa vào session). Cốt lõi chỉ gói trong một câu:

> Mỗi câu trả lời, chỉ giữ tiếng Anh + một chú thích ngắn cho **duy nhất một** khái niệm trung tâm nhất, sau đó dùng trần trụi.
> Không phải thuật ngữ nào cũng chú thích — như vậy sẽ thành bảng từ vựng. Không bao giờ chú thích trong code, comment, hay tiêu đề.

(`/vocab rate` có thể nâng "một" này lên tối đa 5 — xem bên dưới.)

### Cấu tạo

| Thành phần | Vai trò |
|---|---|
| `rules/vibe-vocab.md` + `scripts/session-start.js` | Hook `SessionStart`, đưa quy tắc vào session khi được bật. |
| `hooks/hooks.json` + `scripts/log-vocab.js` | Hook `Stop`, thu thập thuật ngữ mới vào `vocab-log.md` sau mỗi lượt trả lời. Không bao giờ chặn câu trả lời. |
| `commands/vocab.md` | `/vocab on` / `off`, `/vocab` (xem sổ từ), `/vocab focus <lĩnh vực>` (chế độ Chủ động), `/vocab rate <1-5>` (số từ chú thích mỗi câu trả lời). |
| `wordpacks/*.md` | Danh sách từ chọn lọc: `frontend`, `backend`, `ml`, `or-stats`, `devops`. |

### Kích hoạt

Claude Code v2 không có `/output-style`, nên việc kích hoạt dùng file flag kết hợp hook.

```
/plugin marketplace add /path/to/vibe-vocab
/plugin install vibe-vocab@vibe-vocab-local
/vocab on
```

- `/vocab on` — bật cho dự án hiện tại, có hiệu lực ngay trong session hiện tại.
- `/vocab on always` — bật toàn cục.
- `/vocab off` — tắt. Muốn tạm dừng một lúc thì chỉ cần nói "đừng chú thích" hoặc "focus".

Sau khi chỉnh sửa file plugin, chạy `/plugin` → update để áp dụng. Các bước kiểm tra đầu-cuối nằm ở `docs/DOGFOODING.md`.

### Ba chế độ

- **Bị động (mặc định).** Không có danh sách từ; Claude tự chọn từ cuộc trò chuyện. Mỗi câu trả lời một chú thích (mặc định; `/vocab rate` điều chỉnh được).
- **Chủ động.** `/vocab focus backend` ghi bộ từ đó vào `vocab-focus.md`, Claude sẽ chủ động tìm cơ hội tự nhiên để dùng các từ đó. `/vocab focus off` để quay lại chế độ bị động.
- **Im lặng.** "đừng chú thích" / "focus" tạm dừng session hiện tại; `/vocab off` tắt luôn cho cả các session sau.

### Số từ chú thích mỗi câu trả lời

Mặc định mỗi câu trả lời chỉ chú thích **một** khái niệm trung tâm nhất. Muốn nới rộng:

```
/vocab rate 3         # dự án hiện tại, tối đa 3 từ mỗi câu trả lời
/vocab rate 3 always  # tất cả các dự án
/vocab rate off       # quay về mặc định là 1
```

Giới hạn tối đa là 5 — quá con số đó thì câu trả lời sẽ thành một bảng từ vựng. Giá trị này được lưu vào file `.vibe-vocab-rate` ở gốc dự án và có hiệu lực từ session sau; muốn áp dụng ngay thì chạy lại `/vocab on`. Giới hạn an toàn của bộ thu thập cũng tăng theo, nên các từ chú thích thêm vẫn được ghi lại đầy đủ.

### Hỗ trợ ngôn ngữ

Được xây dựng và tinh chỉnh cho **tiếng Trung**; **tiếng Nhật và tiếng Hàn** cũng là công dân hạng nhất. Các chữ viết không phải Latin như **tiếng Hindi, tiếng Ả Rập** cũng đã được hỗ trợ
(giới hạn độ dài chú thích đã được nới rộng, cách ngắt câu cũng được điều chỉnh — xem `docs/MULTILANG-FINDINGS.md`).

Các ngôn ngữ dùng **chữ Latin** làm tiếng mẹ đẻ (tiếng Tây Ban Nha, tiếng Bồ Đào Nha, **tiếng Việt**…) **hiện chưa được hỗ trợ**: bộ thu thập dùng tiêu chí "chú thích có chứa ký tự không phải ASCII" để phân biệt
một chú thích thật với một cụm tiếng Anh giải thích thêm kiểu `SLA (service level agreement)`, và chú thích bằng chữ Latin không vượt qua được tiêu chí này. Nghĩa là bản dịch README này giúp bạn hiểu dự án, chứ chưa dùng được cho tiếng Việt trong thực tế.

### Kiểm thử

```
npm test
```

Chạy offline toàn bộ kiểm tra thu thập, khử trùng lặp, báo cáo và xử lý đa ngôn ngữ. Không cần Claude Code.

### Giới hạn đã biết (v0.1)

- Chỉ thu thập lần xuất hiện đầu tiên khớp đúng định dạng `thuật ngữ（chú thích ngắn）` với ký tự không phải ASCII trong phần chú thích. Thuật ngữ được giới thiệu theo cách khác sẽ không vào sổ (nhưng bạn vẫn đọc được nó).
- Việc trích thuật ngữ lấy tối đa 4 từ trước dấu ngoặc, nên cách diễn đạt khác thường có thể cắt cụt một thuật ngữ nhiều từ.
- Số từ chú thích mỗi câu trả lời do `/vocab rate` quyết định (mặc định 1, tối đa 5); việc chọn *từ nào* vẫn hoàn toàn phụ thuộc vào prompt và cần tinh chỉnh thêm qua sử dụng thực tế — xem `docs/DOGFOODING.md`.

### Prompt này được chọn như thế nào

`rules/vibe-vocab.md` dùng prompt `checklist-gate-v2`, được chọn sau khi so sánh với năm chiến lược khác trong một đánh giá mù.
Quá trình, điểm số và rủi ro còn lại nằm ở `docs/PROMPT-ITERATION-RESULTS.md`. Các ứng viên bị loại được lưu ở `docs/archive/`.

## Giấy phép

MIT — nếu nó dạy bạn một từ mà giờ bạn dùng mà không cần nghĩ, hãy thả một Star ⭐.
