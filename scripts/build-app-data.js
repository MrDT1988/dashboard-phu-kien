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

  function build(MWG, MAIN) {
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
    var leSellin = { tong: 0, mdl: {}, ma: {} };
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
        mo: {}
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
        // Ban ra LUY KE theo model — chi kenh IND, CHI cac thang co so sell-in
        if (ch === 'IND' && mdl && u && SI_M[r.m]) {
          if (!o._ban) o._ban = {};
          o._ban[mdl] = (o._ban[mdl] || 0) + u;
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
        var coShop = !!(st && shops[st]);
        if (!coShop) {
          // Dong sell-in nay khong ghep duoc vao shop IND nao (ma shop la trong sheet
          // khong co trong danh sach shop). KHONG duoc cong vao tong tinh, neu khong
          // tong tinh se khac tong cong tung shop -> ra ton am gia o cap shop.
          leSellin.tong += qty;
          if (j === 0 && sp) leSellin.mdl[sp] = (leSellin.mdl[sp] || 0) + qty;
          leSellin.ma[sid] = 1;
          return;
        }
        var targets = [all, shops[st]];
        if (sales[shops[st].sale]) targets.push(sales[shops[st].sale]);
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
    var mapMain = {};           // ten shop ben MAIN -> ten shop ben OPPO
    var norm = function (s) {
      return String(s || '').toLowerCase().normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
        .replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '');
    };
    // "TGD_TGI_CLA" -> "tgicla" (bo tien to loai shop vi 2 sheet ghi khac nhau: TGD / DMS / DMS3)
    var geo = function (c) { var p = String(c).split('_'); return p.length >= 3 ? norm(p[1] + p[2]) : norm(c); };

    var SEGA = [], SEGAI = {};   // danh muc phan khuc ben MAIN (co the khac ben OPPO)
    if (MAIN.shop_segment_crosstab) {
      var exact = {}, loose = {};
      shopOrder.forEach(function (st) {
        if (shops[st].chan !== 'MWG') return;
        var p = String(st).split(' - ');
        if (p.length < 4) return;
        var addr = norm(p.slice(3).join(' '));
        var ke = norm(p[2]) + '|' + addr, kl = geo(p[2]) + '|' + addr;
        if (!(ke in exact)) exact[ke] = st; else exact[ke] = null;   // trung -> bo, khong doan bua
        if (!(kl in loose)) loose[kl] = st; else loose[kl] = null;
      });

      var mainShops = {};
      MAIN.shop_segment_crosstab.forEach(function (r) { mainShops[r.shop] = r.sale || ''; });
      Object.keys(mainShops).forEach(function (s) {
        var p = String(s).split(' - ');
        var addr = norm(p.slice(1).join(' '));
        var hit = exact[norm(p[0]) + '|' + addr] || loose[geo(p[0]) + '|' + addr];
        if (hit) { mapMain[s] = hit; mkt.matched++; }
        else mkt.unmatched.push(s);
      });

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

      MAIN.shop_segment_crosstab.forEach(function (r) {
        var i = MIDX[r.m]; if (i === undefined) return;
        var u = r.units || 0, rv = r.rev || 0; if (!u && !rv) return;
        var oppo = String(r.brand || '').toLowerCase() === 'oppo';
        var st = mapMain[r.shop];
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

    // 7b. Thi phan theo NGAY tai shop -> sh.dk (thang nay) / sh.dkp (thang truoc) = [oppoMay, tongMay]
    var sdd = kho('shop_day_data');
    if (sdd && Object.keys(sdd).length) {
      src.dayMkt = true;
      Object.keys(sdd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var dayMap = sdd[tenMain] || {};
        var cur = null, prv = null;
        Object.keys(dayMap).forEach(function (k) {
          var p = String(k).split('-'); if (p.length < 2) return;
          var m = +p[0], d = +p[1];
          var c = dayMap[k] || {};
          var oU = c.oppo_units || 0, tU = c.total_units || 0;
          if (!oU && !tU) return;
          if (m === CUR_M && d >= 1 && d <= DIM_CUR) {
            if (!cur) { cur = new Array(DIM_CUR); for (var a = 0; a < DIM_CUR; a++) cur[a] = [0, 0]; }
            cur[d - 1][0] += oU; cur[d - 1][1] += tU;
          } else if (PRV_M && m === PRV_M && d >= 1 && d <= DIM_PRV) {
            if (!prv) { prv = new Array(DIM_PRV); for (var b = 0; b < DIM_PRV; b++) prv[b] = [0, 0]; }
            prv[d - 1][0] += oU; prv[d - 1][1] += tU;
          }
        });
        if (cur) shops[st].dk = cur;
        if (prv) shops[st].dkp = prv;
      });
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

    // =========================================================
    // 8. Dong goi
    // =========================================================
    function packCh(o) {
      var out = {};
      CHANS.forEach(function (c) { if (o.ch[c]) out[c] = o.ch[c].map(function (x) { return [x[0], tr(x[1])]; }); });
      return out;
    }
    function packPairs(a) { return a.map(function (x) { return [x[0], tr(x[1])]; }); }
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
      if (withDy) { var x = densify(o); r.dy = x[0]; r.dr = x[1]; }
      else { r.d = o.d; r.dp = o.dp; }
      if (o.mkt) r.mkt = o.mkt;
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
      segs: SEGS, sers: SERS, chans: CHANS,
      segsMkt: SEGA,
      tkMonths: SI_LIST,
      tkLe: {
        tong: Math.round(leSellin.tong),
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
