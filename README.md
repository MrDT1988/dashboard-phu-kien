# Dashboard OPPO — Duy Thai

> **Sua gi cung doc `BAN_GIAO.md` truoc.** File do ghi luat nguon so, cam bay hai sheet,
> luat pham vi/bao mat va viec con treo.

He thong dashboard bao cao kinh doanh, host tren GitHub Pages.
Base: https://mrdt1988.github.io/dashboard-phu-kien/

| Ma | Dashboard | Link |
|----|-----------|------|
| PK | Phu kien Nam Phong 2026 | / |
| CP | Chi phi - Quyet toan Partner | /cp.html |
| Sale | Thi dua thang OPPO (MWG) | /sale.html |
| MWG | Report MWG | /mwg.html |
| TG | Report Tien Giang | /tg.html |
| MT | Sellout OPPO Mien Trung | /mt.html |

Luong chinh sua: MWG (nguon goc) -> Sale + TG (phan Chi tiet MWG).
Du lieu KHONG doc truc tiep. Robot (GitHub Actions `cap-nhat-du-lieu.yml`) mo DB TG,
lay so ve roi dong thanh goi ma hoa trong `data/`. Trang doc goi do.
Lich dung goi: moi 30 phut trong khung 08:00-22:30 gio VN (sua 02/09/2026).
Kenh MWG lay so tu sheet DATA MWG, khong lay tu CENTER - xem BAN_GIAO.md muc 1.
Muon co ngay: admin bam nut "Lam moi ngay" canh dong moc so lieu tren DB TG,
hoac Actions > Cap nhat so lieu App > Run workflow.
Nhan duoi tieu de luon ghi ro: so toi ngay nao, goi dung luc nao, da bao nhieu gio.
