# BÀN GIAO — DB TG & App Sale

Cập nhật lần cuối: **02/09/2026**. File này ghi những thứ **phải biết trước khi sửa**.
Ai vào sau đọc file này trước, đừng đọc code trước.

---

## 1. LUẬT NGUỒN SỐ — quan trọng nhất

### 1.1. Kênh MWG lấy số từ sheet **DATA MWG**, không lấy từ CENTER

Anh Thái chốt ngày 02/09/2026, **áp cho cả DB TG lẫn App Sale**.

**Vì sao:** DATA MWG là số đổi trả, nhưng **có theo NGÀY** và **về sớm hơn CENTER nhiều ngày**.
Sale cần số để triển khai ngay trong tháng, không đợi được. Anh Thái biết rõ đó là số
đổi trả và vẫn chọn dùng nó cho mọi chỉ số chi tiết MWG.

**Đã làm xong:** `scripts/build-app-data.js` và bản sao trong `TinhTG.gs`
(`TG_BUILD_APP_DATA`). Tìm chữ `napKenhMWG` và `napNgayKenhMWG`.

**Nguồn thay thế:**

| Cần gì | Lấy ở đâu |
|---|---|
| Số máy / doanh thu theo shop × tháng × model | `MAIN.shop_model_data[shop][tháng][model]` |
| Số theo NGÀY (và quyết định `maxDay`) | `MAIN.shop_day_data[shop]['<tháng>-<ngày>']` |
| Trục tháng | HỢP của CENTER và DATA MWG |
| Dòng máy (Reno / Find / A) | **Suy từ tên model** — hai sheet đặt tên model khác nhau 100%, không khớp trực tiếp được |
| Phân khúc giá | **Suy từ giá bán thực** = doanh thu ÷ số máy |

**NGOẠI LỆ — không phải lựa chọn, mà vì DATA MWG không có trường đó:**

- **Kích hoạt (activated)** → vẫn lấy CENTER. Đây là số nội bộ OPPO.
- **Target** → vẫn lấy CENTER. Đây là chỉ tiêu OPPO giao, không phải số bán.

### 1.2. CHƯA LÀM XONG — DB TG (bảng chính) vẫn đọc CENTER

**Đây là việc đầu tiên của phiên sau.**

App Sale đã đổi xong. Nhưng DB TG tính số **ngay trong trang** bằng khối code riêng
(`computeData` trong `tg.html`), khối đó vẫn lấy kênh MWG từ CENTER.

Sửa nó = chạm vào `tg.html`, file mà **phiên chat MWG đang dùng chung** — dễ đâm nhau.

**Cách làm đã chứng minh được (dùng lại):**
1. Nạp `window.__exportDataMwg` (CENTER) và `window.__exportDataMain` (DATA MWG) trong trang tg.html
2. Vá bản sao code bằng chuỗi, `eval`, chạy **trên số thật**
3. Đối chiếu bản cũ vs bản mới **từng con số** (tổng theo tháng, theo kênh, theo sale, tổng dòng máy = tổng phân khúc = tổng chung)
4. Khớp rồi mới commit — commit xong **chạy lại bản đã commit và so từng byte** với bản đã kiểm

---

## 2. HAI SHEET — CẠM BẪY ĐÃ MẤT THỜI GIAN

| | CENTER | DATA MWG |
|---|---|---|
| Là gì | Số OPPO chốt, cả 3 kênh (MWG/KA/IND) | Số toàn thị trường mọi hãng, **chỉ kênh MWG** |
| Về lúc nào | Chậm | Sớm, có theo ngày |
| Trong code gọi là | tham số `MWG` / `__exportDataMwg` | tham số `MAIN` / `__exportDataMain` |

**TÊN BIẾN NGƯỢC VỚI TRỰC GIÁC.** `MWG` = CENTER, `MAIN` = DATA MWG. Đừng sửa tên,
nhiều chỗ phụ thuộc — chỉ cần nhớ.

