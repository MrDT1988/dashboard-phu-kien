/* bc.js — BÁO CÁO TUẦN / THÁNG cho DB Tiền Giang (anh Thái chốt khung 03/09/2026).
   Lớp trình bày MỚI đặt lên trên tg.html: dùng lại nguyên lớp dữ liệu (checkpoint,
   Apps Script, đăng nhập, phạm vi) — chỉ thay cách hiển thị. Giai đoạn 1: tab Tổng quan.
   Robot đóng gói đi qua (__BO_QUA_GOI). Không có số liệu nào nằm trong file này. */
(function () {
  'use strict';
  if (window.__BO_QUA_GOI) return;

  /* ============ 0. Tiện ích ============ */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fInt = function (v) { return Math.round(v || 0).toLocaleString('vi-VN'); };
  var fTy = function (v) { v = v || 0; if (Math.abs(v) >= 1e9) return (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ'; if (Math.abs(v) >= 1e6) return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' tr'; return fInt(v); };
  var fTyNgan = function (v) { v = v || 0; if (Math.abs(v) >= 1e9) return (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'B'; if (Math.abs(v) >= 1e6) return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + 'M'; return fInt(v); };
  var fTr = function (v) { return v ? (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'M' : '-'; };
  var pct = function (a, b) { return b ? (a - b) / b * 100 : null; };
  var iso = function (d) { return d.toISOString().slice(0, 10); };
  var ngayVN = function (s) { var m = s.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] : s; };
  var congNgay = function (s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  var thangCua = function (s) { return +s.slice(5, 7); };
  var sang = function () { return document.documentElement.getAttribute('data-theme') === 'light'; };

  /* Màu kênh — cùng bảng với demo-mau.js (Sáng / Tối khác nhau để đủ tương phản) */
  var MAU = {
    sang: { MWG: '#006B33', IND: '#2E7CB8', KA: '#C98A2E', TONG: '#59636F', OPPO: '#006B33', KHAC: '#B9C2CB', RENO: '#006B33', FIND: '#8A5CC4', CONLAI: '#B9C2CB', xam: '#8B98A9', chu: '#14171B', chuPhu: '#59636F', luoi: 'rgba(20,23,27,.08)', tang: '#1E8558', giam: '#C43D3D' },
    toi:  { MWG: '#2AD998', IND: '#68B6EF', KA: '#E8B45E', TONG: '#8B98A9', OPPO: '#2AD998', KHAC: '#3A4655', RENO: '#2AD998', FIND: '#B18BE0', CONLAI: '#3A4655', xam: '#8B98A9', chu: '#E8EDF2', chuPhu: '#96A1AE', luoi: 'rgba(255,255,255,.08)', tang: '#2ee673', giam: '#ff5c72' }
  };
  var PK = { sang: ['#B5DDC8', '#8AC7A9', '#63B18C', '#3F9B70', '#1E8558', '#006B41', '#00522F'], toi: ['#0A4530', '#0F5B3E', '#15724D', '#1C8A5D', '#26A26F', '#3FBB87', '#68D3A6'] };
  var mau = function (k) { var b = MAU[sang() ? 'sang' : 'toi']; return b[k] || b.xam; };

  var KENH = ['MWG', 'IND', 'KA'];
  var TEN_KENH = { MWG: 'MWG', IND: 'IND', KA: 'KA' };

  /* ============ 1. Trạng thái ============ */
  var KHO = 'dbtg-bc-v1';
  var st = { cd: 'thang', ky: null, tab: 'tq', tb: null };
  try { var l = JSON.parse(localStorage.getItem(KHO) || '{}'); if (l.cd) st.cd = l.cd; if (l.tb) st.tb = l.tb; } catch (e) {}
  function luu() { try { localStorage.setItem(KHO, JSON.stringify({ cd: st.cd, tb: st.tb })); } catch (e) {} }

  /* ============ 2. Lớp dữ liệu (đọc từ DATA của tg.html, không sửa gì) ============ */
  var D = null;       // DATA CENTER (window.__exportDataMwg — tên cũ, chính là dữ liệu OPPO 3 kênh)
  var OD = null;      // overview_daily_by_date
  var NGAY = [];      // các ngày có số (CENTER), tăng dần
  var NGAY_MWG = [];  // các ngày có số của DATA MWG (tab MWG dùng lịch này — luật nguồn 03/09)
  function napNgayMWG() {
    var B = window.__exportDataMain; if (!B || !B.daily || NGAY_MWG.length) return NGAY_MWG;
    var co = {}; (B.daily.rows || []).forEach(function (r) { co['2026-' + String(r[0]).padStart(2, '0') + '-' + String(r[1]).padStart(2, '0')] = 1; });
    NGAY_MWG = Object.keys(co).sort();
    TUAN.forEach(function (t) { t.coSoMWG = NGAY_MWG.some(function (n) { return n >= t.tu && n <= t.den; }); });
    return NGAY_MWG;
  }
  var TUAN = [];      // [{iso, so, tu, den, coSo}]
  var THANG = [];     // [1..n] có số
  var kenhCoSo = [];  // phạm vi kênh của người xem
  var modelSeries = {}, modelSeg = {};

  function napDuLieu() {
    D = window.__exportDataMwg;
    if (!D || !D.overview_daily_by_date) return false;
    OD = D.overview_daily_by_date;
    NGAY = Object.keys(OD).sort();
    THANG = (D.months_sorted || []).slice();
    kenhCoSo = KENH.filter(function (k) { return (D.channels_list || KENH).indexOf(k) >= 0; });
    var tuanGoc = (typeof ALL_2026_WEEKS !== 'undefined') ? ALL_2026_WEEKS : (function () { var a = [], d = new Date(Date.UTC(2025, 11, 29)); for (var i = 0; i < 53; i++) { a.push(iso(d)); d.setUTCDate(d.getUTCDate() + 7); } return a; })();
    TUAN = tuanGoc.map(function (w, i) { return { iso: w, so: i + 1, tu: w, den: congNgay(w, 6) }; });
    var cuoi = NGAY[NGAY.length - 1];
    TUAN.forEach(function (t) { t.coSo = NGAY.some(function (n) { return n >= t.tu && n <= t.den; }); t.do = t.coSo && cuoi < t.den; t.denCo = t.do ? cuoi : t.den; });
    // model -> series / phân khúc (lấy loại gặp nhiều nhất)
    var ms = {}, mg = {};
    (D.crosstab || []).forEach(function (r) {
      if (!ms[r.model]) ms[r.model] = {}; ms[r.model][r.series] = (ms[r.model][r.series] || 0) + r.sellout;
      if (!mg[r.model]) mg[r.model] = {}; mg[r.model][r.segment] = (mg[r.model][r.segment] || 0) + r.sellout;
    });
    var top = function (o) { var b = null, bv = -1; Object.keys(o).forEach(function (k) { if (o[k] > bv) { bv = o[k]; b = k; } }); return b; };
    Object.keys(ms).forEach(function (m) { modelSeries[m] = top(ms[m]); modelSeg[m] = top(mg[m]); });
    return true;
  }

  /* Danh sách kỳ có số */
  function dsKy(cd) {
    napNgayMWG();
    var cuoiAll = [NGAY[NGAY.length - 1], NGAY_MWG[NGAY_MWG.length - 1]].filter(Boolean).sort().pop();
    if (cd === 'tuan') return TUAN.filter(function (t) { return t.coSo || t.coSoMWG; }).map(function (t) { var doDo = cuoiAll < t.den; return { id: t.iso, ten: 'Tuần ' + t.so, phu: ngayVN(t.tu) + ' – ' + ngayVN(t.den) + (doDo ? ' (đang dở)' : ''), t: t, do: doDo }; });
    var mCuoi = cuoiAll ? thangCua(cuoiAll) : 0, ms = THANG.slice(); for (var m2 = 1; m2 <= mCuoi; m2++) if (ms.indexOf(m2) < 0) ms.push(m2); ms.sort(function (a, b) { return a - b; });
    return ms.map(function (m) { var doDo = m === mCuoi && +cuoiAll.slice(8, 10) < soNgayThang(m); return { id: m, ten: 'Tháng ' + m + '/2026', phu: doDo ? 'đang dở, đến ' + ngayVN(cuoiAll) : '', m: m, do: doDo }; });
  }
  function soNgayThang(m) { return new Date(Date.UTC(2026, m, 0)).getUTCDate(); }
  function khoangKy(cd, id, nguon) {   // -> {tu, den, denCo, do, nhan, nhanNgan}; nguon 'mwg' -> lịch ngày của DATA MWG
    var NG = nguon === 'mwg' ? napNgayMWG() : NGAY; var cuoi = NG[NG.length - 1] || '';
    if (cd === 'tuan') { var t = TUAN.filter(function (x) { return x.iso === id; })[0]; var doT = cuoi < t.den; return { tu: t.tu, den: t.den, denCo: doT ? (cuoi < t.tu ? t.tu : cuoi) : t.den, do: doT, nhan: 'Tuần ' + t.so, nhanNgan: 'W' + t.so, chiTiet: ngayVN(t.tu) + ' – ' + ngayVN(t.den), so: t.so, nguon: nguon }; }
    var m = +id, tu = '2026-' + String(m).padStart(2, '0') + '-01', den = '2026-' + String(m).padStart(2, '0') + '-' + String(soNgayThang(m)).padStart(2, '0');
    var doDo = cuoi >= tu && cuoi < den;
    return { tu: tu, den: den, denCo: doDo ? cuoi : (cuoi < tu ? tu : den), do: doDo, nhan: 'Tháng ' + m + '/2026', nhanNgan: 'T' + m, chiTiet: doDo ? 'đến ' + ngayVN(cuoi) : '1 – ' + ngayVN(den), so: m, nguon: nguon };
  }
  function kyTruoc(cd, k) {   // kỳ liền trước, so cùng số ngày nếu kỳ này đang dở
    var r;
    if (cd === 'tuan') { var tu = congNgay(k.tu, -7); r = { tu: tu, den: congNgay(tu, 6) }; }
    else { var m = k.so - 1; if (m < 1) return null; r = { tu: '2026-' + String(m).padStart(2, '0') + '-01', den: '2026-' + String(m).padStart(2, '0') + '-' + String(soNgayThang(m)).padStart(2, '0') }; }
    if (k.do) { var n = soNgay(k.tu, k.denCo); r.denCo = cd === 'tuan' ? congNgay(r.tu, n - 1) : congNgay(r.tu, Math.min(n, soNgayThang(k.so - 1)) - 1); r.cungKy = true; } else r.denCo = r.den;
    r.nhan = cd === 'tuan' ? 'tuần trước' : 'tháng trước';
    return r;
  }
  function soNgay(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5) + 1; }

  /* Gộp theo khoảng ngày từ overview_daily_by_date */
  function gom(tu, den) {
    var r = { ds: 0, dt: 0, kenh: {}, shop: {}, sale: {}, soNgay: 0 };
    KENH.forEach(function (k) { r.kenh[k] = { ds: 0, dt: 0, shop: {} }; });
    for (var i = 0; i < NGAY.length; i++) {
      var n = NGAY[i]; if (n < tu) continue; if (n > den) break;
      r.soNgay++;
      var byCh = OD[n];
      Object.keys(byCh).forEach(function (ch) {
        var K = r.kenh[ch] || (r.kenh[ch] = { ds: 0, dt: 0, shop: {} });
        Object.keys(byCh[ch]).forEach(function (s) {
          var v = byCh[ch][s], ds = v.sellout || 0, dt = v.rev || 0;
          K.ds += ds; K.dt += dt; r.ds += ds; r.dt += dt;
          var saleThat = (D.shop_sale_map && D.shop_sale_map[s]) || v.sale;   // LUẬT NGUỒN: sale theo SHOP THEO SALE
          var sh = r.shop[s] || (r.shop[s] = { ds: 0, dt: 0, kenh: ch, sale: saleThat });
          sh.ds += ds; sh.dt += dt; if (ds) K.shop[s] = 1;
          var sl = saleThat || '(Không rõ)';
          var sa = r.sale[sl] || (r.sale[sl] = { ds: 0, dt: 0, kenh: {} });
          sa.ds += ds; sa.dt += dt; sa.kenh[ch] = (sa.kenh[ch] || 0) + ds;
        });
      });
    }
    r.soShop = Object.keys(r.shop).filter(function (s) { return r.shop[s].ds > 0; }).length;
    KENH.forEach(function (k) { r.kenh[k].soShop = Object.keys(r.kenh[k].shop).length; });
    return r;
  }
  /* Chuỗi N kỳ gần nhất (đến kỳ đang chọn) — mỗi kỳ: {nhan, ds, dt, kenh:{ch:{ds,dt}}} */
  function chuoiKy(cd, k, n) {
    var out = [];
    if (cd === 'tuan') {
      var idx = TUAN.findIndex(function (t) { return t.iso === k.tu; });
      for (var i = Math.max(0, idx - n + 1); i <= idx; i++) { var t = TUAN[i]; var g = gom(t.tu, t.den); g.nhan = 'W' + t.so; g.id = t.iso; out.push(g); }
    } else {
      for (var m = Math.max(1, k.so - n + 1); m <= k.so; m++) { var kk = khoangKy('thang', m); var g2 = gom(kk.tu, kk.den); g2.nhan = 'T' + m; g2.id = m; out.push(g2); }
    }
    return out;
  }
  /* Model theo kỳ: tháng -> crosstab; tuần -> week_channel_models (chỉ số máy) */
  function modelKy(cd, k) {   // -> {ch: {model: ds}}
    var r = {}; KENH.forEach(function (c) { r[c] = {}; });
    if (cd === 'tuan') {
      var wm = (D.week_channel_models || {})[k.tu] || {};
      Object.keys(wm).forEach(function (c) { r[c] = Object.assign({}, wm[c]); });
    } else {
      (D.crosstab || []).forEach(function (x) { if (x.m !== k.so) return; var c = r[x.channel] || (r[x.channel] = {}); c[x.model] = (c[x.model] || 0) + x.sellout; });
    }
    return r;
  }
  function gomSeries(mk) {   // -> {ch:{RENO, FIND, CONLAI}}, tong
    var r = {}, tong = { RENO: 0, FIND: 0, CONLAI: 0 };
    Object.keys(mk).forEach(function (c) {
      var o = { RENO: 0, FIND: 0, CONLAI: 0 };
      Object.keys(mk[c]).forEach(function (m) { var s = modelSeries[m] || ''; var key = /reno/i.test(s) ? 'RENO' : /find/i.test(s) ? 'FIND' : 'CONLAI'; o[key] += mk[c][m]; tong[key] += mk[c][m]; });
      r[c] = o;
    });
    return { kenh: r, tong: tong };
  }
  function gomSeg(mk) {
    var thuTu = D.segments_list || [], r = {};
    thuTu.forEach(function (s) { r[s] = 0; });
    Object.keys(mk).forEach(function (c) { Object.keys(mk[c]).forEach(function (m) { var s = modelSeg[m] || '(Không rõ)'; r[s] = (r[s] || 0) + mk[c][m]; }); });
    return r;
  }
  /* Target tháng theo kênh (đã thu hẹp theo phạm vi trong tg.html) */
  /* CHANNEL_TARGETS / computeSaleTargetAllocation nằm trong initDashboard() của tg.html — tg.html
     đưa ra ngoài qua window.__bcTarget() (1 dòng thêm sau khối thuHepTheoPhamVi). */
  function layTarget() { try { return window.__bcTarget ? window.__bcTarget() : null; } catch (e) { return null; } }
  function targetKenh() { var t = {}, g = layTarget(); if (!g || !g.kenh) return t; Object.keys(g.kenh).forEach(function (c) { t[c] = { ds: g.kenh[c].sellout, dt: g.kenh[c].revenue, reno16: ((g.sp || {}).reno16 || {})[c] || 0 }; }); return t; }
  function targetSale() { var g = layTarget(); try { return g && g.sale ? (g.sale() || {}) : {}; } catch (e) { return {}; } }
  function reno16Thang(m) {   // số máy Reno16 theo kênh trong tháng m
    var r = {}; (D.series_detail_crosstab || []).forEach(function (x) { if (x.m !== m) return; var sd = x.series_detail || x.seriesDetail || ''; if (!/reno\s*16/i.test(sd)) return; r[x.channel] = (r[x.channel] || 0) + (x.sellout || 0); }); return r;
  }

  /* ============ 3. Thành phần giao diện ============ */
  function chip(v, opt) {   // v = % thay đổi (null -> "—")
    opt = opt || {};
    if (v == null || !isFinite(v)) return '<span class="bc-chip bc-chip-0">—</span>';
    var cls = v > 0.5 ? 'bc-chip-len' : v < -0.5 ? 'bc-chip-giam' : 'bc-chip-0';
    var mt = v > 0.5 ? '▲' : v < -0.5 ? '▼' : '•';
    return '<span class="bc-chip ' + cls + '">' + mt + ' ' + (Math.abs(v) >= 100 ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(1).replace('.0', '')) + '%' + (opt.sau ? ' <i>' + esc(opt.sau) + '</i>' : '') + '</span>';
  }
  function khoi(o) {   // {stt, ten, dangXem, nut(html), rong, id, cachDoc}
    var k = el('section', 'bc-khoi' + (o.rong ? ' bc-rong' : '') + (o.cls ? ' ' + o.cls : ''));
    if (o.id) k.id = o.id;
    k.innerHTML = '<header class="bc-dau"><div class="bc-dau-trai"><h3>' + (o.stt ? '<span class="bc-stt">' + o.stt + '</span>' : '') + esc(o.ten) + (o.cachDoc ? ' <button type="button" class="bc-info" title="Cách đọc" aria-label="Cách đọc">i</button>' : '') + '</h3>' + (o.dangXem ? '<div class="bc-dang-xem">' + o.dangXem + '</div>' : '') + '</div><div class="bc-dau-phai"></div></header><div class="bc-than"></div><div class="bc-chot" hidden></div>';
    if (o.cachDoc) { var cd = el('div', 'bc-cach-doc', esc(o.cachDoc)); cd.hidden = true; k.insertBefore(cd, $('.bc-than', k)); $('.bc-info', k).addEventListener('click', function () { cd.hidden = !cd.hidden; }); }
    return k;
  }
  function chot(k, html) { var c = $('.bc-chot', k); if (!html) { c.hidden = true; return; } c.innerHTML = html; c.hidden = false; }
  function nutChon(ds, chon, onChon) {   // thanh nút chuyển (chỉ số / tab biểu đồ)
    var b = el('div', 'bc-nut-chon'); b.setAttribute('role', 'tablist');
    ds.forEach(function (t, i) { var x = el('button', 'bc-nut' + (i === chon ? ' on' : ''), esc(t)); x.type = 'button'; x.dataset.i = i; b.appendChild(x); });
    b.addEventListener('click', function (e) { var x = e.target.closest('button'); if (!x) return; b.querySelectorAll('button').forEach(function (y) { y.classList.toggle('on', y === x); }); onChon(+x.dataset.i); });
    return b;
  }
  /* Bảng mini: cột = kỳ, dòng = kênh/đối tượng, nút chuyển chỉ số; vừa khung */
  function bangMini(o) {   // {cot:[..], dong:[{ten, mau?}], chiSo:[{ten, lay:(dong,i)->number, fmt}], tong?:true}
    var wrap = el('div', 'bc-mini-wrap');
    var body = el('div', 'bc-mini-cuon');
    var chon = 0;
    function ve() {
      var cs = o.chiSo[chon], fmt = cs.fmt || fInt;
      var h = '<table class="bc-mini"><thead><tr><th>' + esc(cs.donVi || '') + '</th>' + o.cot.map(function (c, i) { return '<th' + (i === o.cot.length - 1 ? ' class="bc-cot-chon"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      var tong = o.cot.map(function () { return 0; });
      o.dong.forEach(function (d) {
        var vs = o.cot.map(function (_, i) { return cs.lay(d, i) || 0; });
        h += '<tr><td>' + (d.mau ? '<i class="bc-cham" style="background:' + d.mau + '"></i>' : '') + esc(d.ten) + '</td>' + vs.map(function (v, i) {
          tong[i] += v; var cls = ''; if (i > 0 && vs[i - 1]) { var p = (v - vs[i - 1]) / vs[i - 1]; cls = p > 0.03 ? ' bc-len' : p < -0.03 ? ' bc-giam' : ''; }
          return '<td class="' + cls + (i === o.cot.length - 1 ? ' bc-cot-chon' : '') + '">' + (v ? fmt(v) : '-') + '</td>';
        }).join('') + '</tr>';
      });
      if (o.tong !== false && o.dong.length > 1 && !cs.khongTong) h += '<tr class="bc-tong"><td>Tổng</td>' + tong.map(function (v, i) { return '<td' + (i === o.cot.length - 1 ? ' class="bc-cot-chon"' : '') + '>' + (v ? fmt(v) : '-') + '</td>'; }).join('') + '</tr>';
      body.innerHTML = h + '</tbody></table>';
      body.scrollLeft = body.scrollWidth;
    }
    if (o.chiSo.length > 1) wrap.appendChild(nutChon(o.chiSo.map(function (c) { return c.ten; }), 0, function (i) { chon = i; ve(); }));
    wrap.appendChild(body); ve();
    return wrap;
  }
  /* Khung biểu đồ: 1 canvas, nhiều tab, số ghi trong biểu đồ, ẩn số nhỏ */
  var charts = [];
  function khungBieuDo(o) {   // {tabs:[{ten, cau:()=>chartConfig}], cao}
    var wrap = el('div', 'bc-bd'); var hop = el('div', 'bc-bd-hop'); hop.style.height = (o.cao || 420) + 'px';
    var cv = el('canvas'); hop.appendChild(cv); var ch = null, chon = 0;
    function ve() {
      if (ch) { try { ch.destroy(); } catch (e) {} ch = null; }
      var cfg = o.tabs[chon].cau(); if (!cfg) return;
      cfg.options = cfg.options || {}; cfg.options.maintainAspectRatio = false; cfg.options.responsive = true;
      cfg.options.animation = cfg.options.animation === undefined ? { duration: 300 } : cfg.options.animation;
      try { ch = new Chart(cv, cfg); } catch (e) { console.warn('bc chart:', e); }
    }
    if (o.tabs.length > 1) wrap.appendChild(nutChon(o.tabs.map(function (t) { return t.ten; }), 0, function (i) { chon = i; ve(); }));
    wrap.appendChild(hop); ve();
    charts.push({ ve: ve, huy: function () { if (ch) { try { ch.destroy(); } catch (e) {} } } });
    return wrap;
  }
  function cauCotChong(labels, datasets, opt) {   // cột chồng theo kênh + tổng trên đầu cột
    opt = opt || {};
    var tong = labels.map(function (_, i) { return datasets.reduce(function (s, d) { return s + (d.data[i] || 0); }, 0); });
    var max = Math.max.apply(null, tong.concat([1]));
    var fmt = opt.fmt || fInt;
    return {
      type: 'bar',
      data: { labels: labels, datasets: datasets.map(function (d, j) { return Object.assign({ borderWidth: 0, borderRadius: 3, maxBarThickness: 46, datalabels: { display: function (c) { var v = c.dataset.data[c.dataIndex]; return v && v / max >= 0.045; }, color: sang() ? '#fff' : '#0b1017', font: { size: 11, weight: '700' }, formatter: function (v) { return fmt(v); }, clamp: true }, order: 2 }, d); }) },
      options: {
        layout: { padding: { top: 22 } },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', color: mau('chuPhu'), font: { size: 12 } } },
          tooltip: { callbacks: { footer: function (it) { return 'Tổng: ' + fmt(tong[it[0].dataIndex]); } } } },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { color: mau('chuPhu'), font: { size: 11 } } }, y: { stacked: true, grid: { color: mau('luoi') }, ticks: { color: mau('chuPhu'), font: { size: 11 }, callback: function (v) { return opt.tien ? fTyNgan(v) : fInt(v); } }, border: { display: false } } }
      },
      plugins: [tongTrenPlugin({ fmt: fmt, tong: tong })],
      __tongTren: true
    };
  }
  /* Nhãn tổng trên đầu cột. Giữ tong/fmt trong closure — KHÔNG để trong options (Chart.js v4 bọc options
     bằng proxy, Math.round(proxy) ném "Cannot convert object to primitive value"). Bị shim phủ nên chỉ là dự phòng. */
  function tongTrenPlugin(o) { return { id: 'tongTren', afterDatasetsDraw: function (c) {
    if (!o || c.$bcTatTong) return; var ctx = c.ctx, meta = null;
    for (var i = c.data.datasets.length - 1; i >= 0; i--) { if (c.isDatasetVisible(i)) { meta = c.getDatasetMeta(i); break; } }
    if (!meta) return;
    ctx.save(); ctx.font = '700 11.5px ' + (Chart.defaults.font.family || 'sans-serif'); ctx.fillStyle = mau('chu'); ctx.textAlign = 'center';
    // tìm đỉnh cột: dataset hiển thị cao nhất theo từng cột
    c.data.labels.forEach(function (_, i) {
      var y = null; for (var j = 0; j < c.data.datasets.length; j++) { if (!c.isDatasetVisible(j)) continue; var m = c.getDatasetMeta(j).data[i]; if (m && (y == null || m.y < y)) y = m.y; }
      var x = meta.data[i] ? meta.data[i].x : null; if (x == null || y == null || !o.tong[i]) return;
      ctx.fillText(o.fmt(o.tong[i]), x, y - 6);
    });
    ctx.restore();
  } }; }
  function cauVong(labels, data, colors, fmt) {
    var tong = data.reduce(function (s, v) { return s + v; }, 0) || 1;
    return {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 2, borderColor: sang() ? '#fff' : '#111820', hoverOffset: 6 }] },
      options: { cutout: '58%', layout: { padding: 8 },
        plugins: { legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', color: mau('chuPhu'), font: { size: 12 }, generateLabels: function (c) { return c.data.labels.map(function (l, i) { var v = c.data.datasets[0].data[i]; return { text: l + '  ' + (v / tong * 100).toFixed(1) + '%  (' + (fmt || fInt)(v) + ')', fillStyle: c.data.datasets[0].backgroundColor[i], strokeStyle: 'transparent', index: i, pointStyle: 'rectRounded' }; }); } } },
          datalabels: { display: function (c) { return c.dataset.data[c.dataIndex] / tong >= 0.04; }, color: '#fff', font: { size: 12, weight: '700' }, formatter: function (v) { return (v / tong * 100).toFixed(0) + '%'; } },
          tooltip: { callbacks: { label: function (c) { return ' ' + c.label + ': ' + (fmt || fInt)(c.raw) + ' (' + (c.raw / tong * 100).toFixed(1) + '%)'; } } } } }
    };
  }

  /* ============ 4. TAB TỔNG QUAN ============ */
  function veTongQuan(root) {
    root.innerHTML = '';
    var cd = st.cd, k = khoangKy(cd, st.ky), kt = kyTruoc(cd, k);
    var nay = gom(k.tu, k.denCo), truoc = kt ? gom(kt.tu, kt.denCo) : null;
    var tenKyTruoc = kt ? kt.nhan + (kt.cungKy ? ' (cùng số ngày)' : '') : '';
    var chuoi12 = chuoiKy(cd, k, 12);
    var mk = modelKy(cd, k), ser = gomSeries(mk), seg = gomSeg(mk);
    var grid = el('div', 'bc-luoi'); root.appendChild(grid);

    /* --- Thanh kỳ --- */
    var bar = el('div', 'bc-ky-bar');
    bar.innerHTML = '<div><div class="bc-ky-ten">' + esc(k.nhan) + ' <small>' + esc(k.chiTiet) + '</small></div><div class="bc-ky-ss">' + (kt ? 'So với <b>' + esc(kt.nhan) + '</b>' + (kt.cungKy ? ' — cùng số ngày (' + soNgay(k.tu, k.denCo) + ' ngày)' : '') : 'Chưa có kỳ trước để so') + (k.do ? ' · <b>kỳ đang dở</b>, số đến ' + ngayVN(k.denCo) : '') + '</div></div>';
    grid.appendChild(bar);

    /* --- 1. KPI --- */
    (function () {
      var kq = khoi({ stt: 1, ten: 'Kết quả ' + k.nhan.toLowerCase(), rong: true, cls: 'bc-kpi-khoi', dangXem: 'Số máy · doanh thu · đơn giá · shop có bán — chip so với ' + esc(tenKyTruoc || 'kỳ trước') });
      var the = el('div', 'bc-kpi-row');
      var asp = nay.ds ? nay.dt / nay.ds : 0, aspT = truoc && truoc.ds ? truoc.dt / truoc.ds : null;
      var spark = function (lay) { var vs = chuoi12.map(lay); var mx = Math.max.apply(null, vs.concat([1])); var w = 100, h = 28, n = vs.length; if (n < 2) return ''; var pts = vs.map(function (v, i) { return (i / (n - 1) * w).toFixed(1) + ',' + (h - v / mx * (h - 4) - 2).toFixed(1); }); return '<svg class="bc-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="' + pts.join(' ') + '"/><circle cx="' + pts[n - 1].split(',')[0] + '" cy="' + pts[n - 1].split(',')[1] + '" r="2.4"/></svg>'; };
      var theHtml = function (nhan, gt, sub, ck, sp, kenhRows) {
        return '<div class="bc-kpi"><div class="bc-kpi-nhan">' + nhan + '</div><div class="bc-kpi-gt">' + gt + '</div><div class="bc-kpi-sub">' + ck + ' <span>' + sub + '</span></div>' + sp + '<div class="bc-kpi-kenh">' + kenhRows + '</div></div>';
      };
      var rowsK = function (lay, layT, fmt) { return kenhCoSo.map(function (c) { var v = lay(c), vt = truoc ? layT(c) : null; return '<div><i class="bc-cham" style="background:' + mau(c) + '"></i><b>' + c + '</b><span>' + fmt(v) + '</span>' + chip(pct(v, vt)) + '</div>'; }).join(''); };
      the.innerHTML =
        theHtml('Doanh số', fInt(nay.ds) + ' <small>máy</small>', truoc ? tenKyTruoc + ': ' + fInt(truoc.ds) : '', chip(truoc ? pct(nay.ds, truoc.ds) : null), spark(function (g) { return g.ds; }), rowsK(function (c) { return nay.kenh[c].ds; }, function (c) { return truoc.kenh[c].ds; }, fInt)) +
        theHtml('Doanh thu', fTyNgan(nay.dt), truoc ? tenKyTruoc + ': ' + fTyNgan(truoc.dt) : '', chip(truoc ? pct(nay.dt, truoc.dt) : null), spark(function (g) { return g.dt; }), rowsK(function (c) { return nay.kenh[c].dt; }, function (c) { return truoc.kenh[c].dt; }, fTyNgan)) +
        theHtml('Đơn giá TB', fTr(asp) + '<small>/máy</small>', aspT ? tenKyTruoc + ': ' + fTr(aspT) : '', chip(aspT ? pct(asp, aspT) : null), spark(function (g) { return g.ds ? g.dt / g.ds : 0; }), rowsK(function (c) { var K = nay.kenh[c]; return K.ds ? K.dt / K.ds : 0; }, function (c) { var K = truoc.kenh[c]; return K.ds ? K.dt / K.ds : 0; }, fTr)) +
        theHtml('Shop có bán', fInt(nay.soShop), truoc ? tenKyTruoc + ': ' + fInt(truoc.soShop) : '', chip(truoc ? pct(nay.soShop, truoc.soShop) : null), spark(function (g) { return g.soShop; }), rowsK(function (c) { return nay.kenh[c].soShop; }, function (c) { return truoc.kenh[c].soShop; }, fInt));
      $('.bc-than', kq).appendChild(the);
      // câu chốt
      if (truoc) {
        var dg = kenhCoSo.map(function (c) { return { c: c, p: pct(nay.kenh[c].ds, truoc.kenh[c].ds), d: nay.kenh[c].ds - truoc.kenh[c].ds }; }).filter(function (x) { return x.p != null; });
        if (dg.length) { dg.sort(function (a, b) { return b.d - a.d; }); var tp = pct(nay.ds, truoc.ds); var keo = dg[0], keo2 = dg[dg.length - 1]; chot(kq, 'Tổng ' + (tp >= 0 ? 'tăng' : 'giảm') + ' <b>' + Math.abs(tp).toFixed(1) + '%</b> so ' + tenKyTruoc + '. ' + (keo.d > 0 ? '<b>' + keo.c + '</b> kéo lên nhiều nhất (' + (keo.d > 0 ? '+' : '') + fInt(keo.d) + ' máy)' : '') + (keo2.d < 0 ? (keo.d > 0 ? '; ' : '') + '<b>' + keo2.c + '</b> giảm ' + fInt(-keo2.d) + ' máy' : '') + '.'); }
      }
      grid.appendChild(kq);
    })();

    /* --- 3. Biểu đồ chính DS | DT theo kênh (8 cột) --- */
    (function () {
      var kq = khoi({ stt: 3, ten: (cd === 'tuan' ? '12 tuần' : '12 tháng') + ' theo kênh', cls: 'bc-c8', dangXem: 'Cột chồng 3 kênh, tổng ghi trên đầu cột · kỳ đang chọn ở cột cuối' });
      var labels = chuoi12.map(function (g) { return g.nhan; });
      var bd = khungBieuDo({ cao: 440, tabs: [
        { ten: 'Doanh số', cau: function () { return cauCotChong(labels, kenhCoSo.map(function (c) { return { label: c, data: chuoi12.map(function (g) { return g.kenh[c].ds; }), backgroundColor: mau(c) }; })); } },
        { ten: 'Doanh thu', cau: function () { return cauCotChong(labels, kenhCoSo.map(function (c) { return { label: c, data: chuoi12.map(function (g) { return g.kenh[c].dt; }), backgroundColor: mau(c) }; }), { fmt: fTyNgan, tien: true }); } }
      ] });
      $('.bc-than', kq).appendChild(bd);
      if (chuoi12.length >= 4) { var l = chuoi12.length; var tb = chuoi12.slice(l - 4, l - 1).reduce(function (s, g) { return s + g.ds; }, 0) / 3; var p = pct(chuoi12[l - 1].ds, tb); chot(kq, k.nhan + ' đạt <b>' + fInt(chuoi12[l - 1].ds) + '</b> máy, ' + (p >= 0 ? 'cao hơn' : 'thấp hơn') + ' trung bình 3 kỳ trước <b>' + Math.abs(p).toFixed(1) + '%</b>' + (k.do ? ' (kỳ đang dở)' : '') + '.'); }
      grid.appendChild(kq);
    })();

    /* --- 10. Top tăng / giảm (4 cột) --- */
    (function () {
      var kq = khoi({ stt: 10, ten: 'Top tăng / giảm', cls: 'bc-c4', dangXem: 'Shop và Sale đổi nhiều nhất so ' + esc(tenKyTruoc || 'kỳ trước') + ' (số máy)' });
      var than = $('.bc-than', kq);
      if (!truoc) { than.innerHTML = '<p class="bc-trong">Chưa có kỳ trước để so.</p>'; grid.appendChild(kq); return; }
      var ds = Object.keys(nay.shop).concat(Object.keys(truoc.shop)).filter(function (s, i, a) { return a.indexOf(s) === i; }).map(function (s) { var a = nay.shop[s] || { ds: 0 }, b = truoc.shop[s] || { ds: 0 }; return { ten: s, kenh: (nay.shop[s] || truoc.shop[s]).kenh, d: a.ds - b.ds, nay: a.ds, truoc: b.ds }; });
      var len = ds.filter(function (x) { return x.d > 0; }).sort(function (a, b) { return b.d - a.d; }).slice(0, 5);
      var giam = ds.filter(function (x) { return x.d < 0; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 5);
      var sl = Object.keys(nay.sale).concat(Object.keys(truoc.sale)).filter(function (s, i, a) { return a.indexOf(s) === i && s !== '(Không rõ)'; }).map(function (s) { var a = nay.sale[s] || { ds: 0 }, b = truoc.sale[s] || { ds: 0 }; return { ten: s, d: a.ds - b.ds, nay: a.ds, truoc: b.ds }; });
      var slLen = sl.filter(function (x) { return x.d > 0; }).sort(function (a, b) { return b.d - a.d; }).slice(0, 3);
      var slGiam = sl.filter(function (x) { return x.d < 0; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 3);
      var dong = function (x, kieu) { return '<li><span class="bc-top-ten" title="' + esc(x.ten) + '">' + (x.kenh ? '<i class="bc-cham" style="background:' + mau(x.kenh) + '"></i>' : '') + esc(tenShopNgan(x.ten)) + '</span><span class="bc-top-so ' + kieu + '">' + (x.d > 0 ? '+' : '') + fInt(x.d) + '</span><span class="bc-top-phu">' + fInt(x.truoc) + '→' + fInt(x.nay) + '</span></li>'; };
      var tabs = nutChon(['Shop', 'Sale'], 0, function (i) { veList(i); });
      var box = el('div');
      function veList(i) {
        var L = i ? slLen : len, G = i ? slGiam : giam;
        box.innerHTML = '<div class="bc-top-2"><div><div class="bc-top-tieu bc-len-chu">▲ Tăng</div><ul class="bc-top">' + (L.length ? L.map(function (x) { return dong(x, 'bc-len-chu'); }).join('') : '<li class="bc-trong">Không có</li>') + '</ul></div><div><div class="bc-top-tieu bc-giam-chu">▼ Giảm</div><ul class="bc-top">' + (G.length ? G.map(function (x) { return dong(x, 'bc-giam-chu'); }).join('') : '<li class="bc-trong">Không có</li>') + '</ul></div></div>';
      }
      than.appendChild(tabs); than.appendChild(box); veList(0);
      if (giam.length) chot(kq, 'Cần gọi trước: <b>' + esc(tenShopNgan(giam[0].ten)) + '</b> (' + fInt(giam[0].d) + ' máy)' + (giam[1] ? ', <b>' + esc(tenShopNgan(giam[1].ten)) + '</b> (' + fInt(giam[1].d) + ')' : '') + '.');
      grid.appendChild(kq);
    })();

    /* --- 7. Tỉ trọng Reno | Phân khúc | Kênh (4 cột) --- */
    (function () {
      var kq = khoi({ stt: 7, ten: 'Tỉ trọng ' + k.nhanNgan, cls: 'bc-c4', dangXem: '% số máy trong kỳ · miếng dưới 4% không ghi số' });
      var segLabels = Object.keys(seg).filter(function (s) { return seg[s] > 0; });
      var pk = PK[sang() ? 'sang' : 'toi'];
      var bd = khungBieuDo({ cao: 300, tabs: [
        { ten: 'Reno', cau: function () { return cauVong(['Reno', 'Find', 'Còn lại'], [ser.tong.RENO, ser.tong.FIND, ser.tong.CONLAI], [mau('RENO'), mau('FIND'), mau('CONLAI')]); } },
        { ten: 'Phân khúc', cau: function () { return cauVong(segLabels, segLabels.map(function (s) { return seg[s]; }), segLabels.map(function (s, i) { return pk[Math.min(i, pk.length - 1)]; })); } },
        { ten: 'Kênh', cau: function () { return cauVong(kenhCoSo, kenhCoSo.map(function (c) { return nay.kenh[c].ds; }), kenhCoSo.map(mau)); } }
      ] });
      $('.bc-than', kq).appendChild(bd);
      var tongSer = ser.tong.RENO + ser.tong.FIND + ser.tong.CONLAI;
      if (tongSer) { var ktKy = kt ? (cd === 'tuan' ? khoangKy('tuan', kt.tu) : khoangKy('thang', k.so - 1)) : null; var mkT = ktKy ? gomSeries(modelKy(cd, ktKy)) : null; var pR = ser.tong.RENO / tongSer * 100; var pRT = mkT && (mkT.tong.RENO + mkT.tong.FIND + mkT.tong.CONLAI) ? mkT.tong.RENO / (mkT.tong.RENO + mkT.tong.FIND + mkT.tong.CONLAI) * 100 : null; chot(kq, 'Reno chiếm <b>' + pR.toFixed(1) + '%</b> số máy' + (pRT != null ? ' (' + (kt.nhan) + ': ' + pRT.toFixed(1) + '%)' : '') + '.'); }
      grid.appendChild(kq);
    })();

    /* --- 6. Reno & Find vs còn lại theo kỳ (4 cột) --- */
    (function () {
      var kq = khoi({ stt: 6, ten: 'Reno & Find theo ' + (cd === 'tuan' ? 'tuần' : 'tháng'), cls: 'bc-c4', dangXem: '12 kỳ gần nhất, số máy' });
      var labels = chuoi12.map(function (g) { return g.nhan; });
      var seri = chuoi12.map(function (g) { return gomSeries(modelKy(cd, cd === 'tuan' ? khoangKy('tuan', g.id) : khoangKy('thang', g.id))).tong; });
      var bd = khungBieuDo({ cao: 300, tabs: [{ ten: 'Reno & Find', cau: function () { return cauCotChong(labels, [{ label: 'Reno', data: seri.map(function (s) { return s.RENO; }), backgroundColor: mau('RENO') }, { label: 'Find', data: seri.map(function (s) { return s.FIND; }), backgroundColor: mau('FIND') }, { label: 'Còn lại', data: seri.map(function (s) { return s.CONLAI; }), backgroundColor: mau('CONLAI') }]); } }] });
      $('.bc-than', kq).appendChild(bd);
      grid.appendChild(kq);
    })();

    /* --- 5. Hiệu suất giữa các kênh (4 cột) --- */
    (function () {
      var kq = khoi({ stt: 5, ten: 'Hiệu suất kênh', cls: 'bc-c4', dangXem: k.nhan + ' · chip so ' + esc(tenKyTruoc || 'kỳ trước') });
      var h = '<table class="bc-bang"><thead><tr><th>Kênh</th><th>Máy</th><th>Doanh thu</th><th>ĐG TB</th><th>Shop</th><th>Máy/shop</th></tr></thead><tbody>';
      kenhCoSo.forEach(function (c) { var K = nay.kenh[c], T = truoc ? truoc.kenh[c] : null; var asp = K.ds ? K.dt / K.ds : 0, aspT = T && T.ds ? T.dt / T.ds : null; var ms = K.soShop ? K.ds / K.soShop : 0, msT = T && T.soShop ? T.ds / T.soShop : null;
        h += '<tr><td><i class="bc-cham" style="background:' + mau(c) + '"></i><b>' + c + '</b></td><td>' + fInt(K.ds) + '<br>' + chip(T ? pct(K.ds, T.ds) : null) + '</td><td>' + fTyNgan(K.dt) + '<br>' + chip(T ? pct(K.dt, T.dt) : null) + '</td><td>' + fTr(asp) + '<br>' + chip(aspT ? pct(asp, aspT) : null) + '</td><td>' + fInt(K.soShop) + '<br>' + chip(T ? pct(K.soShop, T.soShop) : null) + '</td><td>' + (ms ? ms.toFixed(1) : '-') + '<br>' + chip(msT ? pct(ms, msT) : null) + '</td></tr>'; });
      var asp0 = nay.ds ? nay.dt / nay.ds : 0;
      h += '<tr class="bc-tong"><td>Tổng</td><td>' + fInt(nay.ds) + '</td><td>' + fTyNgan(nay.dt) + '</td><td>' + fTr(asp0) + '</td><td>' + fInt(nay.soShop) + '</td><td>' + (nay.soShop ? (nay.ds / nay.soShop).toFixed(1) : '-') + '</td></tr></tbody></table>';
      $('.bc-than', kq).innerHTML = h;
      grid.appendChild(kq);
    })();

    /* --- 8. Target theo kênh & Sale (12 cột) --- */
    (function () {
      var tk = targetKenh(); if (!Object.keys(tk).length) return;
      var m = cd === 'tuan' ? thangCua(k.denCo) : k.so;
      var kThang = khoangKy('thang', m);
      var denCo = cd === 'tuan' ? (k.denCo < kThang.denCo ? k.denCo : kThang.denCo) : k.denCo;
      var luyKe = gom(kThang.tu, denCo);
      var ngayDa = soNgay(kThang.tu, denCo), ngayThang = soNgayThang(m), ngayCon = Math.max(0, ngayThang - ngayDa);
      var ten = cd === 'tuan' ? 'Tiến độ target tháng ' + m + ' đến hết ' + k.nhan.toLowerCase() : 'Target tháng ' + m;
      var kq = khoi({ stt: 8, ten: ten, rong: true, dangXem: 'Luỹ kế 01/' + String(m).padStart(2, '0') + ' – ' + ngayVN(denCo) + ' (' + ngayDa + '/' + ngayThang + ' ngày) · target tháng theo kênh' + (cd === 'tuan' ? ' · nhịp cần bán mỗi tuần còn lại để về đích' : '') });
      var reno = reno16Thang(m);
      var h = '<div class="bc-target">';
      kenhCoSo.forEach(function (c) {
        var t = tk[c]; if (!t) return; var K = luyKe.kenh[c]; var pDs = t.ds ? K.ds / t.ds * 100 : 0, pDt = t.dt ? K.dt / t.dt * 100 : 0;
        var conDs = Math.max(0, t.ds - K.ds), tuanCon = ngayCon / 7; var nhip = tuanCon > 0 ? conDs / tuanCon : conDs;
        var duKien = ngayDa ? K.ds / ngayDa * ngayThang : 0; var pDk = t.ds ? duKien / t.ds * 100 : 0;
        var r16 = reno[c] || 0, pR = t.reno16 ? r16 / t.reno16 * 100 : null;
        h += '<div class="bc-tg"><div class="bc-tg-dau"><i class="bc-cham" style="background:' + mau(c) + '"></i><b>' + c + '</b><span class="bc-tg-p ' + (pDs >= 100 ? 'bc-len-chu' : pDk >= 95 ? '' : 'bc-giam-chu') + '">' + pDs.toFixed(1) + '%</span></div>' +
          '<div class="bc-thanh"><div style="width:' + Math.min(100, pDs) + '%;background:' + mau(c) + '"></div><i style="left:' + Math.min(100, ngayDa / ngayThang * 100) + '%" title="mốc thời gian"></i></div>' +
          '<div class="bc-tg-so"><span>Máy <b>' + fInt(K.ds) + '</b> / ' + fInt(t.ds) + '</span><span>DT <b>' + fTyNgan(K.dt) + '</b> / ' + fTyNgan(t.dt) + ' (' + pDt.toFixed(0) + '%)</span>' + (pR != null ? '<span>Reno16 <b>' + fInt(r16) + '</b> / ' + fInt(t.reno16) + ' (' + pR.toFixed(0) + '%)</span>' : '') + '</div>' +
          '<div class="bc-tg-ghi">' + (ngayCon > 0 ? 'Còn thiếu <b>' + fInt(conDs) + '</b> máy · ' + ngayCon + ' ngày · cần <b>' + fInt(nhip) + ' máy/tuần</b> · dự kiến cuối tháng ' + fInt(duKien) + ' (' + pDk.toFixed(0) + '%)' : 'Tháng đã khép: ' + (pDs >= 100 ? 'đạt' : 'thiếu ' + fInt(conDs) + ' máy')) + '</div></div>';
      });
      h += '</div>';
      // theo Sale
      var ts = targetSale(); var saleRows = Object.keys(luyKe.sale).filter(function (s) { return s !== '(Không rõ)'; }).map(function (s) { var a = luyKe.sale[s]; var t = ts[s] || {}; var kenhChinh = Object.keys(a.kenh).sort(function (x, y) { return a.kenh[y] - a.kenh[x]; })[0]; return { s: s, kenh: t.channel || kenhChinh, ds: a.ds, dt: a.dt, tds: t.target_sellout || 0, tdt: t.target_revenue || 0 }; }).sort(function (a, b) { var pa = a.tds ? a.ds / a.tds : -1, pb = b.tds ? b.ds / b.tds : -1; return pa - pb; });
      if (saleRows.length) {
        var chiTiet = el('details', 'bc-details'); chiTiet.innerHTML = '<summary>Theo Sale (' + saleRows.length + ') — xếp từ thấp lên cao</summary>';
        var t2 = '<div class="bc-cuon"><table class="bc-bang bc-bang-sale"><thead><tr><th>Sale</th><th>Kênh</th><th>Máy</th><th>Target</th><th>% HT</th><th>DT</th><th>Target DT</th><th>% HT</th></tr></thead><tbody>';
        saleRows.forEach(function (r) { var p = r.tds ? r.ds / r.tds * 100 : null, p2 = r.tdt ? r.dt / r.tdt * 100 : null; t2 += '<tr><td>' + esc(r.s) + '</td><td><i class="bc-cham" style="background:' + mau(r.kenh) + '"></i>' + esc(r.kenh || '') + '</td><td>' + fInt(r.ds) + '</td><td>' + (r.tds ? fInt(r.tds) : '-') + '</td><td>' + thanhNho(p) + '</td><td>' + fTyNgan(r.dt) + '</td><td>' + (r.tdt ? fTyNgan(r.tdt) : '-') + '</td><td>' + thanhNho(p2) + '</td></tr>'; });
        chiTiet.innerHTML += t2 + '</tbody></table></div>';
        $('.bc-than', kq).innerHTML = h; $('.bc-than', kq).appendChild(chiTiet);
      } else $('.bc-than', kq).innerHTML = h;
      grid.appendChild(kq);
    })();

    /* --- 2. Doanh số theo tuần cả năm (7 cột) --- */
    (function () {
      var wu = D.week_channel_units || {}, wr = D.week_revenue || {};
      var ws = TUAN.filter(function (t) { return t.coSo; });
      var kq = khoi({ stt: 2, ten: 'Doanh số theo tuần — cả năm', cls: 'bc-c7', dangXem: ws.length + ' tuần có số · tuần thuộc kỳ đang chọn tô đậm' });
      var labels = ws.map(function (t) { return 'W' + t.so; });
      var trongKy = function (t) { return cd === 'tuan' ? t.iso === k.tu : (t.tu <= k.den && t.den >= k.tu); };
      var bd = khungBieuDo({ cao: 320, tabs: [{ ten: 'Doanh số', cau: function () {
        var cfg = cauCotChong(labels, kenhCoSo.map(function (c) { return { label: c, data: ws.map(function (t) { return (wu[t.iso] || {})[c] || 0; }), backgroundColor: ws.map(function (t) { return trongKy(t) ? mau(c) : hexMo(mau(c), 0.38); }) }; }));
        cfg.data.datasets.forEach(function (d) { d.maxBarThickness = 28; d.datalabels.display = false; });
        cfg.plugins = [tongTrenPlugin({ fmt: function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : fInt(v); }, tong: labels.map(function (_, i) { return kenhCoSo.reduce(function (s, c) { return s + ((wu[ws[i].iso] || {})[c] || 0); }, 0); }) })];
        cfg.options.scales.x.ticks.font = { size: 10 }; cfg.options.scales.x.ticks.autoSkip = false; cfg.options.scales.x.ticks.maxRotation = 0;
        cfg.options.scales.x.ticks.callback = function (v, i) { return (i % 2 === 0 || ws.length <= 20) ? labels[i] : ''; };
        return cfg; } }] });
      $('.bc-than', kq).appendChild(bd);
      $('.bc-than', kq).appendChild(bangMini({ cot: ws.slice(-12).map(function (t) { return 'W' + t.so; }), dong: kenhCoSo.map(function (c) { return { ten: c, mau: mau(c), c: c }; }),
        chiSo: [{ ten: 'Máy', lay: function (d, i) { var t = ws.slice(-12)[i]; return (wu[t.iso] || {})[d.c] || 0; } }, { ten: 'DT', fmt: fTyNgan, lay: function (d, i) { var t = ws.slice(-12)[i]; var g = gom(t.tu, t.den); return g.kenh[d.c].dt; } }] }));
      grid.appendChild(kq);
    })();

    /* --- 4. Bảng theo kênh theo kỳ (5 cột) --- */
    (function () {
      var kq = khoi({ stt: 4, ten: 'Theo kênh — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), cls: 'bc-c5', dangXem: 'Nút chuyển chỉ số · màu ô = so cột liền trước' });
      $('.bc-than', kq).appendChild(bangMini({ cot: chuoi12.map(function (g) { return g.nhan; }), dong: kenhCoSo.map(function (c) { return { ten: c, mau: mau(c), c: c }; }),
        chiSo: [{ ten: 'Máy', lay: function (d, i) { return chuoi12[i].kenh[d.c].ds; } }, { ten: 'DT', fmt: fTyNgan, lay: function (d, i) { return chuoi12[i].kenh[d.c].dt; } }, { ten: 'ĐG TB', fmt: fTr, khongTong: true, lay: function (d, i) { var K = chuoi12[i].kenh[d.c]; return K.ds ? K.dt / K.ds : 0; } }, { ten: 'Shop', lay: function (d, i) { return chuoi12[i].kenh[d.c].soShop; } }] }));
      grid.appendChild(kq);
    })();

    /* --- 9. Xu hướng % HT target theo tháng (chỉ tháng) --- */
    if (cd === 'thang') (function () {
      var tk = targetKenh(); if (!Object.keys(tk).length) return;
      var kq = khoi({ stt: 9, ten: '% hoàn thành target theo tháng', cls: 'bc-c6', dangXem: 'Số máy thực tế / target tháng · vạch 100%' });
      var ms = THANG.slice(); var labels = ms.map(function (m) { return 'T' + m; });
      var gs = ms.map(function (m) { var kk = khoangKy('thang', m); return gom(kk.tu, kk.den); });
      var bd = khungBieuDo({ cao: 300, tabs: [{ ten: '%HT', cau: function () { return {
        type: 'line', data: { labels: labels, datasets: kenhCoSo.filter(function (c) { return tk[c] && tk[c].ds; }).map(function (c) { return { label: c, data: gs.map(function (g) { return +(g.kenh[c].ds / tk[c].ds * 100).toFixed(1); }), borderColor: mau(c), backgroundColor: mau(c), tension: .3, pointRadius: 3.5, datalabels: { align: 'top', color: mau(c), font: { size: 10.5, weight: '700' }, formatter: function (v) { return v.toFixed(0); } } }; }) },
        options: { layout: { padding: { top: 16 } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, color: mau('chuPhu') } }, annotation: undefined }, scales: { x: { grid: { display: false }, ticks: { color: mau('chuPhu') } }, y: { grid: { color: mau('luoi') }, ticks: { color: mau('chuPhu'), callback: function (v) { return v + '%'; } }, border: { display: false } } } },
        plugins: [{ id: 'vach100', afterDraw: function (c) { var y = c.scales.y.getPixelForValue(100); if (!isFinite(y)) return; var ctx = c.ctx; ctx.save(); ctx.strokeStyle = mau('giam'); ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.chartArea.left, y); ctx.lineTo(c.chartArea.right, y); ctx.stroke(); ctx.restore(); } }] }; } }] });
      $('.bc-than', kq).appendChild(bd);
      grid.appendChild(kq);
    })();

    /* --- 11. Chi tiết shop (12 cột) --- */
    (function () {
      var kq = khoi({ stt: 11, ten: 'Chi tiết theo Shop', rong: true, dangXem: k.nhan + ' · xếp theo số máy · chip so ' + esc(tenKyTruoc || 'kỳ trước') });
      var than = $('.bc-than', kq);
      var rows = Object.keys(nay.shop).map(function (s) { var a = nay.shop[s], b = truoc ? truoc.shop[s] : null; return { s: s, kenh: a.kenh, sale: a.sale || '', ds: a.ds, dt: a.dt, dsT: b ? b.ds : null }; }).sort(function (a, b) { return b.ds - a.ds; });
      var loc = el('div', 'bc-loc');
      var sales = rows.map(function (r) { return r.sale; }).filter(function (s, i, a) { return s && a.indexOf(s) === i; }).sort();
      loc.innerHTML = '<label>Kênh <select data-k="kenh"><option value="">Tất cả</option>' + kenhCoSo.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></label><label>Sale <select data-k="sale"><option value="">Tất cả</option>' + sales.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></label><label>Tìm <input type="search" data-k="tim" placeholder="tên shop"></label><span class="bc-loc-dem"></span>';
      var box = el('div', 'bc-cuon'); var moRong = false; var nutThem = el('button', 'bc-nut-them'); nutThem.type = 'button';
      function ve() {
        var f = { kenh: $('[data-k=kenh]', loc).value, sale: $('[data-k=sale]', loc).value, tim: $('[data-k=tim]', loc).value.toLowerCase() };
        var rs = rows.filter(function (r) { return (!f.kenh || r.kenh === f.kenh) && (!f.sale || r.sale === f.sale) && (!f.tim || r.s.toLowerCase().indexOf(f.tim) >= 0); });
        $('.bc-loc-dem', loc).textContent = rs.length + ' shop';
        var show = moRong ? rs : rs.slice(0, 10);
        box.innerHTML = '<table class="bc-bang bc-bang-shop"><thead><tr><th>#</th><th>Shop</th><th>Kênh</th><th>Sale</th><th>Máy</th><th>so kỳ trước</th><th>Doanh thu</th><th>ĐG TB</th></tr></thead><tbody>' + show.map(function (r, i) { return '<tr' + (!r.ds ? ' class="bc-mo"' : '') + '><td>' + (i + 1) + '</td><td title="' + esc(r.s) + '">' + esc(r.s) + '</td><td><i class="bc-cham" style="background:' + mau(r.kenh) + '"></i>' + r.kenh + '</td><td>' + esc(r.sale) + '</td><td><b>' + fInt(r.ds) + '</b></td><td>' + chip(r.dsT != null ? pct(r.ds, r.dsT) : null) + (r.dsT != null ? ' <small>' + fInt(r.dsT) + '</small>' : '') + '</td><td>' + fTyNgan(r.dt) + '</td><td>' + fTr(r.ds ? r.dt / r.ds : 0) + '</td></tr>'; }).join('') + '</tbody></table>';
        nutThem.textContent = moRong ? 'Thu gọn' : 'Xem tất cả ' + rs.length + ' shop'; nutThem.hidden = rs.length <= 10;
      }
      loc.addEventListener('change', ve); loc.addEventListener('input', ve); nutThem.addEventListener('click', function () { moRong = !moRong; ve(); });
      than.appendChild(loc); than.appendChild(box); than.appendChild(nutThem); ve();
      var soKhong = truoc ? Object.keys(truoc.shop).filter(function (s) { return truoc.shop[s].ds > 0 && !(nay.shop[s] && nay.shop[s].ds > 0); }).length : 0;
      if (soKhong) chot(kq, '<b>' + soKhong + '</b> shop có bán ' + tenKyTruoc + ' nhưng ' + k.nhan.toLowerCase() + ' chưa ra máy.');
      grid.appendChild(kq);
    })();

    /* --- 12. Văn bản: Chiến lược / Chính sách / Chương trình (chỉ tháng) — mượn khối cũ --- */
    if (cd === 'thang') (function () {
      var cu = window.__bcKhoiCu || []; if (!cu.length) return;
      var kq = khoi({ stt: 12, ten: 'Chiến lược · Chính sách · Chương trình', rong: true, cls: 'bc-van', dangXem: 'Thu gọn — bấm từng mục để mở (nội dung như DB TG cũ)' });
      var than = $('.bc-than', kq);
      cu.forEach(function (c) { var d = el('details', 'bc-details'); d.innerHTML = '<summary>' + esc(c.ten) + '</summary>'; d.appendChild(c.el); c.el.style.display = ''; than.appendChild(d); });
      grid.appendChild(kq);
    })();
  }
  function thanhNho(p) { if (p == null) return '-'; return '<span class="bc-thanh-nho"><i style="width:' + Math.min(100, p) + '%;background:' + (p >= 100 ? mau('tang') : p >= 70 ? mau('KA') : mau('giam')) + '"></i></span> ' + p.toFixed(0) + '%'; }
  function tenShopNgan(s) { s = String(s); s = s.replace(/^(TGDĐ|ĐMX|FPT|VTS|TGD|ĐMS)[^-]*-\s*\d*\s*-?\s*/i, function (m) { return m.split('-')[0].trim() + ' · '; }); return s.length > 34 ? s.slice(0, 32) + '…' : s; }
  function hexMo(hex, a) { var m = hex.replace('#', ''); if (m.length === 3) m = m.split('').map(function (c) { return c + c; }).join(''); var n = parseInt(m, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

  /* ============ 5. Khung trang: thanh chọn, tab, thiết bị ============ */
  var goc = null;
  var DANG_KY = {};   // panelId -> { ve: function(root, ctx), muon: [regex tiêu đề khối cũ giữ lại] }
  var GOC = {};       // panelId -> .bc-root
  function chuanBiPanel(pid, muon) {
    var p = document.getElementById(pid); if (!p || GOC[pid]) return GOC[pid] || null;
    var giu = [];
    Array.prototype.forEach.call(p.querySelectorAll('h3'), function (h) { var t = h.textContent.replace(/\s+/g, ' ').trim(); if ((muon || []).some(function (re) { return re.test(t); })) { var c = h.closest('.table-section, .chart-container, section, .ct-card') || h.parentElement; if (c && !giu.some(function (g) { return g.el === c; })) giu.push({ ten: t, el: c }); } });
    Array.prototype.forEach.call(p.children, function (c) { c.classList.add('bc-cu'); });
    var r = el('div', 'bc-root'); p.appendChild(r);
    GOC[pid] = r; r.__muon = giu;
    return r;
  }
  function dungKhung() {
    var header = $('.dashboard-header'); if (!header) return false;
    var xuat = $('#export-html-btn'); if (xuat) xuat.style.display = 'none';
    var bar = el('div', 'bc-bar');
    bar.innerHTML = '<div class="bc-chedo" role="tablist"><button type="button" data-cd="thang">Báo cáo tháng</button><button type="button" data-cd="tuan">Báo cáo tuần</button></div>' +
      '<label class="bc-ky-chon">Kỳ <select id="bc-ky"></select></label>' +
      '<div class="bc-tb"><button type="button" data-tb="mt" title="Máy tính">🖥</button><button type="button" data-tb="dt" title="Điện thoại">📱</button></div>';
    var tabs = $('.db-tg-tabnav', header) || header.lastElementChild;
    header.insertBefore(bar, tabs);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cd) { st.cd = b.dataset.cd; st.ky = null; luu(); napKy(); veTatCa(); }
      if (b.dataset.tb) { st.tb = b.dataset.tb; luu(); apThietBi(); }
    });
    $('#bc-ky', bar).addEventListener('change', function () { st.ky = st.cd === 'tuan' ? this.value : +this.value; veTatCa(); });
    // Tổng quan: giấu nội dung cũ, mượn 3 khối văn bản
    var p = $('#panel-overview'); if (p) {
      var giu = [];
      Array.prototype.forEach.call(p.querySelectorAll('h3'), function (h) { var t = h.textContent.trim(); if (/^(Chiến lược Kênh|Chính sách cho Nhân sự|Tổng Chương trình Bán hàng)/i.test(t)) { var c = h.closest('.table-section, .chart-container, section, .ct-card') || h.parentElement; if (c && giu.indexOf(c) < 0) giu.push({ ten: t, el: c }); } });
      window.__bcKhoiCu = giu;
      Array.prototype.forEach.call(p.children, function (c) { c.classList.add('bc-cu'); });
      goc = el('div', 'bc-root'); p.appendChild(goc); GOC['panel-overview'] = goc;
    }
    Object.keys(DANG_KY).forEach(function (pid) { chuanBiPanel(pid, DANG_KY[pid].muon); });
    return true;
  }
  function napKy() {
    var sel = $('#bc-ky'); if (!sel) return; var ds = dsKy(st.cd); sel.innerHTML = '';
    ds.forEach(function (x) { var o = document.createElement('option'); o.value = x.id; o.textContent = x.ten + (x.phu ? ' · ' + x.phu : ''); sel.appendChild(o); });
    if (st.ky == null || !ds.some(function (x) { return String(x.id) === String(st.ky); })) {
      var cuoi = ds[ds.length - 1];
      // Tuần đang dở mới có 1–2 ngày số thì mặc định mở tuần đủ 7 ngày gần nhất (anh vẫn chọn tuần dở được)
      if (st.cd === 'tuan' && cuoi && cuoi.do && ds.length > 1) { var cuoiAll = [NGAY[NGAY.length - 1], NGAY_MWG[NGAY_MWG.length - 1]].filter(Boolean).sort().pop(); if (soNgay(cuoi.t.tu, cuoiAll) <= 2) cuoi = ds[ds.length - 2]; }
      st.ky = cuoi ? cuoi.id : null;
    }
    sel.value = st.ky;
    document.querySelectorAll('.bc-chedo button').forEach(function (b) { b.classList.toggle('on', b.dataset.cd === st.cd); });
    document.documentElement.setAttribute('data-bc-cd', st.cd);
  }
  function apThietBi() {
    var tb = st.tb || (window.matchMedia('(max-width: 720px)').matches ? 'dt' : 'mt');
    document.documentElement.classList.toggle('bc-dt', tb === 'dt');
    document.querySelectorAll('.bc-tb button').forEach(function (b) { b.classList.toggle('on', b.dataset.tb === tb); });
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
  }
  function boiCanh() {
    var cd = st.cd, k = khoangKy(cd, st.ky), kt = kyTruoc(cd, k);
    var kM = khoangKy(cd, st.ky, 'mwg'), ktM = kyTruoc(cd, kM);
    return { cd: cd, k: k, kt: kt, ktKy: kt ? (cd === 'tuan' ? khoangKy('tuan', kt.tu) : khoangKy('thang', k.so - 1)) : null, tenKyTruoc: kt ? kt.nhan + (kt.cungKy ? ' (cùng số ngày)' : '') : '',
      mwg: { k: kM, kt: ktM, tenKyTruoc: ktM ? ktM.nhan + (ktM.cungKy ? ' (cùng số ngày)' : '') : '' } };
  }
  function veTatCa() {
    charts.forEach(function (c) { c.huy(); }); charts = [];
    if (goc) { try { veTongQuan(goc); } catch (e) { console.error('bc Tổng quan:', e); goc.innerHTML = '<p class="bc-trong">Lỗi dựng Tổng quan: ' + esc(e.message) + '</p>'; } }
    Object.keys(DANG_KY).forEach(function (pid) {
      var r = GOC[pid] || chuanBiPanel(pid, DANG_KY[pid].muon); if (!r) return;
      try { r.innerHTML = ''; DANG_KY[pid].ve(r, boiCanh()); } catch (e) { console.error('bc ' + pid + ':', e); r.innerHTML = '<p class="bc-trong">Lỗi dựng tab: ' + esc(e.message) + '</p>'; }
    });
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 80);
  }
  // Đổi Sáng/Tối -> vẽ lại biểu đồ (màu khác nhau)
  new MutationObserver(function () { charts.forEach(function (c) { try { c.ve(); } catch (e) {} }); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ============ 6. Khởi động: đợi DATA ============ */
  var dem = 0;
  var t = setInterval(function () {
    if (napDuLieu()) { clearInterval(t); if (dungKhung()) { napKy(); apThietBi(); veTatCa(); } }
    else if (++dem > 7200) clearInterval(t);   // 60 phút — đường Apps Script có khi tải > 3 phút (đã dính 03/09)
  }, 500);
  window.__bc = { st: st, veTatCa: veTatCa, gom: gom, khoangKy: khoangKy, kyTruoc: kyTruoc, chuoiKy: chuoiKy, modelKy: modelKy, gomSeries: gomSeries, boiCanh: boiCanh,
    dangKy: function (pid, cau) { DANG_KY[pid] = cau; if (D) { chuanBiPanel(pid, cau.muon); veTatCa(); } },
    ui: { el: el, esc: esc, fInt: fInt, fTy: fTy, fTyNgan: fTyNgan, fTr: fTr, pct: pct, chip: chip, khoi: khoi, chot: chot, nutChon: nutChon, bangMini: bangMini, khungBieuDo: khungBieuDo, cauCotChong: cauCotChong, cauVong: cauVong, mau: mau, PK: PK, sang: sang, thanhNho: thanhNho, tenShopNgan: tenShopNgan, hexMo: hexMo, congNgay: congNgay, ngayVN: ngayVN, soNgay: soNgay, soNgayThang: soNgayThang, thangCua: thangCua, iso: iso },
    du: function () { return { D: D, OD: OD, NGAY: NGAY, TUAN: TUAN, THANG: THANG, kenhCoSo: kenhCoSo, modelSeries: modelSeries, modelSeg: modelSeg, B: window.__exportDataMain || null }; } };
})();
