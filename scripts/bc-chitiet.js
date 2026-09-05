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
      bar.innerHTML = '<div><div class="bc-ky-ten">' + esc(ctx.k.nhan) + ' <small>' + esc(ctx.k.chiTiet) + '</small></div><div class="bc-ky-ss">' + (ctx.k.chuaCo ? '<b class="bc-giam-chu">Nguồn chưa có số kỳ này</b> (mới tới ' + ngayVN(ctx.k.cuoiNguon) + ') · ' : '') + (ctx.kt ? 'So với <b>' + esc(ctx.kt.nhan) + '</b>' + (ctx.kt.cungKy ? ' — cùng số ngày' : '') : 'Chưa có kỳ trước') + (ctx.k.do ? ' · <b>kỳ đang dở</b>, số đến ' + ngayVN(ctx.k.denCo) : '') + (extra ? ' · ' + extra : '') + '</div></div>';
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
      /* LUẬT NGUỒN (anh Thái 03/09): tab MWG dùng LỊCH NGÀY của DATA MWG (ctx.mwg), không dùng lịch CENTER */
      if (ctx.mwg) ctx = Object.assign({}, ctx, { k: ctx.mwg.k, kt: ctx.mwg.kt, tenKyTruoc: ctx.mwg.tenKyTruoc });
      /* LUẬT NGUỒN: Sale phụ trách shop = sheet SHOP THEO SALE (khớp Store ID thật qua PARTNER_TO_STORE_ID), không dùng cột Sale của DATA MWG */
      var P2S = (window.__bcMwg && window.__bcMwg.partnerToStore) || {}, SALE_ID = d.D.shop_sale_by_id || {};
      var saleCua = function (meta) { var code = meta && meta.store_code ? String(meta.store_code) : ''; var id = P2S[code] || code; var sl = SALE_ID[id]; return sl ? { sale: sl, chuaGan: false } : { sale: (meta && meta.sale) || '(Không rõ)', chuaGan: true }; };
      var DL = B.daily, R = DL.rows, HANG = DL.brands, SEG = DL.segments, SALE = DL.sales, SIZE = DL.sizes, MODEL = DL.models;
      var iOppo = HANG.findIndex(function (h) { return /oppo/i.test(h); });
      var trongKhoang = function (tu, den) { return function (r) { var ng = '2026-' + pad2(r[0]) + '-' + pad2(r[1]); return ng >= tu && ng <= den; }; };
          /* ---- chỉ số phụ dùng chung ---- */
             var iSS = HANG.findIndex(function (h) { return /samsung/i.test(h); });
             var iXM = HANG.findIndex(function (h) { return /xiaomi/i.test(h); });
             var PKI = SEG.map(function (s, i) { return /^(10-15M|15-20M)$/.test(s) ? i : -1; }).filter(function (i) { return i >= 0; });
             var laPK = function (s) { return PKI.indexOf(s) >= 0; };
             var THANG_MWG = (function () { var z = {}; for (var i = 0; i < R.length; i++) z[R[i][0]] = 1; return Object.keys(z).map(Number).sort(function (a, b) { return a - b; }); })();
             var M_MOI = THANG_MWG[THANG_MWG.length - 1] || 0;
             var khoangThang = function (m) { return BC.khoangKy('thang', m, 'mwg'); };

             /* biểu đồ riêng của tab MWG — tự quản để bộ lọc tháng vẽ lại được */
             var CT = (window.__bcCtCharts = window.__bcCtCharts || []);
             CT.forEach(function (c) { try { c.huy(); } catch (e) {} }); CT.length = 0;
             if (!window.__bcCtObs) { window.__bcCtObs = 1; new MutationObserver(function () { (window.__bcCtCharts || []).forEach(function (c) { try { c.ve(); } catch (e) {} }); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); }
             function bdRieng(cao, cau) {
                        var wrap = el('div', 'bc-bd'), hop = el('div', 'bc-bd-hop'); hop.style.height = cao + 'px';
                        var cv = el('canvas'); hop.appendChild(cv); wrap.appendChild(hop);
                        var ch = null;
                        function ve() { if (ch) { try { ch.destroy(); } catch (e) {} ch = null; } var cfg = cau(); if (!cfg) return; cfg.options = cfg.options || {}; cfg.options.maintainAspectRatio = false; cfg.options.responsive = true; try { ch = new Chart(cv, cfg); } catch (e) { console.warn('bc-ct chart:', e); } }
                        var o = { el: wrap, ve: ve, huy: function () { if (ch) { try { ch.destroy(); } catch (e) {} } } };
                        CT.push(o); ve(); return o;
             }

             function gomMWG(tu, den) {
                        var f = trongKhoang(tu, den);
                        var r = { tong: { u: 0, dt: 0 }, oppo: { u: 0, dt: 0 }, hang: HANG.map(function () { return { u: 0, dt: 0 }; }),
                                           seg: SEG.map(function () { return { u: 0, dt: 0 }; }), segHang: SEG.map(function () { return HANG.map(function () { return 0; }); }),
                                           hangPK: HANG.map(function () { return 0; }), model: {}, ngay: {} };
                        for (var i = 0; i < R.length; i++) {
                                     var x = R[i]; if (!f(x)) continue;
                                     var dt = x[5] || 0, u = x[6] || 0, h = x[4], s = x[3], md = x[8];
                                     r.tong.u += u; r.tong.dt += dt; r.hang[h].u += u; r.hang[h].dt += dt;
                                     if (s >= 0 && r.seg[s]) { r.seg[s].u += u; r.seg[s].dt += dt; r.segHang[s][h] += u; if (laPK(s)) r.hangPK[h] += u; }
                                     if (h === iOppo) { r.oppo.u += u; r.oppo.dt += dt; }
                                     var ng = pad2(x[0]) + '-' + pad2(x[1]);
                                     var N = r.ngay[ng] || (r.ngay[ng] = { h: HANG.map(function () { return { u: 0, dt: 0 }; }), pk: HANG.map(function () { return 0; }), reno: 0, find: 0 });
                                     N.h[h].u += u; N.h[h].dt += dt; if (s >= 0 && laPK(s)) N.pk[h] += u;
                                     if (h === iOppo) { var tm = MODEL[md] || ''; if (/reno/i.test(tm)) N.reno += u; else if (/find/i.test(tm)) N.find += u; }
                                     var M = r.model[md] || (r.model[md] = { u: 0, dt: 0, h: h }); M.u += u; M.dt += dt;
                        }
                        return r;
             }
             function shopMWG(tu, den) {
                        var SD = B.shop_day_data || {}, meta = {}; (B.shop_rows_brand4 || []).forEach(function (s) { meta[s.shop] = s; });
                        var out = {};
                        Object.keys(SD).forEach(function (shop) {
                                     var m = meta[shop] || {}, sc = saleCua(m);
                                     var o = { oU: 0, oDt: 0, sU: 0, sDt: 0, xU: 0, xDt: 0, aU: 0, aDt: 0, tU: 0, tDt: 0, pkO: 0, pkT: 0, sale: sc.sale, chuaGan: sc.chuaGan, size: m.shop_size || '?' };
                                     Object.keys(SD[shop]).forEach(function (kk) {
                                                    var p = kk.split('-'); var ng = '2026-' + pad2(p[0]) + '-' + pad2(p[1]); if (ng < tu || ng > den) return;
                                                    var v = SD[shop][kk];
                                                    o.oU += v.oppo_units || 0; o.oDt += v.oppo_rev || 0; o.sU += v.samsung_units || 0; o.sDt += v.samsung_rev || 0;
                                                    o.xU += v.xiaomi_units || 0; o.xDt += v.xiaomi_rev || 0; o.aU += v.apple_units || 0; o.aDt += v.apple_rev || 0;
                                                    o.tU += v.total_units || 0; o.tDt += v.total_rev || 0; o.pkO += v.pk1020_oppo_units || 0; o.pkT += v.pk1020_total_units || 0;
                                     });
                                     out[shop] = o;
                        });
                        return out;
             }
             var CONG = ['oU', 'oDt', 'sU', 'sDt', 'xU', 'xDt', 'aU', 'aDt', 'tU', 'tDt', 'pkO', 'pkT'];
             function gomTheo(shops, lay) {
                        var r = {};
                        Object.keys(shops).forEach(function (s) {
                                     var x = shops[s], k2 = lay(x); var a = r[k2];
                                     if (!a) { a = r[k2] = { shops: 0, shop0: 0, chuaGan: 0, ten: [] }; CONG.forEach(function (f) { a[f] = 0; }); }
                                     CONG.forEach(function (f) { a[f] += x[f]; });
                                     a.shops++; if (!x.oU) a.shop0++; if (x.chuaGan) a.chuaGan++; a.ten.push(s);
                        });
                        return r;
             }
             var shDs = function (a, u) { return a.tU ? (u / a.tU * 100) : 0; };
             var shDt = function (a, dt) { var md = a.tDt - a.aDt; return md ? (dt / md * 100) : 0; };
             var pcCh = function (v) { return v.toFixed(1) + '%'; };
             var oCotChinh = function (a) {
                        return '<td><b>' + fInt(a.pkO) + '</b>' + (a.pkT ? ' <small>' + pcCh(a.pkO / a.pkT * 100) + '</small>' : '') + '</td>' +
                                     '<td>' + pcCh(shDs(a, a.oU)) + ' <small>/ ' + pcCh(shDs(a, a.sU)) + ' / ' + pcCh(shDs(a, a.xU)) + '</small></td>' +
                                     '<td>' + pcCh(shDt(a, a.oDt)) + ' <small>/ ' + pcCh(shDt(a, a.sDt)) + ' / ' + pcCh(shDt(a, a.xDt)) + '</small></td>';
             };
             var dauCotChinh = '<th>PK 10-20M</th><th>Share D.S <small>O/S/X</small></th><th>Share D.T <small>O/S/X</small></th>';
             var selThangCT = function (ds, chon, coKy, onChon) {
                        var l = el('label', 'bc-loc-thang', 'Tháng ');
                        var s = el('select');
                        if (coKy) { var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Kỳ đang chọn'; s.appendChild(o0); }
                        ds.forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = 'Tháng ' + m; s.appendChild(o); });
                        s.value = chon == null ? '' : chon;
                        s.addEventListener('change', function () { onChon(s.value); });
                        l.appendChild(s); return l;
             };

             var k = ctx.k, kt = ctx.kt, cd = ctx.cd;
             /* Anh Thái 05/09: tab MWG lấy THÁNG MỚI NHẤT của DATA MWG (CENTER về chậm hơn).
                      Chỉ tự nhảy khi đang ở tháng mặc định (tháng cuối CENTER) — chọn tay tháng cũ thì giữ nguyên. */
             var doiThang = null;
             if (cd === 'thang' && M_MOI && k.so < M_MOI) {
                        var mCenter = d.NGAY.length ? U.thangCua(d.NGAY[d.NGAY.length - 1]) : 0;
                        if (k.so === mCenter) { doiThang = M_MOI; k = khoangThang(M_MOI); kt = BC.kyTruoc('thang', k); ctx = Object.assign({}, ctx, { k: k, kt: kt, tenKyTruoc: kt ? kt.nhan : '' }); }
             }
             var thangKy = cd === 'tuan' ? U.thangCua(k.denCo) : k.so;
             if (THANG_MWG.indexOf(thangKy) < 0) thangKy = M_MOI || thangKy;

             var nay = gomMWG(k.tu, k.denCo), truoc = kt ? gomMWG(kt.tu, kt.denCo) : null;
             var shopNay = shopMWG(k.tu, k.denCo), shopTruoc = kt ? shopMWG(kt.tu, kt.denCo) : null;
             var ky12 = dsKy12(ctx), chuoi = ky12.map(function (q) { return gomMWG(q.tu, q.den); });
             var saleNay = gomTheo(shopNay, function (x) { return x.sale; });
             var saleTruoc = shopTruoc ? gomTheo(shopTruoc, function (x) { return x.sale; }) : null;
             var SALES_MWG = Object.keys(saleNay).sort(function (a, b) { return saleNay[b].oU - saleNay[a].oU; });
             var soChuaGan = Object.keys(shopNay).filter(function (s) { return shopNay[s].chuaGan; }).length;
             var grid = el('div', 'bc-luoi'); root.appendChild(grid);
             grid.appendChild(bangKyChung(ctx, 'Thị trường MWG Tiền Giang + Bến Tre (12 hãng) · Sale theo sheet SHOP THEO SALE'
                                                  + (doiThang ? ' · <b>đã nhảy sang tháng ' + doiThang + '</b> (tháng mới nhất DATA MWG có số)' : '')
                                                  + (soChuaGan ? ' · <b class="bc-giam-chu">' + soChuaGan + ' shop chưa gán sale trong sheet</b>' : '')));
             var share = function (g) { return g.tong.u ? g.oppo.u / g.tong.u * 100 : 0; };

             /* ================= 1. Kết quả MWG — mỗi thẻ 1 Sale ================= */
             (function () {
                        var kq = khoi({ stt: 1, ten: 'Kết quả MWG ' + k.nhan.toLowerCase(), rong: true, cls: 'bc-kpi-khoi',
                                                 dangXem: 'Mỗi thẻ 1 Sale — máy OPPO, thị phần trong chợ của chính Sale đó, chip so ' + esc(ctx.tenKyTruoc || 'kỳ trước') });
                        var the = el('div', 'bc-kpi-row' + (SALES_MWG.length > 4 ? ' bc-kpi-6' : ''));
                        the.innerHTML = SALES_MWG.map(function (s) {
                                     var a = saleNay[s], b = saleTruoc ? saleTruoc[s] : null;
                                     var sh = shDs(a, a.oU), shT = b ? shDs(b, b.oU) : null;
                                     var rows = [
                                                    ['DT OPPO', fTyNgan(a.oDt), b ? pct(a.oDt, b.oDt) : null],
                                                    ['Máy chợ', fInt(a.tU), b ? pct(a.tU, b.tU) : null],
                                                    ['PK 10-20M', fInt(a.pkO), b ? pct(a.pkO, b.pkO) : null],
                                                    ['Shop bán', fInt(a.shops - a.shop0) + '/' + a.shops, b ? pct(a.shops - a.shop0, b.shops - b.shop0) : null]
                                                  ].map(function (x) { return '<div><i class="bc-cham" style="background:' + mau('MWG') + '"></i><b>' + esc(x[0]) + '</b><span>' + x[1] + '</span>' + chip(x[2]) + '</div>'; }).join('');
                                     return theKpi(esc(s.split(' ').slice(-2).join(' ')), fInt(a.oU) + ' <small>máy</small>',
                                                               chip(b ? pct(a.oU, b.oU) : null),
                                                               'Thị phần <b>' + pcCh(sh) + '</b>' + (shT != null ? ' · ' + esc(ctx.tenKyTruoc) + ' ' + pcCh(shT) : ''), rows);
                        }).join('');
                        $('.bc-than', kq).appendChild(the);
                        if (truoc) { var dS = share(nay) - share(truoc); chot(kq, 'Toàn MWG: thị phần máy OPPO ' + (dS >= 0 ? 'tăng' : 'giảm') + ' <b>' + Math.abs(dS).toFixed(1) + ' điểm</b> (' + pcCh(share(truoc)) + ' → ' + pcCh(share(nay)) + ') · máy OPPO ' + (nay.oppo.u >= truoc.oppo.u ? '+' : '') + fInt(nay.oppo.u - truoc.oppo.u) + ', toàn ngành ' + (nay.tong.u >= truoc.tong.u ? '+' : '') + fInt(nay.tong.u - truoc.tong.u) + ' máy.'); }
                        grid.appendChild(kq);
             })();

             /* ================= 2. Doanh số theo hãng — 12 kỳ + bảng mini theo Sale ================= */
             (function () {
                        var kq = khoi({ stt: 2, ten: 'Doanh số theo hãng — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), rong: true,
                                                 dangXem: 'Biểu đồ: top 6 hãng, còn lại gộp "Khác" · Bảng mini bên dưới: chi tiết từng Sale, lọc riêng theo tháng (mặc định cả năm)' });
                        var top6 = HANG.map(function (h, i) { return { h: h, i: i, u: nay.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 6);
                        var labels = ky12.map(function (q) { return q.nhan; });
                        var cotHang = function (lay, tien) {
                                     var khac = chuoi.map(function (g) { var t = lay(g.tong); top6.forEach(function (x) { t -= lay(g.hang[x.i]); }); return Math.max(0, t); });
                                     return cauCotChong(labels, top6.map(function (x) { return { label: x.h, data: chuoi.map(function (g) { return lay(g.hang[x.i]); }), backgroundColor: mauHang(x.h) }; })
                                                                    .concat([{ label: 'Khác', data: khac, backgroundColor: mauHang('Khác') }]), { fmt: tien ? fTyNgan : fInt, tien: tien });
                        };
                        var than = $('.bc-than', kq);
                        than.appendChild(khungBieuDo({ cao: 420, tabs: [
                           { ten: 'Thị phần %', cau: function () { return U.cauDuong(labels, top6.map(function (x) { return { label: x.h, data: chuoi.map(function (g) { return g.tong.u ? +(g.hang[x.i].u / g.tong.u * 100).toFixed(1) : 0; }), borderColor: mauHang(x.h), backgroundColor: mauHang(x.h) }; }), { phanTram: true, fmt: function (v) { return v + '%'; } }); } },
                           { ten: 'Máy', cau: function () { return cotHang(function (x) { return x.u; }); } },
                           { ten: 'Doanh thu', cau: function () { return cotHang(function (x) { return x.dt; }, true); } }
                                   ] }));

                        var mSel = '', chon = 0;
                        var CS = [
                           { ten: 'Doanh số', fmt: fInt, lay: function (a, f) { return a[f + 'U']; }, tong: function (a) { return a.tU; } },
                           { ten: 'Doanh thu', fmt: fTyNgan, lay: function (a, f) { return a[f + 'Dt']; }, tong: function (a) { return a.tDt; } },
                           { ten: 'PK 10-20M', fmt: fInt, lay: function (a, f) { return f === 'o' ? a.pkO : null; }, tong: function (a) { return a.pkT; } }
                                   ];
                        var HNHOM = [['o', 'OPPO'], ['s', 'Samsung'], ['x', 'Xiaomi'], ['a', 'Apple']];
                        var loc = el('div', 'bc-loc');
                        loc.appendChild(selThangCT(THANG_MWG, null, true, function (v) { mSel = v; veBang(); }));
                        $('.bc-loc-thang select', loc).options[0].textContent = 'Cả năm';
                        var hopNut = el('div'); hopNut.appendChild(nutChon(CS.map(function (c) { return c.ten; }), 0, function (i) { chon = i; veBang(); }));
                        var box = el('div', 'bc-cuon');
                        function veBang() {
                                     var g = mSel ? gomTheo(shopMWG(khoangThang(+mSel).tu, khoangThang(+mSel).denCo), function (x) { return x.sale; })
                                                               : gomTheo(shopMWG('2026-01-01', '2026-12-31'), function (x) { return x.sale; });
                                     var cs = CS[chon];
                                     var ss = Object.keys(g).sort(function (a, b) { return g[b].oU - g[a].oU; });
                                     var h = '<table class="bc-bang"><thead><tr><th>Sale</th>' + HNHOM.map(function (x) { return '<th>' + x[1] + '</th>'; }).join('') + '<th>Khác</th><th>Tổng chợ</th><th>Share OPPO</th></tr></thead><tbody>';
                                     var tg = {}; CONG.forEach(function (f) { tg[f] = 0; });
                                     ss.forEach(function (s) {
                                                    var a = g[s]; CONG.forEach(function (f) { tg[f] += a[f]; });
                                                    var tong = cs.tong(a), biet = HNHOM.reduce(function (z, x) { return z + (cs.lay(a, x[0]) || 0); }, 0);
                                                    h += '<tr><td>' + esc(s.split(' ').slice(-2).join(' ')) + '</td>' + HNHOM.map(function (x) { var v = cs.lay(a, x[0]); return '<td>' + (v == null ? '—' : cs.fmt(v)) + '</td>'; }).join('')
                                                      + '<td>' + (chon === 2 ? '—' : cs.fmt(Math.max(0, tong - biet))) + '</td><td>' + cs.fmt(tong) + '</td><td><b>' + pcCh(tong ? (cs.lay(a, 'o') || 0) / tong * 100 : 0) + '</b></td></tr>';
                                     });
                                     var tT = cs.tong(tg), bT = HNHOM.reduce(function (z, x) { return z + (cs.lay(tg, x[0]) || 0); }, 0);
                                     h += '<tr class="bc-tong"><td>Tổng</td>' + HNHOM.map(function (x) { var v = cs.lay(tg, x[0]); return '<td>' + (v == null ? '—' : cs.fmt(v)) + '</td>'; }).join('')
                                       + '<td>' + (chon === 2 ? '—' : cs.fmt(Math.max(0, tT - bT))) + '</td><td>' + cs.fmt(tT) + '</td><td><b>' + pcCh(tT ? (cs.lay(tg, 'o') || 0) / tT * 100 : 0) + '</b></td></tr>';
                                     box.innerHTML = h + '</tbody></table>';
                        }
                        than.appendChild(loc); than.appendChild(hopNut); than.appendChild(box); veBang();
                        grid.appendChild(kq);
             })();

             /* ================= 3. Tỉ trọng phân khúc giá — 3 biểu đồ 1 hàng + TOP 10 ================= */
             (function () {
                        var mSel = thangKy;
                        var kq = khoi({ stt: 3, ten: 'Tỉ trọng phân khúc giá', rong: true,
                                                 dangXem: 'Phân khúc xếp từ thấp lên cao · 3 biểu đồ và bảng TOP 10 bên dưới dùng chung bộ lọc Tháng' });
                        $('.bc-dau-phai', kq).appendChild(selThangCT(THANG_MWG, mSel, false, function (v) { mSel = +v; nap(); b1.ve(); b2.ve(); b3.ve(); veTop(); veChot(); }));
                        var than = $('.bc-than', kq);
                        var G = null;
                        function nap() { var kk = khoangThang(mSel); G = gomMWG(kk.tu, kk.denCo); }
                        nap();
                        var pkMau = function () { return U.PK[sang() ? 'sang' : 'toi']; };
                        var segCo = function () { return SEG.map(function (s, i) { return { s: s, i: i, u: G.seg[i].u }; }).filter(function (x) { return x.u > 0; }); };
                        var top5 = function () { return HANG.map(function (h, i) { return { h: h, i: i, u: G.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 5); };
                        var hang3 = el('div', 'bc-3bd'); than.appendChild(hang3);
                        function o3(ten, cau) { var w = el('div', 'bc-3bd-o'); w.appendChild(el('div', 'bc-bd-ten', esc(ten))); var b = bdRieng(300, cau); w.appendChild(b.el); hang3.appendChild(w); return b; }
                        var b1 = o3('Thị trường theo phân khúc', function () { var sc = segCo(), p = pkMau(); return cauVong(sc.map(function (x) { return x.s; }), sc.map(function (x) { return x.u; }), sc.map(function (x, j) { return p[Math.min(j, p.length - 1)]; })); });
                        var b2 = o3('Hãng → phân khúc (%)', function () { var sc = segCo(), t5 = top5(), p = pkMau(); var c = cauCotChong(t5.map(function (x) { return x.h; }), sc.map(function (x, j) { return { label: x.s, data: t5.map(function (hh) { var t = G.hang[hh.i].u; return t ? +(G.segHang[x.i][hh.i] / t * 100).toFixed(1) : 0; }), backgroundColor: p[Math.min(j, p.length - 1)] }; }), { fmt: function (v) { return v.toFixed(0) + '%'; } }); c.plugins = []; return c; });
                        var b3 = o3('Phân khúc → hãng (máy)', function () { var sc = segCo(), t5 = top5(); return cauCotChong(sc.map(function (x) { return x.s; }), t5.map(function (hh) { return { label: hh.h, data: sc.map(function (x) { return G.segHang[x.i][hh.i]; }), backgroundColor: mauHang(hh.h) }; })); });
                        var tenTop = el('div', 'bc-bd-ten'); tenTop.style.textAlign = 'left'; tenTop.textContent = 'TOP 10 SẢN PHẨM BÁN CHẠY';
                        var hopNut = el('div'), box = el('div', 'bc-cuon'), chonH = 0;
                        than.appendChild(tenTop); than.appendChild(hopNut); than.appendChild(box);
                        function veTop() {
                                     var t6 = HANG.map(function (h, i) { return { h: h, i: i, u: G.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 6);
                                     if (chonH >= t6.length) chonH = 0;
                                     hopNut.innerHTML = ''; hopNut.appendChild(nutChon(t6.map(function (x) { return x.h; }), chonH, function (i) { chonH = i; veTop(); }));
                                     var hh = t6[chonH]; if (!hh) { box.innerHTML = '<p class="bc-trong">Chưa có số.</p>'; return; }
                                     var ms = Object.keys(G.model).filter(function (m) { return G.model[m].h === hh.i; }).map(function (m) { return { m: MODEL[m], u: G.model[m].u, dt: G.model[m].dt }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 10);
                                     box.innerHTML = '<table class="bc-bang"><thead><tr><th>#</th><th>Model</th><th>Máy</th><th>DT</th><th>ĐG TB</th></tr></thead><tbody>'
                                       + ms.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td title="' + esc(x.m) + '">' + esc(x.m.replace(/^Điện thoại\s*/i, '').slice(0, 42)) + '</td><td><b>' + fInt(x.u) + '</b></td><td>' + fTyNgan(x.dt) + '</td><td>' + fTr(x.u ? x.dt / x.u : 0) + '</td></tr>'; }).join('') + '</tbody></table>';
                        }
                        function veChot() { var t = G.seg.reduce(function (z, x) { return z + x.u; }, 0); var pkU = PKI.reduce(function (z, i) { return z + G.seg[i].u; }, 0); chot(kq, 'Tháng ' + mSel + ': phân khúc <b>10-20M</b> chiếm <b>' + pcCh(t ? pkU / t * 100 : 0) + '</b> máy toàn chợ; OPPO nắm <b>' + pcCh(pkU ? G.hangPK[iOppo] / pkU * 100 : 0) + '</b> khoảng này.'); }
                        veTop(); veChot();
                        grid.appendChild(kq);
             })();

             /* ================= 4. Hiệu suất theo Size shop ================= */
             (function () {
                        var mSel = '';
                        var kq = khoi({ stt: 4, ten: 'Hiệu suất theo Size shop', rong: true,
                                                 dangXem: 'PK 10-20M · Share D.S · Share D.T của OPPO / Samsung / Xiaomi · bấm dòng Size để mở chi tiết shop trong nhóm' });
                        $('.bc-dau-phai', kq).appendChild(selThangCT(THANG_MWG, null, true, function (v) { mSel = v; mo = {}; ve(); }));
                        var box = el('div', 'bc-cuon'); $('.bc-than', kq).appendChild(box);
                        var mo = {};
                        function ve() {
                                     var shops = mSel ? shopMWG(khoangThang(+mSel).tu, khoangThang(+mSel).denCo) : shopNay;
                                     var g = gomTheo(shops, function (x) { return x.size; });
                                     var ds = SIZE.filter(function (s) { return g[s]; }).concat(Object.keys(g).filter(function (s) { return SIZE.indexOf(s) < 0; }));
                                     var h = '<table class="bc-bang"><thead><tr><th>Size</th><th>Shop</th><th>Có bán</th><th>Máy OPPO</th><th>Máy chợ</th>' + dauCotChinh + '<th>OPPO/shop</th></tr></thead><tbody>';
                                     var tg = { shops: 0, shop0: 0 }; CONG.forEach(function (f) { tg[f] = 0; });
                                     ds.forEach(function (sz) {
                                                    var a = g[sz]; if (!a) return; CONG.forEach(function (f) { tg[f] += a[f]; }); tg.shops += a.shops; tg.shop0 += a.shop0;
                                                    h += '<tr class="bc-size-dong" data-sz="' + esc(sz) + '" style="cursor:pointer"><td><b>' + (mo[sz] ? '▾ ' : '▸ ') + esc(sz) + '</b></td><td>' + a.shops + '</td><td>' + (a.shops - a.shop0) + '</td><td><b>' + fInt(a.oU) + '</b></td><td>' + fInt(a.tU) + '</td>' + oCotChinh(a) + '<td>' + (a.shops ? (a.oU / a.shops).toFixed(1) : '-') + '</td></tr>';
                                                    if (mo[sz]) {
                                                                     var rs = a.ten.map(function (s) { return { s: s, x: shops[s] }; }).sort(function (p, q) { return q.x.oU - p.x.oU; });
                                                                     h += '<tr><td colspan="9"><div class="bc-cuon"><table class="bc-bang"><thead><tr><th>Shop</th><th>Sale</th><th>Máy OPPO</th><th>Máy chợ</th>' + dauCotChinh + '</tr></thead><tbody>'
                                                                       + rs.map(function (r) { return '<tr' + (!r.x.oU ? ' class="bc-mo"' : '') + '><td title="' + esc(r.s) + '">' + esc(tenShopNgan(r.s)) + '</td><td>' + esc(String(r.x.sale).split(' ').slice(-2).join(' ')) + '</td><td><b>' + fInt(r.x.oU) + '</b></td><td>' + fInt(r.x.tU) + '</td>' + oCotChinh(r.x) + '</tr>'; }).join('')
                                                                       + '</tbody></table></div></td></tr>';
                                                    }
                                     });
                                     h += '<tr class="bc-tong"><td>Tổng</td><td>' + tg.shops + '</td><td>' + (tg.shops - tg.shop0) + '</td><td>' + fInt(tg.oU) + '</td><td>' + fInt(tg.tU) + '</td>' + oCotChinh(tg) + '<td>' + (tg.shops ? (tg.oU / tg.shops).toFixed(1) : '-') + '</td></tr></tbody></table>';
                                     box.innerHTML = h;
                        }
                        box.addEventListener('click', function (e) { var tr = e.target.closest('.bc-size-dong'); if (!tr) return; var sz = tr.getAttribute('data-sz'); mo[sz] = !mo[sz]; ve(); });
                        ve();
                        grid.appendChild(kq);
             })();

             /* ================= 5. Hiệu suất Sale / ASM ================= */
             (function () {
                        var mSel = '';
                        var kq = khoi({ stt: 5, ten: 'Hiệu suất Sale / ASM — OPPO so với thị trường', rong: true,
                                                 dangXem: 'Thêm PK 10-20M · Share D.S · Share D.T của OPPO / Samsung / Xiaomi · cờ đỏ: giảm >20% hoặc mất ≥3 điểm thị phần' });
                        $('.bc-dau-phai', kq).appendChild(selThangCT(THANG_MWG, null, true, function (v) { mSel = v; ve(); }));
                        var box = el('div', 'bc-cuon'); $('.bc-than', kq).appendChild(box);
                        function ve() {
                                     var A, Bt, nhanT;
                                     if (!mSel) { A = saleNay; Bt = saleTruoc; nhanT = ctx.tenKyTruoc || 'kỳ trước'; }
                                     else {
                                                    var m = +mSel, kk = khoangThang(m); A = gomTheo(shopMWG(kk.tu, kk.denCo), function (x) { return x.sale; });
                                                    var kp = m > 1 ? khoangThang(m - 1) : null;
                                                    Bt = kp ? gomTheo(shopMWG(kp.tu, kp.denCo), function (x) { return x.sale; }) : null;
                                                    nhanT = kp ? 'tháng ' + (m - 1) : 'kỳ trước';
                                     }
                                     var rows = Object.keys(A).map(function (s) {
                                                    var a = A[s], b = Bt ? Bt[s] : null;
                                                    var sh = shDs(a, a.oU), shT = b ? shDs(b, b.oU) : null, p = b ? pct(a.oU, b.oU) : null;
                                                    var co = []; if (p != null && p < -20) co.push('giảm ' + Math.abs(p).toFixed(0) + '%');
                                                    if (shT != null && sh - shT <= -3) co.push('mất ' + (shT - sh).toFixed(1) + ' điểm');
                                                    if (a.shop0 >= 3) co.push(a.shop0 + ' shop 0 máy');
                                                    return { s: s, a: a, sh: sh, shT: shT, p: p, co: co };
                                     }).sort(function (x, y) { return (y.co.length - x.co.length) || ((x.p == null ? 0 : x.p) - (y.p == null ? 0 : y.p)); });
                                     var h = '<table class="bc-bang"><thead><tr><th>Sale / ASM</th><th>Máy OPPO</th><th>so ' + esc(nhanT) + '</th><th>Máy chợ</th>' + dauCotChinh + '<th>± điểm</th><th>Shop</th><th>Shop 0 máy</th><th>DT OPPO</th><th>Cảnh báo</th></tr></thead><tbody>';
                                     rows.forEach(function (r) {
                                                    h += '<tr' + (r.co.length ? ' class="bc-canh"' : '') + '><td>' + esc(r.s) + '</td><td><b>' + fInt(r.a.oU) + '</b></td><td>' + chip(r.p) + '</td><td>' + fInt(r.a.tU) + '</td>' + oCotChinh(r.a)
                                                      + '<td>' + (r.shT != null ? chipDiem(r.sh - r.shT) : '—') + '</td><td>' + r.a.shops + '</td><td>' + (r.a.shop0 ? '<span class="bc-giam-chu"><b>' + r.a.shop0 + '</b></span>' : '0') + '</td><td>' + fTyNgan(r.a.oDt) + '</td><td>' + (r.co.length ? '<span class="bc-co">' + r.co.map(esc).join(' · ') + '</span>' : '<span class="bc-len-chu">ổn</span>') + '</td></tr>';
                                     });
                                     box.innerHTML = h + '</tbody></table>';
                                     var xau = rows.filter(function (r) { return r.co.length; });
                                     chot(kq, xau.length ? '<b>' + xau.length + '</b> Sale có vấn đề: ' + xau.slice(0, 3).map(function (r) { return '<b>' + esc(r.s.split(' ').slice(-2).join(' ')) + '</b> (' + r.co.join(', ') + ')'; }).join(', ') + '.' : 'Không Sale nào chạm ngưỡng cảnh báo.');
                        }
                        ve();
                        grid.appendChild(kq);
             })();

             /* ================= 6. Số bán ngày ================= */
             (function () {
                        var mSel = thangKy;
                        var kq = khoi({ stt: 6, ten: 'Số bán ngày', rong: true,
                                                 dangXem: 'Tháng mới nhất của DATA MWG · biểu đồ đường đủ hãng theo ngày · bảng mini bên dưới: OPPO theo từng Sale (15 ngày gần nhất)' });
                        $('.bc-dau-phai', kq).appendChild(selThangCT(THANG_MWG, mSel, false, function (v) { mSel = +v; nap(); bd.ve(); veBang(); }));
                        var than = $('.bc-than', kq);
                        var chon = 0, G = null, ngay = [], SH = null;
                        var CS = [
                           { ten: 'Doanh số', fmt: fInt, lay: function (N, i) { return N.h[i].u; }, f: 'oU' },
                           { ten: 'Doanh thu', fmt: fTyNgan, tien: true, lay: function (N, i) { return N.h[i].dt; }, f: 'oDt' },
                           { ten: 'PK 10-20M', fmt: fInt, lay: function (N, i) { return N.pk[i]; }, f: 'pkO' },
                           { ten: 'Reno', fmt: fInt, reno: true, f: 'oU' }
                                   ];
                        function nap() {
                                     var kk = khoangThang(mSel); G = gomMWG(kk.tu, kk.denCo); ngay = [];
                                     for (var dd = kk.tu; dd <= kk.denCo; dd = congNgay(dd, 1)) ngay.push(dd);
                                     SH = shopMWG(kk.tu, kk.denCo);
                        }
                        nap();
                        than.appendChild(nutChon(CS.map(function (c) { return c.ten; }), 0, function (i) { chon = i; bd.ve(); veBang(); }));
                        var bd = bdRieng(360, function () {
                                     var cs = CS[chon];
                                     var nhan = ngay.map(function (dd) { return ngayVN(dd).slice(0, 2); });
                                     var lay = function (dd) { return G.ngay[dd.slice(5)] || null; };
                                     var dsets;
                                     if (cs.reno) dsets = [
                                        { label: 'Reno', data: ngay.map(function (dd) { var N = lay(dd); return N ? N.reno : 0; }), borderColor: mau('RENO'), backgroundColor: mau('RENO') },
                                        { label: 'Find', data: ngay.map(function (dd) { var N = lay(dd); return N ? N.find : 0; }), borderColor: mau('FIND'), backgroundColor: mau('FIND') }];
                                     else {
                                                    var t6 = HANG.map(function (h, i) { return { h: h, i: i, u: G.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 6);
                                                    dsets = t6.map(function (x) { return { label: x.h, data: ngay.map(function (dd) { var N = lay(dd); return N ? cs.lay(N, x.i) : 0; }), borderColor: mauHang(x.h), backgroundColor: mauHang(x.h) }; });
                                     }
                                     return U.cauDuong(nhan, dsets, { fmt: cs.fmt, tien: !!cs.tien });
                        });
                        than.appendChild(bd.el);
                        var hopBang = el('div', 'bc-mini-cuon'); than.appendChild(hopBang);
                        function veBang() {
                                     var f = CS[chon].f;
                                     var cot = ngay.slice(-15);
                                     var val = {};
                                     Object.keys(SH).forEach(function (shop) {
                                                    var sale = SH[shop].sale; if (!val[sale]) val[sale] = cot.map(function () { return 0; });
                                                    var dm = (B.shop_day_data || {})[shop] || {};
                                                    cot.forEach(function (dd, i) {
                                                                     var v = dm[(+dd.slice(5, 7)) + '-' + (+dd.slice(8, 10))] || dm[dd.slice(5, 7) + '-' + dd.slice(8, 10)];
                                                                     if (!v) return;
                                                                     val[sale][i] += f === 'oDt' ? (v.oppo_rev || 0) : f === 'pkO' ? (v.pk1020_oppo_units || 0) : (v.oppo_units || 0);
                                                    });
                                     });
                                     var fmt = f === 'oDt' ? fTyNgan : fInt;
                                     var ss = Object.keys(val).sort();
                                     var h = '<table class="bc-mini"><thead><tr><th>' + esc(CS[chon].reno ? 'Máy OPPO' : CS[chon].ten) + '</th>' + cot.map(function (dd, i) { return '<th' + (i === cot.length - 1 ? ' class="bc-cot-chon"' : '') + '>' + ngayVN(dd).slice(0, 2) + '</th>'; }).join('') + '</tr></thead><tbody>';
                                     var tong = cot.map(function () { return 0; });
                                     ss.forEach(function (s) {
                                                    var vs = val[s];
                                                    h += '<tr><td><i class="bc-cham" style="background:' + mau('MWG') + '"></i>' + esc(s.split(' ').slice(-2).join(' ')) + '</td>' + vs.map(function (v, i) {
                                                                     tong[i] += v; var cl = ''; if (i > 0 && vs[i - 1]) { var p = (v - vs[i - 1]) / vs[i - 1]; cl = p > .03 ? ' bc-len' : p < -.03 ? ' bc-giam' : ''; }
                                                                     return '<td class="' + cl + (i === cot.length - 1 ? ' bc-cot-chon' : '') + '">' + (v ? fmt(v) : '-') + '</td>';
                                                    }).join('') + '</tr>';
                                     });
                                     h += '<tr class="bc-tong"><td>Tổng</td>' + tong.map(function (v, i) { return '<td' + (i === cot.length - 1 ? ' class="bc-cot-chon"' : '') + '>' + (v ? fmt(v) : '-') + '</td>'; }).join('') + '</tr></tbody></table>';
                                     hopBang.innerHTML = h; hopBang.scrollLeft = hopBang.scrollWidth;
                        }
                        veBang();
                        grid.appendChild(kq);
             })();

             /* ================= 7. Thi đua tháng (mượn) ================= */
             if (cd === 'thang') muonKhoi(grid, 7, 'Chương trình thi đua tháng', 'Bonus Size S/A · % HT theo Sale/ASM — như DB TG cũ', timMuon(root, /thi đua/i));
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
