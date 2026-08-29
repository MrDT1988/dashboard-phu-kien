# BẢNG KIỂM 38 MỤC — giống bản demo 100%

Nguồn sự thật: `demo/demo.html` (bản anh Thái duyệt). Mọi mục phải đối chiếu với **chính file
đó**, không đối chiếu với trí nhớ.

Cách kiểm mỗi mục: mở `tg-demo.html` trong máy bằng `thu/chup-chart.mjs` hoặc `thu/chup-bang.mjs`,
chụp đúng mục đó, **mở ảnh ra nhìn**, so với mục tương ứng của demo.

---

## A. 18 BIỂU ĐỒ demo có vẽ

Lời gọi trong demo (đã bóc từ `demo/demo-js.js`) là chuẩn phải đạt.

| # | Mục | Demo vẽ bằng | Trạng thái |
|---|---|---|---|
| A1 | Doanh số theo tuần — cả năm | `veChong` | ✅ khớp |
| A2 | Doanh số theo kênh theo tháng | `veChong` | ✅ khớp |
| A3 | Doanh thu theo kênh theo tháng | `veChong` | ✅ khớp |
| A4 | Sell Out Reno & Find | `veChong` | ✅ khớp |
| A5 | **Tỉ trọng phân khúc giá theo từng kênh** | `ve100('cSegKenh',SEGK.nh,SEGK.bo,PSEG,{rowH:28,PL:56,W:390,fn:11,fs:10.5})` — **thanh NGANG** | ☐ đang là cột dọc |
| A6 | **Tỉ trọng đóng góp theo kênh — vòng Doanh thu** | `veVong('cPieDS',PIE,{ten:'Doanh thu',dec:1,dv:' tỷ',dvTong:'tỷ đồng'})` | ✅ khớp |
| A7 | **Tỉ trọng đóng góp theo kênh — vòng Reno & Find** | `veVong('cPieDT',renoNam,{ten:'Reno & Find',dec:0,dv:' máy',dvTong:'máy Reno',phu:...})` | ☐ **THIẾU HẲN** |
| A8 | Xu hướng % hoàn thành Target | `veDuong` + `moc:100` | ✅ khớp |
| A9 | **Thị phần theo hãng theo tháng** | `veDuong('cShare',TH,dsHang.map(k=>({t:k,v:SHARE[k],c:MK[k],noi:k==='OPPO'})))` — **ĐƯỜNG, OPPO đậm, hãng khác mờ** | ☐ đang là cột chồng |
| A10 | **Tỉ trọng phân khúc giá theo số lượng** | `ve100('cSegUnits',SEGU.nh,SEGU.bo,PSEG,{rowH:30,PL:36})` khi xem tất cả phân khúc; `veChong` khi đã chọn 1 phân khúc | ☐ đang luôn là cột |
| A11 | **Tỉ trọng từng hãng theo phân khúc giá** | `ve100('cSeg',SEGH.nh,SEGH.bo,[--apple,--samsung,--oppo,--xiaomi,--vivo,--realme,--khac],{rowH:26,PL:56})` | ☐ đang là cột dọc |
| A12 | **Tỉ trọng phân khúc giá theo từng hãng** | `ve100('cBrandSeg',HSEG.nh,HSEG.bo,PSEG,{rowH:26,PL:62})` | ☐ đang là cột dọc |
| A13 | Doanh số theo tuần (KA) | `veChong` | ✅ khớp |
| A14 | Sell Out theo tháng (KA) | `veChong` | ✅ khớp |
| A15 | Sell Out theo Reno (KA) | `veChong` | ✅ khớp |
| A16 | Doanh số theo tuần (IND) | `veChong` | ✅ khớp |
| A17 | Sell Out theo tháng — O.C/Normal | `veChong` | ✅ khớp |
| A18 | Sell In theo tháng — O.C/Normal | `veChong` | ✅ khớp |

**Còn phải làm: A5 · A7 · A9 · A10 · A11 · A12**

---

## B. 20 CÂU DẶN cho các bảng "giữ nguyên"

Chép nguyên văn từ demo.