**Cạm bẫy khác:**

- **Tên shop hai bên KHÁC NHAU.** CENTER ghi `FPT - TGG My Phuoc Tay - Cai Lay`,
  DATA MWG ghi `ĐMS_TGI_CBE - An Thái Đông`. Ghép qua `veShopOppo()` / `mapMain`.
- **Tên model hai bên khác 100%.** CENTER: `Reno15 F 5G 12GB+256GB`.
  DATA MWG: `OPPO Reno15 F 5G 12+256GB Xanh nhạt`. Không khớp trực tiếp được.
- **`DATA.daily.rows` KHÔNG có chiều shop** — chỉ cắt được theo sale.
- **`sell_in_rows` là mảng thô**, cột 0 = Store ID dạng SỐ, phải so sánh dạng CHUỖI.
- Trong Apps Script, `getValues()` trả ô ngày là **đối tượng Date**, không phải chuỗi.
  Đã chèn nhánh xử lý riêng ở `parseDateCell` / `parseHourFromDateTimeCell`
  (dùng `Utilities.formatDate(..., 'Asia/Ho_Chi_Minh', ...)`).
  Bỏ nhánh này là **lùi đúng 1 ngày**, mất ngày 31 và đẻ ra ngày 31/12 năm trước.

### 5 shop chưa ghép được tên (361 máy = 1,46% không vào app)

- ĐMS3_TGI_CTH – Đông Hòa
- TGD_BTR_CTH – An Hóa
- ĐMS_BTR_BAT – Mỹ Chánh
- ĐMS3_TGI_MTH – Trung An
- TGD_TGI_CLA – Cai Lậy 1

Thống nhất tên bên CENTER là số tự về, **không phải sửa code**.

---

## 3. PHẠM VI & BẢO MẬT — luật cứng

> **CẮT Ở TẦNG ĐÓNG GÓI, KHÔNG PHẢI TẦNG GIAO DIỆN.**
> Ẩn trên màn hình thì dữ liệu VẪN NẰM trong file của họ — mở F12 là đọc được.

Ba thứ **phải tính lại**, không được bê nguyên số toàn vùng vào gói của một người:
`kpi` · `week_*` · `brand_ranking` / `top_brands`.

### Bộ kiểm rò rỉ

- **`TG_kiemPhamViApp()`** (Apps Script) — chạy trên gói thật của từng người, không cần mã PIN.
  Phép mạnh nhất là **QUÉT DẤU VẾT**: đổi gói ra chuỗi rồi tìm tên của MỌI sale khác.
  Báo **đường dẫn chính xác** (ví dụ `sales[0].s[10].stf[1][0]`) chứ không báo chung chung.
- **`scripts/kiem-goi-that.mjs`** (GitHub Action) — mở gói đã mã hoá bằng mã của chính họ.
  ⚠️ **Bộ này CHỈ soi shop, KHÔNG soi tên.** Nó đã **không bắt được** lỗ rò tồn kho đại lý.
  Nếu còn giữ hai bản cắt phạm vi song song thì nên thêm phép quét tên vào đây.

### Ô `stf` — trùng tên, KHÔNG phải rò rỉ

`stf` là danh sách PG của từng shop. Một PG có thể **trùng tên với một sale khác**.
Phạm vi shop đã được kiểm riêng nên shop trong gói chắc chắn là của người đó → tên trong
`stf` là nhân viên shop của họ. Xoá đi là họ mất bảng PG của chính mình.
Bộ kiểm đã tự phân biệt, vẫn ghi lại ở mục `trungTen` để đối chiếu.

### Lỗ rò đã sửa 02/09 — bảng tồn kho đại lý

