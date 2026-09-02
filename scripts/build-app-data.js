/* build-app-data.js — v2 "day du"
 * Chay TRONG trang tg.html (hoac trong GitHub Action qua Playwright).
 *
 * Doc 2 kho du lieu da tinh san cua DB TG:
 *   window.__exportDataMwg  = so lieu OPPO toan tinh, 3 kenh (MWG / KA / IND)
 *   window.__exportDataMain = so lieu TOAN THI TRUONG (moi hang) - chi co o kenh MWG
 *
 * v2 lay them (so voi v1):
 *   - kich hoat (activated) vs sellout, o cap tinh / sale / kenh
 *   - sell-in kenh IND (OPPO / phu kien / khac) theo thang, tra ve tan shop
 *   - so sale + PG tung kenh tung thang (headcount) -> doanh thu dau nguoi
 *   - TAN SHOP: thi phan theo phan khuc, top model moi hang, thi phan theo ngay,
 *               khung gio ban, nhan vien ban gioi PK 10-20M, size shop, ma shop
 *
 * Quy uoc: doanh thu luu bang TRIEU DONG (lam tron). So may = so nguyen.
 * Nguon nao khong co thi bo qua, KHONG doan - co co "src" bao ro lay duoc gi.
 */
(function () {
  'use strict';

  /* ============ THI PHAN KENH FPT + VIETTEL (sheet "Share KA") ============
     Sheet gom HAI bang canh nhau, chi co SO MAY (khong co doanh thu):
       FPT     cot 0-7 : Ngay | Ma Shop | Ten Shop | Brand2 | So Luong | PK | AREA | Mien
       VIETTEL cot 12-18: SHOP | KV | MIEN | HANG | SL | PK | THANG
     Ten hang viet lung tung (SAMSUNG / Samsung, XIAOMI / Xiaomi) -> gom khong phan biet
     hoa thuong. FPT viet tat (OP, IP, SS, XM, HO) -> doi ve ten day du.
     Phan khuc hai bang ghi khac nhau -> quy ve 4 nhom gia chung.
     Anh Thai chot: chi lay o MUC KENH, khong ghep xuong tung shop. */
  function tinhShareKA(rows, MONTHS) {
    if (!Array.isArray(rows) || rows.length < 2) return null;

    var TEN_HANG = {
      op: 'OPPO', oppo: 'OPPO', ip: 'Apple', apple: 'Apple',
      ss: 'Samsung', samsung: 'Samsung', xm: 'Xiaomi', xiaomi: 'Xiaomi',
      ho: 'Honor', honor: 'Honor', vivo: 'vivo', fp: 'Khác', others: 'Khác',
      other: 'Khác', khac: 'Khác',
    };
    function chuanHang(x) {
      var k = String(x || '').trim().toLowerCase();
      return TEN_HANG[k] || (k ? (k.charAt(0).toUpperCase() + k.slice(1)) : 'Khác');
    }
    // 4 nhom gia chung, nhan dien theo con SO trong chuoi nen ca hai kieu ghi deu trung
    function nhomGia(x) {
      var t = String(x || '').replace(/\s+/g, '').toUpperCase();
      if (/(^|[^0-9])(<3M|<5M|1_)/.test(t) || /^\D*[0-4]M?-5M/.test(t)) return 0;   // duoi 5M
      if (/3M-5M/.test(t)) return 0;
      if (/5M-7M|7M-10M|2_|3_/.test(t)) return 1;                                    // 5-10M
      if (/10M-15M|15M-20M|4_|5_/.test(t)) return 2;                                 // 10-20M
      if (/20M-30M|6_/.test(t)) return 3;                                            // 20-30M
      if (/>30M|7_/.test(t)) return 4;                                               // tren 30M
      return -1;
    }
    function thangCuaNgay(x) {
      var t = String(x || '').trim();
      var m = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);   // 01.01.2026
      if (m) return parseInt(m[2], 10);
      var d = new Date(t);
      if (isNaN(d.getTime())) return 0;
      /* BAY MUI GIO. O ngay that qua Apps Script thanh chuoi UTC: ngay 01.01.2026
         (gio VN) ra "2025-12-31T17:00:00.000Z". Robot chay tren may chu GitHub
         (gio UTC) nen doc ra THANG 12 — moi dong ghi ngay mung 1 bi day nham
         sang thang truoc. Ep doc theo dung mui gio cua sheet. */
      try {
        var s2 = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(d);
        return parseInt(s2.slice(5, 7), 10);
      } catch (e) { return d.getMonth() + 1; }
    }
    function thangCuaChu(x) {
      var m = String(x || '').match(/(\d{1,2})/);
      return m ? parseInt(m[1], 10) : 0;
    }
    function soCua(x) {
      var n = parseFloat(String(x == null ? '' : x).replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? 0 : n;
    }

    var NM = MONTHS.length;
    function honKhoi() {
      return { m: MONTHS.map(function () { return [0, 0]; }),      // [oppo, tong] tung thang
               pk: [0, 1, 2, 3, 4].map(function () { return [0, 0]; }),
               hang: {}, shop: {}, dong: 0 };
    }
    var K = { fpt: honKhoi(), viettel: honKhoi() };

    function nap(o, thang, hang, sl, pk, shop) {
      if (!sl) return;
      o.dong++;
      var laOppo = (hang === 'OPPO');
      var i = MONTHS.indexOf(thang);
      if (i >= 0) { o.m[i][1] += sl; if (laOppo) o.m[i][0] += sl; }
      var g = nhomGia(pk);
      if (g >= 0) { o.pk[g][1] += sl; if (laOppo) o.pk[g][0] += sl; }
      o.hang[hang] = (o.hang[hang] || 0) + sl;
      if (shop) o.shop[shop] = 1;
    }

    for (var r = 1; r < rows.length; r++) {           // bo dong tieu de
      var v = rows[r] || [];
      // --- FPT: cot 0..7
      if (v[2] && soCua(v[4])) {
        nap(K.fpt, thangCuaNgay(v[0]), chuanHang(v[3]), soCua(v[4]), v[5], String(v[2]).trim());
      }
      // --- VIETTEL: cot 12..18
      if (v[12] && soCua(v[16])) {
        nap(K.viettel, thangCuaChu(v[18]), chuanHang(v[15]), soCua(v[16]), v[17], String(v[12]).trim());
      }
    }

    function goi(o) {
      if (!o.dong) return null;
      var hg = Object.keys(o.hang).map(function (h) { return [h, Math.round(o.hang[h])]; })
        .sort(function (a, b) { return b[1] - a[1]; });
      return {
        m: o.m.map(function (x) { return [Math.round(x[0]), Math.round(x[1])]; }),
        pk: o.pk.map(function (x) { return [Math.round(x[0]), Math.round(x[1])]; }),
        hang: hg, shops: Object.keys(o.shop).length, dong: o.dong,
      };
    }
    var fpt = goi(K.fpt), vt = goi(K.viettel);
    if (!fpt && !vt) return null;
    return {
      fpt: fpt, viettel: vt,
      nhomTen: ['Dưới 5M', '5–10M', '10–20M', '20–30M', 'Trên 30M'],
      chiSoMay: true,          // sheet nay KHONG co doanh thu — app phai noi ro
    };
  }

  function build(MWG, MAIN, SHARE_KA) {
    if (!MWG) throw new Error('Chua co __exportDataMwg');
    MAIN = MAIN || {};

    // Vai bang nam o MWG, vai bang nam o MAIN - tuy phien ban DB. Tim ca 2 cho.
    function kho(ten) {
      if (MAIN && MAIN[ten]) return MAIN[ten];
      if (MWG && MWG[ten]) return MWG[ten];
      return null;
    }

    var MONTHS = (MWG.months_sorted || []).slice();
    if (!MONTHS.length) {
      var seen = {};
      (MWG.crosstab || []).forEach(function (r) { seen[r.m] = 1; });
      MONTHS = Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
    }
    /* QUY TAC 02/09/2026 (anh Thai chot): chi so chi tiet kenh MWG lay tu DATA MWG.
       DATA MWG ve som hon CENTER (so OPPO chot) nhieu ngay, nen truc thang phai lay
       HOP cua hai ben - neu chi lay CENTER thi thang moi nhat cua MWG bi cat mat. */
    (function themThangCuaDataMWG() {
      var nhan = (MAIN && MAIN.month_labels) || [];
      var co = {};
      ((MAIN && MAIN.shop_rows_brand4) || []).forEach(function (r) {
        var b = ((r && r.brands) || {}).Oppo || {};
        var a = b.monthly_units || [];
        for (var q = 0; q < a.length; q++) {
          if (!a[q]) continue;
          var m = nhan[q] ? parseInt(String(nhan[q]).replace(/\D/g, ''), 10) : (q + 1);
          if (m) co[m] = 1;
        }
      });
      Object.keys(co).forEach(function (m) { if (MONTHS.indexOf(+m) < 0) MONTHS.push(+m); });
      MONTHS.sort(function (a, b) { return a - b; });
    })();
    var NM = MONTHS.length;
    var MIDX = {}; MONTHS.forEach(function (m, i) { MIDX[m] = i; });
    var CUR_M = MONTHS[NM - 1], PRV_M = NM > 1 ? MONTHS[NM - 2] : null;

    var tr = function (v) { return Math.round((v || 0) / 1e6); };
    var num = function (v) { var x = parseFloat(String(v == null ? 0 : v).replace(/[^0-9.-]/g, '')); return isFinite(x) ? x : 0; };
    var zeros = function (n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = 0; return a; };
    var pairs = function (n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = [0, 0]; return a; };
    var quads = function (n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = [0, 0, 0, 0]; return a; };

    // Ngay-trong-nam: 1/1 = 1. Dung lam truc chung cho tuan / thang / quy.
    var lastDoy = 0;
    function doyOf(y, m, d) {
      return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
    }
    function addDy(o, doy, u, rv) {
      if (!o._dy) { o._dy = {}; o._dr = {}; }
      o._dy[doy] = (o._dy[doy] || 0) + u;
      o._dr[doy] = (o._dr[doy] || 0) + rv;
    }

    // ---- nam + so ngay cua thang
    var dayKeys = Object.keys(MWG.overview_daily_by_date || {}).sort();
    var YEAR = dayKeys.length ? +dayKeys[0].slice(0, 4) : new Date().getFullYear();
    var dim = function (m) { return new Date(Date.UTC(YEAR, m, 0)).getUTCDate(); };
    var DIM_CUR = dim(CUR_M), DIM_PRV = PRV_M ? dim(PRV_M) : 0;

    // ---- danh muc
    var CHANS = ['MWG', 'KA', 'IND'];
    var SEGS = (MWG.segments_list || []).slice();
    var SERS = (MWG.series_list || []).filter(function (s) { return s && s !== '(Không rõ)'; });
    if (SERS.indexOf('(Không rõ)') < 0) SERS = SERS.concat(['Khác']);
    var SEGI = {}; SEGS.forEach(function (s, i) { SEGI[s] = i; });
    var SERI = {}; SERS.forEach(function (s, i) { SERI[s] = i; });
    var KHAC = SERS.indexOf('Khác');

    // ---- Thang nao co so SELL IN. Ton kho CHI duoc tinh tren cac thang nay,
    // neu khong se tru ca phan ban ra cua thang chua nhap so -> ton bi hut xuong sai.
    var SELLIN_COL = { STORE_ID: 0, RETAILER: 1, PROVINCE: 2, MONTH: 3, PRODUCT: 4, GROUP: 5, QTY: 6 };
    var sellinRows = (MAIN && MAIN.sell_in_rows) || MWG.sell_in_rows || null;
    // Sell-in khong ghep duoc vao shop nao — de rieng, khong tron vao tong
    var leSellin = { tong: 0, mdl: {}, ma: {}, theoTen: 0, theoMa: 0 };
    var SI_M = {}, SI_LIST = [];
    if (sellinRows) {
      sellinRows.forEach(function (r) {
        if (!r || r.length < 7) return;
        var m = parseInt(r[SELLIN_COL.MONTH], 10);
        if (m && MIDX[m] !== undefined) SI_M[m] = 1;
      });
      SI_LIST = Object.keys(SI_M).map(Number).sort(function (a, b) { return a - b; });
    }

    // Co bao lay duoc nguon nao - app dung de an/hien tung khoi, khong bia so.
    var src = {
      act: false, sellin: false, hc: false, segMkt: false,
      model: false, dayMkt: false, hour: false, staff: false
    };

    // =========================================================
    // 1. Khung rong cho tung shop / tung sale / toan tinh
    // =========================================================
    function blank(extra) {
      var o = {
        m: pairs(NM),                  // [may, doanh thu] theo thang
        ac: zeros(NM),                 // may DA KICH HOAT theo thang
        d: zeros(DIM_CUR),             // may theo ngay - thang hien tai
        dp: zeros(DIM_PRV),            // may theo ngay - thang truoc
        ch: {},                        // kenh -> [may, dt] theo thang
        sg: pairs(SEGS.length),        // phan khuc - luy ke ca nam
        sgM: pairs(SEGS.length),       // phan khuc - thang hien tai
        sr: pairs(SERS.length),        // dong may - luy ke
        srM: pairs(SERS.length),       // dong may - thang hien tai
        mo: {},                        // model OPPO -> [may, dt] thang hien tai
        srm: null,                     // dong may theo TUNG THANG  [series][thang] = [may, dt]
        sgm: null,                     // phan khuc theo TUNG THANG [seg][thang] = [may, dt]
        moM: {},                       // thang -> { model: [may, dt] }
        chd: null                      // chi tiet theo tung kenh (chi dat o cap tinh & sale)
      };
      for (var k in extra) o[k] = extra[k];
      return o;
    }

    var shops = {}, shopOrder = [], idToShop = {};
    (MWG.store_rows || []).forEach(function (r) {
      if (shops[r.store]) return;
      shops[r.store] = blank({
        n: r.store,
        sale: r.sale || '(Không rõ)',
        chan: r.channel || '?',
        lv: r.level && r.level !== '(Không rõ)' ? r.level : '',
        size: r.size && r.size !== '(Không rõ)' ? r.size : '',
        sid: r.store_id ? String(r.store_id).trim() : '',
        tg: tr(r.target)
      });
      shopOrder.push(r.store);
      if (r.store_id) idToShop[String(r.store_id).trim()] = r.store;
    });

    // ---- GOM CHI NHANH THEO DAI LY -------------------------------------------
    // Nhieu dai ly co vai chi nhanh: sell-in ghi ten cong ty, sell out ghi tung chi nhanh.
    // Vi vay ton kho phai tinh o cap DAI LY, khong phai tung chi nhanh.
    function khongDau(x) {
      return String(x || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    }
    function khoaDaiLy(ten) {
      var t = khongDau(ten);
      t = t.split(/\s[-–]\s|\s*\(|_|,|\s[-–]|[-–]\s/)[0];
      t = t.replace(/\b(cua hang|cong ty|cty|tnhh|mtv|dntn|doanh nghiep tu nhan)\b/g, ' ');
      t = t.replace(/[^a-z0-9]+/g, ' ').trim();
      return t;
    }
    var dlTheoKhoa = {};     // khoa -> { shops: [ten shop], sale: {} }
    shopOrder.forEach(function (st) {
      if (shops[st].chan !== 'IND') return;
      var k = khoaDaiLy(st);
      if (!k) return;
      shops[st].dlk = k;
      if (!dlTheoKhoa[k]) dlTheoKhoa[k] = { shops: [], ten: st };
      dlTheoKhoa[k].shops.push(st);
    });

    var sales = {}, all = blank({});
    function saleOf(name) {
      name = name || '(Không rõ)';
      if (!sales[name]) sales[name] = blank({ n: name });
      return sales[name];
    }
    (MWG.sales_list || []).forEach(saleOf);
    shopOrder.forEach(function (s) { saleOf(shops[s].sale); });

    function addCh(o, ch, i, u, rv) {
      if (!o.ch[ch]) o.ch[ch] = pairs(NM);
      o.ch[ch][i][0] += u; o.ch[ch][i][1] += rv;
    }
    // Khung chi tiet cho 1 kenh, dung o cap TINH va cap SALE (shop chi thuoc 1 kenh nen khong can)
    function chdOf(o, ch) {
      if (!o.chd) o.chd = {};
      if (!o.chd[ch]) o.chd[ch] = {
        m: pairs(NM), ac: zeros(NM), d: zeros(DIM_CUR), dp: zeros(DIM_PRV),
        sg: pairs(SEGS.length), sgM: pairs(SEGS.length),
        sr: pairs(SERS.length), srM: pairs(SERS.length),
        mo: {}, srm: null, sgm: null, moM: {}
      };
      return o.chd[ch];
    }

    // =========================================================
    // 2. Do so lieu OPPO theo thang tu crosstab
    //    crosstab item: {m, channel, store, model, series, segment, sales, sellout, activated, rev}
    // =========================================================
    (MWG.crosstab || []).forEach(function (r) {
      var i = MIDX[r.m]; if (i === undefined) return;
      var u = r.sellout || 0, rv = r.rev || 0, ac = r.activated || 0;
      if (!u && !rv && !ac) return;
      if (r.activated != null) src.act = true;
      var ch = r.channel || '?';
      /* So cua kenh MWG lay tu DATA MWG (khoi ben duoi), khong lay tu CENTER.
         RIENG kich hoat thi van giu CENTER vi DATA MWG khong co truong nay. */
      if (ch === 'MWG') {
        if (ac) {
          var tgAc = [all, saleOf(r.sales), shops[r.store]];
          for (var qAc = 0; qAc < tgAc.length; qAc++) if (tgAc[qAc]) tgAc[qAc].ac[i] += ac;
        }
        return;
      }
      var si = SEGI[r.segment];
      var ri = SERI[r.series]; if (ri === undefined) ri = KHAC;
      var isCur = r.m === CUR_M;
      var mdl = r.model || '';

      var targets = [all, saleOf(r.sales), shops[r.store]];
      for (var t = 0; t < targets.length; t++) {
        var o = targets[t]; if (!o) continue;
        o.m[i][0] += u; o.m[i][1] += rv;
        o.ac[i] += ac;
        addCh(o, ch, i, u, rv);
        if (si !== undefined) { o.sg[si][0] += u; o.sg[si][1] += rv;
          if (isCur) { o.sgM[si][0] += u; o.sgM[si][1] += rv; } }
        if (ri !== undefined && ri >= 0) { o.sr[ri][0] += u; o.sr[ri][1] += rv;
          if (isCur) { o.srM[ri][0] += u; o.srM[ri][1] += rv; } }
        if (isCur && mdl && u) {
          if (!o.mo[mdl]) o.mo[mdl] = [0, 0];
          o.mo[mdl][0] += u; o.mo[mdl][1] += rv;
        }
        // phan khuc theo TUNG THANG (cho bo loc PK gia)
        if (si !== undefined) {
          if (!o.sgm) { o.sgm = []; for (var z0 = 0; z0 < SEGS.length; z0++) o.sgm.push(pairs(NM)); }
          o.sgm[si][i][0] += u; o.sgm[si][i][1] += rv;
        }
        // dong may theo TUNG THANG (de bat tab Reno / Find o bieu do doanh so)
        if (ri !== undefined && ri >= 0) {
          if (!o.srm) { o.srm = []; for (var z1 = 0; z1 < SERS.length; z1++) o.srm.push(pairs(NM)); }
          o.srm[ri][i][0] += u; o.srm[ri][i][1] += rv;
        }
        // model theo TUNG THANG (de loc model ban chay theo thang)
        if (mdl && u) {
          if (!o.moM[r.m]) o.moM[r.m] = {};
          if (!o.moM[r.m][mdl]) o.moM[r.m][mdl] = [0, 0];
          o.moM[r.m][mdl][0] += u; o.moM[r.m][mdl][1] += rv;
        }
        // Ban ra LUY KE theo model — chi kenh IND, CHI cac thang co so sell-in
        if (ch === 'IND' && mdl && u && SI_M[r.m]) {
          if (!o._ban) o._ban = {};
          o._ban[mdl] = (o._ban[mdl] || 0) + u;
          if (t === 2 && o.dlk && dlTheoKhoa[o.dlk]) {   // t===2 la cap SHOP
            var gg = dlTheoKhoa[o.dlk];
            if (!gg._ban) gg._ban = {};
            gg._ban[mdl] = (gg._ban[mdl] || 0) + u;
          }
        }
        if (t < 2) {   // chi tinh chi tiet kenh o cap tinh & sale
          var cd = chdOf(o, ch);
          cd.m[i][0] += u; cd.m[i][1] += rv;
          cd.ac[i] += ac;
          if (si !== undefined) { cd.sg[si][0] += u; cd.sg[si][1] += rv;
            if (isCur) { cd.sgM[si][0] += u; cd.sgM[si][1] += rv; } }
          if (ri !== undefined && ri >= 0) { cd.sr[ri][0] += u; cd.sr[ri][1] += rv;
            if (isCur) { cd.srM[ri][0] += u; cd.srM[ri][1] += rv; } }
          if (isCur && mdl && u) {
            if (!cd.mo[mdl]) cd.mo[mdl] = [0, 0];
            cd.mo[mdl][0] += u; cd.mo[mdl][1] += rv;
          }
          if (si !== undefined) {
            if (!cd.sgm) { cd.sgm = []; for (var z3 = 0; z3 < SEGS.length; z3++) cd.sgm.push(pairs(NM)); }
            cd.sgm[si][i][0] += u; cd.sgm[si][i][1] += rv;
          }
          if (ri !== undefined && ri >= 0) {
            if (!cd.srm) { cd.srm = []; for (var z2 = 0; z2 < SERS.length; z2++) cd.srm.push(pairs(NM)); }
            cd.srm[ri][i][0] += u; cd.srm[ri][i][1] += rv;
          }
          if (mdl && u) {
            if (!cd.moM[r.m]) cd.moM[r.m] = {};
            if (!cd.moM[r.m][mdl]) cd.moM[r.m][mdl] = [0, 0];
            cd.moM[r.m][mdl][0] += u; cd.moM[r.m][mdl][1] += rv;
          }
        }
      }
    });

    // =========================================================
    // 3. So lieu theo NGAY (thang hien tai + thang truoc + truc ca nam)
    // =========================================================
    var maxDay = 0;
    Object.keys(MWG.overview_daily_by_date || {}).forEach(function (iso) {
      var p = iso.split('-'); if (p.length !== 3) return;
      var yy = +p[0], mo = +p[1], dd = +p[2];
      var doy = doyOf(yy, mo, dd);
      var key = null, lim = 0;
      if (mo === CUR_M) { key = 'd'; lim = DIM_CUR; }
      else if (PRV_M && mo === PRV_M) { key = 'dp'; lim = DIM_PRV; }
      var byCh = MWG.overview_daily_by_date[iso];
      Object.keys(byCh).forEach(function (ch) {
        // So theo NGAY cua kenh MWG lay tu DATA MWG (khoi 7b0 ben duoi)
        if (ch === 'MWG') return;
        var byStore = byCh[ch];
        Object.keys(byStore).forEach(function (st) {
          var v = byStore[st] || {};
          var u = v.sellout || 0, rv = v.rev || 0;
          if (!u && !rv) return;
          if (doy > lastDoy) lastDoy = doy;
          var sh = shops[st];
          var sn = v.sale || (sh ? sh.sale : null);
          var sl = sales[sn || '(Không rõ)'];
          addDy(all, doy, u, rv); addDy(chdOf(all, ch), doy, u, rv);
          if (sl) { addDy(sl, doy, u, rv); addDy(chdOf(sl, ch), doy, u, rv); }
          if (key && dd >= 1 && dd <= lim && sh) sh[key][dd - 1] += u;
          if (key === 'd' && u && dd > maxDay) maxDay = dd;
        });
      });
    });

    // =========================================================
    // 4. SELL-IN kenh IND (sheet SELL IN: mang tho, cot theo SELLIN_COL)
    //    Quy ve shop qua Store ID. Nhom hang: OPPO / PK (phu kien) / Khac.
    // =========================================================
    if (sellinRows && sellinRows.length) {
      src.sellin = true;
      sellinRows.forEach(function (r) {
        if (!r || r.length < 7) return;
        var sid = String(r[SELLIN_COL.STORE_ID] || '').trim();
        var m = parseInt(r[SELLIN_COL.MONTH], 10);
        var i = MIDX[m]; if (i === undefined || !sid) return;
        var nhom = String(r[SELLIN_COL.GROUP] || '').trim().toUpperCase();
        var qty = num(r[SELLIN_COL.QTY]);
        if (!qty) return;
        var j = nhom === 'OPPO' ? 0 : (nhom === 'PK' ? 1 : 2);
        var st = idToShop[sid];
        var sp = String(r[SELLIN_COL.PRODUCT] || '').trim();
        var coShop = !!(st && shops[st] && shops[st].chan === 'IND');
        // Ma shop khong khop -> thu ghep theo TEN dai ly (anh Thai: nhieu shop nhieu chi nhanh)
        var kDL = coShop ? shops[st].dlk : khoaDaiLy(r[SELLIN_COL.RETAILER]);
        if (!coShop && kDL && dlTheoKhoa[kDL]) {
          // ghep duoc theo ten -> quy vao chi nhanh dau tien cua dai ly do,
          // ton se duoc tinh o cap DAI LY nen khong lech
          st = dlTheoKhoa[kDL].shops[0];
          coShop = true;
          leSellin.theoTen += qty;
        }
        if (!coShop) {
          // Dong sell-in nay khong ghep duoc vao shop IND nao (ma shop la trong sheet
          // khong co trong danh sach shop). KHONG duoc cong vao tong tinh, neu khong
          // tong tinh se khac tong cong tung shop -> ra ton am gia o cap shop.
          leSellin.tong += qty;
          if (j === 0 && sp) leSellin.mdl[sp] = (leSellin.mdl[sp] || 0) + qty;
          leSellin.ma[sid] = 1;
          return;
        }
        if (idToShop[sid] === st) leSellin.theoMa += qty;
        var targets = [all, shops[st]];
        if (sales[shops[st].sale]) targets.push(sales[shops[st].sale]);
        // gom them o cap DAI LY de tinh ton dung khi co nhieu chi nhanh
        var gDL = shops[st].dlk && dlTheoKhoa[shops[st].dlk];
        if (gDL) {
          if (j === 0 && sp) { if (!gDL._nhap) gDL._nhap = {}; gDL._nhap[sp] = (gDL._nhap[sp] || 0) + qty; }
        }
        targets.forEach(function (o) {
          if (!o.si) { o.si = []; for (var k = 0; k < NM; k++) o.si[k] = [0, 0, 0]; }
          o.si[i][j] += qty;
          // Nhap LUY KE theo model (chi nhom OPPO) — de tinh ton kho
          if (j === 0 && sp) {
            if (!o._nhap) o._nhap = {};
            o._nhap[sp] = (o._nhap[sp] || 0) + qty;
          }
        });
      });
    }

    // ---- Ton kho dai ly IND = nhap luy ke - ban luy ke, theo tung model.
    // Da kiem chung 26/26 ten san pham ben SELL IN trung khop ten model ben ban hang.
    var chuanTen = function (s) { return String(s || '').toUpperCase().replace(/\s+/g, ' ').replace(/\s*\+\s*/g, '+').trim(); };
    function tonKho(o) {
      if (!o._nhap && !o._ban) return null;
      var g = {};
      Object.keys(o._nhap || {}).forEach(function (k) {
        var c = chuanTen(k);
        if (!g[c]) g[c] = { n: k, nhap: 0, ban: 0 };
        g[c].nhap += o._nhap[k];
      });
      Object.keys(o._ban || {}).forEach(function (k) {
        var c = chuanTen(k);
        if (!g[c]) g[c] = { n: k, nhap: 0, ban: 0 };
        g[c].ban += o._ban[k];
      });
      var ds = Object.keys(g).map(function (c) {
        return [g[c].n, Math.round(g[c].nhap), g[c].ban, Math.round(g[c].nhap) - g[c].ban];
      }).filter(function (x) { return x[1] || x[2]; });
      if (!ds.length) return null;
      ds.sort(function (a, b) { return b[3] - a[3]; });
      return ds;
    }
    // Shop co ban ma KHONG co bat ky dong sell-in nao -> ton khong tinh duoc
    function chuaGhepSellin(o) {
      return !!(o._ban && Object.keys(o._ban).length) && !(o._nhap && Object.keys(o._nhap).length);
    }

    // =========================================================
    // 5. HEADCOUNT theo kenh & thang: {kenh: {thang: {sales:[], pgs:[]}}}
    // =========================================================
    var HC = null;
    var hcRaw = kho('channel_month_headcount');
    if (hcRaw && Object.keys(hcRaw).length) {
      src.hc = true;
      HC = {};
      CHANS.forEach(function (c) {
        var cd = hcRaw[c] || {};
        HC[c] = MONTHS.map(function (m) {
          var cell = cd[m] || cd[String(m)] || {};
          return [(cell.sales || []).length, (cell.pgs || []).length];
        });
      });
    }

    // =========================================================
    // 6. THI PHAN - chi kenh MWG (nguon MAIN, du lieu moi hang)
    //    Ten shop 2 sheet khac nhau -> doi chieu theo ma vung + dia chi.
    // =========================================================
    var mkt = { matched: 0, unmatched: [], shops: 0 };
    var nhomPKTen = null;      // ten 4 nhom gia, chi co khi doc duoc bang phan khuc ben MAIN
    var mapMain = {};           // ten shop ben MAIN -> ten shop ben OPPO
    var norm = function (s) {
      return String(s || '').toLowerCase().normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
        .replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '');
    };
    // "TGD_TGI_CLA" -> "tgicla" (bo tien to loai shop vi 2 sheet ghi khac nhau: TGD / DMS / DMS3)
    var geo = function (c) { var p = String(c).split('_'); return p.length >= 3 ? norm(p[1] + p[2]) : norm(c); };
    // 02/09: dong nhat gach noi — " – " / " — " (en/em dash) thanh " - " truoc khi tach
    var dash = function (s) { return String(s || '').replace(/\s[\u2013\u2014]\s/g, ' - '); };

    var SEGA = [], SEGAI = {};   // danh muc phan khuc ben MAIN (co the khac ben OPPO)
    if (MAIN.shop_segment_crosstab) {
      var exact = {}, loose = {}, oppoMWG = [];
      shopOrder.forEach(function (st) {
        if (shops[st].chan !== 'MWG') return;
        var p = dash(st).split(' - ');   // 02/09: ten OPPO co shop dung gach dai " – " (9408 An Hoa)
        if (p.length < 4) return;
        var addr = norm(p.slice(3).join(' '));
        var ke = norm(p[2]) + '|' + addr, kl = geo(p[2]) + '|' + addr;
        oppoMWG.push({ st: st, g: geo(p[2]), a: addr });
        if (!(ke in exact)) exact[ke] = st; else exact[ke] = null;   // trung -> bo, khong doan bua
        if (!(kl in loose)) loose[kl] = st; else loose[kl] = null;
      });

      var mainShops = {};
      MAIN.shop_segment_crosstab.forEach(function (r) { mainShops[r.shop] = r.sale || ''; });
      var chuaKhop = [];
      Object.keys(mainShops).forEach(function (s) {
        var p = dash(s).split(' - ');
        var addr = norm(p.slice(1).join(' '));
        var hit = exact[norm(p[0]) + '|' + addr] || loose[geo(p[0]) + '|' + addr];
        if (hit) { mapMain[s] = hit; mkt.matched++; }
        else chuaKhop.push({ s: s, g: geo(p[0]), a: addr });
      });
      /* ==== them 02/09/2026 — noi not shop DATA MWG <-> OPPO (12 shop MWG tung rot) ====
         Tang 3: shop CHUA khop hai ben do lech tien to loai shop (DMS3 vs DMS) hoac lech ma dia ly
                 (BTR_BAT vs BTR_BTR) -> so trong nhom chua khop: geo+dia chi, roi dia chi.
         Tang 4: shop doi ten (Cai Lay -> Cai Lay 1) -> cung geo, dia chi la tien to cua nhau,
                 duy nhat trong toan bo shop OPPO. Cho phep nhieu ten MAIN cung tro ve mot shop OPPO
                 (so theo ngay tu cong don) — dung cho shop doi ten giua nam. */
      var daDung = {};
      Object.keys(mapMain).forEach(function (k) { daDung[mapMain[k]] = 1; });
      chuaKhop.forEach(function (u) {
        if (mapMain[u.s]) return;
        var c = oppoMWG.filter(function (o) { return !daDung[o.st] && o.g === u.g && o.a === u.a; });
        if (c.length !== 1) c = oppoMWG.filter(function (o) { return !daDung[o.st] && o.a === u.a; });
        if (c.length === 1) { mapMain[u.s] = c[0].st; daDung[c[0].st] = 1; mkt.matched++; }
      });
      chuaKhop.forEach(function (u) {
        if (mapMain[u.s]) return;
        var c = oppoMWG.filter(function (o) {
          return o.g === u.g && o.a && u.a && (u.a.indexOf(o.a) === 0 || o.a.indexOf(u.a) === 0); });
        if (c.length === 1) { mapMain[u.s] = c[0].st; daDung[c[0].st] = 1; mkt.matched++; }
      });
      chuaKhop.forEach(function (u) { if (!mapMain[u.s]) mkt.unmatched.push(u.s); });
      /* ==== het khoi them 02/09/2026 ==== */

      // danh muc phan khuc ben MAIN, giu thu tu theo segment_order neu co
      var ordRaw = kho('segment_order');
      var segSeen = {};
      MAIN.shop_segment_crosstab.forEach(function (r) { if (r.seg) segSeen[r.seg] = 1; });
      if (Array.isArray(ordRaw) && ordRaw.length) {
        ordRaw.forEach(function (s) { if (segSeen[s]) { SEGA.push(s); delete segSeen[s]; } });
      }
      Object.keys(segSeen).sort().forEach(function (s) { SEGA.push(s); });
      SEGA.forEach(function (s, i) { SEGAI[s] = i; });
      if (SEGA.length) src.segMkt = true;

      // gom: shop -> thang -> [oppoU, oppoRv, totU, totRv]; brand thang hien tai; phan khuc thi truong
      function mblank() { return quads(NM); }
      var mShop = {}, mSale = {}, mAll = mblank();
      var brShop = {}, brSale = {}, brAll = {};
      var sgShop = {}, sgSale = {}, sgAll = null;     // thang hien tai, theo SEGA
      var sgShopY = {}, sgSaleY = {}, sgAllY = null;  // luy ke ca nam
      function sgBlank() { return quads(SEGA.length); }

      // 4 nhom gia anh Thai dung de nhin nhanh. Nhan dien theo TEN khoang, doi nhan
      // ben DB TG cung khong vo. Dung cho sgmS = phan khuc x thang o cap shop.
      var NHOM_TEN = ['Dưới 5M', '5–10M', '10–20M', 'Trên 20M'];
      var NHOM_BIEN = [[0, 5], [5, 10], [10, 20], [20, Infinity]];
      // Doc nhan khoang gia ra [tu, den] trieu, khong dung bieu thuc chinh quy.
      // Khop theo TEN nhu ban cu bo sot <3M, 3-5M, >20M, >30M = 38% so may.
      function docKhoangPK(ten) {
        var t = String(ten == null ? '' : ten).toUpperCase().split(' ').join('');
        t = t.split('TRIỆU').join('M').split('TRIEU').join('M').split('M').join('');
        var so = function (x) {
          if (x.charAt(0) === '=') x = x.slice(1);
          var v = parseFloat(x.split(',').join('.'));
          return isNaN(v) ? null : v;
        };
        if (t.charAt(0) === '<') { var a = so(t.slice(1)); return a === null ? null : [0, a]; }
        if (t.charAt(0) === '>') { var b = so(t.slice(1)); return b === null ? null : [b, Infinity]; }
        var p = t.split('-');
        if (p.length === 2) {
          var c = so(p[0]), d = so(p[1]);
          if (c !== null && d !== null) return [c, d];
        }
        return null;
      }
      var SEG_NHOM = {};
      SEGA.forEach(function (ten) {
        var k = docKhoangPK(ten); if (!k) return;
        for (var gi = 0; gi < NHOM_BIEN.length; gi++) {
          if (k[0] >= NHOM_BIEN[gi][0] && k[0] < NHOM_BIEN[gi][1]) { SEG_NHOM[ten] = gi; return; }
        }
      });
      // Bonus Model cua chuong trinh Sale Loc & Khai:
      //   10-15M -> 80.000d/may  ·  tu 15M tro len -> 120.000d/may  ·  duoi 10M -> 0
      // Chi can 2 o dem may OPPO nen luu gon: bmS[thang] = [may 10-15M, may >=15M]
      var SEG_BM = {};
      SEGA.forEach(function (ten) {
        var k = docKhoangPK(ten); if (!k) return;
        if (k[0] >= 15) { SEG_BM[ten] = 1; return; }
        if (k[0] >= 10) { SEG_BM[ten] = 0; return; }
      });
      var bmShop = {};
      function bmBlank() { var a = []; for (var q = 0; q < NM; q++) a.push([0, 0]); return a; }

      var sgmShop = {};
      function sgmBlank() {
        var a = [];
        for (var q = 0; q < NM; q++) a.push([[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
        return a;
      }

      // 4 hang chinh theo TUNG THANG, luu o cap SHOP:
      // [oppoMay,oppoDT, ssMay,ssDT, xmMay,xmDT, ipMay,ipDT, tongMay,tongDT]
      var mkmShop = {};
      // phan khuc x HANG x thang o cap shop -> PK 10-20M tach duoc tung hang
      var HANG7 = { oppo: 0, samsung: 1, xiaomi: 2, apple: 3, vivo: 4, realme: 5 };
      var sgbShop = {};
      function sgbBlank() {
        var a = [], q, g, h;
        for (q = 0; q < NM; q++) {
          var t = [];
          for (g = 0; g < 4; g++) { var e = []; for (h = 0; h < 7; h++) e.push([0, 0]); t.push(e); }
          a.push(t);
        }
        return a;
      }
      var CHI4 = { oppo: 0, samsung: 2, xiaomi: 4, apple: 6 };
      MAIN.shop_segment_crosstab.forEach(function (r) {
        var i = MIDX[r.m]; if (i === undefined) return;
        var u = r.units || 0, rv = r.rev || 0; if (!u && !rv) return;
        var oppo = String(r.brand || '').toLowerCase() === 'oppo';
        var st = mapMain[r.shop];
        if (st) {
          if (!mkmShop[st]) { mkmShop[st] = []; for (var q3 = 0; q3 < NM; q3++)
            mkmShop[st].push([0,0,0,0,0,0,0,0,0,0]); }
          var j4 = CHI4[String(r.brand || '').toLowerCase()];
          if (j4 !== undefined) { mkmShop[st][i][j4] += u; mkmShop[st][i][j4 + 1] += rv; }
          mkmShop[st][i][8] += u; mkmShop[st][i][9] += rv;
        }
        var sn = st ? shops[st].sale : (r.sale || '(Không rõ)');

        var rows = [mAll];
        if (st) { mShop[st] = mShop[st] || mblank(); rows.push(mShop[st]); }
        if (sn) { mSale[sn] = mSale[sn] || mblank(); rows.push(mSale[sn]); }
        rows.forEach(function (a) {
          a[i][2] += u; a[i][3] += rv;
          if (oppo) { a[i][0] += u; a[i][1] += rv; }
        });

        // phan khuc thi truong (OPPO vs tong) - cung 1 nguon nen luon khop nhau
        var gi = SEGAI[r.seg];
        if (gi !== undefined) {
          if (!sgAllY) { sgAllY = sgBlank(); sgAll = sgBlank(); }
          var boxes = [sgAllY];
          if (r.m === CUR_M) boxes.push(sgAll);
          if (st) {
            sgShopY[st] = sgShopY[st] || sgBlank(); boxes.push(sgShopY[st]);
            if (r.m === CUR_M) { sgShop[st] = sgShop[st] || sgBlank(); boxes.push(sgShop[st]); }
          }
          if (sn) {
            sgSaleY[sn] = sgSaleY[sn] || sgBlank(); boxes.push(sgSaleY[sn]);
            if (r.m === CUR_M) { sgSale[sn] = sgSale[sn] || sgBlank(); boxes.push(sgSale[sn]); }
          }
          boxes.forEach(function (a) {
            a[gi][2] += u; a[gi][3] += rv;
            if (oppo) { a[gi][0] += u; a[gi][1] += rv; }
          });
        }

        // phan khuc x THANG o cap shop -> muc Shop xem duoc PK 10-20M tung thang
        var gn = SEG_NHOM[r.seg];
        if (st && gn !== undefined) {
          if (!sgmShop[st]) sgmShop[st] = sgmBlank();
          var o4 = sgmShop[st][i][gn];
          o4[2] += u; o4[3] += rv;
          if (oppo) { o4[0] += u; o4[1] += rv; }
        }

      // gom them theo hang cho tung nhom gia
      if (st && gn !== undefined) {
        if (!sgbShop[st]) sgbShop[st] = sgbBlank();
        var hb = HANG7[String(r.brand || '').toLowerCase()];
        if (hb === undefined) hb = 6;
        var ob = sgbShop[st][i][gn][hb];
        ob[0] += u; ob[1] += rv;
      }

        if (st && oppo) {
          var bi = SEG_BM[r.seg];
          if (bi !== undefined) {
            if (!bmShop[st]) bmShop[st] = bmBlank();
            bmShop[st][i][bi] += u;
          }
        }

        if (st && r.shopSize && !shops[st].size) shops[st].size = String(r.shopSize).trim();
        if (r.m === CUR_M) {
          var b = r.brand || '?';
          brAll[b] = brAll[b] || [0, 0]; brAll[b][0] += u; brAll[b][1] += rv;
          if (st) { brShop[st] = brShop[st] || {}; brShop[st][b] = brShop[st][b] || [0, 0];
            brShop[st][b][0] += u; brShop[st][b][1] += rv; }
          if (sn) { brSale[sn] = brSale[sn] || {}; brSale[sn][b] = brSale[sn][b] || [0, 0];
            brSale[sn][b][0] += u; brSale[sn][b][1] += rv; }
        }
      });

      var topBrands = function (obj, n) {
        return Object.keys(obj || {})
          .map(function (b) { return [b, obj[b][0], tr(obj[b][1])]; })
          .sort(function (a, b) { return b[1] - a[1]; })
          .slice(0, n || 8);
      };
      var packM = function (a) {
        return a.map(function (x) { return [x[0], tr(x[1]), x[2], tr(x[3])]; });
      };

      all.mkt = { m: packM(mAll), br: topBrands(brAll, 10) };
      if (sgAll) { all.mkt.sg = packM(sgAll); all.mkt.sgY = packM(sgAllY); }
      chdOf(all, 'MWG').mkt = all.mkt;
      Object.keys(mSale).forEach(function (sn) {
        if (!sales[sn]) return;
        sales[sn].mkt = { m: packM(mSale[sn]), br: topBrands(brSale[sn], 8) };
        if (sgSale[sn]) sales[sn].mkt.sg = packM(sgSale[sn]);
        if (sgSaleY[sn]) sales[sn].mkt.sgY = packM(sgSaleY[sn]);
        chdOf(sales[sn], 'MWG').mkt = sales[sn].mkt;
      });
      Object.keys(mkmShop).forEach(function (st) {
        if (!shops[st]) return;
        shops[st].mkm = mkmShop[st].map(function (v) {
          return [v[0], tr(v[1]), v[2], tr(v[3]), v[4], tr(v[5]), v[6], tr(v[7]), v[8], tr(v[9])];
        });
      });
      Object.keys(sgmShop).forEach(function (st) {
        if (!shops[st]) return;
        shops[st].sgmS = sgmShop[st].map(function (mo) {
          return mo.map(function (v) { return [v[0], tr(v[1]), v[2], tr(v[3])]; });
        });
      });
      Object.keys(bmShop).forEach(function (st) {
        if (shops[st]) shops[st].bmS = bmShop[st];
      });
      Object.keys(sgbShop).forEach(function (st) {
        if (!shops[st]) return;
        shops[st].sgb = sgbShop[st].map(function (mo) {
          return mo.map(function (nh) {
            return nh.map(function (v) { return [v[0], tr(v[1])]; });
          });
        });
      });
      nhomPKTen = NHOM_TEN;
      Object.keys(mShop).forEach(function (st) {
        shops[st].mkt = { m: packM(mShop[st]), br: topBrands(brShop[st], 6) };
        if (sgShop[st]) shops[st].mkt.sg = packM(sgShop[st]);
        if (sgShopY[st]) shops[st].mkt.sgY = packM(sgShopY[st]);
        mkt.shops++;
      });
    }

    // =========================================================
    // 7. TAN SHOP: model moi hang / thi phan theo ngay / khung gio / nhan vien
    //    Cac bang nay danh index theo TEN SHOP ben MAIN -> doi sang ten ben OPPO.
    // =========================================================
    function veShopOppo(tenMain) { return mapMain[tenMain] || (shops[tenMain] ? tenMain : null); }
    function thangCua(byMonth, m) { return byMonth ? (byMonth[m] || byMonth[String(m)]) : null; }

    /* =================================================================
     * QUY TAC 02/09/2026 (anh Thai chot, ap dung ca DB TG lan App Sale):
     * TAT CA chi so chi tiet cua kenh MWG lay tu DATA MWG, khong lay CENTER.
     * Ly do: DATA MWG la so doi tra nhung co theo NGAY va ve som hon CENTER
     * nhieu ngay -> sale co so de trien khai ngay trong thang.
     * Nguon: MAIN.shop_model_data[shopMAIN][thang][model] = {units, rev, brand}
     *   du ca shop / thang / model. Series suy tu ten model; phan khuc suy tu
     *   gia ban thuc (doanh thu / so may).
     * NGOAI LE - vi DATA MWG KHONG CO truong do, khong phai lua chon:
     *   - kich hoat (activated): van lay CENTER
     *   - target: van lay CENTER, do la chi tieu OPPO giao chu khong phai so ban
     * ============================================================== */
    function serieTuTen(ten) {
      var t = String(ten || '').toUpperCase();
      if (t.indexOf('FIND') >= 0) return 'Find Series';
      if (t.indexOf('RENO') >= 0) return 'Reno Series';
      if (/\b[AK]\d/.test(t)) return 'A Series';
      return null;
    }
    var PK_RANGE = SEGS.map(function (nhan) {
      var so = (String(nhan).match(/\d+(?:[.,]\d+)?/g) || [])
        .map(function (x) { return parseFloat(x.replace(',', '.')) * 1e6; });
      if (/[<\u2264]/.test(nhan)) return [0, so[0] || Infinity];
      if (/[>\u2265]/.test(nhan)) return [so[0] || 0, Infinity];
      if (so.length >= 2) return [so[0], so[1]];
      return [0, Infinity];
    });
    function pkTuGia(gia) {
      for (var q = 0; q < PK_RANGE.length; q++)
        if (gia >= PK_RANGE[q][0] && gia < PK_RANGE[q][1]) return q;
      return PK_RANGE.length ? PK_RANGE.length - 1 : undefined;
    }
    (function napKenhMWG() {
      var smdM = MAIN && MAIN.shop_model_data;
      if (!smdM || !Object.keys(smdM).length) return;   // khong co nguon -> giu CENTER
      src.mwgTuDataMwg = true;
      Object.keys(smdM).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        if (shops[st].chan !== 'MWG') return;
        var byM = smdM[tenMain] || {};
        Object.keys(byM).forEach(function (mk) {
          var m = parseInt(String(mk).replace(/\D/g, ''), 10);
          var i = MIDX[m]; if (i === undefined) return;
          var isCur = (m === CUR_M);
          var cell = byM[mk] || {};
          Object.keys(cell).forEach(function (mdl) {
            var v = cell[mdl] || {};
            if (String(v.brand || '').toUpperCase() !== 'OPPO') return;
            var u = v.units || 0, rv = v.rev || 0;
            if (!u && !rv) return;
            var ri = SERI[serieTuTen(mdl)]; if (ri === undefined) ri = KHAC;
            var si = u ? pkTuGia(rv / u) : undefined;
            var tg = [all, saleOf(shops[st].sale), shops[st]];
            for (var t = 0; t < tg.length; t++) {
              var o = tg[t]; if (!o) continue;
              o.m[i][0] += u; o.m[i][1] += rv;
              addCh(o, 'MWG', i, u, rv);
              if (si !== undefined) { o.sg[si][0] += u; o.sg[si][1] += rv;
                if (isCur) { o.sgM[si][0] += u; o.sgM[si][1] += rv; } }
              if (ri >= 0) { o.sr[ri][0] += u; o.sr[ri][1] += rv;
                if (isCur) { o.srM[ri][0] += u; o.srM[ri][1] += rv; } }
              if (isCur && u) { if (!o.mo[mdl]) o.mo[mdl] = [0, 0];
                o.mo[mdl][0] += u; o.mo[mdl][1] += rv; }
              if (si !== undefined) {
                if (!o.sgm) { o.sgm = []; for (var z0 = 0; z0 < SEGS.length; z0++) o.sgm.push(pairs(NM)); }
                o.sgm[si][i][0] += u; o.sgm[si][i][1] += rv;
              }
              if (ri >= 0) {
                if (!o.srm) { o.srm = []; for (var z1 = 0; z1 < SERS.length; z1++) o.srm.push(pairs(NM)); }
                o.srm[ri][i][0] += u; o.srm[ri][i][1] += rv;
              }
            }
          });
        });
      });
    })();

    // 7a. Top model moi hang (thang hien tai)  -> sh.md = [[ten, hang, may, dt]]
    var smd = kho('shop_model_data');
    if (smd && Object.keys(smd).length) {
      src.model = true;
      Object.keys(smd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var cell = thangCua(smd[tenMain], CUR_M); if (!cell) return;
        var ds = [];
        Object.keys(cell).forEach(function (mdl) {
          var v = cell[mdl] || {};
          var u = v.units || 0; if (!u) return;
          ds.push([mdl, v.brand || '?', u, tr(v.rev || 0)]);
        });
        ds.sort(function (a, b) { return b[2] - a[2]; });
        if (ds.length) shops[st].md = ds.slice(0, 10);
      });
    }

    /* 7b0. SO THEO NGAY CUA KENH MWG - lay tu DATA MWG (quy tac 02/09/2026).
       Nguon: MAIN.shop_day_data[shopMAIN]['<thang>-<ngay>'] = {oppo_units, oppo_rev, ...}
       Day cung la cho quyet dinh maxDay (so lieu chay toi ngay may) cho thang hien
       tai - CENTER ve cham nen neu doi CENTER thi thang moi se rong tron. */
    (function napNgayKenhMWG() {
      var sdd0 = kho('shop_day_data');
      if (!sdd0 || !Object.keys(sdd0).length) return;
      Object.keys(sdd0).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var sh = shops[st]; if (sh.chan !== 'MWG') return;
        var sl = sales[sh.sale] || null;
        var dayMap = sdd0[tenMain] || {};
        Object.keys(dayMap).forEach(function (k) {
          var p = String(k).split('-'); if (p.length < 2) return;
          var m = +p[0], d = +p[1];
          if (!m || !d || MIDX[m] === undefined) return;
          var c = dayMap[k] || {};
          var u = c.oppo_units || 0, rv = c.oppo_rev || 0;
          if (!u && !rv) return;
          var doy = doyOf(YEAR, m, d);
          if (doy > lastDoy) lastDoy = doy;
          addDy(all, doy, u, rv); addDy(chdOf(all, 'MWG'), doy, u, rv);
          if (sl) { addDy(sl, doy, u, rv); addDy(chdOf(sl, 'MWG'), doy, u, rv); }
          if (m === CUR_M && d >= 1 && d <= DIM_CUR) {
            sh.d[d - 1] += u;
            if (u && d > maxDay) maxDay = d;
          } else if (PRV_M && m === PRV_M && d >= 1 && d <= DIM_PRV) {
            sh.dp[d - 1] += u;
          }
        });
      });
    })();

    // 7b. Thi phan theo NGAY tai shop -> sh.dk (thang nay) / sh.dkp (thang truoc) = [oppoMay, tongMay]
    var sdd = kho('shop_day_data');
    if (sdd && Object.keys(sdd).length) {
      src.dayMkt = true;
      Object.keys(sdd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var dayMap = sdd[tenMain] || {};
        var cur = null, prv = null;
        var oNo = function (n) { var z = new Array(n); for (var q = 0; q < n; q++) z[q] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0]; return z; };
        Object.keys(dayMap).forEach(function (k) {
          var p = String(k).split('-'); if (p.length < 2) return;
          var m = +p[0], d = +p[1];
          var c = dayMap[k] || {};
          // [oppoMay,oppoDT, ssMay,ssDT, xmMay,xmDT, ipMay,ipDT, tongMay,tongDT]
          var v = [c.oppo_units || 0, c.oppo_rev || 0,
                   c.samsung_units || 0, c.samsung_rev || 0,
                   c.xiaomi_units || 0, c.xiaomi_rev || 0,
                   c.apple_units || 0, c.apple_rev || 0,
                   c.total_units || 0, c.total_rev || 0,
                   // rieng khoang 10-20M — DB TG co san theo ngay
                   c.pk1020_oppo_units || 0, c.pk1020_oppo_rev || 0,
                   c.pk1020_total_units || 0, c.pk1020_total_rev || 0];
          if (!v[0] && !v[8]) return;
          if (m === CUR_M && d >= 1 && d <= DIM_CUR) {
            if (!cur) cur = oNo(DIM_CUR);
            for (var k1 = 0; k1 < 14; k1++) cur[d - 1][k1] += v[k1];
          } else if (PRV_M && m === PRV_M && d >= 1 && d <= DIM_PRV) {
            if (!prv) prv = oNo(DIM_PRV);
            for (var k2 = 0; k2 < 14; k2++) prv[d - 1][k2] += v[k2];
          }
        });
        // doanh thu -> trieu dong cho gon
        var lamTron = function (x) { return x.map(function (v) {
          return [v[0], tr(v[1]), v[2], tr(v[3]), v[4], tr(v[5]), v[6], tr(v[7]), v[8], tr(v[9]),
                  v[10], tr(v[11]), v[12], tr(v[13])]; }); };
        /* 02/09: shop co so thang truoc nhung thang nay CHUA ban ngay nao -> van phai co dk (toan 0)
           de rule "dut sell out" trong app dem duoc chuoi trang noi tu thang truoc. Truoc day dk
           bi bo trong -> ruleShop() bo qua shop -> shop trang tu ngay 1 khong bao gio bi goi. */
        if (!cur && prv) cur = oNo(DIM_CUR);
        if (cur) shops[st].dk = lamTron(cur);
        if (prv) shops[st].dkp = lamTron(prv);
      });
    }

    // 7a2. Top 10 model MOI HANG theo tung thang, o cap SALE va toan bo -> o.mdB[thang][hang]
    // Gop model theo DONG MAY: bo tien to loai may, bo ten hang, bo MAU o duoi ten.
    // Luat: lay day token cuoi cung KHONG phai spec (khong co chu so, khong co ngoac);
    // neu trong day do co it nhat MOT tu mau goc thi cat ca day. Nho vay bat duoc ca
    // mau ghep kieu 'Xanh ngoc bich', 'Den Thach Anh', 'Cosmic Orange'.
    var MAU_GOC = {};
    ('den trang xanh vang bac xam hong tim do nau cam kem be black white blue green gold silver ' +
     'gray grey pink purple red orange brown beige teal lilac peach mint jade olive bronze titan ' +
     'titanium ivory coral lavender aqua khaki').split(' ').forEach(function (w) { if (w) MAU_GOC[w] = 1; });
    ['đen','trắng','xanh','vàng','bạc','xám','hồng','tím','đỏ','nâu'].forEach(function (w) { MAU_GOC[w] = 1; });
    function laSpec(t) {
      if (t.indexOf('(') >= 0 || t.indexOf(')') >= 0) return true;
      for (var z = 0; z < t.length; z++) { var c = t.charCodeAt(z); if (c >= 48 && c <= 57) return true; }
      return false;
    }
    function gonTen(s) {
      var t = String(s == null ? '' : s).trim();
      var bo = ['Điện thoại ', 'Máy tính bảng '];
      for (var i9 = 0; i9 < bo.length; i9++) if (t.indexOf(bo[i9]) === 0) t = t.slice(bo[i9].length).trim();
      var hg9 = ['OPPO ', 'Oppo ', 'SAMSUNG ', 'Samsung ', 'XIAOMI ', 'Xiaomi ', 'REALME ', 'Realme ',
                 'realme ', 'vivo ', 'Vivo ', 'HONOR ', 'Honor ', 'TECNO ', 'Tecno ', 'Nubia ', 'Masstel '];
      for (var j9 = 0; j9 < hg9.length; j9++) if (t.indexOf(hg9[j9]) === 0) { t = t.slice(hg9[j9].length).trim(); break; }
      if (t.indexOf('Galaxy ') === 0) t = t.slice(7).trim();
      var p9 = t.split(' '), k9 = p9.length;
      while (k9 > 1 && !laSpec(p9[k9 - 1])) k9--;
      var coMau = false;
      for (var q9 = k9; q9 < p9.length; q9++) if (MAU_GOC[p9[q9].toLowerCase()]) coMau = true;
      if (coMau) { var z9 = p9.slice(0, k9).join(' ').trim(); if (z9) return z9; }
      return t;
    }
    var TEN6 = { oppo: 'OPPO', op: 'OPPO', samsung: 'Samsung', ss: 'Samsung',
                 xiaomi: 'Xiaomi', xm: 'Xiaomi', realme: 'Realme', rm: 'Realme',
                 vivo: 'vivo', vv: 'vivo', apple: 'Apple', ip: 'Apple', iphone: 'Apple' };
    function hang6(x) {
      var k = String(x || '').trim().toLowerCase();
      return TEN6[k] || 'Khác';
    }
    var mdAll = {}, mdSale = {};
    if (smd && Object.keys(smd).length) {
      Object.keys(smd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var sn = shops[st].sale;
        var byM = smd[tenMain] || {};
        Object.keys(byM).forEach(function (mk) {
          var cell = byM[mk] || {};
          Object.keys(cell).forEach(function (mdl) {
            var v = cell[mdl] || {};
            var u = v.units || 0, rv = v.rev || 0;
            if (!u) return;
            var hg = hang6(v.brand);
            mdl = gonTen(mdl);
            var hop = [mdAll];
            if (sn) { if (!mdSale[sn]) mdSale[sn] = {}; hop.push(mdSale[sn]); }
            hop.forEach(function (B) {
              if (!B[mk]) B[mk] = {};
              if (!B[mk][hg]) B[mk][hg] = {};
              if (!B[mk][hg][mdl]) B[mk][hg][mdl] = [0, 0];
              B[mk][hg][mdl][0] += u; B[mk][hg][mdl][1] += rv;
            });
          });
        });
      });
    }
    function goiMdB(B) {
      var out = null;
      Object.keys(B || {}).forEach(function (mk) {
        Object.keys(B[mk]).forEach(function (hg) {
          var ds = topModel(B[mk][hg], 10);
          if (!ds.length) return;
          if (!out) out = {};
          if (!out[mk]) out[mk] = {};
          out[mk][hg] = ds;
        });
      });
      return out;
    }

    // 7b2. NGAY x HANG ca nam o cap SALE va toan bo -> o.dnB[ngayTrongNam-1] = 14 so
    // [oppoMay,oppoDT, ssMay,ssDT, xmMay,xmDT, ipMay,ipDT, tongMay,tongDT,
    //  pkOppoMay,pkOppoDT, pkTongMay,pkTongDT]   (DT don vi trieu)
    var dnAll = null, dnSale = {};
    // MWG co so toi ngay MOI HON nguon OPPO -> mang phai dai theo ngay lon nhat cua CA HAI
    var dnLen = lastDoy;
    if (sdd) {
      Object.keys(sdd).forEach(function (tn2) {
        var dm2 = sdd[tn2] || {};
        Object.keys(dm2).forEach(function (k2) {
          var p2 = String(k2).split('-'); if (p2.length < 2) return;
          var m2 = +p2[0], d2 = +p2[1]; if (!m2 || !d2) return;
          var y2 = doyOf(YEAR, m2, d2);
          if (y2 > dnLen) dnLen = y2;
        });
      });
    }
    var dnBlank = function () {
      var a = new Array(dnLen);
      for (var q = 0; q < dnLen; q++) a[q] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      return a;
    };
    if (sdd && Object.keys(sdd).length && dnLen > 0) {
      Object.keys(sdd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var sn = shops[st].sale;
        var dayMap = sdd[tenMain] || {};
        Object.keys(dayMap).forEach(function (kk) {
          var p = String(kk).split('-'); if (p.length < 2) return;
          var m = +p[0], d = +p[1];
          if (!m || !d) return;
          var doy = doyOf(YEAR, m, d) - 1;
          if (!(doy >= 0 && doy < dnLen)) return;
          var c = dayMap[kk] || {};
          var v = [c.oppo_units || 0, c.oppo_rev || 0,
                   c.samsung_units || 0, c.samsung_rev || 0,
                   c.xiaomi_units || 0, c.xiaomi_rev || 0,
                   c.apple_units || 0, c.apple_rev || 0,
                   c.total_units || 0, c.total_rev || 0,
                   c.pk1020_oppo_units || 0, c.pk1020_oppo_rev || 0,
                   c.pk1020_total_units || 0, c.pk1020_total_rev || 0];
          if (!v[0] && !v[8]) return;
          if (!dnAll) dnAll = dnBlank();
          var hop = [dnAll];
          if (sn) { if (!dnSale[sn]) dnSale[sn] = dnBlank(); hop.push(dnSale[sn]); }
          hop.forEach(function (a) { for (var z = 0; z < 14; z++) a[doy][z] += v[z]; });
        });
      });
    }
    function goiDn(a) {
      return a.map(function (v) {
        return [v[0], tr(v[1]), v[2], tr(v[3]), v[4], tr(v[5]), v[6], tr(v[7]),
                v[8], tr(v[9]), v[10], tr(v[11]), v[12], tr(v[13])];
      });
    }
    Object.keys(mdSale).forEach(function (sn) {
      if (sales[sn]) { var z = goiMdB(mdSale[sn]); if (z) sales[sn].mdB = z; }
    });
    if (Object.keys(mdAll).length) { var zA = goiMdB(mdAll); if (zA) all.mdB = zA; }
    Object.keys(dnSale).forEach(function (sn) {
      if (sales[sn]) sales[sn].dnB = goiDn(dnSale[sn]);
    });
    if (dnAll) all.dnB = goiDn(dnAll);

    // 7d. Tu MAIN.daily.rows (du lieu THO: thang,ngay,sale,phankhuc,hang,DT,may,size,model)
    // -> model theo NGAY + cong don, va PK 10-20M theo NGAY theo HANG. Ca hai o cap SALE.
    var DL = kho('daily');
    var dmTen = null, dmSale = {}, dmAll = null, pkSale = {}, pkAll = null;
    if (DL && Array.isArray(DL.rows) && DL.rows.length) {
      src.dailyRaw = true;
      var dSale = DL.sales || [], dSeg = DL.segments || [], dBr = DL.brands || [], dMd = DL.models || [];
      var H7B = {};
      dBr.forEach(function (b, i) {
        var k = String(b || '').toLowerCase();
        H7B[i] = (k === 'oppo') ? 0 : (k === 'samsung') ? 1 : (k === 'xiaomi') ? 2 :
                 (k === 'apple') ? 3 : (k === 'vivo') ? 4 : (k === 'realme') ? 5 : 6;
      });
      var laPK = {};
      dSeg.forEach(function (s, i) { if (s === '10-15M' || s === '15-20M') laPK[i] = 1; });
      var BA = { 0: 'OPPO', 1: 'Samsung', 2: 'Xiaomi' };
      var pkBlank = function () {
        var a = {};
        return a;
      };
      var gomM = {}, gomA = {};   // gomM[sale][hang][ngay|'c'][modelIdx] = [may, dt]
      var pkM = {}, pkA = {};     // pkM[sale][ngay][hang7] = [may, dt]
      DL.rows.forEach(function (r) {
        if (r[0] !== CUR_M) return;
        var d = r[1], sn = dSale[r[2]], bi = r[4], u = r[6] || 0, rv = r[5] || 0;
        if (!d || !u) return;
        var h7 = H7B[bi]; if (h7 === undefined) h7 = 6;
        // PK 10-20M theo ngay theo hang
        if (laPK[r[3]]) {
          var hopP = [pkA];
          if (sn) { if (!pkM[sn]) pkM[sn] = {}; hopP.push(pkM[sn]); }
          hopP.forEach(function (B) {
            if (!B[d]) { B[d] = []; for (var q = 0; q < 7; q++) B[d].push([0, 0]); }
            B[d][h7][0] += u; B[d][h7][1] += rv;
          });
        }
        // model theo ngay + cong don, chi 3 hang OPPO / Samsung / Xiaomi
        var bn = BA[h7]; if (!bn) return;
        var mi = gonTen(dMd[r[8]] || '?');
        var hopM = [gomA];
        if (sn) { if (!gomM[sn]) gomM[sn] = {}; hopM.push(gomM[sn]); }
        hopM.forEach(function (B) {
          if (!B[bn]) B[bn] = {};
          var G = B[bn];
          if (!G[d]) G[d] = {};
          if (!G[d][mi]) G[d][mi] = [0, 0];
          G[d][mi][0] += u; G[d][mi][1] += rv;
          if (!G.c) G.c = {};
          if (!G.c[mi]) G.c[mi] = [0, 0];
          G.c[mi][0] += u; G.c[mi][1] += rv;
        });
      });
      // rut gon: moi ngay moi hang giu top 8 theo may cua ngay, kem so cong don
      var dungM = {};
      var goiM = function (B) {
        var out = null;
        Object.keys(B || {}).forEach(function (bn) {
          var G = B[bn], cd = G.c || {};
          Object.keys(G).forEach(function (d) {
            if (d === 'c') return;
            var ds = Object.keys(G[d]).map(function (mi) {
              var v = G[d][mi], c = cd[mi] || [0, 0];
              return [mi, v[0], tr(v[1]), c[0], tr(c[1])];
            }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
            if (!ds.length) return;
            ds.forEach(function (x) { dungM[x[0]] = 1; });
            if (!out) out = {};
            if (!out[d]) out[d] = {};
            out[d][bn] = ds;
          });
        });
        return out;
      };
      var mAll = goiM(gomA), mBySale = {};
      Object.keys(gomM).forEach(function (sn) { mBySale[sn] = goiM(gomM[sn]); });
      // bang tra ten model — chi giu ma thuc su duoc dung
      var doi = {}, ten = [];
      Object.keys(dungM).forEach(function (mi) { doi[mi] = ten.length; ten.push(mi); });
      var doiSo = function (O) {
        if (!O) return null;
        Object.keys(O).forEach(function (d) {
          Object.keys(O[d]).forEach(function (bn) {
            O[d][bn].forEach(function (x) { x[0] = doi[x[0]]; });
          });
        });
        return O;
      };
      dmTen = ten;
      dmAll = doiSo(mAll);
      Object.keys(mBySale).forEach(function (sn) { dmSale[sn] = doiSo(mBySale[sn]); });
      var goiPK = function (B) {
        var out = null;
        Object.keys(B || {}).forEach(function (d) {
          if (!out) out = {};
          out[d] = B[d].map(function (v) { return [v[0], tr(v[1])]; });
        });
        return out;
      };
      pkAll = goiPK(pkA);
      Object.keys(pkM).forEach(function (sn) { pkSale[sn] = goiPK(pkM[sn]); });
    }
    if (dmTen && dmTen.length) {
      if (dmAll) all.dmN = dmAll;
      Object.keys(dmSale).forEach(function (sn) { if (sales[sn] && dmSale[sn]) sales[sn].dmN = dmSale[sn]; });
    }
    if (pkAll) all.pkD = pkAll;
    Object.keys(pkSale).forEach(function (sn) { if (sales[sn]) sales[sn].pkD = pkSale[sn]; });

    // 7d2. Bonus Model cua chuong trinh rieng Sale Loc & Khai — tinh o cap SALE.
    //   10-15M -> 80.000d/may · 15-20M / 20-30M / >20M / >30M -> 120.000d/may · duoi 10M -> 0
    //   Rieng model bi EP GIA theo ten thi an muc 120.000d bat ke phan khuc (giong DB TG).
    //   Dung daily.rows vi day la nguon duy nhat co CA phan khuc LAN ten model tren cung mot dong.
    if (DL && Array.isArray(DL.rows) && DL.rows.length) {
      var EP_GIA = {};
      ['OPPO Reno16 F 5G 8+128GB'].forEach(function (t) { EP_GIA[gonTen(t)] = 1; });
      var BM_SEG = { '10-15M': 0, '15-20M': 1, '20-30M': 1, '>20M': 1, '>30M': 1 };
      var dS2 = DL.sales || [], dG2 = DL.segments || [], dB2 = DL.brands || [], dM2 = DL.models || [];
      var iOp = -1;
      dB2.forEach(function (b, i) { if (String(b || '').toLowerCase() === 'oppo') iOp = i; });
      var oSeg = {};
      dG2.forEach(function (x, i) { var v = BM_SEG[String(x || '').trim()]; if (v !== undefined) oSeg[i] = v; });
      var oEp = {};
      dM2.forEach(function (t, i) { if (EP_GIA[gonTen(t)]) oEp[i] = 1; });
      var bmRong = function () { var a = []; for (var q = 0; q < NM; q++) a.push([0, 0]); return a; };
      var bmSale = {}, bmTong = bmRong();
      if (iOp >= 0) {
        DL.rows.forEach(function (r) {
          if (r[4] !== iOp) return;
          var i = MIDX[r[0]]; if (i === undefined) return;
          var u = r[6] || 0; if (!u) return;
          var b = oEp[r[8]] ? 1 : oSeg[r[3]];
          if (b === undefined) return;
          var sn = dS2[r[2]];
          if (sn) { if (!bmSale[sn]) bmSale[sn] = bmRong(); bmSale[sn][i][b] += u; }
          bmTong[i][b] += u;
        });
        all.bmL = bmTong;
        Object.keys(bmSale).forEach(function (sn) { if (sales[sn]) sales[sn].bmL = bmSale[sn]; });
      }
    }

    // 7c. Khung gio ban (moi hang, thang hien tai) -> sh.hr = [[khung, may, dt]]
    var shb = kho('shop_hour_all_brand');
    if (shb && Object.keys(shb).length) {
      src.hour = true;
      Object.keys(shb).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var cell = thangCua(shb[tenMain], CUR_M); if (!cell) return;
        var ds = [];
        Object.keys(cell).forEach(function (slot) {
          var v = cell[slot] || {};
          if (!v.units) return;
          ds.push([slot, v.units, tr(v.rev || 0)]);
        });
        ds.sort(function (a, b) { return String(a[0]).localeCompare(String(b[0]), 'vi', { numeric: true }); });
        if (ds.length) shops[st].hr = ds;
      });
    }

    // 7d. Nhan vien ban gioi PK 10-20M (thang hien tai) -> sh.st = [[ten, may, dt, modelManhNhat]]
    var ssp = kho('shop_staff_pk1020');
    if (ssp && Object.keys(ssp).length) {
      src.staff = true;
      Object.keys(ssp).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var cell = thangCua(ssp[tenMain], CUR_M); if (!cell) return;
        var ds = [];
        Object.keys(cell).forEach(function (ten) {
          var v = cell[ten] || {};
          if (!v.units) return;
          var top = '', topU = 0;
          Object.keys(v.models || {}).forEach(function (mdl) {
            var mv = v.models[mdl] || {};
            if ((mv.units || 0) > topU) { topU = mv.units; top = mdl; }
          });
          ds.push([ten, v.units, tr(v.rev || 0), top]);
        });
        ds.sort(function (a, b) { return b[1] - a[1]; });
        if (ds.length) shops[st].stf = ds.slice(0, 5);
      });
    }

    // ---- Bang ton theo DAI LY (da gom chi nhanh)
    var dlTon = [];
    Object.keys(dlTheoKhoa).forEach(function (k) {
      var g = dlTheoKhoa[k];
      var tk = tonKho(g);
      if (!tk) return;
      var nhap = 0, ban = 0;
      tk.forEach(function (x) { nhap += x[1]; ban += x[2]; });
      if (!nhap) return;                       // chua ghep duoc sell-in -> khong tinh ton
      var saleSet = {}, tenCN = [];
      g.shops.forEach(function (st) { saleSet[shops[st].sale] = 1; tenCN.push(st); });
      dlTon.push({
        n: g.ten, cn: tenCN, sale: Object.keys(saleSet),
        nhap: Math.round(nhap), ban: ban, ton: Math.round(nhap) - ban,
        md: tk.slice(0, 20)
      });
    });
    dlTon.sort(function (a, b) { return b.ton - a.ton; });

    // =========================================================
    // 7e. TARGET THEO KENH — lay dung con so anh Thai giao trong DB TG (tong 50 ty)
    //     va phan bo xuong tung Sale theo DUNG cach DB TG dang lam:
    //     ty trong doanh so/doanh thu binh quan thang cua sale trong chinh kenh do.
    // =========================================================
    var CHANNEL_TARGETS = {
      MWG: { u: 3500, rv: 33000000000 },
      KA:  { u: 600,  rv: 4500000000 },
      IND: { u: 2000, rv: 12500000000 }
    };
    var tenSale = Object.keys(sales);
    CHANS.forEach(function (c) {
      var T = CHANNEL_TARGETS[c]; if (!T) return;
      var tongU = 0, tongR = 0, avg = {};
      tenSale.forEach(function (sn) {
        var mm = sales[sn].ch[c]; if (!mm) return;
        var u = 0, rv = 0;
        mm.forEach(function (x) { u += x[0]; rv += x[1]; });
        avg[sn] = { u: u / NM, rv: rv / NM };
        tongU += avg[sn].u; tongR += avg[sn].rv;
      });
      Object.keys(avg).forEach(function (sn) {
        var o = sales[sn];
        if (!o.tgc) o.tgc = {};
        o.tgc[c] = [
          Math.round(T.u * (tongU ? avg[sn].u / tongU : 0)),
          tr(T.rv * (tongR ? avg[sn].rv / tongR : 0))
        ];
      });
      if (!all.tgc) all.tgc = {};
      all.tgc[c] = [T.u, tr(T.rv)];
    });

    // =========================================================
    // 8. Dong goi
    // =========================================================
    function packCh(o) {
      var out = {};
      CHANS.forEach(function (c) { if (o.ch[c]) out[c] = o.ch[c].map(function (x) { return [x[0], tr(x[1])]; }); });
      return out;
    }
    function packPairs(a) { return a.map(function (x) { return [x[0], tr(x[1])]; }); }
    function packMoM(src2, n) {
      var out = null;
      Object.keys(src2 || {}).forEach(function (m) {
        var ds = topModel(src2[m], n);
        if (ds.length) { if (!out) out = {}; out[m] = ds; }
      });
      return out;
    }
    function topModel(mo, n) {
      return Object.keys(mo || {})
        .map(function (k) { return [k, mo[k][0], tr(mo[k][1])]; })
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, n || 12);
    }
    // Trai mang thua thanh mang dac theo ngay-trong-nam (1..lastDoy)
    function densify(o) {
      var u = new Array(lastDoy), r = new Array(lastDoy);
      for (var i = 0; i < lastDoy; i++) { u[i] = 0; r[i] = 0; }
      if (o._dy) Object.keys(o._dy).forEach(function (k) {
        var i = +k - 1; if (i >= 0 && i < lastDoy) { u[i] = o._dy[k]; r[i] = tr(o._dr[k]); }
      });
      return [u, r];
    }
    function packCore(o, withDy) {
      var r = {
        m: packPairs(o.m), ch: packCh(o),
        sg: packPairs(o.sg), sgM: packPairs(o.sgM),
        sr: packPairs(o.sr), srM: packPairs(o.srM)
      };
      if (o.ac && o.ac.some(function (x) { return x; })) r.ac = o.ac;
      var mo = topModel(o.mo, withDy ? 15 : 10);
      if (mo.length) r.mo = mo;
      if (o.srm) r.srm = o.srm.map(packPairs);
      if (o.sgm) r.sgm = o.sgm.map(packPairs);
      var mm = packMoM(o.moM, withDy ? 10 : 6);
      if (mm) r.moM = mm;
      if (withDy) { var x = densify(o); r.dy = x[0]; r.dr = x[1]; }
      else { r.d = o.d; r.dp = o.dp; }
      if (o.mkt) r.mkt = o.mkt;
      if (o.mdB) r.mdB = o.mdB;
      if (o.dnB) r.dnB = o.dnB;
      if (o.dmN) r.dmN = o.dmN;
      if (o.pkD) r.pkD = o.pkD;
      if (o.bmL) r.bmL = o.bmL;
      if (o.tgc) r.tgc = o.tgc;
      if (o.si) r.si = o.si;
      var tk = tonKho(o); if (tk) r.tk = tk;   // ton kho IND theo model
      if (chuaGhepSellin(o)) r.tkNo = 1;      // ban nhung chua ghep duoc sell-in
      if (o.chd) {
        r.chd = {};
        CHANS.forEach(function (c) {
          var cd = o.chd[c]; if (!cd) return;
          var y = {
            m: packPairs(cd.m),
            sg: packPairs(cd.sg), sgM: packPairs(cd.sgM),
            sr: packPairs(cd.sr), srM: packPairs(cd.srM)
          };
          if (cd.ac && cd.ac.some(function (x) { return x; })) y.ac = cd.ac;
          var cmo = topModel(cd.mo, 12);
          if (cmo.length) y.mo = cmo;
          var z = densify(cd); y.dy = z[0]; y.dr = z[1];
          if (cd.mkt) y.mkt = cd.mkt;
          if (cd.srm) y.srm = cd.srm.map(packPairs);
          if (cd.sgm) y.sgm = cd.sgm.map(packPairs);
          var cmm = packMoM(cd.moM, 8);
          if (cmm) y.moM = cmm;
          r.chd[c] = y;
        });
      }
      return r;
    }

    var bySale = {};
    shopOrder.forEach(function (st) { (bySale[shops[st].sale] = bySale[shops[st].sale] || []).push(st); });

    var salesOut = Object.keys(sales).sort().map(function (name) {
      var lst = (bySale[name] || []).slice().sort(function (a, b) {
        var ra = 0, rb = 0;
        shops[a].m.forEach(function (x) { ra += x[1]; });
        shops[b].m.forEach(function (x) { rb += x[1]; });
        return rb - ra;
      });
      var o = packCore(sales[name], true);
      o.n = name;
      o.shops = lst.length;
      o.tg = lst.reduce(function (t, s) { return t + shops[s].tg; }, 0);
      o.s = lst.map(function (st) {
        var sh = shops[st], c = packCore(sh);
        c.n = sh.n; c.ch2 = sh.chan; c.lv = sh.lv; c.tg = sh.tg;
        if (sh.size) c.size = sh.size;
        if (sh.sid) c.sid = sh.sid;
        if (sh.md) c.md = sh.md;
        if (sh.dk) c.dk = sh.dk;
        if (sh.mkm) c.mkm = sh.mkm;
        if (sh.sgmS) c.sgmS = sh.sgmS;
        if (sh.sgb) c.sgb = sh.sgb;
        if (sh.bmS) c.bmS = sh.bmS;
        if (sh.dkp) c.dkp = sh.dkp;
        if (sh.hr) c.hr = sh.hr;
        if (sh.stf) c.stf = sh.stf;
        return c;
      });
      return o;
    }).filter(function (o) { return o.shops || o.m.some(function (x) { return x[0]; }); });

    var allOut = packCore(all, true);
    allOut.shops = shopOrder.length;
    allOut.tg = shopOrder.reduce(function (t, s) { return t + shops[s].tg; }, 0);

    return {
      updated: new Date().toISOString(),
      v: 2,
      months: MONTHS, maxDay: maxDay, dimCur: DIM_CUR, dimPrv: DIM_PRV,
      year: YEAR, lastDoy: lastDoy,
      dmT: dmTen,
      segs: SEGS, sers: SERS, chans: CHANS,
      segsMkt: SEGA,
      nhomPK: nhomPKTen,
      shareKA: (function () {
        try { return tinhShareKA(SHARE_KA, MONTHS); } catch (e) { return null; }
      })(),
      sizes: (function(){var z={};shopOrder.forEach(function(st){if(shops[st].size)z[shops[st].size]=1});
        return ['S','A','B','C','D','Chưa xếp size'].filter(function(x){return z[x]})
          .concat(Object.keys(z).filter(function(x){return ['S','A','B','C','D','Chưa xếp size'].indexOf(x)<0}).sort())})(),
      tgK: { MWG: [3500, tr(33000000000)], KA: [600, tr(4500000000)], IND: [2000, tr(12500000000)] },
      tkMonths: SI_LIST,
      dlTon: dlTon,
      tkLe: {
        tong: Math.round(leSellin.tong),
        theoMa: Math.round(leSellin.theoMa),
        theoTen: Math.round(leSellin.theoTen),
        ma: Object.keys(leSellin.ma).length,
        mdl: Object.keys(leSellin.mdl).map(function (k) { return [k, Math.round(leSellin.mdl[k])]; })
                 .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 20)
      },
      hc: HC,
      src: src,
      mktNote: {
        matched: mkt.matched, shops: mkt.shops,
        unmatched: mkt.unmatched.slice(0, 20)
      },
      all: allOut,
      sales: salesOut
    };
  }

  if (typeof window !== 'undefined') window.buildAppData = build;
  if (typeof module !== 'undefined' && module.exports) module.exports = build;
})();
