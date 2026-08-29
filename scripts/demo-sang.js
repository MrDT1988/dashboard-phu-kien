/* demo-sang.js — GIAO DIEN SANG cho DB TG, theo dung ban demo.
 *
 * VI SAO PHAI CO
 * --------------
 * Ban demo anh Thai duyet mo ra la NEN SANG (the <html> cua no ghi
 * data-theme="light"). Nghia la cai anh chot khong phai "DB TG hien tai ve
 * bieu do dep hon", ma la CA TRANG SANG. Nen day khong phai trang tri them.
 *
 * BAI HOC 28/08 — LAN TRUOC LAM HONG
 * ----------------------------------
 * Lan truoc em ghep giao dien Sang roi day len, anh Thai mo ra: "loi tum lum".
 * Do dem lai: 16 cho chu mo den ti so tuong phan 1,59 (chuan can 4,5) — tuc la
 * gan nhu khong doc duoc. Em khong thay vi em chi NHIN anh chup.
 * Lan nay co bo do that: thu/do-tuong-phan.mjs duyet tung chu tren trang, tinh
 * ti so tuong phan theo cong thuc WCAG, va liet ke moi cho duoi nguong. Chi khi
 * bo do do bao 0 thi moi duoc goi la xong.
 *
 * CACH LAM
 * --------
 * CSS cua DB TG dung bien mau 278 lan, va viet mau cung 217 lan.
 *   - 278 cho: chi can dat lai 18 bien o :root la xong het mot luot.
 *   - 217 cho: phai chi mat tung cai, ghi ro o phan DAT_RIENG ben duoi.
 * Khong dong vao mot dong nao cua tg.html — chi chen mot the <style>.
 *
 * NGUYEN TAC KHI SUA 217 CHO MAU CUNG
 * -----------------------------------
 * SUA NEN TRUOC, khong boi dam chu. Mot khoi nen #0d131b / #48566a nam giua
 * giao dien Sang la BAN TOI CON SOT LAI, khong phai "chu hoi mo". Doi chu
 * thanh trang de qua duoc bo do la an gian: dat diem ma nhin van hong.
 * Giu y nghia mau: xanh = dat, do = kem, ho phach = canh bao, xam = trung tinh.
 *
 * Mau lay tu :root cua ban demo, khong tu nghi ra:
 *   --bg:#F4F6F7 · --card:#FFF · --card2:#FAFBFC · --line:#E4E8EC · --line2:#EFF2F5
 *   --ink:#14171B · --sub:#59636F · --mut:#69727E
 *   --brand:#006B33 · --brand2:#00522A · --bsoft:#E8F3EC · --bline:#BEDCCB
 *   --pos:#0C6231 · --neg:#C62828 · --warn:#9A5B00
 * Ba mau chu phu duoi day KHONG co san trong demo vi demo chi dung ho lam mau
 * VE bieu do (ve thi 3,0 la du), con o day la CHU (can 4,5). Em giu nguyen sac
 * cua demo va chi ha do sang xuong mot nac cho du nguong:
 *   xanh duong  demo --ind #2E7CB8 (4,48 tren nen trang — thieu 0,02) -> #1C5F91
 *   tim         demo --dmcl #8A5CC4 (4,07 tren nen tim nhat)          -> #6D42A6
 *   ho phach    demo --ka #C98A2E (2,8)  -> dung thang --warn #9A5B00 cua demo
 */