Một đại lý có nhiều chi nhánh thuộc **nhiều sale khác nhau**. Bản cũ chỉ *lọc dòng* nhưng
bê nguyên mảng `sale[]` và `cn[]` → sale A đọc được tên sale B và tên shop của B.
Đã sửa ở **cả hai đường**: `TGV_locTon()` (Apps Script) và `locTon()` (`build-vault.mjs`).
Tổng nhập/bán/tồn vẫn giữ — hàng nằm ở kho đại lý, sale phải biết tổng mới đặt hàng được.

---

## 4. MÃ ĐĂNG NHẬP

- **Mã PIN KHÔNG nằm trong mã nguồn.** Apps Script: Thuộc tính tập lệnh `SALE_CODES`.
  GitHub: Secret `SALE_CODES`. **Hai chỗ phải khớp nhau.**
- Định dạng: `{ "admin": {"pin":"…","ten":"…"}, "leader": {"MWG":"…","KA":"…","IND":"…"}, "sales": {"TÊN SALE":"…"} }`
- Mã phải là **6–12 chữ số**. Sai định dạng là người đó bị bỏ qua, không dựng gói.
- Đường Apps Script: **mã PIN không đi qua đường truyền**. App gửi `sha256(pin + "|" + id)`.
  Mã không nằm trong nhật ký máy chủ, không nằm trong lịch sử trình duyệt, không nằm trong URL.
- `AS_KEY` (Apps Script: `API_KEY`) khoá cổng `/exec`. **Không được nhét vào `app.html`** —
  file đó công khai trên GitHub Pages, ai cũng đọc được, mà cầm `AS_KEY` là kéo được cả sheet.

---

## 5. HAI ĐƯỜNG CHẠY SONG SONG

### Đường ĐANG DÙNG THẬT — robot GitHub

```
Actions cap-nhat-du-lieu.yml  (*/30 1-15 * * *  UTC = 08:00-22:30 giờ VN, mỗi 30 phút)
  → do-nguon.mjs        hỏi Apps Script số dòng sheet; bằng lần trước thì thoát (~1 phút)
  → refresh-app-data.mjs  Playwright mở tg.html, chạy scripts/build-app-data.js
  → build-vault.mjs     cắt phạm vi + mã hoá  → data/<id>.json + data/index.json
  → kiem-goi-that.mjs   mở lại gói bằng mã thật, soi rò rỉ
app.html  đọc data/index.json rồi data/<id>.json, mở khoá bằng PIN
```

Bấm tay: Actions → *Cap nhat so lieu App* → **Run workflow**.
Bấm tay thì **bỏ qua bước dò**, chạy thẳng.

⚠️ **Mã số (`id`) sinh NGẪU NHIÊN mỗi lượt robot** → sale phải đăng nhập lại sau mỗi lượt.

### Đường MỚI — Apps Script tự làm (đã chạy, chưa đấu vào app)

```
TG_chotKy()      lịch 2 tiếng/lần  → đọc CENTER + DATA MWG, lưu file chốt kỳ   (~40 giây)
TG_dungGoiApp()  lịch 2 tiếng/lần  → dựng 20 gói đã cắt phạm vi                (~205 giây)
                                     → TG_app_<id>.json trên Drive
```

⚠️ **HAI LỊCH RIÊNG, CỐ Ý.** Lúc đầu gắn chung (chốt kỳ xong gọi luôn dựng gói) vì giao
diện Trình kích hoạt không nhận cú bấm bằng máy. Sau khi kênh MWG chuyển sang DATA MWG,
bước dựng gói **tăng từ 51 giây lên 205 giây**; cộng với chốt kỳ là ~4 phút, sát hạn
**6 phút** của Google. Tháng sau số nhiều hơn là cả chuỗi chết. Đã tách ra.
**Đừng gộp lại.** Đặt lại lịch: `/exec?mode=tinh&phan=datlichgoi`.

- Mỗi việc riêng lẻ vẫn còn biên an toàn: 205 giây / 360 giây. **Cần theo dõi khi số lớn dần.**
- **`id` ở đường này CỐ ĐỊNH** = `sha256('DBTG|'+vaiTro+'|'+tên).slice(0,16)`.
- **Trigger chạy MÃ ĐÃ LƯU, không phải bản đã triển khai.** Đổi code + Ctrl+S là lịch ăn ngay.
  Chỉ các đường HTTP (`/exec`) mới cần Triển khai bản mới.

