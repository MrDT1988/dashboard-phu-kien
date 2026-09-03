/* bc-chitiet.js — 3 tab chi tiết MWG / KA / IND của Báo cáo tuần/tháng (giai đoạn 2, 03/09/2026).
   Dùng bộ thành phần + lớp dữ liệu của bc.js (window.__bc). Không có số liệu trong file này. */
(function () {
  'use strict';
  if (window.__BO_QUA_GOI) return;
  var dem = 0, t = setInterval(function () { if (window.__bc && window.__bc.ui) { clearInterval(t); khoiDong(); } else if (++dem > 600) clearInterval(t); }, 300);

  function khoiDong() {
    var BC = window.__bc, U = BC.ui, el = U.el, esc = U.esc, fInt = U.fInt, fTyNgan = U.fTyNgan, fTr = U.fTr, pct = U.pct, chip = U.chip, khoi = U.khoi, chot = U.chot, nutChon = U.nutChon, bangMini = U.bangMini, khungBieuDo = U.khungBieuDo, cauCotChong = U.cauCotChong, cauVong = U.cauVong, mau = U.mau, ngayVN = U.ngayVN, congNgay = U.congNgay, soNgay = U.soNgay, tenShopNgan = U.tenShopNgan, thanhNho = U.thanhNho, hexMo = U.hexMo, sang = U.sang;
    var ext = function () { try { return window.__bcTarget ? window.__bcTarget() : {}; } catch (e) { return {}; } };
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var pad2 = function (n) { return String(n).padStart(2, '0'); };
    var mauHang = function (h) { var b = { sang: { Oppo: '#006B33', Samsung: '#1428A0', Xiaomi: '#E85D00', Apple: '#1A1A1A', Vivo: '#6C7CFF', Realme: '#D9A400', 'Khác': '#8A8A8A' }, toi: { Oppo: '#2AD998', Samsung: '#6E8CF0', Xiaomi: '#FF9147', Apple: '#EDEFF2', Vivo: '#A9B6FF', Realme: '#F0C64A', 'Khác': '#8B98A9' } }[sang() ? 'sang' : 'toi']; return b[h] || b['Khác']; };
    var mauSub = function (s) { var m = (ext().kaMau || {})[s]; return m || mau('KA'); };
    var mauOC = function (g) { return g === 'O.C' ? (sang() ? '#006B33' : '#2AD998') : (sang() ? '#8FBFA6' : '#1E6B4E'); };

    /* ===================== dữ liệu dùng chung ===================== */
    function du() { return BC.du(); }
    /* danh sách kỳ (12 gần nhất) -> [{nhan, tu, den}] theo chế độ */
    function dsKy12(ctx) {
      var d = du(), out = [];
      if (ctx.cd === 'tuan') { var idx = d.TUAN.findIndex(function (t) { return t.iso === ctx.k.tu; }); for (var i = Math.max(0, idx - 11); i <= idx; i++) { var w = d.TUAN[i]; out.push({ nhan: 'W' + w.so, tu: w.tu, den: w.den, id: w.iso }); } }
      else { for (var m = Math.max(1, ctx.k.so - 11); m <= ctx.k.so; m++) { var kk = BC.khoangKy('thang', m); out.push({ nhan: 'T' + m, tu: kk.tu, den: kk.den, id: m }); } }
      return out;
    }
    /* Lọc kênh từ gom(): {ds, dt, shop:{}, sale:{}} chỉ 1 kênh */
    function gomKenh(tu, den, kenh) {
      var g = BC.gom(tu, den), r = { ds: 0, dt: 0, shop: {}, sale: {}, soShop: 0 };
      Object.keys(g.shop).forEach(function (s) { var x = g.shop[s]; if (x.kenh !== kenh) return; r.shop[s] = x; r.ds += x.ds; r.dt += x.dt; if (x.ds > 0) r.soShop++; var sl = x.sale || '(Không rõ)'; var a = r.sale[sl] || (r.sale[sl] = { ds: 0, dt: 0, shop: 0, shop0: 0 }); a.ds += x.ds; a.dt += x.dt; if (x.ds > 0) a.shop++; else a.shop0++; });
      return r;
    }
    function bangKyChung(ctx, extra) {
      var bar = el('div', 'bc-ky-bar');
      bar.innerHTML = '<div><div class="bc-ky-ten">' + esc(ctx.k.nhan) + ' <small>' + esc(ctx.k.chiTiet) + '</small></div><div class="bc-ky-ss">' + (ctx.kt ? 'So với <b>' + esc(ctx.kt.nhan) + '</b>' + (ctx.kt.cungKy ? ' — cùng số ngày' : '') : 'Chưa có kỳ trước') + (ctx.k.do ? ' · <b>kỳ đang dở</b>, số đến ' + ngayVN(ctx.k.denCo) : '') + (extra ? ' · ' + extra : '') + '</div></div>';
      return bar;
    }
    function theKpi(nhan, gt, ck, sub, rows) { return '<div class="bc-kpi"><div class="bc-kpi-nhan">' + nhan + '</div><div class="bc-kpi-gt">' + gt + '</div><div class="bc-kpi-sub">' + ck + ' <span>' + sub + '</span></div><div class="bc-kpi-kenh">' + rows + '</div></div>'; }
    function dongKenh(ten, mauX, v, vt, fmt) { return '<div><i class="bc-cham" style="background:' + mauX + '"></i><b title="' + esc(ten) + '">' + esc(ten.length > 9 ? ten.slice(0, 9) : ten) + '</b><span>' + fmt(v) + '</span>' + chip(vt != null ? pct(v, vt) : null) + '</div>'; }
    function muonKhoi(root, stt, ten, dangXem, khoiCu) {   // mượn khối cũ của tg.html vào khối mới
      if (!khoiCu) return null;
      var kq = khoi({ stt: stt, ten: ten, rong: true, cls: 'bc-van', dangXem: dangXem || 'Nội dung như DB TG cũ' });
      var d = el('div', 'bc-muon'); d.appendChild(khoiCu.el); khoiCu.el.style.display = ''; $('.bc-than', kq).appendChild(d);
      root.appendChild(kq); return kq;
    }
    function timMuon(root, re) { return (root.__muon || []).filter(function (m) { return re.test(m.ten); })[0]; }

    /* ===================== MWG ===================== */
    function veMWG(root, ctx) {
      var d = du(), B = d.B; if (!B || !B.daily) { root.innerHTML = '<p class="bc-trong">Chưa có dữ liệu DATA MWG trong phạm vi này.</p>'; return; }
      var DL = B.daily, R = DL.rows, HANG = DL.brands, SEG = DL.segments, SALE = DL.sales, SIZE = DL.sizes, MODEL = DL.models;
      var iOppo = HANG.findIndex(function (h) { return /oppo/i.test(h); });
      var trongKhoang = function (tu, den) { return function (r) { var ng = '2026-' + pad2(r[0]) + '-' + pad2(r[1]); return ng >= tu && ng <= den; }; };
      function gomMWG(tu, den) {   // -> {tong:{u,dt}, oppo:{u,dt}, hang:[{u,dt}], seg:[{u,dt}], sale:[{u,dt,oppoU,oppoDt}], size:[{u,oppoU}], model:{i:{u,dt,h}}, segHang:[seg][hang]u}
        var f = trongKhoang(tu, den), r = { tong: { u: 0, dt: 0 }, oppo: { u: 0, dt: 0 }, hang: HANG.map(function () { return { u: 0, dt: 0 }; }), seg: SEG.map(function () { return { u: 0, dt: 0 }; }), sale: SALE.map(function () { return { u: 0, dt: 0, oppoU: 0, oppoDt: 0 }; }), size: SIZE.map(function () { return { u: 0, oppoU: 0 }; }), model: {}, segHang: SEG.map(function () { return HANG.map(function () { return 0; }); }), ngay: {} };
        for (var i = 0; i < R.length; i++) { var x = R[i]; if (!f(x)) continue; var dt = x[5] || 0, u = x[6] || 0, h = x[4], s = x[3], sl = x[2], sz = x[7], md = x[8];
          r.tong.u += u; r.tong.dt += dt; r.hang[h].u += u; r.hang[h].dt += dt; if (s >= 0 && r.seg[s]) { r.seg[s].u += u; r.seg[s].dt += dt; r.segHang[s][h] += u; } if (sl >= 0 && r.sale[sl]) { r.sale[sl].u += u; r.sale[sl].dt += dt; } if (sz >= 0 && r.size[sz]) r.size[sz].u += u;
          var ng = pad2(x[0]) + '-' + pad2(x[1]); var N = r.ngay[ng] || (r.ngay[ng] = { u: 0, dt: 0, oppoU: 0, oppoDt: 0 }); N.u += u; N.dt += dt;
          if (h === iOppo) { r.oppo.u += u; r.oppo.dt += dt; if (sl >= 0 && r.sale[sl]) { r.sale[sl].oppoU += u; r.sale[sl].oppoDt += dt; } if (sz >= 0 && r.size[sz]) r.size[sz].oppoU += u; N.oppoU += u; N.oppoDt += dt; }
          var M = r.model[md] || (r.model[md] = { u: 0, dt: 0, h: h }); M.u += u; M.dt += dt; }
        return r;
      }
      function shopMWG(tu, den) {   // từ shop_day_data: shop -> {oppoU, oppoDt, ssU, xmU, apU, totU, totDt, sale, size}
        var SD = B.shop_day_data || {}, meta = {}; (B.shop_rows_brand4 || []).forEach(function (s) { meta[s.shop] = s; });
        var out = {};
        Object.keys(SD).forEach(function (shop) { var m = meta[shop] || {}, o = { oppoU: 0, oppoDt: 0, ssU: 0, xmU: 0, apU: 0, totU: 0, totDt: 0, sale: m.sale || '(Không rõ)', size: m.shop_size || '?' };
          Object.keys(SD[shop]).forEach(function (k) { var p = k.split('-'); var ng = '2026-' + pad2(p[0]) + '-' + pad2(p[1]); if (ng < tu || ng > den) return; var v = SD[shop][k]; o.oppoU += v.oppo_units || 0; o.oppoDt += v.oppo_rev || 0; o.ssU += v.samsung_units || 0; o.xmU += v.xiaomi_units || 0; o.apU += v.apple_units || 0; o.totU += v.total_units || 0; o.totDt += v.total_rev || 0; });
          out[shop] = o; });
        return out;
      }
      var k = ctx.k, kt = ctx.kt, cd = ctx.cd;
      var nay = gomMWG(k.tu, k.denCo), truoc = kt ? gomMWG(kt.tu, kt.denCo) : null;
      var shopNay = shopMWG(k.tu, k.denCo), shopTruoc = kt ? shopMWG(kt.tu, kt.denCo) : null;
      var ky12 = dsKy12(ctx), chuoi = ky12.map(function (q) { return gomMWG(q.tu, q.den); });
      var grid = el('div', 'bc-luoi'); root.appendChild(grid);
      grid.appendChild(bangKyChung(ctx, 'Thị trường MWG Tiền Giang + Bến Tre (12 hãng)'));
      var share = function (g) { return g.tong.u ? g.oppo.u / g.tong.u * 100 : 0; };
      var shareDt = function (g) { var ap = g.hang[HANG.findIndex(function (h) { return /apple/i.test(h); })]; var tt = g.tong.dt - (ap ? ap.dt : 0); return tt ? g.oppo.dt / tt * 100 : 0; };

      /* 1. KPI */
      (function () {
        var kq = khoi({ stt: 1, ten: 'Kết quả MWG ' + k.nhan.toLowerCase(), rong: true, dangXem: 'Toàn ngành 12 hãng · OPPO · thị phần — chip so ' + esc(ctx.tenKyTruoc || 'kỳ trước') });
        var soShop = Object.keys(shopNay).filter(function (s) { return shopNay[s].oppoU > 0; }).length, soShopT = shopTruoc ? Object.keys(shopTruoc).filter(function (s) { return shopTruoc[s].oppoU > 0; }).length : null;
        var top = HANG.map(function (h, i) { return { h: h, i: i, u: nay.hang[i].u, dt: nay.hang[i].dt }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 4);
        var rowsH = function (lay, layT, fmt) { return top.map(function (x) { return dongKenh(x.h, mauHang(x.h), lay(x.i), truoc ? layT(x.i) : null, fmt); }).join(''); };
        $('.bc-than', kq).innerHTML = '<div class="bc-kpi-row">' +
          theKpi('Doanh thu toàn ngành', fTyNgan(nay.tong.dt), chip(truoc ? pct(nay.tong.dt, truoc.tong.dt) : null), fInt(nay.tong.u) + ' máy · ' + Object.keys(shopNay).length + ' shop', rowsH(function (i) { return nay.hang[i].dt; }, function (i) { return truoc.hang[i].dt; }, fTyNgan)) +
          theKpi('Doanh thu OPPO', fTyNgan(nay.oppo.dt), chip(truoc ? pct(nay.oppo.dt, truoc.oppo.dt) : null), shareDt(nay).toFixed(1) + '% thị phần DT (trừ Apple)' + (truoc ? ' · kỳ trước ' + shareDt(truoc).toFixed(1) + '%' : ''), rowsH(function (i) { return nay.hang[i].u; }, function (i) { return truoc.hang[i].u; }, fInt)) +
          theKpi('Máy OPPO', fInt(nay.oppo.u) + ' <small>máy</small>', chip(truoc ? pct(nay.oppo.u, truoc.oppo.u) : null), '<b>' + share(nay).toFixed(1) + '%</b> thị phần máy' + (truoc ? ' · kỳ trước ' + share(truoc).toFixed(1) + '%' : ''), SALE.map(function (s, i) { return dongKenh(s.split(' ').slice(-2).join(' '), mau('MWG'), nay.sale[i].oppoU, truoc ? truoc.sale[i].oppoU : null, fInt); }).join('')) +
          theKpi('Shop có bán OPPO', fInt(soShop) + ' <small>/ ' + Object.keys(shopNay).length + '</small>', chip(soShopT != null ? pct(soShop, soShopT) : null), truoc ? ctx.tenKyTruoc + ': ' + soShopT : '', SIZE.map(function (sz, i) { var n = Object.keys(shopNay).filter(function (s) { return shopNay[s].size === sz && shopNay[s].oppoU > 0; }).length, nt = shopTruoc ? Object.keys(shopTruoc).filter(function (s) { return shopTruoc[s].size === sz && shopTruoc[s].oppoU > 0; }).length : null; return dongKenh('Size ' + sz, mau('MWG'), n, nt, fInt); }).join('')) + '</div>';
        if (truoc) { var dS = share(nay) - share(truoc); chot(kq, 'Thị phần máy OPPO ' + (dS >= 0 ? 'tăng' : 'giảm') + ' <b>' + Math.abs(dS).toFixed(1) + ' điểm</b> (' + share(truoc).toFixed(1) + '% → ' + share(nay).toFixed(1) + '%); máy OPPO ' + (nay.oppo.u >= truoc.oppo.u ? '+' : '') + fInt(nay.oppo.u - truoc.oppo.u) + ', toàn ngành ' + (nay.tong.u >= truoc.tong.u ? '+' : '') + fInt(nay.tong.u - truoc.tong.u) + ' máy.'); }
        grid.appendChild(kq);
      })();

      /* 7. Hiệu suất Sale/ASM (tuần: lên ngay sau KPI) */
      var khoiSale = (function () {
        var kq = khoi({ stt: 7, ten: 'Hiệu suất Sale / ASM — OPPO so với thị trường', rong: true, dangXem: k.nhan + ' · xếp Sale có vấn đề lên đầu · cờ đỏ: giảm >20% so kỳ trước hoặc mất ≥3 điểm thị phần' });
        var rows = SALE.map(function (s, i) { var a = nay.sale[i], b = truoc ? truoc.sale[i] : null; var sh = a.u ? a.oppoU / a.u * 100 : 0, shT = b && b.u ? b.oppoU / b.u * 100 : null; var shops = Object.keys(shopNay).filter(function (x) { return shopNay[x].sale === s; }); var shop0 = shops.filter(function (x) { return shopNay[x].oppoU === 0; }).length;
          var co = []; var p = b ? pct(a.oppoU, b.oppoU) : null; if (p != null && p < -20) co.push('giảm ' + Math.abs(p).toFixed(0) + '%'); if (shT != null && sh - shT <= -3) co.push('mất ' + (shT - sh).toFixed(1) + ' điểm'); if (shop0 >= 3) co.push(shop0 + ' shop 0 máy');
          return { s: s, oppoU: a.oppoU, oppoDt: a.oppoDt, u: a.u, sh: sh, shT: shT, p: p, shops: shops.length, shop0: shop0, co: co }; }).sort(function (a, b) { return (b.co.length - a.co.length) || ((a.p == null ? 0 : a.p) - (b.p == null ? 0 : b.p)); });
        var h = '<div class="bc-cuon"><table class="bc-bang"><thead><tr><th>Sale / ASM</th><th>Máy OPPO</th><th>so kỳ trước</th><th>Máy thị trường</th><th>Thị phần</th><th>± điểm</th><th>Shop</th><th>Shop 0 máy</th><th>DT OPPO</th><th>Cảnh báo</th></tr></thead><tbody>';
        rows.forEach(function (r) { h += '<tr' + (r.co.length ? ' class="bc-canh"' : '') + '><td>' + esc(r.s) + '</td><td><b>' + fInt(r.oppoU) + '</b></td><td>' + chip(r.p) + '</td><td>' + fInt(r.u) + '</td><td><b>' + r.sh.toFixed(1) + '%</b></td><td>' + (r.shT != null ? chipDiem(r.sh - r.shT) : '—') + '</td><td>' + r.shops + '</td><td>' + (r.shop0 ? '<span class="bc-giam-chu"><b>' + r.shop0 + '</b></span>' : '0') + '</td><td>' + fTyNgan(r.oppoDt) + '</td><td>' + (r.co.length ? '<span class="bc-co">' + r.co.map(esc).join(' · ') + '</span>' : '<span class="bc-len-chu">ổn</span>') + '</td></tr>'; });
        h += '</tbody></table></div>';
        $('.bc-than', kq).innerHTML = h;
        var xau = rows.filter(function (r) { return r.co.length; });
        chot(kq, xau.length ? '<b>' + xau.length + '</b> Sale có vấn đề ' + k.nhan.toLowerCase() + ': ' + xau.slice(0, 3).map(function (r) { return '<b>' + esc(r.s.split(' ').slice(-2).join(' ')) + '</b> (' + r.co.join(', ') + ')'; }).join(', ') + '.' : 'Không Sale nào chạm ngưỡng cảnh báo.');
        return kq;
      })();
      if (cd === 'tuan') grid.appendChild(khoiSale);

      /* 2. Doanh số theo hãng — 12 kỳ, top 6 hãng + Khác */
      (function () {
        var kq = khoi({ stt: 2, ten: 'Doanh số theo hãng — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), cls: 'bc-c8', dangXem: 'Top 6 hãng theo máy trong kỳ đang chọn, còn lại gộp "Khác"' });
        var top6 = HANG.map(function (h, i) { return { h: h, i: i, u: nay.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 6);
        var labels = ky12.map(function (q) { return q.nhan; });
        var lam = function (lay, tien) { var ds = top6.map(function (x) { return { label: x.h, data: chuoi.map(function (g) { return lay(g.hang[x.i]); }), borderColor: mauHang(x.h), backgroundColor: mauHang(x.h), tension: .3, pointRadius: 3, fill: false }; });
          return { type: 'line', data: { labels: labels, datasets: ds }, options: { layout: { padding: { top: 14 } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, color: mau('chuPhu') } } }, scales: { x: { grid: { display: false }, ticks: { color: mau('chuPhu') } }, y: { grid: { color: mau('luoi') }, ticks: { color: mau('chuPhu'), callback: function (v) { return tien ? fTyNgan(v) : fInt(v); } }, border: { display: false } } } } }; };
        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 420, tabs: [{ ten: 'Máy', cau: function () { return lam(function (x) { return x.u; }); } }, { ten: 'Doanh thu', cau: function () { return lam(function (x) { return x.dt; }, true); } }, { ten: 'Thị phần %', cau: function () { var c = lam(function (x) { return x.u; }); c.data.datasets.forEach(function (ds, j) { ds.data = chuoi.map(function (g) { return g.tong.u ? +(g.hang[top6[j].i].u / g.tong.u * 100).toFixed(1) : 0; }); }); c.options.scales.y.ticks.callback = function (v) { return v + '%'; }; return c; } }] }));
        grid.appendChild(kq);
      })();

      /* 5. Tỉ trọng phân khúc giá — 3 tab */
      (function () {
        var kq = khoi({ stt: 5, ten: 'Tỉ trọng phân khúc giá ' + k.nhanNgan, cls: 'bc-c4', dangXem: 'Toàn thị trường · từng hãng theo phân khúc · phân khúc theo từng hãng' });
        var pk = U.PK[sang() ? 'sang' : 'toi']; var segCo = SEG.map(function (s, i) { return { s: s, i: i, u: nay.seg[i].u }; }).filter(function (x) { return x.u > 0; });
        var top5 = HANG.map(function (h, i) { return { h: h, i: i, u: nay.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 5);
        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 340, tabs: [
          { ten: 'Thị trường', cau: function () { return cauVong(segCo.map(function (x) { return x.s; }), segCo.map(function (x) { return x.u; }), segCo.map(function (x, j) { return pk[Math.min(j, pk.length - 1)]; })); } },
          { ten: 'Hãng → PK', cau: function () { var c = cauCotChong(top5.map(function (x) { return x.h; }), segCo.map(function (x, j) { return { label: x.s, data: top5.map(function (hh) { var t = nay.hang[hh.i].u; return t ? +(nay.segHang[x.i][hh.i] / t * 100).toFixed(1) : 0; }), backgroundColor: pk[Math.min(j, pk.length - 1)] }; }), { fmt: function (v) { return v.toFixed(0) + '%'; } }); c.plugins = []; return c; } },
          { ten: 'PK → Hãng', cau: function () { return cauCotChong(segCo.map(function (x) { return x.s; }), top5.map(function (hh) { return { label: hh.h, data: segCo.map(function (x) { return nay.segHang[x.i][hh.i]; }), backgroundColor: mauHang(hh.h) }; })); } }
        ] }));
        grid.appendChild(kq);
      })();

      /* 3. Bảng DT & DS theo hãng */
      (function () {
        var kq = khoi({ stt: 3, ten: 'Theo hãng — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), cls: 'bc-c6', dangXem: 'Nút DT · DS · ĐG · thị phần — màu ô so cột liền trước' });
        var top8 = HANG.map(function (h, i) { return { h: h, i: i, u: nay.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 8);
        $('.bc-than', kq).appendChild(bangMini({ cot: ky12.map(function (q) { return q.nhan; }), dong: top8.map(function (x) { return { ten: x.h, mau: mauHang(x.h), i: x.i }; }), chiSo: [
          { ten: 'DT', fmt: fTyNgan, lay: function (d, j) { return chuoi[j].hang[d.i].dt; } }, { ten: 'DS', lay: function (d, j) { return chuoi[j].hang[d.i].u; } },
          { ten: 'ĐG', fmt: fTr, khongTong: true, lay: function (d, j) { var x = chuoi[j].hang[d.i]; return x.u ? x.dt / x.u : 0; } },
          { ten: 'Thị phần', fmt: function (v) { return v.toFixed(1) + '%'; }, khongTong: true, lay: function (d, j) { var g = chuoi[j]; return g.tong.u ? g.hang[d.i].u / g.tong.u * 100 : 0; } }] }));
        grid.appendChild(kq);
      })();

      /* 4. Size shop */
      (function () {
        var kq = khoi({ stt: 4, ten: 'Hiệu suất theo Size shop', cls: 'bc-c6', dangXem: k.nhan + ' · OPPO trong từng size · chip so ' + esc(ctx.tenKyTruoc || 'kỳ trước') });
        var h = '<table class="bc-bang"><thead><tr><th>Size</th><th>Shop</th><th>Có bán</th><th>Máy OPPO</th><th>so kỳ trước</th><th>Máy chợ</th><th>Thị phần</th><th>OPPO/shop</th></tr></thead><tbody>';
        var tong = { n: 0, co: 0, o: 0, oT: 0, t: 0 };
        SIZE.forEach(function (sz) { var shops = Object.keys(shopNay).filter(function (s) { return shopNay[s].size === sz; }); if (!shops.length) return; var co = shops.filter(function (s) { return shopNay[s].oppoU > 0; }).length; var o = 0, tt = 0, oT = 0; shops.forEach(function (s) { o += shopNay[s].oppoU; tt += shopNay[s].totU; if (shopTruoc && shopTruoc[s]) oT += shopTruoc[s].oppoU; }); tong.n += shops.length; tong.co += co; tong.o += o; tong.oT += oT; tong.t += tt;
          h += '<tr><td><b>' + esc(sz) + '</b></td><td>' + shops.length + '</td><td>' + co + '</td><td><b>' + fInt(o) + '</b></td><td>' + chip(shopTruoc ? pct(o, oT) : null) + '</td><td>' + fInt(tt) + '</td><td>' + (tt ? (o / tt * 100).toFixed(1) + '%' : '-') + '</td><td>' + (shops.length ? (o / shops.length).toFixed(1) : '-') + '</td></tr>'; });
        h += '<tr class="bc-tong"><td>Tổng</td><td>' + tong.n + '</td><td>' + tong.co + '</td><td>' + fInt(tong.o) + '</td><td>' + chip(shopTruoc ? pct(tong.o, tong.oT) : null) + '</td><td>' + fInt(tong.t) + '</td><td>' + (tong.t ? (tong.o / tong.t * 100).toFixed(1) + '%' : '-') + '</td><td>' + (tong.n ? (tong.o / tong.n).toFixed(1) : '-') + '</td></tr></tbody></table>';
        $('.bc-than', kq).innerHTML = h;
        grid.appendChild(kq);
      })();

      /* 6. TOP 10 sản phẩm — 6 hãng */
      (function () {
        var kq = khoi({ stt: 6, ten: 'TOP 10 sản phẩm bán chạy', cls: 'bc-c6', dangXem: k.nhan + ' · chọn hãng · số máy và doanh thu' });
        var top6 = HANG.map(function (h, i) { return { h: h, i: i, u: nay.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 6);
        var box = el('div', 'bc-cuon');
        function ve(j) { var hh = top6[j]; var ms = Object.keys(nay.model).filter(function (m) { return nay.model[m].h === hh.i; }).map(function (m) { return { m: MODEL[m], u: nay.model[m].u, dt: nay.model[m].dt, uT: truoc && truoc.model[m] ? truoc.model[m].u : null }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 10);
          box.innerHTML = '<table class="bc-bang"><thead><tr><th>#</th><th>Model</th><th>Máy</th><th>so kỳ trước</th><th>DT</th></tr></thead><tbody>' + ms.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td title="' + esc(x.m) + '">' + esc(x.m.replace(/^Điện thoại\s*/i, '').slice(0, 42)) + '</td><td><b>' + fInt(x.u) + '</b></td><td>' + chip(x.uT != null ? pct(x.u, x.uT) : null) + '</td><td>' + fTyNgan(x.dt) + '</td></tr>'; }).join('') + '</tbody></table>'; }
        var than = $('.bc-than', kq); than.appendChild(nutChon(top6.map(function (x) { return x.h; }), 0, ve)); than.appendChild(box); ve(0);
        grid.appendChild(kq);
      })();

      if (cd !== 'tuan') grid.appendChild(khoiSale);

      /* 8. Chi tiết shop 4 hãng */
      (function () {
        var kq = khoi({ stt: 8, ten: 'Chi tiết shop — OPPO · Samsung · Xiaomi · Apple', rong: true, dangXem: k.nhan + ' · xếp theo máy OPPO · lọc Sale / Size' });
        var than = $('.bc-than', kq);
        var rows = Object.keys(shopNay).map(function (s) { var a = shopNay[s], b = shopTruoc ? shopTruoc[s] : null; return { s: s, sale: a.sale, size: a.size, o: a.oppoU, oDt: a.oppoDt, ss: a.ssU, xm: a.xmU, ap: a.apU, tot: a.totU, totDt: a.totDt, oT: b ? b.oppoU : null }; }).sort(function (a, b) { return b.o - a.o; });
        var loc = el('div', 'bc-loc'); var sales = SALE.slice();
        loc.innerHTML = '<label>Sale <select data-k="sale"><option value="">Tất cả</option>' + sales.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></label><label>Size <select data-k="size"><option value="">Tất cả</option>' + SIZE.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></label><label>Tìm <input type="search" data-k="tim" placeholder="tên shop"></label><span class="bc-loc-dem"></span>';
        var box = el('div', 'bc-cuon'), moRong = false, nut = el('button', 'bc-nut-them'); nut.type = 'button';
        function ve() { var f = { sale: $('[data-k=sale]', loc).value, size: $('[data-k=size]', loc).value, tim: $('[data-k=tim]', loc).value.toLowerCase() };
          var rs = rows.filter(function (r) { return (!f.sale || r.sale === f.sale) && (!f.size || r.size === f.size) && (!f.tim || r.s.toLowerCase().indexOf(f.tim) >= 0); }); $('.bc-loc-dem', loc).textContent = rs.length + ' shop';
          var show = moRong ? rs : rs.slice(0, 10);
          box.innerHTML = '<table class="bc-bang bc-bang-shop"><thead><tr><th>#</th><th>Shop</th><th>Size</th><th>Sale</th><th>OPPO</th><th>so kỳ trước</th><th>Thị phần</th><th>Samsung</th><th>Xiaomi</th><th>Apple</th><th>Tổng chợ</th><th>DT OPPO</th></tr></thead><tbody>' + show.map(function (r, i) { return '<tr' + (!r.o ? ' class="bc-mo"' : '') + '><td>' + (i + 1) + '</td><td title="' + esc(r.s) + '">' + esc(r.s) + '</td><td>' + esc(r.size) + '</td><td>' + esc(r.sale.split(' ').slice(-2).join(' ')) + '</td><td><b>' + fInt(r.o) + '</b></td><td>' + chip(r.oT != null ? pct(r.o, r.oT) : null) + '</td><td>' + (r.tot ? (r.o / r.tot * 100).toFixed(0) + '%' : '-') + '</td><td>' + fInt(r.ss) + '</td><td>' + fInt(r.xm) + '</td><td>' + fInt(r.ap) + '</td><td>' + fInt(r.tot) + '</td><td>' + fTyNgan(r.oDt) + '</td></tr>'; }).join('') + '</tbody></table>';
          nut.textContent = moRong ? 'Thu gọn' : 'Xem tất cả ' + rs.length + ' shop'; nut.hidden = rs.length <= 10; }
        loc.addEventListener('change', ve); loc.addEventListener('input', ve); nut.addEventListener('click', function () { moRong = !moRong; ve(); });
        than.appendChild(loc); than.appendChild(box); than.appendChild(nut); ve();
        var so0 = rows.filter(function (r) { return r.o === 0 && r.tot > 0; }).length; if (so0) chot(kq, '<b>' + so0 + '</b> shop có bán máy hãng khác nhưng <b>0 máy OPPO</b> trong kỳ.');
        grid.appendChild(kq);
      })();

      /* 10. DS | DT theo ngày */
      (function () {
        var kq = khoi({ stt: 10, ten: 'OPPO theo ngày', cls: 'bc-c8', dangXem: cd === 'tuan' ? '7 ngày của tuần chọn · cột mờ = tuần trước' : 'Các ngày trong tháng chọn' });
        var ngay = []; for (var dd = k.tu; dd <= k.den; dd = congNgay(dd, 1)) ngay.push(dd);
        var lay = function (g, dd, f) { var N = g.ngay[dd.slice(5)]; return N ? N[f] : 0; };
        var lam = function (f, tien) { var ds = [{ label: 'OPPO ' + k.nhan, data: ngay.map(function (dd) { return dd > k.denCo ? 0 : lay(nay, dd, f); }), backgroundColor: mau('OPPO') }];
          if (cd === 'tuan' && truoc) ds.push({ label: kt.nhan, data: ngay.map(function (dd, i) { return lay(truoc, congNgay(kt.tu, i), f); }), backgroundColor: hexMo(mau('OPPO'), 0.35) });
          var c = cauCotChong(ngay.map(function (dd) { return cd === 'tuan' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][new Date(dd).getUTCDay() === 0 ? 6 : new Date(dd).getUTCDay() - 1] + ' ' + ngayVN(dd).slice(0, 2) : ngayVN(dd).slice(0, 2); }), ds, { fmt: tien ? fTyNgan : fInt, tien: tien }); c.options.scales.x.stacked = false; c.options.scales.y.stacked = false; c.plugins = []; return c; };
        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 340, tabs: [{ ten: 'Máy', cau: function () { return lam('oppoU'); } }, { ten: 'Doanh thu', cau: function () { return lam('oppoDt', true); } }] }));
        grid.appendChild(kq);
      })();

      /* 9. Cùng kỳ tháng trước (chỉ tháng) */
      if (cd === 'thang' && truoc) (function () {
        var kq = khoi({ stt: 9, ten: 'Luỹ kế theo ngày — so tháng trước', cls: 'bc-c4', dangXem: 'Máy OPPO cộng dồn từ ngày 1' });
        var n = U.soNgayThang(k.so), lk = [], lkT = [], a = 0, b = 0; for (var i = 1; i <= n; i++) { var N = nay.ngay[pad2(k.so) + '-' + pad2(i)], NT = truoc.ngay[pad2(k.so - 1) + '-' + pad2(i)]; a += N ? N.oppoU : 0; b += NT ? NT.oppoU : 0; lk.push(('2026-' + pad2(k.so) + '-' + pad2(i)) > k.denCo ? null : a); lkT.push(b); }
        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 340, tabs: [{ ten: 'Luỹ kế', cau: function () { return { type: 'line', data: { labels: lk.map(function (_, i) { return i + 1; }), datasets: [{ label: k.nhan, data: lk, borderColor: mau('OPPO'), backgroundColor: mau('OPPO'), tension: .2, pointRadius: 0, borderWidth: 2.5 }, { label: kt.nhan, data: lkT, borderColor: mau('xam'), backgroundColor: mau('xam'), tension: .2, pointRadius: 0, borderWidth: 1.5, borderDash: [4, 4] }] }, options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, color: mau('chuPhu') } } }, scales: { x: { grid: { display: false }, ticks: { color: mau('chuPhu') } }, y: { grid: { color: mau('luoi') }, ticks: { color: mau('chuPhu') }, border: { display: false } } } } }; } }] }));
        grid.appendChild(kq);
      })();

      /* 11. Thi đua tháng (mượn) */
      if (cd === 'thang') muonKhoi(grid, 11, 'Chương trình thi đua tháng', 'Bonus Size S/A · % HT theo Sale/ASM — như DB TG cũ', timMuon(root, /thi đua/i));
    }

    /* ===================== KA ===================== */
    function veKA(root, ctx) {
      var d = du(), D = d.D, k = ctx.k, kt = ctx.kt, cd = ctx.cd;
      var subOf = (function () { try { return ext().kaSub ? ext().kaSub() : {}; } catch (e) { return {}; } })();
      var THU_TU = ext().kaThuTu || ['FPT', 'VIETTEL', 'ĐIỆN MÁY CHỢ LỚN', 'CELLPHONES'];
      var tenSub = function (s) { return { 'ĐIỆN MÁY CHỢ LỚN': 'ĐMCL', 'CELLPHONES': 'CellphoneS', 'VIETTEL': 'Viettel' }[s] || s; };
      var subCua = function (shop) { return subOf[shop] || '(Chưa xác định)'; };
      function gomKA(tu, den) { var g = gomKenh(tu, den, 'KA'); g.sub = {}; THU_TU.forEach(function (s) { g.sub[s] = { ds: 0, dt: 0, shop: 0 }; }); Object.keys(g.shop).forEach(function (s) { var x = g.shop[s], sb = subCua(s); if (!g.sub[sb]) return; g.sub[sb].ds += x.ds; g.sub[sb].dt += x.dt; if (x.ds > 0) g.sub[sb].shop++; }); return g; }
      var nay = gomKA(k.tu, k.denCo), truoc = kt ? gomKA(kt.tu, kt.denCo) : null;
      var ky12 = dsKy12(ctx), chuoi = ky12.map(function (q) { return gomKA(q.tu, q.den); });
      var subCo = THU_TU.filter(function (s) { return chuoi.some(function (g) { return g.sub[s].ds > 0; }) || nay.sub[s].ds > 0; });
      var grid = el('div', 'bc-luoi'); root.appendChild(grid);
      grid.appendChild(bangKyChung(ctx, 'Kênh KA — FPT · Viettel · ĐMCL · CellphoneS'));

      /* 1. KPI */
      (function () {
        var kq = khoi({ stt: 1, ten: 'Kết quả KA ' + k.nhan.toLowerCase(), rong: true, dangXem: 'Tách 4 kênh phụ — chip so ' + esc(ctx.tenKyTruoc || 'kỳ trước') });
        var asp = nay.ds ? nay.dt / nay.ds : 0, aspT = truoc && truoc.ds ? truoc.dt / truoc.ds : null;
        var rows = function (lay, layT, fmt) { return subCo.map(function (s) { return dongKenh(tenSub(s), mauSub(s), lay(nay.sub[s]), truoc ? layT(truoc.sub[s]) : null, fmt); }).join(''); };
        $('.bc-than', kq).innerHTML = '<div class="bc-kpi-row">' +
          theKpi('Doanh số', fInt(nay.ds) + ' <small>máy</small>', chip(truoc ? pct(nay.ds, truoc.ds) : null), truoc ? ctx.tenKyTruoc + ': ' + fInt(truoc.ds) : '', rows(function (x) { return x.ds; }, function (x) { return x.ds; }, fInt)) +
          theKpi('Doanh thu', fTyNgan(nay.dt), chip(truoc ? pct(nay.dt, truoc.dt) : null), truoc ? ctx.tenKyTruoc + ': ' + fTyNgan(truoc.dt) : '', rows(function (x) { return x.dt; }, function (x) { return x.dt; }, fTyNgan)) +
          theKpi('Đơn giá TB', fTr(asp) + '<small>/máy</small>', chip(aspT ? pct(asp, aspT) : null), aspT ? ctx.tenKyTruoc + ': ' + fTr(aspT) : '', rows(function (x) { return x.ds ? x.dt / x.ds : 0; }, function (x) { return x.ds ? x.dt / x.ds : 0; }, fTr)) +
          theKpi('Shop có bán', fInt(nay.soShop), chip(truoc ? pct(nay.soShop, truoc.soShop) : null), truoc ? ctx.tenKyTruoc + ': ' + truoc.soShop : '', rows(function (x) { return x.shop; }, function (x) { return x.shop; }, fInt)) + '</div>';
        grid.appendChild(kq);
      })();

      /* 2. DS theo tuần cả năm (KA) */
      (function () {
        var kq = khoi({ stt: 2, ten: 'Doanh số theo tuần — cả năm (KA)', cls: 'bc-c7', dangXem: 'Cột chồng 4 kênh phụ · tuần thuộc kỳ chọn tô đậm' });
        var ws = d.TUAN.filter(function (t) { return t.coSo; }); var gs = ws.map(function (t) { return gomKA(t.tu, t.den); });
        var trongKy = function (t) { return cd === 'tuan' ? t.iso === k.tu : (t.tu <= k.den && t.den >= k.tu); };
        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 320, tabs: [{ ten: 'Máy', cau: function () { var c = cauCotChong(ws.map(function (t) { return 'W' + t.so; }), subCo.map(function (s) { return { label: tenSub(s), data: gs.map(function (g) { return g.sub[s].ds; }), backgroundColor: ws.map(function (t) { return trongKy(t) ? mauSub(s) : hexMo(mauSub(s), 0.38); }) }; })); c.data.datasets.forEach(function (x) { x.maxBarThickness = 28; }); c.options.scales.x.ticks.font = { size: 10 }; c.options.scales.x.ticks.autoSkip = false; c.options.scales.x.ticks.maxRotation = 0; return c; } }] }));
        $('.bc-than', kq).appendChild(bangMini({ cot: ws.slice(-12).map(function (t) { return 'W' + t.so; }), dong: subCo.map(function (s) { return { ten: tenSub(s), mau: mauSub(s), s: s }; }), chiSo: [{ ten: 'Máy', lay: function (r, i) { return gs.slice(-12)[i].sub[r.s].ds; } }, { ten: 'DT', fmt: fTyNgan, lay: function (r, i) { return gs.slice(-12)[i].sub[r.s].dt; } }] }));
        grid.appendChild(kq);
      })();

      /* 3. Sell out Tất cả | Reno */
      (function () {
        var kq = khoi({ stt: 3, ten: 'Sell Out KA — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), cls: 'bc-c5', dangXem: 'Tất cả theo kênh phụ · Reno & Find so còn lại' });
        var labels = ky12.map(function (q) { return q.nhan; });
        var seri = ky12.map(function (q) { var mk = BC.modelKy(cd, cd === 'tuan' ? BC.khoangKy('tuan', q.id) : BC.khoangKy('thang', q.id)); return BC.gomSeries({ KA: mk.KA || {} }).tong; });
        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 360, tabs: [
          { ten: 'Tất cả', cau: function () { return cauCotChong(labels, subCo.map(function (s) { return { label: tenSub(s), data: chuoi.map(function (g) { return g.sub[s].ds; }), backgroundColor: mauSub(s) }; })); } },
          { ten: 'Reno', cau: function () { return cauCotChong(labels, [{ label: 'Reno', data: seri.map(function (x) { return x.RENO; }), backgroundColor: mau('RENO') }, { label: 'Find', data: seri.map(function (x) { return x.FIND; }), backgroundColor: mau('FIND') }, { label: 'Còn lại', data: seri.map(function (x) { return x.CONLAI; }), backgroundColor: mau('CONLAI') }]); } },
          { ten: 'Doanh thu', cau: function () { return cauCotChong(labels, subCo.map(function (s) { return { label: tenSub(s), data: chuoi.map(function (g) { return g.sub[s].dt; }), backgroundColor: mauSub(s) }; }), { fmt: fTyNgan, tien: true }); } }
        ] }));
        grid.appendChild(kq);
      })();

      /* 4. Thị phần FPT & Viettel (mượn, chỉ tháng) */
      if (cd === 'thang') muonKhoi(grid, 4, 'Thị phần theo tháng — FPT & Viettel', 'Nguồn Share KA (theo tháng) — như DB TG cũ', timMuon(root, /Thị phần/i));

      /* 5. Chi tiết shop × kênh phụ — cột = kỳ */
      (function () {
        var kq = khoi({ stt: 5, ten: 'Chi tiết theo Shop × kênh phụ — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), rong: true, dangXem: 'Nhóm theo kênh phụ · nút DT / DS · cột cuối = kỳ đang chọn · màu ô so cột trước' });
        var shops = {}; chuoi.forEach(function (g) { Object.keys(g.shop).forEach(function (s) { shops[s] = 1; }); });
        var dong = []; THU_TU.forEach(function (sb) { var ds = Object.keys(shops).filter(function (s) { return subCua(s) === sb; }).sort(function (a, b) { return (nay.shop[b] ? nay.shop[b].ds : 0) - (nay.shop[a] ? nay.shop[a].ds : 0); }); if (!ds.length) return; dong.push({ ten: tenSub(sb) + ' (' + ds.length + ')', nhom: true, mau: mauSub(sb), s: null, sb: sb }); ds.forEach(function (s) { dong.push({ ten: '   ' + tenShopNgan(s.replace(/^(FPT|Viettel|VTS|Cellphone[sS]?|CPS|ĐMCL|Điện Máy Chợ Lớn)\s*-\s*/i, '')), s: s }); }); });
        var lay = function (r, i, f) { var g = chuoi[i]; if (r.nhom) return g.sub[r.sb][f]; var x = g.shop[r.s]; return x ? x[f] : 0; };
        var w = bangMini({ cot: ky12.map(function (q) { return q.nhan; }), dong: dong, tong: false, chiSo: [{ ten: 'DT', fmt: fTyNgan, lay: function (r, i) { return lay(r, i, 'dt'); } }, { ten: 'DS', lay: function (r, i) { return lay(r, i, 'ds'); } }] });
        w.classList.add('bc-mini-shop');
        $('.bc-than', kq).appendChild(w);
        var so0 = Object.keys(shops).filter(function (s) { return nay.shop[s] ? nay.shop[s].ds === 0 : true; }).length; chot(kq, '<b>' + Object.keys(shops).length + '</b> shop KA có số trong 12 kỳ; <b>' + so0 + '</b> shop 0 máy ' + k.nhan.toLowerCase() + '.');
        grid.appendChild(kq);
      })();

      /* 6. Chương trình shop chưa PG (mượn, chỉ tháng) */
      if (cd === 'thang') muonKhoi(grid, 6, 'Chương trình shop chưa có PG — ngân sách & KPI Sale', null, timMuon(root, /chưa có PG/i));
    }

    /* ===================== IND ===================== */
    function veIND(root, ctx) {
      var d = du(), D = d.D, k = ctx.k, kt = ctx.kt, cd = ctx.cd, E = ext();
      var levelOf = {}, idToShop = {}, saleOf = {}; (D.store_rows || []).forEach(function (r) { if (r.channel !== 'IND') return; levelOf[r.store] = r.level; saleOf[r.store] = r.sale; if (r.store_id) idToShop[String(r.store_id).trim()] = r.store; });
      var nhom = function (shop) { try { return E.ocLevel ? E.ocLevel(levelOf[shop]) : { group: 'Normal', sub: null }; } catch (e) { return { group: 'Normal', sub: null }; } };
      var OC_T = E.ocTarget || {}, OC_TT = E.ocThuTu || ['Platinum', 'Titan', 'Gold'];
      /* Sell In theo ngày VN từ cột H (ISO UTC) — chỉ tính 1 lần */
      var SI = (function () { if (window.__bcSI) return window.__bcSI; var out = {}; (D.sell_in_rows || []).forEach(function (r) { if (!r || r.length < 7) return; var q = +r[6] || 0; var ng = null; if (r[7]) { var dt = new Date(r[7]); if (!isNaN(dt)) { dt = new Date(dt.getTime() + 7 * 3600e3); ng = dt.toISOString().slice(0, 10); } } if (!ng) { var m = +r[3]; if (m) ng = '2026-' + pad2(m) + '-15'; } if (!ng) return; var shop = idToShop[String(r[0]).trim()] || ('#' + r[0]); var N = out[ng] || (out[ng] = {}); N[shop] = (N[shop] || 0) + q; }); return (window.__bcSI = out); })();
      function gomSI(tu, den) { var r = { tong: 0, shop: {}, oc: { 'O.C': 0, Normal: 0 } }; Object.keys(SI).forEach(function (ng) { if (ng < tu || ng > den) return; Object.keys(SI[ng]).forEach(function (s) { var q = SI[ng][s]; r.tong += q; r.shop[s] = (r.shop[s] || 0) + q; r.oc[nhom(s).group] += q; }); }); return r; }
      function gomIND(tu, den) { var g = gomKenh(tu, den, 'IND'); g.oc = { 'O.C': { ds: 0, dt: 0, shop: 0 }, Normal: { ds: 0, dt: 0, shop: 0 } }; g.level = {}; OC_TT.forEach(function (l) { g.level[l] = { ds: 0, dt: 0, shop: 0, shops: [] }; }); Object.keys(g.shop).forEach(function (s) { var x = g.shop[s], n = nhom(s); g.oc[n.group].ds += x.ds; g.oc[n.group].dt += x.dt; if (x.ds > 0) g.oc[n.group].shop++; if (n.sub && g.level[n.sub]) { g.level[n.sub].ds += x.ds; g.level[n.sub].dt += x.dt; if (x.ds > 0) { g.level[n.sub].shop++; g.level[n.sub].shops.push(s); } } }); g.si = gomSI(tu, den); return g; }
      var nay = gomIND(k.tu, k.denCo), truoc = kt ? gomIND(kt.tu, kt.denCo) : null;
      var ky12 = dsKy12(ctx), chuoi = ky12.map(function (q) { return gomIND(q.tu, q.den); });
      var SALES = Object.keys(nay.sale).concat(chuoi.length ? Object.keys(chuoi[chuoi.length - 1].sale) : []).filter(function (s, i, a) { return a.indexOf(s) === i && s !== '(Không rõ)'; }).sort(function (a, b) { return nay.sale[b] ? nay.sale[b].ds : 0 - (nay.sale[a] ? nay.sale[a].ds : 0); });
      var tenNgan = function (s) { return s.split(' ').slice(-1)[0]; };
      var grid = el('div', 'bc-luoi'); root.appendChild(grid);
      grid.appendChild(bangKyChung(ctx, 'Kênh IND (OPPO Club) — O.C / Normal'));

      /* 1. KPI + theo Sale */
      (function () {
        var kq = khoi({ stt: 1, ten: 'Kết quả IND ' + k.nhan.toLowerCase(), rong: true, dangXem: 'Tách theo Sale trong từng thẻ — chip so ' + esc(ctx.tenKyTruoc || 'kỳ trước') });
        var asp = nay.ds ? nay.dt / nay.ds : 0, aspT = truoc && truoc.ds ? truoc.dt / truoc.ds : null;
        var rows = function (lay, fmt) { return SALES.map(function (s) { var a = nay.sale[s] || { ds: 0, dt: 0, shop: 0 }, b = truoc ? (truoc.sale[s] || { ds: 0, dt: 0, shop: 0 }) : null; return dongKenh(tenNgan(s), mau('IND'), lay(a), b ? lay(b) : null, fmt); }).join(''); };
        $('.bc-than', kq).innerHTML = '<div class="bc-kpi-row">' +
          theKpi('Doanh số', fInt(nay.ds) + ' <small>máy</small>', chip(truoc ? pct(nay.ds, truoc.ds) : null), 'O.C ' + fInt(nay.oc['O.C'].ds) + ' · Normal ' + fInt(nay.oc.Normal.ds), rows(function (x) { return x.ds; }, fInt)) +
          theKpi('Doanh thu', fTyNgan(nay.dt), chip(truoc ? pct(nay.dt, truoc.dt) : null), truoc ? ctx.tenKyTruoc + ': ' + fTyNgan(truoc.dt) : '', rows(function (x) { return x.dt; }, fTyNgan)) +
          theKpi('Đơn giá TB', fTr(asp) + '<small>/máy</small>', chip(aspT ? pct(asp, aspT) : null), aspT ? ctx.tenKyTruoc + ': ' + fTr(aspT) : '', rows(function (x) { return x.ds ? x.dt / x.ds : 0; }, fTr)) +
          theKpi('Shop có bán', fInt(nay.soShop), chip(truoc ? pct(nay.soShop, truoc.soShop) : null), 'Sell In ' + fInt(nay.si.tong) + ' máy' + (truoc ? ' (' + ctx.tenKyTruoc.split(' (')[0] + ': ' + fInt(truoc.si.tong) + ')' : ''), rows(function (x) { return x.shop; }, fInt)) + '</div>';
        if (truoc) { var dg = SALES.map(function (s) { var a = nay.sale[s] || { ds: 0 }, b = truoc.sale[s] || { ds: 0 }; return { s: s, d: a.ds - b.ds }; }).sort(function (a, b) { return a.d - b.d; }); if (dg.length) chot(kq, 'Sale giảm nhiều nhất: <b>' + esc(tenNgan(dg[0].s)) + '</b> (' + fInt(dg[0].d) + ' máy); tăng nhiều nhất: <b>' + esc(tenNgan(dg[dg.length - 1].s)) + '</b> (+' + fInt(dg[dg.length - 1].d) + ').'); }
        grid.appendChild(kq);
      })();

      /* 2. DS theo tuần cả năm (IND) */
      (function () {
        var kq = khoi({ stt: 2, ten: 'Doanh số theo tuần — cả năm (IND)', cls: 'bc-c7', dangXem: 'Cột chồng O.C / Normal · tuần thuộc kỳ chọn tô đậm' });
        var ws = d.TUAN.filter(function (t) { return t.coSo; }); var gs = ws.map(function (t) { return gomIND(t.tu, t.den); });
        var trongKy = function (t) { return cd === 'tuan' ? t.iso === k.tu : (t.tu <= k.den && t.den >= k.tu); };
        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 320, tabs: [{ ten: 'Máy', cau: function () { var c = cauCotChong(ws.map(function (t) { return 'W' + t.so; }), ['O.C', 'Normal'].map(function (g) { return { label: g, data: gs.map(function (x) { return x.oc[g].ds; }), backgroundColor: ws.map(function (t) { return trongKy(t) ? mauOC(g) : hexMo(mauOC(g), 0.38); }) }; })); c.data.datasets.forEach(function (x) { x.maxBarThickness = 28; }); c.options.scales.x.ticks.font = { size: 10 }; c.options.scales.x.ticks.autoSkip = false; c.options.scales.x.ticks.maxRotation = 0; return c; } }] }));
        $('.bc-than', kq).appendChild(bangMini({ cot: ws.slice(-12).map(function (t) { return 'W' + t.so; }), dong: ['O.C', 'Normal'].map(function (g) { return { ten: g, mau: mauOC(g), g: g }; }), chiSo: [{ ten: 'Máy', lay: function (r, i) { return gs.slice(-12)[i].oc[r.g].ds; } }, { ten: 'DT', fmt: fTyNgan, lay: function (r, i) { return gs.slice(-12)[i].oc[r.g].dt; } }, { ten: 'S.I', lay: function (r, i) { return gs.slice(-12)[i].si.oc[r.g]; } }] }));
        grid.appendChild(kq);
      })();

      /* 3. Sell Out | Sell In */
      (function () {
        var kq = khoi({ stt: 3, ten: 'Sell Out | Sell In — O.C / Normal — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), cls: 'bc-c5', dangXem: 'Sell In gộp theo ngày từ sheet SELL IN (cột DATE)' });
        var labels = ky12.map(function (q) { return q.nhan; });
        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 360, tabs: [
          { ten: 'Sell Out', cau: function () { return cauCotChong(labels, ['O.C', 'Normal'].map(function (g) { return { label: g, data: chuoi.map(function (x) { return x.oc[g].ds; }), backgroundColor: mauOC(g) }; })); } },
          { ten: 'Sell In', cau: function () { return cauCotChong(labels, ['O.C', 'Normal'].map(function (g) { return { label: g, data: chuoi.map(function (x) { return x.si.oc[g]; }), backgroundColor: mauOC(g) }; })); } },
          { ten: 'S.O vs S.I', cau: function () { var c = cauCotChong(labels, [{ label: 'Sell Out', data: chuoi.map(function (x) { return x.ds; }), backgroundColor: mau('IND') }, { label: 'Sell In', data: chuoi.map(function (x) { return x.si.tong; }), backgroundColor: hexMo(mau('IND'), 0.45) }]); c.options.scales.x.stacked = false; c.options.scales.y.stacked = false; c.plugins = []; return c; } }
        ] }));
        var lk = 0, lkSI = 0; d.NGAY.forEach(function (n) { if (n > k.denCo) return; }); var gAll = gomIND('2026-01-01', k.denCo); chot(kq, 'Luỹ kế đến ' + ngayVN(k.denCo) + ': Sell In <b>' + fInt(gAll.si.tong) + '</b> · Sell Out <b>' + fInt(gAll.ds) + '</b> → tồn ước tính <b>' + fInt(gAll.si.tong - gAll.ds) + '</b> máy.');
        grid.appendChild(kq);
      })();

      /* 4. Bảng nhiệt theo Sale */
      (function () {
        var kq = khoi({ stt: 4, ten: 'Theo Sale — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), rong: true, dangXem: 'Nút DS · DT · Shop · S.I · PK (PK = Sell In − Sell Out luỹ kế đến hết kỳ) · màu ô so cột trước' });
        var saleSI = function (g) { var r = {}; Object.keys(g.si.shop).forEach(function (s) { var sl = saleOf[s] || '(Không rõ)'; r[sl] = (r[sl] || 0) + g.si.shop[s]; }); return r; };
        var siKy = chuoi.map(saleSI);
        var lkSO = {}, lkSI = {}; var pkKy = ky12.map(function (q) { var g = gomIND('2026-01-01', q.den); var r = {}; var si = saleSI(g); Object.keys(g.sale).concat(Object.keys(si)).forEach(function (s) { r[s] = (si[s] || 0) - (g.sale[s] ? g.sale[s].ds : 0); }); return r; });
        $('.bc-than', kq).appendChild(bangMini({ cot: ky12.map(function (q) { return q.nhan; }), dong: SALES.map(function (s) { return { ten: tenNgan(s), s: s, mau: mau('IND') }; }), chiSo: [
          { ten: 'DS', lay: function (r, i) { var a = chuoi[i].sale[r.s]; return a ? a.ds : 0; } }, { ten: 'DT', fmt: fTyNgan, lay: function (r, i) { var a = chuoi[i].sale[r.s]; return a ? a.dt : 0; } },
          { ten: 'Shop', lay: function (r, i) { var a = chuoi[i].sale[r.s]; return a ? a.shop : 0; } }, { ten: 'S.I', lay: function (r, i) { return siKy[i][r.s] || 0; } }, { ten: 'PK', lay: function (r, i) { return pkKy[i][r.s] || 0; } }] }));
        grid.appendChild(kq);
      })();

      /* 5. Mục tiêu shop IND theo level + 6. Target shop O.C */
      (function () {
        var m = cd === 'tuan' ? U.thangCua(k.denCo) : k.so; var kTh = BC.khoangKy('thang', m); var denCo = cd === 'tuan' ? (k.denCo < kTh.denCo ? k.denCo : kTh.denCo) : k.denCo;
        var lk = gomIND(kTh.tu, denCo); var ngayDa = soNgay(kTh.tu, denCo), ngayThang = U.soNgayThang(m), ngayCon = Math.max(0, ngayThang - ngayDa);
        var kq = khoi({ stt: 5, ten: (cd === 'tuan' ? 'Tiến độ mục tiêu shop O.C tháng ' + m + ' đến hết ' + k.nhan.toLowerCase() : 'Mục tiêu shop O.C tháng ' + m), cls: 'bc-c6', dangXem: 'Target/shop theo level × số shop có bán · luỹ kế ' + ngayDa + '/' + ngayThang + ' ngày' });
        var h = '<table class="bc-bang"><thead><tr><th>Level</th><th>Shop có bán</th><th>Máy</th><th>Target</th><th>% HT</th><th>Đạt</th>' + (ngayCon ? '<th>Cần/tuần</th>' : '') + '</tr></thead><tbody>';
        var chiTiet = [];
        OC_TT.forEach(function (l) { var L = lk.level[l], t = OC_T[l] || { ds: 0 }; var tg = t.ds * L.shop, p = tg ? L.ds / tg * 100 : null; var dat = L.shops.filter(function (s) { return lk.shop[s].ds >= t.ds; }).length; var con = Math.max(0, tg - L.ds);
          h += '<tr><td><b>' + esc(l) + '</b></td><td>' + L.shop + '</td><td><b>' + fInt(L.ds) + '</b></td><td>' + fInt(tg) + '</td><td>' + thanhNho(p) + '</td><td>' + dat + '/' + L.shop + '</td>' + (ngayCon ? '<td>' + fInt(ngayCon > 0 ? con / (ngayCon / 7) : 0) + '</td>' : '') + '</tr>';
          L.shops.forEach(function (s) { chiTiet.push({ s: s, l: l, ds: lk.shop[s].ds, dt: lk.shop[s].dt, t: t.ds, sale: saleOf[s] || '' }); }); });
        h += '</tbody></table>';
        $('.bc-than', kq).innerHTML = h;
        grid.appendChild(kq);
        var kq2 = khoi({ stt: 6, ten: 'Tiến độ target từng shop O.C', cls: 'bc-c6', dangXem: 'Xếp từ thấp lên cao · % luỹ kế tháng đến ' + ngayVN(denCo) });
        chiTiet.sort(function (a, b) { return (a.ds / a.t) - (b.ds / b.t); });
        var box = el('div', 'bc-cuon'), moRong = false, nut = el('button', 'bc-nut-them'); nut.type = 'button';
        function ve() { var show = moRong ? chiTiet : chiTiet.slice(0, 10); box.innerHTML = '<table class="bc-bang bc-bang-shop"><thead><tr><th>#</th><th>Shop</th><th>Level</th><th>Sale</th><th>Máy</th><th>Target</th><th>% HT</th>' + (ngayCon ? '<th>Cần/tuần</th>' : '') + '</tr></thead><tbody>' + show.map(function (r, i) { var p = r.t ? r.ds / r.t * 100 : null; return '<tr><td>' + (i + 1) + '</td><td title="' + esc(r.s) + '">' + esc(tenShopNgan(r.s)) + '</td><td>' + esc(r.l) + '</td><td>' + esc(tenNgan(r.sale)) + '</td><td><b>' + fInt(r.ds) + '</b></td><td>' + fInt(r.t) + '</td><td>' + thanhNho(p) + '</td>' + (ngayCon ? '<td>' + fInt(Math.max(0, r.t - r.ds) / (ngayCon / 7)) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table>'; nut.textContent = moRong ? 'Thu gọn' : 'Xem tất cả ' + chiTiet.length + ' shop'; nut.hidden = chiTiet.length <= 10; }
        nut.addEventListener('click', function () { moRong = !moRong; ve(); }); var than2 = $('.bc-than', kq2); than2.appendChild(box); than2.appendChild(nut); ve();
        var dat = chiTiet.filter(function (r) { return r.ds >= r.t; }).length; chot(kq2, '<b>' + dat + '/' + chiTiet.length + '</b> shop O.C đã đạt target tháng' + (ngayCon ? ' · còn ' + ngayCon + ' ngày' : '') + '.');
        grid.appendChild(kq2);
      })();

      /* 7. Thưởng Sale IND (mượn, chỉ tháng) · 8. Tồn kho (mượn, 2 chế độ) */
      if (cd === 'thang') muonKhoi(grid, 7, 'Chương trình tháng — Thưởng Sale IND', null, timMuon(root, /Thưởng Sale/i));
      muonKhoi(grid, 8, 'Tồn kho ước tính — theo đại lý & model', 'Ảnh chụp hiện tại (Sell In − Sell Out luỹ kế) — giống nhau ở 2 chế độ', timMuon(root, /Tồn kho ước tính/i));
    }

    function chipDiem(d) { var cls = d > 0.3 ? 'bc-chip-len' : d < -0.3 ? 'bc-chip-giam' : 'bc-chip-0'; return '<span class="bc-chip ' + cls + '">' + (d > 0 ? '▲ +' : d < 0 ? '▼ ' : '• ') + d.toFixed(1) + '</span>'; }

    BC.dangKy('panel-mwg', { ve: veMWG, muon: [/thi đua/i] });
    BC.dangKy('panel-ka', { ve: veKA, muon: [/Thị phần/i, /chưa có PG/i] });
    BC.dangKy('panel-ind', { ve: veIND, muon: [/Thưởng Sale/i, /Tồn kho ước tính/i, /Tồn theo đại lý/i] });
  }
})();