(function () {
  'use strict';

  /* ROBOT DI QUA, KHONG LAM GI CA.
     Robot lam du lieu cho app dien thoai (refresh-app-data.mjs) mo chinh trang
     nay, va dat window.__BO_QUA_GOI = true truoc khi trang chay. No chi can SO,
     khong nhin man hinh. Ve them mot lop SVG len 20 bieu do va gan bo theo doi
     tren moi cai bang chi lam robot cham hon va them mot cho co the vo — ma neu
     robot vo thi 20 sale mat du lieu tren app. Nen o day dung han. */
  if (window.__BO_QUA_GOI) return;
  var KHO = 'dbtg_giao_dien';

  var CSS = [
    /* ---- 18 bien goc: dat lai het mot luot ------------------------------ */
    ':root[data-theme="light"]{',
    '  --bg-primary:#F4F6F7; --bg-card:#FFFFFF; --bg-card-hover:#FAFBFC;',
    '  --bg-input:#FFFFFF; --bg-header:#FFFFFF;',
    '  --border-color:#E4E8EC;',
    '  --text-primary:#14171B; --text-secondary:#59636F; --text-on-dark:#FFFFFF;',
    '  --oppo-green:#006B33; --oppo-green-dark:#00522A;',
    /* --neutral ha mot nac so voi --mut #69727E cua demo: #69727E do duoc 4,94
       tren nen TRANG, nhung nhieu o dung no lai co nen xam nhat (#FAFBFC, o
       zebra, o to nhat) nen tut xuong duoi 4,5. #5E6773 con 5,77, du bien an. */
    '  --positive:#0C6231; --negative:#C62828; --neutral:#5E6773;',
    '  --glow-soft:0 1px 3px rgba(16,24,40,.06); --glow-strong:0 2px 8px rgba(16,24,40,.10);',
    '  --dm-line2:#EFF2F5; --dm-bsoft:#E8F3EC; --dm-bline:#BEDCCB; --dm-warn:#9A5B00;',
    '  color-scheme:light;',
    '}',
    /* ---- nen trang va chu chung ---------------------------------------- */
    ':root[data-theme="light"] body{background:#F4F6F7;color:#14171B}',
    ':root[data-theme="light"] .chart-container,',
    ':root[data-theme="light"] .table-section{background:#FFFFFF;border-color:#E4E8EC;',
    '  box-shadow:0 1px 2px rgba(16,24,40,.05),0 1px 3px rgba(16,24,40,.04)}',
    ':root[data-theme="light"] .chart-container:hover{box-shadow:0 2px 6px rgba(16,24,40,.08);',
    '  border-color:#BEDCCB}',
    /* ---- bang ---------------------------------------------------------- */
    ':root[data-theme="light"] table{color:#14171B}',
    ':root[data-theme="light"] th{background:#FAFBFC;color:#59636F;border-color:#E4E8EC}',
    ':root[data-theme="light"] td{border-color:#EFF2F5}',
    ':root[data-theme="light"] tr:hover td{background:#FAFBFC}',

    /* ==================================================================== *
     * DAT_RIENG — 217 cho tg.html viet mau CUNG (khong qua bien).
     * Bien o tren khong voi toi duoc, phai chi mat tung khu.
     * ==================================================================== */

    /* --- 1. BANG BAO LON: khung cuon + hang tieu de ---------------------- *
     * .table-scroll dang la #48566a (xam xanh dam) va thead la #57687e.
     * Day la hai cho hong NANG NHAT: gan het so lieu cua ca trang nam tren
     * hai nen nay, chu da thanh den ma nen van toi -> khong doc duoc.
     * Nen cuon -> trang; hang tieu de -> xam rat nhat de van tach khoi than
     * bang khi ghim (sticky) va cuon, van giu gach xanh OPPO o day. */
    ':root[data-theme="light"] .table-scroll{background:#FFFFFF;border-color:#E4E8EC}',
    ':root[data-theme="light"] .data-table thead th,',
    ':root[data-theme="light"] #shop-combined-table thead th{background:#F1F4F7;color:#14171B;',
    '  border-bottom-color:#006B33}',
    /* Ro chuot len tieu de de sap xep: nen xanh OPPO dam -> chu phai TRANG,
       khong con la #04140e (gan den) nhu ban toi. */
    ':root[data-theme="light"] .data-table thead th:hover{background:#006B33;color:#FFFFFF}',
    /* Vien trai "trung tinh" cua dong khong hon khong kem: #3a4557 la xam gan
       den, tren nen trang thanh mot vach den la mat. Ha ve xam nhat. */
    ':root[data-theme="light"] .data-table tbody tr.row-neutral{border-left-color:#C6CDD6}',

    /* --- 2. BA LOP KHUNG BAO NGOAI: Phan -> Cum -> The ------------------ *
     * tg.html xep ba lop long nhau de mat phan biet duoc khoi: .part-wrap
     * (ca mot Phan) > .cluster-wrap (mot cum muc) > .chart-container/
     * .table-section (tung the). O ban toi ba lop deu la den dam nhat dan.
     * O ban Sang giu dung ba nac do nhung di NGUOC: xam nhat -> xam rat nhat
     * -> trang. Nho vay the trang van noi len tren khung, khong bi chim.
     * Phan 2 giu sac XANH (part-green) vi day la khoi Review Thang trong tam. */
    ':root[data-theme="light"] .part-wrap.part-gray{background:#EFF2F5;border-color:#E4E8EC}',
    ':root[data-theme="light"] .part-wrap.part-green{background:#E8F3EC;border-color:#BEDCCB}',
    ':root[data-theme="light"] .cluster-wrap{background:#F7F9FB;border-color:#E4E8EC;',
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}',
    ':root[data-theme="light"] .part-wrap.part-gray .part-title::before{background:#8B98A9}',
    /* .table-box (hai bang canh nhau) dang #10161f — gan den han. */
    ':root[data-theme="light"] .table-box{background:#FAFBFC;border-color:#E4E8EC;',
    '  box-shadow:0 1px 2px rgba(16,24,40,.05)}',

    /* --- 3. THE KPI ----------------------------------------------------- *
     * Rieng 4 the o "So sanh cung ky thang truoc" (#mc-kpi-row) tg.html co y
     * to nen KHAC voi the thuong (#0d131b) de tach lop, vi ca khoi da nam
     * trong mot .table-section nen trang. Giu dung y do: van tach lop, nhung
     * bang xam nhat chu khong phai den. */
    ':root[data-theme="light"] #mc-kpi-row .kpi-card{background:#F1F4F7;border-left-color:#14171B}',
    ':root[data-theme="light"] .kpi-card{box-shadow:0 1px 2px rgba(16,24,40,.05)}',
    ':root[data-theme="light"] .kpi-card:hover{box-shadow:0 3px 10px rgba(16,24,40,.10);',
    '  border-color:#BEDCCB}',
    /* Nhan "OPPO" trong the so sanh: nen xanh OPPO dam -> chu trang. */
    ':root[data-theme="light"] .mc-kpi-oppo-label{color:#FFFFFF;box-shadow:none}',

    /* --- 4. DAI BANG TOM TAT (mini-month / mini-week) -------------------- *
     * Cot nhan ben trai duoc ghim (sticky) nen bat buoc phai co nen DUC, neu
     * khong cac o so se cuon xuyen qua. tg.html dung #0d131b / #0d1420 /
     * #0d1a17 — ba sac toi tuong ung xam / xanh duong (bang theo ngay, doanh
     * SO) / xanh la (bang theo ngay, doanh THU). Giu dung ba sac do, doi sang
     * ban nhat de con phan biet duoc bang nao la bang nao. */
    ':root[data-theme="light"] .mini-month-table td.mmt-label,',
    ':root[data-theme="light"] .mini-week-table td.mwt-label{background:#F1F4F7;color:#59636F}',
    ':root[data-theme="light"] #chart-daily-mini-table td.mmt-label{background:#EDF3FB}',
    ':root[data-theme="light"] #chart-daily-revenue-mini-table td.mmt-label{background:#E8F3EC}',
    ':root[data-theme="light"] #chart-daily-mini-table tr.mmt-month td{color:#1C5F91}',

    /* --- 5. O NEN TO BANG rgba(255,255,255,...) ------------------------- *
     * Day la cai bay am tham. Tren nen toi, "phu them mot lop trang mo" la
     * cach lam noi o len. Tren nen TRANG thi lop trang mo do bang KHONG:
     * zebra bien mat, hang tong bien mat, hang tieu de nhom bien mat — bo do
     * tuong phan khong bao gi ca vi chu van den tren trang, nhung nhin thi
     * bang mat het duong phan. Nen phai doi thanh mau XAM NHAT that. */
    ':root[data-theme="light"] .shop-detail-table tbody tr:not(.sdt-grand):nth-child(even){',
    '  background:#F7F9FB}',
    ':root[data-theme="light"] .ka-shop-revenue-group-row td{background:#EFF2F5}',
    ':root[data-theme="light"] .ka-shop-revenue-total-row td{background:#F4F6F8}',
    ':root[data-theme="light"] .ind-sale-xe-row td{background:#F4F6F8}',
    ':root[data-theme="light"] .tag,',
    ':root[data-theme="light"] .tag.normal{background:#EFF2F5;color:#59636F}',
    ':root[data-theme="light"] .mini-bar-track{background:#E4E8EC}',
    /* Cot "Ca nam" cua bang nhiet theo hang — tg.html to bang !important nen
       o day cung phai !important, khong thi luat cu de len. */
    ':root[data-theme="light"] .brand-heat-table .bht-year,',
    ':root[data-theme="light"] .brand-heat-table th.bht-year-col{background:#F1F4F7 !important}',
    ':root[data-theme="light"] .brand-heat-table tr:last-child .bht-year{',
    '  background:#E8ECF1 !important}',

    /* --- 6. KHOI GHI CHU / CANH BAO ------------------------------------- *
     * Chu ho phach #ffd873 sinh ra de doc tren nen den; tren nen kem nhat no
     * chi con ti so 1,22. Doi sang --warn #9A5B00 cua demo: van la ho phach,
     * van doc ra "canh bao", nhung du 4,9 tren nen kem. */
    ':root[data-theme="light"] .notes-section{background:#FBF1E3;border-color:#E8CFA0;color:#9A5B00}',
    ':root[data-theme="light"] .notes-section h4{color:#9A5B00}',
    ':root[data-theme="light"] .ind-unresolved-sale-warning{background:#FBF1E3;',
    '  border-color:#E0C08A;color:#9A5B00}',
    ':root[data-theme="light"] .tag.unknown{background:#FBF1E3;color:#9A5B00}',

    /* --- 7. HUY HIEU (metric-tag / goi-badge) --------------------------- *
     * Ba mau nhan DS/DT/DG va ba hang goi lay tu ban toi. Nen cua chung la
     * rgba nhat nen sang len la tu on; chi phai ha DO SANG cua CHU xuong. */
    ':root[data-theme="light"] .metric-tag.units,',
    ':root[data-theme="light"] .metric-tag.pk,',
    ':root[data-theme="light"] .goi-badge.goi-titan{color:#1C5F91}',
    ':root[data-theme="light"] .metric-tag.avgprice{color:#6D42A6}',
    ':root[data-theme="light"] .metric-tag.oppo,',
    ':root[data-theme="light"] .goi-badge.goi-gold{color:#9A5B00}',
    ':root[data-theme="light"] .goi-badge.goi-platinum{background:#EFF2F5;color:#59636F}',

    /* --- 8. NUT / TAB DANG BAT ------------------------------------------ *
     * Moi nut "dang chon" cua tg.html deu la: nen xanh OPPO + chu #04140e
     * (gan den). Dung o ban toi vi xanh OPPO ban toi la #2ad998 rat sang.
     * Ban Sang xanh OPPO la #006B33 (dam) -> chu gan den tren do chi con 2,0.
     * Chu phai la TRANG. Gom ca sau nut vao mot luat. */
    ':root[data-theme="light"] .view-toggle-btn.active,',
    ':root[data-theme="light"] .sale-card-btn.active,',
    ':root[data-theme="light"] .ind-sale-metric-btn.active,',
    ':root[data-theme="light"] .brand-heat-metric-btn.active,',
    ':root[data-theme="light"] .quick-nav a.active,',
    ':root[data-theme="light"] .db-tg-tab.active{color:#FFFFFF}',
    /* Thanh dieu huong nhanh: nen da thanh trang (bien --bg-header) nhung chu
       van la rgba(255,255,255,.82) — tuc chu trang tren nen trang, mat hut. */
    ':root[data-theme="light"] .quick-nav{border-color:#BEDCCB;',
    '  box-shadow:0 1px 3px rgba(16,24,40,.08)}',
    ':root[data-theme="light"] .quick-nav a{color:#59636F}',
    ':root[data-theme="light"] .quick-nav a:hover{background:#EFF2F5;color:#14171B}',
    ':root[data-theme="light"] .quick-nav a.active{box-shadow:none}',

    /* --- 9. BANG DE DAU TRANG ------------------------------------------- *
     * Giu la mot dai mau thuong hieu (nhan dien OPPO), khong bien thanh trang
     * — nhung phai la XANH OPPO chu khong phai gan den nhu ban toi. Chu trang
     * tren xanh #00522A -> 9,6, dat thoai mai. */
    ':root[data-theme="light"] .dashboard-header{',
    '  background:linear-gradient(135deg,#00431F 0%,#00622F 55%,#0A7A45 100%);',
    '  border-color:#00431F;box-shadow:0 2px 10px rgba(16,24,40,.12)}',
    /* Huy hieu va tab dang chon nam NGAY TREN dai xanh do: neu van de nen xanh
       OPPO thi chung chim vao dai. Dao lai: nen trang, chu xanh. */
    ':root[data-theme="light"] .dashboard-header .badge{background:#FFFFFF;color:#00522A;',
    '  box-shadow:none}',
    ':root[data-theme="light"] .db-tg-tab.active{background:#FFFFFF;color:#00522A;',
    '  border-color:#FFFFFF;box-shadow:none}',

    /* --- 10. VUN VAT --------------------------------------------------- */
    ':root[data-theme="light"] .mini-bar-other{background:#9AA4B0}',
    ':root[data-theme="light"] .multiselect-panel{background:#FFFFFF;border-color:#E4E8EC;',
    '  box-shadow:0 8px 24px rgba(16,24,40,.12)}',
    ':root[data-theme="light"] .ind-sale-summary-wrap{box-shadow:0 1px 2px rgba(16,24,40,.05)}',
    ':root[data-theme="light"] ::-webkit-scrollbar-thumb{background:#C6CDD6}',

    /* ==================================================================== *
     * 11. MAU VIET THANG TRONG THUOC TINH style="" CUA THE
     * --------------------------------------------------------------------
     * Tu day tro xuong BAT BUOC dung !important. Khong phai vi thich, ma vi
     * mau nay nam trong style="" ngay tren the (do JS dung chuoi HTML sinh ra,
     * hoac do elem.style.color = ...). Style tren the luon thang moi luat CSS
     * ben ngoai, tru khi co !important. Khong co cach nao khac ma khong sua
     * tg.html — ma tg.html thi khong duoc dong vao.
     *
     * Hai dang ghi cua CUNG MOT mau deu phai bat:
     *   - JS noi chuoi HTML  -> giu nguyen chu goc:  color:#e0b24d
     *   - JS gan elem.style  -> trinh duyet doi ra:  color: rgb(224, 178, 77)
     * ==================================================================== */

    /* 11a. Ho phach (canh bao / ton kho con hang) -> --warn #9A5B00 */
    ':root[data-theme="light"] [style*="color:#e0b24d"],',
    ':root[data-theme="light"] [style*="color: rgb(224, 178, 77)"],',
    ':root[data-theme="light"] [style*="color:#ffd873"],',
    ':root[data-theme="light"] [style*="color:#FFC800"]{color:#9A5B00 !important}',
    /* 11b. Xanh la (dat / duong) -> --pos #0C6231 */
    ':root[data-theme="light"] [style*="color:#2ee673"],',
    ':root[data-theme="light"] [style*="color: rgb(46, 230, 115)"]{color:#0C6231 !important}',
    /* 11c. Xanh duong (nhom DS / Normal / thi phan) -> #1C5F91 */
    ':root[data-theme="light"] [style*="color:#79c0ff"],',
    ':root[data-theme="light"] [style*="color:#5b8fd6"],',
    ':root[data-theme="light"] [style*="color: rgb(91, 143, 214)"]{color:#1C5F91 !important}',
    /* 11d. Do (chua dat) -> --neg #C62828 */
    ':root[data-theme="light"] [style*="color:#ff5c72"],',
    ':root[data-theme="light"] [style*="color: rgb(255, 92, 114)"]{color:#C62828 !important}',
    /* 11e. Xam (kenh KA trong muc Chien luoc Kenh) -> --sub #59636F */
    ':root[data-theme="light"] [style*="color:#B0B7BD"]{color:#59636F !important}',
    /* 11f. Cham tron + vien tren cua ba the "Chien luoc Kenh": giu dung ba sac
       ho phach / xam / xanh la, chi lam dam lai cho thay ro tren nen trang. */
    ':root[data-theme="light"] [style*="solid #FFC800"]{border-top-color:#9A5B00 !important}',
    ':root[data-theme="light"] [style*="background:#FFC800"]{background:#9A5B00 !important}',
    ':root[data-theme="light"] [style*="solid #B0B7BD"]{border-top-color:#8B98A9 !important}',
    ':root[data-theme="light"] [style*="background:#B0B7BD"]{background:#8B98A9 !important}',
    ':root[data-theme="light"] [style*="solid #2ee673"]{border-top-color:#0C6231 !important}',
    ':root[data-theme="light"] [style*="background:#2ee673;"]{background:#0C6231 !important}',

    /* 11g. Cac o canh bao do cua tung bang. Chung deu la <div> co san trong
     * tg.html voi style="...color:#ff8fa3", JS chi bat/tat va do chu vao. Phai
     * ke ten tung cai chu KHONG dung [style*="#ff8fa3"] chung: cung mau do con
     * duoc dung o man hinh dang nhap va man hinh cho — hai man do la NEN TOI
     * that su (khong theo giao dien Sang), doi chu o do thanh do dam la mat
     * chu luon. */
    ':root[data-theme="light"] #sale-table-alert,',
    ':root[data-theme="light"] #shop-dead-alert,',
    ':root[data-theme="light"] #alert-worst-share,',
    ':root[data-theme="light"] #alert-worst-pk1020,',
    ':root[data-theme="light"] #alert-worst-decline,',
    ':root[data-theme="light"] #thidua-size-alert,',
    ':root[data-theme="light"] #thidua-sale-alert,',
    ':root[data-theme="light"] #target-attainment-alert{background:#FBEAEA !important;',
    '  border-color:#EFB9B9 !important;color:#C62828 !important}',

    /* 11h. Dong "bung ra" khi bam vao ten nhom/sale: <td> co san
     * style="background:#101a15" (xanh den) de tach khoi than bang. */
    ':root[data-theme="light"] tr.product-detail-row > td{background:#FAFBFC !important}',

    /* 11i. Ba muc thuong PG o "Chinh sach cho Nhan su": vien ngoai to
     * rgba(34,229,160,0.08) roi vien trong to tiep rgba(34,229,160,0.14) —
     * hai lop CUNG MOT sac xanh chong len nhau. Tren nen toi thi moi lop them
     * mot chut sang, ra ba bac ro rang; tren nen trang thi hai lop gan nhu
     * bang nhau, huy hieu chim vao hang chua no. Doi huy hieu sang ba mau
     * XANH NHAT DUC (khong trong suot) de ba bac lai tach ra. */
    ':root[data-theme="light"] #hr-policy-section span[style*="rgba(34,229,160,0.14)"]{',
    '  background:#E3F3EA !important}',
    ':root[data-theme="light"] #hr-policy-section span[style*="rgba(34,229,160,0.18)"]{',
    '  background:#D8EEE2 !important}',
    ':root[data-theme="light"] #hr-policy-section span[style*="rgba(34,229,160,0.24)"]{',
    '  background:#CDE8D9 !important}',

    /* ==================================================================== *
     * 12. BO VE CUA BAN DEMO (demo-ve.js)
     * --------------------------------------------------------------------
     * demo-ve.js nau san mot the <style> NGAY LUC TAI TRANG. Luc do trang con
     * dang o che do Toi, nen chu thich duoi moi bieu do (.dmv-lg) va o chu
     * thich khi ro chuot (#dmv-tip) bi dong cung mau xam sang #8b98a9 — doi
     * sang che do Sang khong sinh lai the <style> do. Day len tai day.
     * ==================================================================== */
    ':root[data-theme="light"] .dmv-lg{color:#59636F}',
    ':root[data-theme="light"] #dmv-tip{background:#FFFFFF;color:#14171B;',
    '  border-color:#E4E8EC;box-shadow:0 8px 24px rgba(16,24,40,.14)}',

    /* ==================================================================== *
     * 13. BA CHO BO DO TUONG PHAN KHONG BAT DUOC — nhin anh chup moi thay
     * --------------------------------------------------------------------
     * Bo do chi do CHU tren NEN. No khong bat duoc:
     *   - o nhap con trong: chua go gi thi khong co chu de do;
     *   - mot the noi rieng mot goc man hinh ma BEN TRONG NO tu du tuong phan
     *     (chu sang tren nen den) — dat chuan, nhung la mot mieng den dan giua
     *     trang sang.
     * Ca ba cho duoi day deu qua duoc bo do ma nhin van hong.
     * ==================================================================== */

    /* 13a. Hai o "Tu" / "Den" cua bo loc theo ngay: the ghi thang
     * background:#0f151d; color:#e8edf2. Chua go so thi o khong co chu -> bo
     * do bao sach, ma tren anh chup la hai o DEN SI giua hang bo loc trang.
     *
     * PHAI GOI THEO ID, KHONG GOI THEO [style*=...] nhu cac cho khac.
     * Do 29/08: voi <input> thi luat [style*="background:#0f151d"] van an —
     * getComputedStyle tra ve dung mau trang — nhung Chromium VE RA van la o
     * den. Bo do tuong phan doc computed style nen bao sach, chi anh chup moi
     * lo ra. Goi thang theo id thi ve dung. Cung vi vay dat background-color
     * (thuoc tinh le) chu khong dat background (thuoc tinh gop). */
    ':root[data-theme="light"] #filter-day-from,',
    ':root[data-theme="light"] #filter-day-to{background-color:#FFFFFF !important;',
    '  color:#14171B !important;border-color:#E4E8EC !important}',

    /* 13b. Nut "Xuat HTML" o goc phai dai dau trang: vien va chu deu lay
     * var(--oppo-green) = #006B33 o ban Sang — dung mau voi dai xanh dang do
     * no, nen nut bien mat. Dao thanh vien + chu TRANG cho noi len. */
    ':root[data-theme="light"] #export-html-btn{color:#FFFFFF !important;',
    '  border-color:rgba(255,255,255,.55) !important}',
    ':root[data-theme="light"] #export-html-status{color:#FFFFFF !important}',

    /* 13c. The nguoi dang xem + nut Dang xuat, ghim goc duoi trai tren MOI
     * tab. tg.html to cung nen #141b24 voi chu #e8edf2/#7d8896/#96a1ae. Ben
     * trong the do tuong phan rat tot nen bo do cho qua — nhung tren nen Sang
     * no la mot mieng den noi giua trang. Lat nguoc ca the. */
    ':root[data-theme="light"] #dbtg-the-ai{background:#FFFFFF !important;',
    '  border-color:#E4E8EC !important;color:#14171B !important;',
    '  box-shadow:0 6px 22px rgba(16,24,40,.14) !important}',
    ':root[data-theme="light"] #dbtg-the-ai [style*="color:#7d8896"]{color:#59636F !important}',
    ':root[data-theme="light"] #dbtg-the-ai #dbtg-thoat,',
    ':root[data-theme="light"] #dbtg-the-ai #dbtg-thoat-huy{color:#59636F !important;',
    '  border-color:#E4E8EC !important}',
    ':root[data-theme="light"] #dbtg-the-ai #dbtg-thoat-ok{background:#006B33 !important;',
    '  color:#FFFFFF !important}',
  ].join('\n');

  function datCSS() {
    if (document.getElementById('dm-sang-css')) return;
    var st = document.createElement('style');
    st.id = 'dm-sang-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function dat(che) {
    document.documentElement.setAttribute('data-theme', che === 'sang' ? 'light' : 'dark');
    try { localStorage.setItem(KHO, che); } catch (e) {}
    capNhatNut(che);
    // Bo ve va bang doc mau tu bien CSS -> phai ve lai sau khi doi
    setTimeout(function () {
      try { if (window.__dmvVeLai) window.__dmvVeLai(); } catch (e) {}
      try { if (window.__dmBangLai) window.__dmBangLai(); } catch (e) {}
      try { if (window.__dmChamLai) window.__dmChamLai(); } catch (e) {}
    }, 60);
  }

  function dangDung() {
    /* Lan dau mo: mo ra NEN SANG. Vi ban demo anh Thai duyet mac dinh la nen
       sang (the <html> cua no ghi data-theme="light"). Ai quen nen toi thi bam
       mot cai o goc duoi phai, va trang nho lua chon do cho nhung lan sau. */
    try { return localStorage.getItem(KHO) || 'sang'; } catch (e) { return 'sang'; }
  }

  var nut = null;
  function capNhatNut(che) {
    if (!nut) return;
    [].forEach.call(nut.querySelectorAll('[data-che]'), function (b) {
      var on = b.dataset.che === che;
      b.style.background = on ? 'var(--oppo-green)' : 'transparent';
      b.style.color = on ? '#FFFFFF' : 'var(--text-secondary)';
      b.style.fontWeight = on ? '800' : '600';
    });
  }

  function dungNut() {
    if (document.getElementById('dm-sang-nut')) return true;
    nut = document.createElement('div');
    nut.id = 'dm-sang-nut';
    nut.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9986;display:inline-flex;'
      + 'gap:2px;padding:3px;border-radius:10px;background:var(--bg-card);'
      + 'border:1px solid var(--border-color);box-shadow:0 4px 14px rgba(0,0,0,.18);'
      + 'font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    nut.innerHTML = '<button data-che="sang" style="border:0;padding:6px 13px;border-radius:8px;'
      + 'cursor:pointer;font:inherit">Sáng</button>'
      + '<button data-che="toi" style="border:0;padding:6px 13px;border-radius:8px;'
      + 'cursor:pointer;font:inherit">Tối</button>';
    document.body.appendChild(nut);
    nut.addEventListener('click', function (e) {
      var b = e.target.closest('[data-che]'); if (!b) return;
      dat(b.dataset.che);
    });
    return true;
  }

  function khoiDong() {
    datCSS();
    dungNut();
    dat(dangDung());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', khoiDong);
  else khoiDong();
  window.__dmSang = dat;
})();