**Vì sao chưa đấu App Sale sang:** cổng `/exec` khoá bằng `AS_KEY`, mà `AS_KEY` không được
nằm trong `app.html`. Muốn đấu thì phải mở cổng riêng cho hai đường `appindex` và
`goi/<id>/<mã>` trong `Mã.gs` — hai đường đó đã tự khoá bằng PIN từng người rồi.
**Anh Thái đã chọn: giữ robot làm người đưa thư, chưa đụng `Mã.gs`.**

**Việc tiếp theo cho đường này:** thay ruột `refresh-app-data.mjs` — bỏ Playwright, gọi thẳng
Apps Script lấy 20 gói đã cắt sẵn rồi mã hoá. Nhanh hơn ~7 lần và **xoá được bản cắt phạm vi
trùng lặp bên Node** — đúng chỗ đã đẻ ra lỗ rò tồn kho.

---

## 6. CÁCH LÀM VIỆC VỚI APPS SCRIPT (đã tốn thời gian, đừng lặp lại)

- **Không sửa `Mã.gs`.** File đó dùng chung với phiên chat MWG. Code mới để trong `TinhTG.gs`.
  Vì vậy `goi/<id>/<bam>` nhét cả ba thứ vào MỘT tham số `phan` — để khỏi phải sửa `Mã.gs`.
- **Chuyển file vào trình soạn thảo:** commit lên GitHub → trong tab Apps Script chạy
  `fetch` URL raw **theo SHA cụ thể** (không dùng `main`, CDN trễ ~1 phút) →
  `monaco.editor.getModels()` → `pushEditOperations`. Chuyển nguyên vẹn từng byte, gần như không tốn gì.
- **Ctrl+S phải bấm khi ĐANG mở đúng file** — chọn `TinhTG.gs` ở cột trái rồi mới lưu.
  Sau khi tải lại trang, trình soạn thảo tự nhảy về `Mã.gs`.
- **Hộp thoại Triển khai rất khó bấm bằng máy.** Trình tự chạy được:
  `find` nút Triển khai → click theo `ref` → `find` mục "Quản lý tùy chọn triển khai" → click `ref`
  → chờ 5 giây → `find` bút chì → click `ref` → click ô phiên bản theo TOẠ ĐỘ (777, 220)
  → chụp màn hình xác nhận danh sách đã mở → **Up** → **Enter** → `find` nút Triển khai xanh → click `ref`.
  Click theo toạ độ vào các mục trong danh sách gần như luôn trượt.
- **Ô "Chọn nguồn sự kiện" trong trang Trình kích hoạt không nhận cú bấm bằng máy.**
  Vì vậy lịch dựng gói được gắn vào `TG_chotKy` thay vì tạo trigger riêng.
- **Nút "Chạy" hay tự nhảy sang "Gỡ lỗi"** và treo phiên. Đã thêm các đường HTTP chẩn đoán để khỏi phải bấm.
- **Lỗi ném ra khỏi `doGet` trả về trang HTML không có header CORS** → trình duyệt chỉ thấy
  "Failed to fetch". Đã bọc `TG_traKetQua_` trong try/catch trả JSON đọc được.

## 7. GITHUB

Tài khoản **MrDT1988 chưa cài GitHub App của Claude** → phiên Cowork **không push thẳng được**.
Phải commit qua trình duyệt: `github.com/MrDT1988/dashboard-phu-kien/upload/main[/<thư mục>]`
→ `file_upload` vào ô chọn file → gõ lời commit → **Commit changes**.

⚠️ Gõ ký tự `/` vào ô lời commit sẽ mở thanh tìm kiếm của GitHub. Dùng `-` thay cho `/`.

