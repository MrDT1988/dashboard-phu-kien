/* build-app-data.js — chay TRONG trang tg.html (hoac trong GitHub Action qua Playwright).
 * Doc 2 kho du lieu da tinh san cua DB TG:
 *   window.__exportDataMwg  = so lieu OPPO toan tinh, 3 kenh (MWG / KA / IND)
 *   window.__exportDataMain = so lieu TOAN THI TRUONG (moi hang) - chi co o kenh MWG
 * Tra ve 1 object gon nhe cho app Sale/ASM.
 *
 * Quy uoc: doanh thu luu bang TRIEU DONG (lam tron). So may = so nguyen.
 */
(function () {
  'use strict';

  function build(MWG, MAIN) {
    if (!MWG) throw new Error('Chua co __exportDataMwg');

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
    var zeros = function (n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = 0; return a; };
    var pairs = function (n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = [0, 0]; return a; };

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

    // =========================================================
    // 1. Khung rong cho tung shop / tung sale / toan tinh
    // =========================================================
    function blank(extra) {
      var o = {
        m: pairs(NM),                  // [may, doanh thu] theo thang
        d: zeros(DIM_CUR),             // may theo ngay - thang hien tai
        dp: zeros(DIM_PRV),            // may theo ngay - thang truoc
        ch: {},                        // kenh -> [may, dt] theo thang
        sg: pairs(SEGS.length),        // phan khuc - luy ke ca nam
        sgM: pairs(SEGS.length),       // phan khuc - thang hien tai
        sr: pairs(SERS.length),        // dong may - luy ke
        srM: pairs(SERS.length),       // dong may - thang hien tai
        chd: null                      // chi tiet theo tung kenh (chi dat o cap tinh & sale)
      };
      for (var k in extra) o[k] = extra[k];
      return o;
    }

    var shops = {}, shopOrder = [];
    (MWG.store_rows || []).forEach(function (r) {
      if (shops[r.store]) return;
      shops[r.store] = blank({
        n: r.store,
        sale: r.sale || '(Không rõ)',
        chan: r.channel || '?',
        lv: r.level && r.level !== '(Không rõ)' ? r.level : '',
        tg: tr(r.target)
      });
      shopOrder.push(r.store);
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
        m: pairs(NM), d: zeros(DIM_CUR), dp: zeros(DIM_PRV),
        sg: pairs(SEGS.length), sgM: pairs(SEGS.length),
        sr: pairs(SERS.length), srM: pairs(SERS.length)
      };
      return o.chd[ch];
    }

    // =========================================================
    // 2. Do so lieu OPPO theo thang tu crosstab
    //    crosstab item: {m, channel, store, model, series, segment, sales, sellout, activated, rev}
    // =========================================================
    (MWG.crosstab || []).forEach(function (r) {
      var i = MIDX[r.m]; if (i === undefined) return;
      var u = r.sellout || 0, rv = r.rev || 0;
      if (!u && !rv) return;
      var ch = r.channel || '?';
      var si = SEGI[r.segment];
      var ri = SERI[r.series]; if (ri === undefined) ri = KHAC;
      var isCur = r.m === CUR_M;

      var targets = [all, saleOf(r.sales), shops[r.store]];
      for (var t = 0; t < targets.length; t++) {
        var o = targets[t]; if (!o) continue;
        o.m[i][0] += u; o.m[i][1] += rv;
        addCh(o, ch, i, u, rv);
        if (si !== undefined) { o.sg[si][0] += u; o.sg[si][1] += rv;
          if (isCur) { o.sgM[si][0] += u; o.sgM[si][1] += rv; } }
        if (ri !== undefined && ri >= 0) { o.sr[ri][0] += u; o.sr[ri][1] += rv;
          if (isCur) { o.srM[ri][0] += u; o.srM[ri][1] += rv; } }
        if (t < 2) {   // chi tinh chi tiet kenh o cap tinh & sale
          var cd = chdOf(o, ch);
          cd.m[i][0] += u; cd.m[i][1] += rv;
          if (si !== undefined) { cd.sg[si][0] += u; cd.sg[si][1] += rv;
            if (isCur) { cd.sgM[si][0] += u; cd.sgM[si][1] += rv; } }
          if (ri !== undefined && ri >= 0) { cd.sr[ri][0] += u; cd.sr[ri][1] += rv;
            if (isCur) { cd.srM[ri][0] += u; cd.srM[ri][1] += rv; } }
        }
      }
    });

    // =========================================================
    // 3. So lieu theo NGAY (thang hien tai + thang truoc)
    // =========================================================
    var maxDay = 0;
    Object.keys(MWG.overview_daily_by_date || {}).forEach(function (iso) {
      var p = iso.split('-'); if (p.length !== 3) return;
      var mo = +p[1], dd = +p[2], key, lim;
      if (mo === CUR_M) { key = 'd'; lim = DIM_CUR; }
      else if (PRV_M && mo === PRV_M) { key = 'dp'; lim = DIM_PRV; }
      else return;
      if (dd < 1 || dd > lim) return;
      var byCh = MWG.overview_daily_by_date[iso];
      Object.keys(byCh).forEach(function (ch) {
        var byStore = byCh[ch];
        Object.keys(byStore).forEach(function (st) {
          var u = (byStore[st] || {}).sellout || 0; if (!u) return;
          all[key][dd - 1] += u;
          chdOf(all, ch)[key][dd - 1] += u;
          var sh = shops[st];
          var sn = (byStore[st] || {}).sale || (sh ? sh.sale : null);
          var sl = sales[sn || '(Không rõ)'];
          if (sl) { sl[key][dd - 1] += u; chdOf(sl, ch)[key][dd - 1] += u; }
          if (sh) sh[key][dd - 1] += u;
          if (key === 'd' && dd > maxDay) maxDay = dd;
        });
      });
    });

    // =========================================================
    // 4. THI PHAN - chi kenh MWG (nguon __exportDataMain, du lieu moi hang)
    //    Ten shop 2 sheet khac nhau -> doi chieu theo ma vung + dia chi.
    // =========================================================
    var mkt = { matched: 0, unmatched: [], shops: 0 };
    if (MAIN && MAIN.shop_segment_crosstab) {
      var norm = function (s) {
        return String(s || '').toLowerCase().normalize('NFD')
          .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
          .replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '');
      };
      // "TGD_TGI_CLA" -> "tgicla" (bo tien to loai shop vi 2 sheet ghi khac nhau: TGD / DMS / DMS3)
      var geo = function (c) { var p = String(c).split('_'); return p.length >= 3 ? norm(p[1] + p[2]) : norm(c); };

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

      var map = {};   // ten shop ben MAIN -> ten shop ben OPPO
      var mainShops = {};
      MAIN.shop_segment_crosstab.forEach(function (r) { mainShops[r.shop] = r.sale || ''; });
      Object.keys(mainShops).forEach(function (s) {
        var p = String(s).split(' - ');
        var addr = norm(p.slice(1).join(' '));
        var hit = exact[norm(p[0]) + '|' + addr] || loose[geo(p[0]) + '|' + addr];
        if (hit) { map[s] = hit; mkt.matched++; }
        else mkt.unmatched.push(s);
      });

      // gom: shop -> thang -> [oppoU, oppoRv, totU, totRv]; va brand cua thang hien tai
      function mblank() { var a = new Array(NM); for (var i = 0; i < NM; i++) a[i] = [0, 0, 0, 0]; return a; }
      var mShop = {}, mSale = {}, mAll = mblank();
      var brShop = {}, brSale = {}, brAll = {};

      MAIN.shop_segment_crosstab.forEach(function (r) {
        var i = MIDX[r.m]; if (i === undefined) return;
        var u = r.units || 0, rv = r.rev || 0; if (!u && !rv) return;
        var oppo = String(r.brand || '').toLowerCase() === 'oppo';
        var st = map[r.shop];
        var sn = st ? shops[st].sale : (r.sale || '(Không rõ)');

        var rows = [mAll];
        if (st) { mShop[st] = mShop[st] || mblank(); rows.push(mShop[st]); }
        if (sn) { mSale[sn] = mSale[sn] || mblank(); rows.push(mSale[sn]); }
        rows.forEach(function (a) {
          a[i][2] += u; a[i][3] += rv;
          if (oppo) { a[i][0] += u; a[i][1] += rv; }
        });

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
      chdOf(all, 'MWG').mkt = all.mkt;
      Object.keys(mSale).forEach(function (sn) {
        if (sales[sn]) {
          sales[sn].mkt = { m: packM(mSale[sn]), br: topBrands(brSale[sn], 8) };
          chdOf(sales[sn], 'MWG').mkt = sales[sn].mkt;
        }
      });
      Object.keys(mShop).forEach(function (st) {
        shops[st].mkt = { m: packM(mShop[st]), br: topBrands(brShop[st], 6) };
        mkt.shops++;
      });
    }

    // =========================================================
    // 5. Dong goi
    // =========================================================
    function packCh(o) {
      var out = {};
      CHANS.forEach(function (c) { if (o.ch[c]) out[c] = o.ch[c].map(function (x) { return [x[0], tr(x[1])]; }); });
      return out;
    }
    function packPairs(a) { return a.map(function (x) { return [x[0], tr(x[1])]; }); }
    function packCore(o) {
      var r = {
        m: packPairs(o.m), d: o.d, dp: o.dp, ch: packCh(o),
        sg: packPairs(o.sg), sgM: packPairs(o.sgM),
        sr: packPairs(o.sr), srM: packPairs(o.srM)
      };
      if (o.mkt) r.mkt = o.mkt;
      if (o.chd) {
        r.chd = {};
        CHANS.forEach(function (c) {
          var cd = o.chd[c]; if (!cd) return;
          var x = {
            m: packPairs(cd.m), d: cd.d, dp: cd.dp,
            sg: packPairs(cd.sg), sgM: packPairs(cd.sgM),
            sr: packPairs(cd.sr), srM: packPairs(cd.srM)
          };
          if (cd.mkt) x.mkt = cd.mkt;
          r.chd[c] = x;
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
      var o = packCore(sales[name]);
      o.n = name;
      o.shops = lst.length;
      o.tg = lst.reduce(function (t, s) { return t + shops[s].tg; }, 0);
      o.s = lst.map(function (st) {
        var sh = shops[st], c = packCore(sh);
        c.n = sh.n; c.ch2 = sh.chan; c.lv = sh.lv; c.tg = sh.tg;
        return c;
      });
      return o;
    }).filter(function (o) { return o.shops || o.m.some(function (x) { return x[0]; }); });

    var allOut = packCore(all);
    allOut.shops = shopOrder.length;
    allOut.tg = shopOrder.reduce(function (t, s) { return t + shops[s].tg; }, 0);

    return {
      updated: new Date().toISOString(),
      months: MONTHS, maxDay: maxDay, dimCur: DIM_CUR, dimPrv: DIM_PRV,
      segs: SEGS, sers: SERS, chans: CHANS,
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