| # | Bảng | Demo dặn | Trạng thái |
|---|---|---|---|
| B1 | Target theo Kênh & Sale | cột % hoàn thành có thanh tiến độ nội dòng, xanh khi ≥100% đỏ khi <70%; hàng tổng tách bằng kẻ đậm thay vì tô nền | ✅ |
| B2 | Chi tiết theo Shop/Đối tác | nút lọc nhanh **có sẵn số đếm ngay trên nút**, và nút **"Xem thêm 100 shop"** | ☐ |
| B3 | Chiến lược Kênh | **mỗi kênh một thẻ, gạch màu bên trái theo màu kênh** | ☐ |
| B4 | Chính sách cho Nhân sự | **danh sách có dấu đầu dòng** | ☐ |
| B5 | Tổng Chương trình BH theo Kênh | thêm **cột thanh tỉ trọng ngân sách** | ☐ |
| B6 | Hiệu suất theo Size Shop | mỗi size một dòng có thanh tỉ trọng; **cột share tô theo thang xanh** | ⚠️ có thanh rồi, thang xanh chưa |
| B7 | TOP 10 sản phẩm | tên model kèm chấm màu hãng; cột số máy có thanh ngang trong ô | ✅ |
| B8 | Chi tiết theo Sale/ASM | cột share có thanh tiến độ, xanh khi trên trung bình vùng, đỏ khi dưới | ✅ |
| B9 | Chi tiết 125 shop | cố định hàng tiêu đề khi cuộn (đã có sẵn) · **nút lọc có số đếm** · **tô nhạt hàng dưới ngưỡng** | ⚠️ |
| B10 | So sánh cùng kỳ tháng trước | **hai cột cạnh nhau, chênh lệch bọc viên thuốc xanh/đỏ** | ☐ |
| B11 | Doanh số & Doanh thu theo ngày | thêm **đường trung bình 7 ngày** | ✅ |
| B12 | Chương trình thi đua tháng | hạng 1–3 có huy hiệu, cột tiến độ dạng thanh | ✅ |
| B13 | Thị phần theo tháng — FPT & Viettel | giữ đủ (không đổi trình bày) | ✅ |
| B14 | Doanh thu chi tiết theo Shop (KA) | dòng nhóm bỏ tô nền, chữ đậm + kẻ trên | ✅ |
| B15 | Shop chưa có PG — Ngân sách | thêm **thanh tỉ trọng ngân sách theo shop** | ✅ |
| B16 | Theo dõi theo Sale — Bảng nhiệt | **thang nhiệt về MỘT TÔNG XANH OPPO nhạt → đậm** | ☐ |
| B17 | Tổng quan Mục tiêu Shop IND | **mỗi mục tiêu một vòng tiến độ nhỏ kèm số tuyệt đối** | ☐ |
| B18 | Tiến độ Target theo Shop O.C | **xếp theo % còn thiếu, shop nguy cơ nằm trên đầu** | ☐ |
| B19 | Thưởng Sale IND | giữ đủ mức thưởng và điều kiện (không đổi trình bày) | ✅ |
| B20 | Tồn kho ước tính | **ô dưới ngưỡng bọc viên thuốc cam** thay vì tô cả ô | ☐ |

**Còn phải làm: B2 · B3 · B4 · B5 · B6 · B9 · B10 · B16 · B17 · B18 · B20**

---

## Luật chung khi làm

1. **KHÔNG sửa `tg.html`.** Mọi thứ nằm trong `scripts/demo-*.js`.
2. Chữ trong ô bảng **không được đổi** — sắp xếp / tìm kiếm / xuất HTML của DB TG phải chạy y nguyên.
   Ngoại lệ: B3, B4, B10, B17 buộc phải dựng lại thẻ; làm xong phải kiểm lại các bộ kiểm.
3. Mọi tệp mở đầu bằng `if (window.__BO_QUA_GOI) return;` — robot làm dữ liệu app đi qua, không chạy.
4. Xong mỗi mục: **chụp ảnh, mở ra nhìn**, so với demo. Không tick khi chưa nhìn.
5. Chạy lại đủ bộ kiểm trước khi đẩy:
   `kiem-tg` 64/64 · `kiem-moc-giao-dien` 20/20 · `kiem-vai` 19/19 · `kiem-doi-nen` 9/9 ·
   `do-tuong-phan sang` = 0 · `do-tuong-phan toi` ≤ 217