---

## 8. ĐƯỜNG HTTP CHẨN ĐOÁN

Gọi từ tab **tg.html** đang mở (trang đó tự gắn `key=` vào mọi yêu cầu gửi Apps Script).

`https://script.google.com/macros/s/<ID>/exec?mode=tinh&phan=<...>`

| `phan` | Làm gì |
|---|---|
| `center` / `mwg` | Trả gói đã chốt của từng sheet |
| `chotky` | *(không có — `TG_chotKy` chạy bằng lịch)* |
| `soicot` | Soi cột Doanh thu sheet CENTER |
| `soiphu` | Soi các sheet phụ |
| `soiapp` | Soi khối app-data |
| `xemlich` | Xem đang có lịch nào |
| `appindex` | Danh sách 20 người (id / tên / vai trò — **không có mã**) |
| `dunggoi` | Dựng lại 20 gói ngay (~51 giây) |
| `kiempv` | **Bộ kiểm rò rỉ phạm vi** (~12–18 giây) |
| `goi/<id>/<bam>` | Lấy gói của đúng một người, `bam = sha256(pin + '|' + id)` |
| `datlich` / `datlichgoi` | Đặt lịch |

⚠️ `dunggoi` **ghi đè** 20 gói trên Drive. Chỉ gọi khi bản đã Triển khai đúng là bản mới nhất,
không thì nó ghi đè bằng logic cũ.

---

## 9. VIỆC CÒN TREO

1. **DB TG (bảng chính) chuyển kênh MWG sang DATA MWG** — xem mục 1.2. Ưu tiên 1.
2. **Thay ruột robot**: bỏ Playwright, gọi thẳng Apps Script — xem mục 5.
3. **Thống nhất tên 5 shop** để lấy lại 361 máy — xem mục 2.
4. **Đổi toàn bộ mã PIN**: file PDF mã đã đi qua khung chat ngày 02/09.
   Đổi ở **cả** `SALE_CODES` (Apps Script) **và** GitHub Secret.
5. **`tg.html` dòng ~3154** còn `dayDate.toISOString()` phụ thuộc múi giờ trình duyệt.
   Đang chữa tạm bằng cách ép trình duyệt của robot về `Asia/Ho_Chi_Minh` trong
   `refresh-app-data.mjs`. Nên sửa tận gốc.
6. **Lịch `TG_chotKy` đang có tỷ lệ lỗi 50%** (xem trang Trình kích hoạt) — chưa truy nguyên nhân.
   Kèm theo: **bước dựng gói đã lên 205 giây / hạn 360 giây**. Số càng nhiều càng sát hạn.
   Nếu chạm hạn: cắt `TG_dungGoiApp` thành nhiều lượt (mỗi lượt vài người) rồi ghép lại.
7. **Dự án Apps Script trùng lặp** `1uGFYFT7v0eXV4IU-hVDyJkxxBLZ8wlucE-5xqXBouN3CCvj0i9A8aDR6` — chưa dọn.
8. **Mỗi lần nhập số tháng mới** phải nối dài chuỗi ranh giới khối `ROW()` ở ô R2/S2 sheet DATA MWG.

---

## 10. THUỘC LÒNG

- **Số liệu của 20 người thật.** Sửa xong phải **chạy thử trên số thật và đối chiếu từng con số**,
  không đẩy mù. Cách đã dùng cả ngày 02/09: vá chuỗi → `eval` trong trang → so bản cũ với bản mới
  → commit → **chạy lại bản đã commit, so từng byte** với bản đã kiểm.
- **Không đoán số.** Nguồn nào không có thì bỏ trống, có cờ `src` báo rõ lấy được gì.
- **Không tự sửa số trên sheet.** Ngày 02/09 suýt thay công thức sống `=R2*T2` của cột Doanh thu
  bằng giá trị cứng vì chẩn đoán sai — kịp đính chính trước khi chạy. Soi kỹ trước, sửa sau.
