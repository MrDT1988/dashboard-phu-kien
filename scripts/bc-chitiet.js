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
    /* Anh Thái 05-09: OPPO luôn viết HOA — tên hãng lấy từ data nên chuẩn hoá ngay đầu vào */
         var tenHoa = function (s) { return String(s == null ? '' : s).replace(/oppo/gi, 'OPPO'); };
         var mauHang = function (h) {
                  var b = { sang: { oppo: '#006B33', samsung: '#1428A0', xiaomi: '#E85D00', apple: '#1A1A1A', vivo: '#6C7CFF', realme: '#D9A400', 'khác': '#8A8A8A' }, toi: { oppo: '#2AD998', samsung: '#6E8CF0', xiaomi: '#FF9147', apple: '#EDEFF2', vivo: '#A9B6FF', realme: '#F0C64A', 'khác': '#8B98A9' } }[sang() ? 'sang' : 'toi'];
                  return b[String(h == null ? '' : h).toLowerCase()] || b['khác'];
         };
    /* Anh Thái 06/09: cột PG của shop KA — đọc từ bảng cũ #ka-shop-revenue-table trong tg.html
           (✓ = shop ĐÃ có PG, tức KHÔNG nằm trong chương trình "shop chưa có PG"). */
         var pgKA = function () {
                  if (window.__bcPG) return window.__bcPG;
                  var m = {}, chuan = {};
                  var gonTen = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ''); };
                  var tb = document.getElementById('ka-shop-revenue-table');
                  if (tb) [].slice.call(tb.querySelectorAll('tbody tr')).forEach(function (tr) {
                             if (tr.children.length < 3) return;
                             var ten = (tr.children[0].textContent || '').trim();
                             if (!ten) return;
                             var co = /✓/.test(tr.children[1].textContent || '');
                             m[ten] = co; chuan[gonTen(ten)] = co;
                  });
                  return (window.__bcPG = function (s) { var v = m[s]; if (v === undefined) v = chuan[gonTen(s)]; return v; });
         };
         var mauSub = function (s) { var m = (ext().kaMau || {})[s]; return m || mau('KA'); };
         var mauOC = function (g) { return g === 'O.C' ? (sang() ? '#006B33' : '#2AD998') : (sang() ? '#8FBFA6' : '#1E6B4E'); };
     
         /* ===================== dữ liệu dùng chung ===================== */
    /* Anh Thái 06/09: bọc số vào span đỏ khi chỉ số xấu — dùng chung cả 3 tab */
         var do_ = function (kem, s) { return kem ? '<span class="bc-giam-chu">' + s + '</span>' : s; };
     /* Anh Thái 06/09: khối MƯỢN của DB TG cũ chỉ có SỐ THEO THÁNG (thị phần, chương trình,
       thi đua, thưởng). Trước đây chế độ TUẦN giấu luôn các khối này -> nhìn như bị cắt quyền.
       Nay hiện ở CẢ HAI chế độ; ở chế độ tuần ghi rõ số là của tháng. */
    var nhanThang = function (cd, t) { return (cd === 'tuan' ? '⚠ SỐ THEO THÁNG — không đổi theo tuần · ' : '') + (t || 'Nội dung như DB TG cũ'); };
    /* Anh Thái 06/09: khoá gộp shop O.C trùng tên (Nokia Phong / Nokia Phong 2 / Nokia Phong cty = 1 shop;
        Mỹ Hạnh / Mỹ Hạnh Cty = 1; Hồng Ngọc / Hồng Ngọc TG = 1). Riêng Long Hưng và Long Hưng 2 là 2 shop độc lập. */
     var khoaOC = function (ten) {
          var g = String(ten || '').split(/[-–(,]/)[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
          g = g.replace(/^(cua hang|ch)\s+/, '').replace(/^dtdd\s+/, '').replace(/^va laptop\s+/, '');
          g = g.replace(/\b(cong ty|cty|pp|mobile|tg|bt|tien giang|ben tre|vinh long|long an)\b/g, ' ').replace(/\s+/g, ' ').trim();
          if (/^long hung/.test(g)) return g.replace(/\s+/g, '');
          return g.replace(/\s*\d+$/, '').replace(/\s+/g, '');
     };
     /* Anh Thái 06/09: bộ lọc Tháng dùng chung cho cả 3 tab MWG / KA / IND */
         var selThangCT = function (ds, chon, coKy, onChon) {
                  var l = el('label', 'bc-loc-thang', 'Tháng ');
                  var s = el('select');
                  if (coKy) { var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Kỳ đang chọn'; s.appendChild(o0); }
                  ds.forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = 'Tháng ' + m; s.appendChild(o); });
                  s.value = chon == null ? '' : chon;
                  s.addEventListener('change', function () { onChon(s.value); });
                  l.appendChild(s); return l;
         };function du() { return BC.du(); }
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
      var DL = B.daily, R = DL.rows, HANG = (DL.brands || []).map(tenHoa), SEG = DL.segments, SALE = DL.sales, SIZE = DL.sizes, MODEL = DL.models;
       var iOppo = HANG.findIndex(function (h) { return /oppo/i.test(h); });
      var trongKhoang = function (tu, den) { return function (r) { var ng = '2026-' + pad2(r[0]) + '-' + pad2(r[1]); return ng >= tu && ng <= den; }; };
          /* ---- chỉ số phụ dùng chung ---- */
             var iSS = HANG.findIndex(function (h) { return /samsung/i.test(h); });
             var iXM = HANG.findIndex(function (h) { return /xiaomi/i.test(h); });
      var iAP = HANG.findIndex(function (h) { return /apple|iphone/i.test(h); });
             var PKI = SEG.map(function (s, i) { return /^(10-15M|15-20M)$/.test(s) ? i : -1; }).filter(function (i) { return i >= 0; });
             var laPK = function (s) { return PKI.indexOf(s) >= 0; };
             /* Anh Thái 05-09 tối: phân khúc phải xếp thấp → cao (data trả về theo bảng chữ cái) */
             var THU_TU_SEG = ['<3M', '3-5M', '5-7M', '7-10M', '10-15M', '15-20M', '20-30M', '>20M', '>30M'];
             var canDuoi = function (s) { var m = String(s).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : 0; };
             var hangSeg = function (s) { var i = THU_TU_SEG.indexOf(String(s)); return i >= 0 ? i : 100 + canDuoi(s); };
             var xepSeg = function (ds) { return ds.slice().sort(function (a, b) { return hangSeg(a.s) - hangSeg(b.s); }); };
             var duoi10M = function (s) { return /^</.test(String(s)) || canDuoi(s) < 10; };
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
      /* Anh Thái 05-09 tối: chỉ số OPPO thấp hơn TRUNG BÌNH của nhóm thì tô đỏ ngay ô đó.
               nhom = số gộp của cả nhóm (Size / toàn chợ); không truyền thì không so. */
          var oCotChinh = function (a, nhom) {
                     var tbPk = nhom && nhom.shops ? nhom.pkO / nhom.shops : null;
                     var shO = shDs(a, a.oU), shDtO = shDt(a, a.oDt);
                     var kPk = tbPk != null && a.pkO < tbPk;
                     var kDs = nhom ? shO < shDs(nhom, nhom.oU) : false;
                     var kDt = nhom ? shDtO < shDt(nhom, nhom.oDt) : false;
                     return '<td>' + do_(kPk, '<b>' + fInt(a.pkO) + '</b>') + (a.pkT ? ' <small>' + pcCh(a.pkO / a.pkT * 100) + '</small>' : '') + '</td>' +
                                  '<td>' + do_(kDs, pcCh(shO)) + ' <small>/ ' + pcCh(shDs(a, a.sU)) + ' / ' + pcCh(shDs(a, a.xU)) + '</small></td>' +
                                  '<td>' + do_(kDt, pcCh(shDtO)) + ' <small>/ ' + pcCh(shDt(a, a.sDt)) + ' / ' + pcCh(shDt(a, a.xDt)) + '</small></td>';
             
          };
             var dauCotChinh = '<th>PK 10-20M</th><th>Share D.S <small>O/S/X</small></th><th>Share D.T <small>O/S/X</small></th>';

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

      /* ================= 1. Kết quả MWG — 4 thẻ, dưới thẻ là chi tiết từng Sale =================
               Anh Thái 05-09: giữ 4 thẻ như cũ (Doanh số / Doanh thu / PK 10-20M / Đơn giá),
                        phần dưới mỗi thẻ là số của từng Sale + chip so kỳ trước. */
             (function () {
                  var kq = khoi({ stt: 1, ten: 'Kết quả MWG ' + k.nhan.toLowerCase(), rong: true, cls: 'bc-kpi-khoi bc-mwg-kq',
                                 dangXem: '4 chỉ số OPPO tại chợ MWG · dưới mỗi thẻ là chi tiết từng Sale, chip so ' + esc(ctx.tenKyTruoc || 'kỳ trước') });
                        var tatCa = function (sh) { return gomTheo(sh, function () { return 'ALL'; })['ALL'] || null; };
                        var TG = tatCa(shopNay), TT = shopTruoc ? tatCa(shopTruoc) : null;
                        var dgia = function (a) { return a && a.oU ? a.oDt / a.oU : 0; };
                        var tenSale = function (s) { return String(s).split(' ').slice(-2).join(' '); };
                        var CHI = [
                           { nhan: 'Doanh số', gt: function (a) { return fInt(a.oU) + ' <small>máy</small>'; }, lay: function (a) { return a.oU; }, fmt: fInt,
                                        sub: function (a) { return 'Thị phần máy <b>' + pcCh(shDs(a, a.oU)) + '</b>'; } },
                           { nhan: 'Doanh thu', gt: function (a) { return fTyNgan(a.oDt); }, lay: function (a) { return a.oDt; }, fmt: fTyNgan,
                                        sub: function (a) { return 'Thị phần DT <b>' + pcCh(shDt(a, a.oDt)) + '</b>'; } },
                           { nhan: 'PK 10-20M', gt: function (a) { return fInt(a.pkO) + ' <small>máy</small>'; }, lay: function (a) { return a.pkO; }, fmt: fInt,
                                        sub: function (a) { return 'Chiếm <b>' + pcCh(a.pkT ? a.pkO / a.pkT * 100 : 0) + '</b> PK chợ'; } },
                           { nhan: 'Đơn giá', gt: function (a) { return fTr(dgia(a)); }, lay: dgia, fmt: fTr,
                                        sub: function (a) { return 'Chợ <b>' + fTr(a.tU ? a.tDt / a.tU : 0) + '</b>'; } }
                                   ];
                        var the = el('div', 'bc-kpi-row');
                        the.innerHTML = TG ? CHI.map(function (c) {
                                     var rows = SALES_MWG.map(function (s) {
                      var a = saleNay[s], b = saleTruoc ? saleTruoc[s] : null, vt = b ? c.lay(b) : null;
                                                    /* Anh Thái 05-09 tối: tên Sale để nguyên 2 chữ cuối, chữ nhỏ, gọn 1 hàng */
                                                    return '<div><i class="bc-cham" style="background:' + mau('MWG') + '"></i><b title="' + esc(s) + '">' + esc(tenSale(s)) + '</b><span>' + c.fmt(c.lay(a)) + '</span>' + chip(vt != null ? pct(c.lay(a), vt) : null) + '</div>';
                                     }).join('');
                                     return theKpi(esc(c.nhan), c.gt(TG), chip(TT ? pct(c.lay(TG), c.lay(TT)) : null), c.sub(TG), rows);
                        }).join('') : '<p class="bc-trong">Chưa có dữ liệu shop MWG cho kỳ này.</p>';
                        $('.bc-than', kq).appendChild(the);
                        if (truoc) { var dS = share(nay) - share(truoc); chot(kq, 'Toàn MWG: thị phần máy OPPO ' + (dS >= 0 ? 'tăng' : 'giảm') + ' <b>' + Math.abs(dS).toFixed(1) + ' điểm</b> (' + pcCh(share(truoc)) + ' → ' + pcCh(share(nay)) + ') · máy OPPO ' + (nay.oppo.u >= truoc.oppo.u ? '+' : '') + fInt(nay.oppo.u - truoc.oppo.u) + ', toàn ngành ' + (nay.tong.u >= truoc.tong.u ? '+' : '') + fInt(nay.tong.u - truoc.tong.u) + ' máy.'); }
                        grid.appendChild(kq);
             })();
       
             /* ================= 2. Doanh số theo hãng — 12 kỳ + bảng mini theo Sale ================= */
             (function () {
                        var kq = khoi({ stt: 2, ten: 'Doanh số theo hãng — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), rong: true,
                                                 dangXem: 'Biểu đồ: top 6 hãng, còn lại gộp "Khác" · Bảng mini: chi tiết từng Sale, đủ hãng cả ở tab PK 10-20M, có Share OPPO / SS / XM · lọc riêng theo tháng (mặc định cả năm)' });
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

                        /* Anh Thái 05-09 tối: cả 3 tab đều có Share OPPO / SS / XM; tab PK 10-20M có đủ hãng.
                                   PK theo hãng chỉ có ở daily.rows (shop_day_data chỉ có PK OPPO + PK tổng) — đã đối chiếu:
                                              danh sách Sale của DATA MWG trùng đúng 6 người với sheet SHOP THEO SALE nên gộp được. */
                     var mSel = '', chon = 0;
                     var CS = [{ ten: 'Doanh số', fmt: fInt }, { ten: 'Doanh thu', fmt: fTyNgan }, { ten: 'PK 10-20M', fmt: fInt }];
                     var HNHOM = ['OPPO', 'Samsung', 'Xiaomi', 'Apple'];
                     var loc = el('div', 'bc-loc');
                     loc.appendChild(selThangCT(THANG_MWG, null, true, function (v) { mSel = v; veBang(); }));
                     $('.bc-loc-thang select', loc).options[0].textContent = 'Cả năm';
                     var hopNut = el('div'); hopNut.appendChild(nutChon(CS.map(function (c) { return c.ten; }), 0, function (i) { chon = i; veBang(); }));
                     var box = el('div', 'bc-cuon');
                     function pkTheoSale(tu, den) {   /* PK 10-20M theo Sale × hãng, lấy từ daily.rows */
                               var f = trongKhoang(tu, den), r = {};
                               for (var i = 0; i < R.length; i++) {
                                              var x = R[i]; if (!f(x) || !laPK(x[3])) continue;
                                              var s = SALE[x[2]] || '(chưa gán)';
                                              var a = r[s] || (r[s] = { h: HANG.map(function () { return 0; }), tong: 0 });
                                              a.h[x[4]] += x[6] || 0; a.tong += x[6] || 0;
                               }
                                  return r;
                     }
                        function veBang() {
                                     var kk = mSel ? khoangThang(+mSel) : { tu: '2026-01-01', denCo: '2026-12-31' };
                                     var g = gomTheo(shopMWG(kk.tu, kk.denCo), function (x) { return x.sale; });
                                     var dong = [];
                                     if (chon === 2) {
                                                    var pk = pkTheoSale(kk.tu, kk.denCo);
                                                    Object.keys(pk).forEach(function (s) {
                                                                     var a = pk[s];
                                                                     dong.push({ ten: s, v: [a.h[iOppo] || 0, iSS >= 0 ? a.h[iSS] : 0, iXM >= 0 ? a.h[iXM] : 0, iAP >= 0 ? a.h[iAP] : 0], tong: a.tong });
                                                    });
                                     } else {
                                                    var hau = chon === 1 ? 'Dt' : 'U';
                                                    Object.keys(g).forEach(function (s) {
                                                                     var a = g[s];
                                                                     dong.push({ ten: s, v: [a['o' + hau], a['s' + hau], a['x' + hau], a['a' + hau]], tong: a['t' + hau] });
                                                    });
                                     }
                                     dong.sort(function (a, b) { return b.v[0] - a.v[0]; });
                                     var cs = CS[chon];
          var tong = { ten: 'Tổng', v: [0, 0, 0, 0], tong: 0 };
                                     dong.forEach(function (r) { r.v.forEach(function (v, i) { tong.v[i] += v; }); tong.tong += r.tong; });
                                     /* Anh Thái 06/09: bỏ tô nhiệt, chỉ tô ĐỎ Share OPPO của Sale thấp hơn Share OPPO toàn team */
                                     var shTeam = tong.tong ? tong.v[0] / tong.tong * 100 : 0;
                                     var oDong = function (r, cls) {
                                                    var biet = r.v.reduce(function (z, v) { return z + v; }, 0);
                                                    var sh = function (i) { return r.tong ? r.v[i] / r.tong * 100 : 0; };
                                                    var s0 = sh(0), kem = !cls && r.tong && s0 < shTeam;
                                                    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td title="' + esc(r.ten) + '">' + esc(String(r.ten).split(' ').slice(-2).join(' ')) + '</td>'
                                                                     + r.v.map(function (v) { return '<td>' + cs.fmt(v) + '</td>'; }).join('')
                                                                     + '<td>' + cs.fmt(Math.max(0, r.tong - biet)) + '</td><td>' + cs.fmt(r.tong) + '</td>'
                                                                     + '<td>' + do_(kem, '<b>' + pcCh(s0) + '</b>') + '</td><td>' + pcCh(sh(1)) + '</td><td>' + pcCh(sh(2)) + '</td></tr>';
                                     };
                           box.innerHTML = '<table class="bc-bang"><thead><tr><th>Sale</th>' + HNHOM.map(function (x) { return '<th>' + x + '</th>'; }).join('')
                                       + '<th>Khác</th><th>Tổng chợ</th><th>Share OPPO</th><th>Share SS</th><th>Share XM</th></tr></thead><tbody>'
                                       + dong.map(function (r) { return oDong(r); }).join('') + oDong(tong, 'bc-tong') + '</tbody></table>';
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
        /* Anh Thái 05-09 tối: phân khúc xếp THẤP → CAO; dưới 10M màu xám đậm dần, từ 10M màu xanh lá đậm dần */
                        var XAM = { sang: ['#DDE2E8', '#C3CBD4', '#A6B1BD', '#8794A2'], toi: ['#414C58', '#4F5C6A', '#5F6E7D', '#71818F'] };
                        var XANH = { sang: ['#CFEBD8', '#A6DCB7', '#77C895', '#48AE72', '#218F55'], toi: ['#1B6349', '#27825E', '#33A175', '#4BC090', '#77DCAE'] };
                        var mauSeg = function (ten, thuTuXam, thuTuXanh, soXam, soXanh) {
                                     var s = sang() ? 'sang' : 'toi';
                                     if (duoi10M(ten)) { var a = XAM[s]; return a[Math.min(Math.round(thuTuXam * (a.length - 1) / Math.max(1, soXam - 1)), a.length - 1)]; }
                                     var b = XANH[s]; return b[Math.min(Math.round(thuTuXanh * (b.length - 1) / Math.max(1, soXanh - 1)), b.length - 1)];
                        };
                        var mauDs = function (sc) {
                                     var nX = sc.filter(function (x) { return duoi10M(x.s); }).length, nG = sc.length - nX, iX = 0, iG = 0;
                                     return sc.map(function (x) { return duoi10M(x.s) ? mauSeg(x.s, iX++, 0, nX, nG) : mauSeg(x.s, 0, iG++, nX, nG); });
                        };
                        var segCo = function () { return xepSeg(SEG.map(function (s, i) { return { s: s, i: i, u: G.seg[i].u }; }).filter(function (x) { return x.u > 0; })); };
                        var top5 = function () { return HANG.map(function (h, i) { return { h: h, i: i, u: G.hang[i].u }; }).sort(function (a, b) { return b.u - a.u; }).slice(0, 5); };
                        var hang3 = el('div', 'bc-3bd'); than.appendChild(hang3);
                        function o3(ten, cau) { var w = el('div', 'bc-3bd-o'); w.appendChild(el('div', 'bc-bd-ten', esc(ten))); var b = bdRieng(300, cau); w.appendChild(b.el); hang3.appendChild(w); return b; }
                        var b1 = o3('Thị trường theo phân khúc', function () { var sc = segCo(), p = mauDs(sc); return cauVong(sc.map(function (x) { return x.s; }), sc.map(function (x) { return x.u; }), p); });
                        var b2 = o3('Hãng → phân khúc (%)', function () { var sc = segCo(), t5 = top5(), p = mauDs(sc); var c = cauCotChong(t5.map(function (x) { return x.h; }), sc.map(function (x, j) { return { label: x.s, data: t5.map(function (hh) { var t = G.hang[hh.i].u; return t ? +(G.segHang[x.i][hh.i] / t * 100).toFixed(1) : 0; }), backgroundColor: p[j] }; }), { fmt: function (v) { return v.toFixed(0) + '%'; } }); c.plugins = []; return c; });var b3 = o3('Phân khúc → hãng (máy)', function () { var sc = segCo(), t5 = top5(); return cauCotChong(sc.map(function (x) { return x.s; }), t5.map(function (hh) { return { label: hh.h, data: sc.map(function (x) { return G.segHang[x.i][hh.i]; }), backgroundColor: mauHang(hh.h) }; })); });
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
          dangXem: 'PK 10-20M · Share D.S · Share D.T của OPPO / Samsung / Xiaomi · bấm dòng Size để mở chi tiết shop — chỉ số OPPO dưới trung bình nhóm được tô đỏ' });
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
                             var tbO = a.shops ? a.oU / a.shops : 0;
                                                                     h += '<tr><td colspan="9"><div class="bc-cuon"><table class="bc-bang"><thead><tr><th>Shop</th><th>Sale</th><th>Máy OPPO</th><th>Máy chợ</th>' + dauCotChinh + '</tr></thead><tbody>'
                                                                                        + '<tr class="bc-tb-nhom"><td colspan="8">Trung bình nhóm Size ' + esc(sz) + ': <b>' + tbO.toFixed(1) + '</b> máy OPPO/shop · PK <b>' + (a.shops ? (a.pkO / a.shops).toFixed(1) : '0') + '</b>/shop · Share D.S <b>' + pcCh(shDs(a, a.oU)) + '</b> · Share D.T <b>' + pcCh(shDt(a, a.oDt)) + '</b> — số nào <span class="bc-giam-chu">đỏ</span> là dưới trung bình</td></tr>'
                                                                                        + rs.map(function (r) { return '<tr' + (!r.x.oU ? ' class="bc-mo"' : '') + '><td title="' + esc(r.s) + '">' + esc(tenShopNgan(r.s)) + '</td><td>' + esc(String(r.x.sale).split(' ').slice(-2).join(' ')) + '</td><td>' + do_(r.x.oU < tbO, '<b>' + fInt(r.x.oU) + '</b>') + '</td><td>' + fInt(r.x.tU) + '</td>' + oCotChinh(r.x, a) + '</tr>'; }).join('')
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
                        $('.bc-dau-phai', kq).appendChild(selThangCT(THANG_MWG, null, true, function (v) { mSel = v; mo = {}; ve(); }));
                        var box = el('div', 'bc-cuon'); $('.bc-than', kq).appendChild(box);
                        /* 09/09 anh Thai: bam vao Sale thi bung chi tiet shop cua Sale do */
                        var mo = {};
                        box.addEventListener('click', function (e) {
                                     var tr = e.target.closest('.bc-sale-dong'); if (!tr) return;
                                     var s = tr.getAttribute('data-sale'); mo[s] = !mo[s]; ve();
                        });
                        function ve() {
                                     var A, Bt, nhanT, shopsHT;
                                     if (!mSel) { A = saleNay; Bt = saleTruoc; nhanT = ctx.tenKyTruoc || 'kỳ trước'; shopsHT = shopNay; }
                                     else {
                                                    var m = +mSel, kk = khoangThang(m), spHT = shopMWG(kk.tu, kk.denCo);
                                                    shopsHT = spHT; A = gomTheo(spHT, function (x) { return x.sale; });
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
                                                    h += '<tr class="bc-sale-dong' + (r.co.length ? ' bc-canh' : '') + '" data-sale="' + esc(r.s) + '" style="cursor:pointer"><td><b>' + (mo[r.s] ? '▾ ' : '▸ ') + esc(r.s) + '</b></td><td><b>' + fInt(r.a.oU) + '</b></td><td>' + chip(r.p) + '</td><td>' + fInt(r.a.tU) + '</td>' + oCotChinh(r.a)
                                                      + '<td>' + (r.shT != null ? chipDiem(r.sh - r.shT) : '—') + '</td><td>' + r.a.shops + '</td><td>' + (r.a.shop0 ? '<span class="bc-giam-chu"><b>' + r.a.shop0 + '</b></span>' : '0') + '</td><td>' + fTyNgan(r.a.oDt) + '</td><td>' + (r.co.length ? '<span class="bc-co">' + r.co.map(esc).join(' · ') + '</span>' : '<span class="bc-len-chu">ổn</span>') + '</td></tr>';
                                                    /* 09/09: bam vao Sale -> lie^t ke^ shop cua Sale do, xep theo may OPPO giam dan.
                                                       To DO shop nao duoi trung binh cua chinh Sale do. */
                                                    if (mo[r.s]) {
                                                                   var rsS = (r.a.ten || []).map(function (n) { return { n: n, x: shopsHT ? shopsHT[n] : null }; })
                                                                                  .filter(function (z) { return z.x; })
                                                                                  .sort(function (p, q) { return q.x.oU - p.x.oU; });
                                                                   var tbS = r.a.shops ? r.a.oU / r.a.shops : 0;
                                                                   h += '<tr><td colspan="20"><div class="bc-cuon"><table class="bc-bang"><thead><tr><th>Shop</th><th>Size</th><th>Máy OPPO</th><th>Máy chợ</th>' + dauCotChinh + '</tr></thead><tbody>'
                                                                      + '<tr class="bc-tb-nhom"><td colspan="20">Trung bình của <b>' + esc(r.s) + '</b>: <b>' + tbS.toFixed(1) + '</b> máy OPPO/shop · ' + r.a.shops + ' shop · ' + (r.a.shop0 || 0) + ' shop 0 máy — shop dưới mức này tô đỏ</td></tr>'
                                                                      + rsS.map(function (z) {
                                                                                     return '<tr' + (!z.x.oU ? ' class="bc-mo"' : '') + '><td title="' + esc(z.n) + '">' + esc(tenShopNgan(z.n)) + '</td><td>' + esc(z.x.size || '') + '</td><td>' + do_(z.x.oU < tbS, '<b>' + fInt(z.x.oU) + '</b>') + '</td><td>' + fInt(z.x.tU) + '</td>' + oCotChinh(z.x) + '</tr>';
                                                                      }).join('')
                                                                      + '</tbody></table></div></td></tr>';
                                                    }
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
          dangXem: 'Tháng mới nhất của DATA MWG · biểu đồ đường đủ hãng theo ngày · bảng mini: % thị phần OPPO của từng Sale theo ngày (15 ngày gần nhất), ô đỏ là thấp hơn cả team' });
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
                       /* Anh Thái 05-09 tối: bảng mini bỏ tô nhiệt, hiện % thị phần OPPO của Sale theo ngày;
                                  ngày nào Sale thấp hơn % của cả team thì tô ĐỎ đúng ô đó. */
                        function veBang() {
                                     var f = CS[chon].f;
                                     var cot = ngay.slice(-15);
                                     var layTM = function (v) {
                                                    if (f === 'oDt') return [v.oppo_rev || 0, Math.max(0, (v.total_rev || 0) - (v.apple_rev || 0))];
                                                    if (f === 'pkO') return [v.pk1020_oppo_units || 0, v.pk1020_total_units || 0];
                                                    return [v.oppo_units || 0, v.total_units || 0];
                                     };
                                     var val = {}, tuT = cot.map(function () { return 0; }), mauT = cot.map(function () { return 0; });
                                     Object.keys(SH).forEach(function (shop) {
                                                    var sale = SH[shop].sale;
                                                    var a = val[sale] || (val[sale] = { tu: cot.map(function () { return 0; }), mau: cot.map(function () { return 0; }) });
                                                    var dm = (B.shop_day_data || {})[shop] || {};
                                                    cot.forEach(function (dd, i) {
                                                                     var v = dm[(+dd.slice(5, 7)) + '-' + (+dd.slice(8, 10))] || dm[dd.slice(5, 7) + '-' + dd.slice(8, 10)];
                                                                     if (!v) return;
                                                                     var p = layTM(v); a.tu[i] += p[0]; a.mau[i] += p[1]; tuT[i] += p[0]; mauT[i] += p[1];
                                                    });
                                     });
                                     var pcO = function (t, m) { return m ? t / m * 100 : null; };
                                     var nhanCs = CS[chon].reno ? 'Share máy' : 'Share ' + CS[chon].ten;
                                     var ss = Object.keys(val).sort();
                                     var h = '<table class="bc-mini"><thead><tr><th>' + esc(nhanCs) + '</th>' + cot.map(function (dd, i) { return '<th' + (i === cot.length - 1 ? ' class="bc-cot-chon"' : '') + '>' + ngayVN(dd).slice(0, 2) + '</th>'; }).join('') + '</tr></thead><tbody>';
                                     ss.forEach(function (s) {
                                                    var a = val[s];
                                                    h += '<tr><td><i class="bc-cham" style="background:' + mau('MWG') + '"></i>' + esc(s.split(' ').slice(-2).join(' ')) + '</td>' + cot.map(function (dd, i) {
                                                                     var v = pcO(a.tu[i], a.mau[i]), tb = pcO(tuT[i], mauT[i]);
                                                                     var cl = (v != null && tb != null && v < tb) ? 'bc-duoi-tb' : '';
                                                                     return '<td class="' + cl + (i === cot.length - 1 ? ' bc-cot-chon' : '') + '">' + (v == null ? '-' : pcCh(v)) + '</td>';
                                                    }).join('') + '</tr>';
                                     });
                                     h += '<tr class="bc-tong"><td>Toàn team</td>' + cot.map(function (dd, i) { var v = pcO(tuT[i], mauT[i]); return '<td' + (i === cot.length - 1 ? ' class="bc-cot-chon"' : '') + '>' + (v == null ? '-' : pcCh(v)) + '</td>'; }).join('') + '</tr></tbody></table>';hopBang.innerHTML = h; hopBang.scrollLeft = hopBang.scrollWidth;
                        }
                        veBang();
                        grid.appendChild(kq);
             })();

             /* ================= 7. Thi đua tháng (mượn) ================= */
             muonKhoi(grid, 7, 'Chương trình thi đua tháng', nhanThang(cd, 'Bonus Size S/A · % HT theo Sale/ASM — như DB TG cũ'), timMuon(root, /thi đua/i));
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

      /* 2. DS theo tuần cả năm (KA) — Anh Thái 06/09: bảng to hết màn hình, bỏ bản đồ nhiệt */
             (function () {
                        var kq = khoi({ stt: 2, ten: 'Doanh số theo tuần — cả năm (KA)', rong: true, dangXem: 'Cột chồng 4 kênh phụ · tuần thuộc kỳ chọn tô đậm · ô ĐỎ = giảm so với tuần liền trước' });
                kq.classList.add('bc-ka-k2');
                        var ws = d.TUAN.filter(function (t) { return t.coSo; }); var gs = ws.map(function (t) { return gomKA(t.tu, t.den); });
                        var trongKy = function (t) { return cd === 'tuan' ? t.iso === k.tu : (t.tu <= k.den && t.den >= k.tu); };
                        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 320, tabs: [{ ten: 'Máy', cau: function () { var c = cauCotChong(ws.map(function (t) { return 'W' + t.so; }), subCo.map(function (s) { return { label: tenSub(s), data: gs.map(function (g) { return g.sub[s].ds; }), backgroundColor: ws.map(function (t) { return trongKy(t) ? mauSub(s) : hexMo(mauSub(s), 0.38); }) }; })); c.data.datasets.forEach(function (x) { x.maxBarThickness = 28; }); c.options.scales.x.ticks.font = { size: 10 }; c.options.scales.x.ticks.autoSkip = false; c.options.scales.x.ticks.maxRotation = 0; return c; } }] }));
                        $('.bc-than', kq).appendChild(bangMini({ nhiet: false, cot: ws.slice(-12).map(function (t) { return 'W' + t.so; }), dong: subCo.map(function (s) { return { ten: tenSub(s), mau: mauSub(s), s: s }; }), chiSo: [{ ten: 'Máy', lay: function (r, i) { return gs.slice(-12)[i].sub[r.s].ds; } }, { ten: 'DT', fmt: fTyNgan, lay: function (r, i) { return gs.slice(-12)[i].sub[r.s].dt; } }] }));
                        grid.appendChild(kq);
             })();
       
             /* 3. Thị phần FPT & Viettel (mượn, chỉ tháng) */
             muonKhoi(grid, 4, 'Thị phần theo tháng — FPT & Viettel', nhanThang(cd, 'Nguồn Share KA (theo tháng) — như DB TG cũ'), timMuon(root, /Thị phần/i));
       
             /* 4. Chi tiết shop × kênh phụ — cột = kỳ, thêm cột PG */
             (function () {
                        var kq = khoi({ stt: 5, ten: 'Chi tiết theo Shop × kênh phụ — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), rong: true,
                                                 dangXem: 'Nhóm theo kênh phụ · nút DT / DS · cột PG: ✓ là shop ĐÃ có PG (không tính chương trình bên dưới) · ô ĐỎ = giảm so với kỳ liền trước' });
                        var PG = pgKA();
                        var shops = {}; chuoi.forEach(function (g) { Object.keys(g.shop).forEach(function (s) { shops[s] = 1; }); });
                        var dong = []; THU_TU.forEach(function (sb) { var ds = Object.keys(shops).filter(function (s) { return subCua(s) === sb; }).sort(function (a, b) { return (nay.shop[b] ? nay.shop[b].ds : 0) - (nay.shop[a] ? nay.shop[a].ds : 0); }); if (!ds.length) return; dong.push({ ten: tenSub(sb) + ' (' + ds.length + ')', nhom: true, mau: mauSub(sb), s: null, sb: sb }); ds.forEach(function (s) { dong.push({ ten: '   ' + tenShopNgan(s.replace(/^(FPT|Viettel|VTS|Cellphone[sS]?|CPS|ĐMCL|Điện Máy Chợ Lớn)\s*-\s*/i, '')), s: s }); }); });
                        var lay = function (r, i, f) { var g = chuoi[i]; if (r.nhom) return g.sub[r.sb][f]; var x = g.shop[r.s]; return x ? x[f] : 0; };
                        var w = bangMini({ nhiet: false, cot: ky12.map(function (q) { return q.nhan; }), dong: dong, tong: false,
                                                    cotThem: { ten: 'PG', lay: function (r) { if (r.nhom) return ''; var v = PG(r.s); return v === true ? '<b class="bc-len-chu">✓</b>' : v === false ? '<span class="bc-giam-chu">✗</span>' : '<span class="bc-mo-chu">—</span>'; } },
                                                    chiSo: [{ ten: 'DT', fmt: fTyNgan, lay: function (r, i) { return lay(r, i, 'dt'); } }, { ten: 'DS', lay: function (r, i) { return lay(r, i, 'ds'); } }] });
                        w.classList.add('bc-mini-shop');
                        $('.bc-than', kq).appendChild(w);
                        var soPG = Object.keys(shops).filter(function (s) { return PG(s) === true; }).length;
                        var so0 = Object.keys(shops).filter(function (s) { return nay.shop[s] ? nay.shop[s].ds === 0 : true; }).length;
                        chot(kq, '<b>' + Object.keys(shops).length + '</b> shop KA có số trong 12 kỳ; <b>' + soPG + '</b> shop đã có PG (không tính chương trình); <b>' + so0 + '</b> shop 0 máy ' + k.nhan.toLowerCase() + '.');
                        grid.appendChild(kq);
             })();
       
             /* 5. Sell out — 12 kỳ + biểu đồ tròn tỉ lệ đóng góp (Anh Thái 06/09: đưa xuống dưới) */
             (function () {
                        var kq = khoi({ stt: 3, ten: 'Sell Out KA — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), rong: true, dangXem: 'Tất cả theo kênh phụ · Reno & Find so còn lại · vòng bên phải: tỉ lệ đóng góp của 4 kênh phụ trong 12 kỳ' });
                        var labels = ky12.map(function (q) { return q.nhan; });
                        var seri = ky12.map(function (q) { var mk = BC.modelKy(cd, cd === 'tuan' ? BC.khoangKy('tuan', q.id) : BC.khoangKy('thang', q.id)); return BC.gomSeries({ KA: mk.KA || {} }).tong; });
                        var hang = el('div', 'bc-hang-bd'); var trai = el('div'), phai = el('div');
                        trai.appendChild(khungBieuDo({ cao: 360, tabs: [
                           { ten: 'Tất cả', cau: function () { return cauCotChong(labels, subCo.map(function (s) { return { label: tenSub(s), data: chuoi.map(function (g) { return g.sub[s].ds; }), backgroundColor: mauSub(s) }; })); } },
                           { ten: 'Reno', cau: function () { return cauCotChong(labels, [{ label: 'Reno', data: seri.map(function (x) { return x.RENO; }), backgroundColor: mau('RENO') }, { label: 'Find', data: seri.map(function (x) { return x.FIND; }), backgroundColor: mau('FIND') }, { label: 'Còn lại', data: seri.map(function (x) { return x.CONLAI; }), backgroundColor: mau('CONLAI') }]); } },
                           { ten: 'Doanh thu', cau: function () { return cauCotChong(labels, subCo.map(function (s) { return { label: tenSub(s), data: chuoi.map(function (g) { return g.sub[s].dt; }), backgroundColor: mauSub(s) }; }), { fmt: fTyNgan, tien: true }); } }
                                   ] }));
                        var congSub = function (f) { return subCo.map(function (s) { return chuoi.reduce(function (z, g) { return z + g.sub[s][f]; }, 0); }); };
                        phai.appendChild(el('div', 'bc-bd-ten', 'TỈ LỆ ĐÓNG GÓP THEO KÊNH'));
                        phai.appendChild(khungBieuDo({ cao: 320, tabs: [
                           { ten: 'Máy', cau: function () { return cauVong(subCo.map(tenSub), congSub('ds'), subCo.map(mauSub)); } },
                           { ten: 'Doanh thu', cau: function () { return cauVong(subCo.map(tenSub), congSub('dt'), subCo.map(mauSub), fTyNgan); } }
                                   ] }));
                        hang.appendChild(trai); hang.appendChild(phai);
                        $('.bc-than', kq).appendChild(hang);
                        var tds = congSub('ds'), tt = tds.reduce(function (a, b) { return a + b; }, 0);
                        var xep = subCo.map(function (s, i) { return { s: s, v: tds[i] }; }).sort(function (a, b) { return b.v - a.v; });
                        if (tt) chot(kq, 'Trong 12 kỳ, ' + xep.map(function (x) { return '<b>' + esc(tenSub(x.s)) + '</b> ' + (x.v / tt * 100).toFixed(1) + '%'; }).join(' · ') + '.');
                                     /* Anh Thái 06/09: khối này nằm ngay DƯỚI khối 2 (mã vẫn viết ở đây cho gọn) */
                                     var k2 = grid.querySelector('.bc-ka-k2');
                                     grid.insertBefore(kq, k2 ? k2.nextSibling : null);
             })();

      /* 6. Chương trình shop chưa PG (mượn, chỉ tháng) */
      muonKhoi(grid, 6, 'Chương trình shop chưa có PG — ngân sách & KPI Sale', nhanThang(cd, null), timMuon(root, /chưa có PG/i));
    }

    /* ===================== IND ===================== */
    function veIND(root, ctx) {
      var d = du(), D = d.D, k = ctx.k, kt = ctx.kt, cd = ctx.cd, E = ext();
      var levelOf = {}, idToShop = {}, saleOf = {}; (D.store_rows || []).forEach(function (r) { if (r.channel !== 'IND') return; levelOf[r.store] = r.level; saleOf[r.store] = r.sale; if (r.store_id) idToShop[String(r.store_id).trim()] = r.store; });
      var nhom = function (shop) { try { return E.ocLevel ? E.ocLevel(levelOf[shop]) : { group: 'Normal', sub: null }; } catch (e) { return { group: 'Normal', sub: null }; } };
      var OC_T = E.ocTarget || {}, OC_TT = E.ocThuTu || ['Platinum', 'Titan', 'Gold'];
      var CHUA_GAN = '(chưa gán shop)';
          /* Sell In theo ngày VN từ cột H (ISO UTC) — Anh Thái 06/09: tách OPPO / PK (cột F),
                   hàng nào không khớp shop IND thì gom vào "(chưa gán shop)" để tổng vẫn khớp sheet. */
          var SI = (function () { if (window.__bcSI2) return window.__bcSI2; var out = {}; (D.sell_in_rows || []).forEach(function (r) { if (!r || r.length < 7) return; var q = +r[6] || 0; var ng = null; if (r[7]) { var dt = new Date(r[7]); if (!isNaN(dt)) { dt = new Date(dt.getTime() + 7 * 3600e3); ng = dt.toISOString().slice(0, 10); } } if (!ng) { var m = +r[3]; if (m) ng = '2026-' + pad2(m) + '-15'; } if (!ng) return; var shop = idToShop[String(r[0]).trim()] || CHUA_GAN; var loai = String(r[5] || '').toUpperCase() === 'PK' ? 'p' : 'o'; var N = out[ng] || (out[ng] = {}); var S = N[shop] || (N[shop] = { o: 0, p: 0 }); S[loai] += q; }); return (window.__bcSI2 = out); })();
          function gomSI(tu, den) {
                     var r = { tong: 0, tongPk: 0, chuaGan: 0, chuaGanPk: 0, shop: {}, shopPk: {}, oc: { 'O.C': 0, Normal: 0 }, ocPk: { 'O.C': 0, Normal: 0 } };
                     Object.keys(SI).forEach(function (ng) {
                                  if (ng < tu || ng > den) return;
                                  Object.keys(SI[ng]).forEach(function (s) {
                                                 var x = SI[ng][s];
                                                 r.tong += x.o; r.tongPk += x.p;
                                                 r.shop[s] = (r.shop[s] || 0) + x.o; r.shopPk[s] = (r.shopPk[s] || 0) + x.p;
                                                 if (s === CHUA_GAN) { r.chuaGan += x.o; r.chuaGanPk += x.p; return; }
                                                 var g2 = nhom(s).group; r.oc[g2] += x.o; r.ocPk[g2] += x.p;
                                  });
                     });
                     return r;
          }
             function gomIND(tu, den) { var g = gomKenh(tu, den, 'IND'); g.oc = { 'O.C': { ds: 0, dt: 0, shop: 0 }, Normal: { ds: 0, dt: 0, shop: 0 } }; g.level = {}; OC_TT.forEach(function (l) { g.level[l] = { ds: 0, dt: 0, shop: 0, shops: [] }; }); Object.keys(g.shop).forEach(function (s) { var x = g.shop[s], n = nhom(s); g.oc[n.group].ds += x.ds; g.oc[n.group].dt += x.dt; if (x.ds > 0) g.oc[n.group].shop++; if (n.sub && g.level[n.sub]) { g.level[n.sub].ds += x.ds; g.level[n.sub].dt += x.dt; if (x.ds > 0) { g.level[n.sub].shop++; g.level[n.sub].shops.push(s); } } }); g.si = gomSI(tu, den); return g; }
             var nay = gomIND(k.tu, k.denCo), truoc = kt ? gomIND(kt.tu, kt.denCo) : null;
             var ky12 = dsKy12(ctx), chuoi = ky12.map(function (q) { return gomIND(q.tu, q.den); });
             var SALES = Object.keys(nay.sale).concat(chuoi.length ? Object.keys(chuoi[chuoi.length - 1].sale) : []).filter(function (s, i, a) { return a.indexOf(s) === i && s !== '(Không rõ)'; }).sort(function (a, b) { return nay.sale[b] ? nay.sale[b].ds : 0 - (nay.sale[a] ? nay.sale[a].ds : 0); });
             var tenNgan = function (s) { return s.split(' ').slice(-1)[0]; };
             var grid = el('div', 'bc-luoi'); root.appendChild(grid);
             grid.appendChild(bangKyChung(ctx, 'Kênh IND (OPPO Club) — O.C / Normal'));

             /* 1. KPI + theo Sale */
             (function () {
                        var kq = khoi({ stt: 1, ten: 'Kết quả IND ' + k.nhan.toLowerCase(), rong: true, dangXem: 'Tách theo Sale trong từng thẻ · thẻ Sell In chỉ tính máy OPPO (không gồm phụ kiện) — chip so ' + esc(ctx.tenKyTruoc || 'kỳ trước') });
                        var rows = function (lay, fmt) { return SALES.map(function (s) { var a = nay.sale[s] || { ds: 0, dt: 0, shop: 0 }, b = truoc ? (truoc.sale[s] || { ds: 0, dt: 0, shop: 0 }) : null; return dongKenh(tenNgan(s), mau('IND'), lay(a), b ? lay(b) : null, fmt); }).join(''); };
                        /* Anh Thái 06/09: bỏ thẻ Đơn giá TB, thay bằng Sell In (chỉ OPPO) — chi tiết theo Sale */
                        var siSale = function (g) { var r = {}; Object.keys(g.si.shop).forEach(function (s2) { if (s2 === CHUA_GAN) return; var sl = saleOf[s2] || '(Không rõ)'; r[sl] = (r[sl] || 0) + g.si.shop[s2]; }); return r; };
                        var siN = siSale(nay), siT = truoc ? siSale(truoc) : null;
                        var rowsSI = SALES.map(function (s) { return dongKenh(tenNgan(s), mau('IND'), siN[s] || 0, siT ? (siT[s] || 0) : null, fInt); }).join('');
                        $('.bc-than', kq).innerHTML = '<div class="bc-kpi-row">' +
                                     theKpi('Doanh số', fInt(nay.ds) + ' <small>máy</small>', chip(truoc ? pct(nay.ds, truoc.ds) : null), 'O.C ' + fInt(nay.oc['O.C'].ds) + ' · Normal ' + fInt(nay.oc.Normal.ds), rows(function (x) { return x.ds; }, fInt)) +
                                     theKpi('Doanh thu', fTyNgan(nay.dt), chip(truoc ? pct(nay.dt, truoc.dt) : null), truoc ? ctx.tenKyTruoc + ': ' + fTyNgan(truoc.dt) : '', rows(function (x) { return x.dt; }, fTyNgan)) +
                                     theKpi('Sell In', fInt(nay.si.tong) + ' <small>máy OPPO</small>', chip(truoc ? pct(nay.si.tong, truoc.si.tong) : null), 'Chưa gán shop ' + fInt(nay.si.chuaGan) + ' máy', rowsSI) +
                                     theKpi('Shop có bán', fInt(nay.soShop), chip(truoc ? pct(nay.soShop, truoc.soShop) : null), 'Sell In PK ' + fInt(nay.si.tongPk) + ' món', rows(function (x) { return x.shop; }, fInt)) + '</div>';
                        if (truoc) { var dg = SALES.map(function (s) { var a = nay.sale[s] || { ds: 0 }, b = truoc.sale[s] || { ds: 0 }; return { s: s, d: a.ds - b.ds }; }).sort(function (a, b) { return a.d - b.d; }); if (dg.length) chot(kq, 'Sale giảm nhiều nhất: <b>' + esc(tenNgan(dg[0].s)) + '</b> (' + fInt(dg[0].d) + ' máy); tăng nhiều nhất: <b>' + esc(tenNgan(dg[dg.length - 1].s)) + '</b> (+' + fInt(dg[dg.length - 1].d) + ').'); }
                        grid.appendChild(kq);
             })();

             /* 2. DS theo tuần cả năm (IND) */
             (function () {
                        var kq = khoi({ stt: 2, ten: 'Doanh số theo tuần — cả năm (IND)', cls: 'bc-c7', dangXem: 'Cột chồng O.C / Normal · tuần thuộc kỳ chọn tô đậm' });
                        var ws = d.TUAN.filter(function (t) { return t.coSo; }); var gs = ws.map(function (t) { return gomIND(t.tu, t.den); });
                        var trongKy = function (t) { return cd === 'tuan' ? t.iso === k.tu : (t.tu <= k.den && t.den >= k.tu); };
                        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 320, tabs: [{ ten: 'Máy', cau: function () { var c = cauCotChong(ws.map(function (t) { return 'W' + t.so; }), ['O.C', 'Normal'].map(function (g) { return { label: g, data: gs.map(function (x) { return x.oc[g].ds; }), backgroundColor: ws.map(function (t) { return trongKy(t) ? mauOC(g) : hexMo(mauOC(g), 0.38); }) }; })); c.data.datasets.forEach(function (x) { x.maxBarThickness = 28; }); c.options.scales.x.ticks.font = { size: 10 }; c.options.scales.x.ticks.autoSkip = false; c.options.scales.x.ticks.maxRotation = 0; return c; } }] }));
                        $('.bc-than', kq).appendChild(bangMini({ cot: ws.slice(-12).map(function (t) { return 'W' + t.so; }), dong: ['O.C', 'Normal'].map(function (g) { return { ten: g, mau: mauOC(g), g: g }; }), nhiet: false, chiSo: [{ ten: 'Máy', lay: function (r, i) { return gs.slice(-12)[i].oc[r.g].ds; } }, { ten: 'DT', fmt: fTyNgan, lay: function (r, i) { return gs.slice(-12)[i].oc[r.g].dt; } }, { ten: 'S.I OPPO', lay: function (r, i) { return gs.slice(-12)[i].si.oc[r.g]; } }, { ten: 'S.I PK', lay: function (r, i) { return gs.slice(-12)[i].si.ocPk[r.g]; } }] }));
                        grid.appendChild(kq);
             })();

             /* 3. Sell Out | Sell In — Anh Thái 06/09: tách Sell In OPPO / Sell In PK, thêm tab Reno */
             (function () {
                        var kq = khoi({ stt: 3, ten: 'Sell Out | Sell In — O.C / Normal — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), cls: 'bc-c5',
                                                 dangXem: 'Sell In gộp theo ngày từ sheet SELL IN (cột DATE) · tách OPPO / PK theo cột loại hàng · "S.O vs S.I" chỉ so với Sell In OPPO' });
                        var labels = ky12.map(function (q) { return q.nhan; });
                        var seri = ky12.map(function (q) { var mk = BC.modelKy(cd, cd === 'tuan' ? BC.khoangKy('tuan', q.id) : BC.khoangKy('thang', q.id)); return BC.gomSeries({ IND: mk.IND || {} }).tong; });
                        $('.bc-than', kq).appendChild(khungBieuDo({ cao: 360, tabs: [
                           { ten: 'Sell Out', cau: function () { return cauCotChong(labels, ['O.C', 'Normal'].map(function (g) { return { label: g, data: chuoi.map(function (x) { return x.oc[g].ds; }), backgroundColor: mauOC(g) }; })); } },
                           { ten: 'Sell In OPPO', cau: function () { return cauCotChong(labels, ['O.C', 'Normal'].map(function (g) { return { label: g, data: chuoi.map(function (x) { return x.si.oc[g]; }), backgroundColor: mauOC(g) }; }).concat([{ label: 'Chưa gán shop', data: chuoi.map(function (x) { return x.si.chuaGan; }), backgroundColor: mau('KHAC') }])); } },
                           { ten: 'Sell In PK', cau: function () { return cauCotChong(labels, ['O.C', 'Normal'].map(function (g) { return { label: g, data: chuoi.map(function (x) { return x.si.ocPk[g]; }), backgroundColor: mauOC(g) }; }).concat([{ label: 'Chưa gán shop', data: chuoi.map(function (x) { return x.si.chuaGanPk; }), backgroundColor: mau('KHAC') }])); } },
                           { ten: 'S.O vs S.I', cau: function () { var c = cauCotChong(labels, [{ label: 'Sell Out', data: chuoi.map(function (x) { return x.ds; }), backgroundColor: mau('IND') }, { label: 'Sell In OPPO', data: chuoi.map(function (x) { return x.si.tong; }), backgroundColor: hexMo(mau('IND'), 0.45) }]); c.options.scales.x.stacked = false; c.options.scales.y.stacked = false; c.plugins = []; return c; } },
                           { ten: 'Reno', cau: function () { return cauCotChong(labels, [{ label: 'Reno', data: seri.map(function (x) { return x.RENO; }), backgroundColor: mau('RENO') }, { label: 'Find', data: seri.map(function (x) { return x.FIND; }), backgroundColor: mau('FIND') }, { label: 'Còn lại', data: seri.map(function (x) { return x.CONLAI; }), backgroundColor: mau('CONLAI') }]); } }
                                   ] }));
                        var gAll = gomIND('2026-01-01', k.denCo);
                        chot(kq, 'Luỹ kế đến ' + ngayVN(k.denCo) + ': Sell In OPPO <b>' + fInt(gAll.si.tong) + '</b> (trong đó <b>' + fInt(gAll.si.chuaGan) + '</b> máy về tài khoản công ty/PP chưa gán shop) · Sell Out <b>' + fInt(gAll.ds) + '</b> → tồn ước tính <b>' + fInt(gAll.si.tong - gAll.ds) + '</b> máy · Sell In PK <b>' + fInt(gAll.si.tongPk) + '</b> món.');
                        grid.appendChild(kq);
             })();

             /* 4. Theo Sale — Anh Thái 06/09: cột "PK" cũ là TỒN (S.I − S.O) nên hay âm.
                      Tách rõ: S.I OPPO / S.I PK (phụ kiện) / Tồn — và giải thích vì sao Tồn âm. */
             (function () {
                        var kq = khoi({ stt: 4, ten: 'Theo Sale — 12 ' + (cd === 'tuan' ? 'tuần' : 'tháng'), rong: true,
                                                 dangXem: 'DS · DT · Shop · S.I OPPO · S.I PK (phụ kiện) · Tồn (S.I OPPO − S.O luỹ kế đến hết kỳ) · ô ĐỎ = xấu đi so với kỳ liền trước' });
                        var saleSI = function (g, f) { var r = {}; Object.keys(g.si[f]).forEach(function (s) { if (s === CHUA_GAN) return; var sl = saleOf[s] || '(Không rõ)'; r[sl] = (r[sl] || 0) + g.si[f][s]; }); return r; };
                        var siKy = chuoi.map(function (g) { return saleSI(g, 'shop'); });
                        var siPkKy = chuoi.map(function (g) { return saleSI(g, 'shopPk'); });
                        var tonKy = ky12.map(function (q) { var g = gomIND('2026-01-01', q.den); var si = saleSI(g, 'shop'); var r = {}; Object.keys(g.sale).concat(Object.keys(si)).forEach(function (s) { r[s] = (si[s] || 0) - (g.sale[s] ? g.sale[s].ds : 0); }); return r; });
                        $('.bc-than', kq).appendChild(bangMini({ nhiet: false, cot: ky12.map(function (q) { return q.nhan; }), dong: SALES.map(function (s) { return { ten: tenNgan(s), s: s, mau: mau('IND') }; }), chiSo: [
                           { ten: 'DS', lay: function (r, i) { var a = chuoi[i].sale[r.s]; return a ? a.ds : 0; } },
                           { ten: 'DT', fmt: fTyNgan, lay: function (r, i) { var a = chuoi[i].sale[r.s]; return a ? a.dt : 0; } },
                           { ten: 'Shop', lay: function (r, i) { var a = chuoi[i].sale[r.s]; return a ? a.shop : 0; } },
                           { ten: 'S.I OPPO', lay: function (r, i) { return siKy[i][r.s] || 0; } },
                           { ten: 'S.I PK', lay: function (r, i) { return siPkKy[i][r.s] || 0; } },
                           { ten: 'Tồn', nguoc: true, lay: function (r, i) { return tonKy[i][r.s] || 0; } }] }));
                        var gAll = gomIND('2026-01-01', k.denCo);
                        chot(kq, 'Vì sao cột <b>Tồn</b> có số âm: Sell In tính từ 01/01/2026 nên KHÔNG có tồn đầu năm, và <b>' + fInt(gAll.si.chuaGan) + '/' + fInt(gAll.si.tong + gAll.si.chuaGan) + '</b> máy Sell In về tài khoản công ty/PP không nằm trong danh sách shop IND nên không cộng cho Sale nào — trong khi hàng đó vẫn được bán ra ở shop. Số âm = bán nhiều hơn phần nhập ghi nhận được, không phải lỗi tính.');
                        grid.appendChild(kq);
             })();

      /* 5. Mục tiêu tháng — Anh Thái 06/09: 4 tab, mỗi tab 1 chỉ tiêu + target cố định.
               Nhóm O.C gộp shop trùng tên (Nokia Phong / Nokia Phong 2 / Nokia Phong cty = 1 shop);
                        riêng Long Hưng và Long Hưng 2 là 2 shop độc lập. */
             (function () {
                        var MUC_OC = 200e6, SO_MAY_NORMAL = 5;
                        var TG_DT = (E.kenh && E.kenh.IND ? E.kenh.IND.revenue : 0) || 0;
                        var TABS = [
                           { ten: 'Tiến độ target doanh thu', tg: TG_DT, fmt: fTyNgan, donVi: '' },
                           { ten: 'Shop có S.O', tg: 110, fmt: fInt, donVi: ' shop' },
                           { ten: 'Shop O.C đạt gói', tg: 25, fmt: fInt, donVi: ' shop' },
                           { ten: 'Shop có S.O 5 máy', tg: 60, fmt: fInt, donVi: ' shop' }
                                   ];
                        var THANG_CO2 = (function () { var mC = d.NGAY.length ? U.thangCua(d.NGAY[d.NGAY.length - 1]) : 12; var a = []; for (var i = 1; i <= mC; i++) a.push(i); return a; })();
                        var mSel = cd === 'tuan' ? U.thangCua(k.denCo) : k.so;
                        if (THANG_CO2.indexOf(mSel) < 0) mSel = THANG_CO2[THANG_CO2.length - 1] || mSel;
                        var chon = 0;
                        var kq = khoi({ stt: 5, ten: 'Mục tiêu tháng', rong: true,
                                                 dangXem: 'Target: doanh thu ' + fTyNgan(TG_DT) + ' · 110 shop có S.O · 25 shop O.C đạt gói (DT ≥ 200M, shop trùng tên đã gộp) · 60 shop Normal bán từ 5 máy' });
                        var than = $('.bc-than', kq);
                        $('.bc-dau-phai', kq).appendChild(selThangCT(THANG_CO2, mSel, false, function (v) { mSel = +v; ve(); }));
                        than.appendChild(nutChon(TABS.map(function (t) { return t.ten; }), 0, function (i) { chon = i; ve(); }));
                        var hopSo = el('div', 'bc-muc-tieu'), box = el('div', 'bc-cuon');
                        than.appendChild(hopSo); than.appendChild(box);
                        function ve() {
                                     var kTh = BC.khoangKy('thang', mSel);
                                     var denCo = (cd === 'tuan' && mSel === U.thangCua(k.denCo) && k.denCo < kTh.denCo) ? k.denCo : kTh.denCo;
                                     var lk = gomIND(kTh.tu, denCo);
                                     var ngayDa = soNgay(kTh.tu, denCo), ngayThang = U.soNgayThang(mSel), ngayCon = Math.max(0, ngayThang - ngayDa);
                                     var t = TABS[chon], dat = 0, h = '';
                                     if (chon === 0) {
                                                    dat = lk.dt;
                                                    var rows = SALES.map(function (s) { var a = lk.sale[s] || { ds: 0, dt: 0, shop: 0 }; return { s: s, dt: a.dt, ds: a.ds }; }).sort(function (a, b) { return b.dt - a.dt; });
                                                    h = '<table class="bc-bang"><thead><tr><th>Sale</th><th>Doanh thu</th><th>Tỉ trọng</th><th>Máy</th></tr></thead><tbody>'
                                                                     + rows.map(function (r) { return '<tr><td>' + esc(tenNgan(r.s)) + '</td><td><b>' + fTyNgan(r.dt) + '</b></td><td>' + (dat ? (r.dt / dat * 100).toFixed(1) : '0.0') + '%</td><td>' + fInt(r.ds) + '</td></tr>'; }).join('')
                                                                     + '<tr class="bc-tong"><td>Tổng</td><td>' + fTyNgan(dat) + '</td><td>100%</td><td>' + fInt(lk.ds) + '</td></tr></tbody></table>';
                                     } else if (chon === 1) {
                                                    var theoSale = {};
                                                    Object.keys(levelOf).forEach(function (s) { var sl = saleOf[s] || '(Không rõ)'; var a = theoSale[sl] || (theoSale[sl] = { co: 0, tong: 0 }); a.tong++; var x = lk.shop[s]; if (x && x.ds > 0) a.co++; });
                                                    dat = Object.keys(theoSale).reduce(function (z, s) { return z + theoSale[s].co; }, 0);
                                                    var ss = Object.keys(theoSale).sort(function (a, b) { return theoSale[b].co - theoSale[a].co; });
                                                    h = '<table class="bc-bang"><thead><tr><th>Sale</th><th>Shop phụ trách</th><th>Shop có S.O</th><th>Tỉ lệ</th></tr></thead><tbody>'
                                                                     + ss.map(function (s) { var a = theoSale[s]; var p = a.tong ? a.co / a.tong * 100 : 0; return '<tr><td>' + esc(tenNgan(s)) + '</td><td>' + a.tong + '</td><td>' + do_(p < 50, '<b>' + a.co + '</b>') + '</td><td>' + thanhNho(p) + '</td></tr>'; }).join('')
                                                                     + '</tbody></table>';
                                     } else if (chon === 2) {
                                                    var nhomOC = {};
                                                    Object.keys(levelOf).forEach(function (s) {
                                                                     if (nhom(s).group !== 'O.C') return;
                                                                     var kk2 = khoaOC(s), a = nhomOC[kk2] || (nhomOC[kk2] = { ten: s, dt: 0, ds: 0, n: 0, sale: saleOf[s] || '' });
                                                                     var x = lk.shop[s]; a.n++; if (x) { a.dt += x.dt; a.ds += x.ds; }
                                                                     if (s.length < a.ten.length) a.ten = s;
                                                    });
                                                    var ds2 = Object.keys(nhomOC).map(function (kk2) { return nhomOC[kk2]; }).sort(function (a, b) { return b.dt - a.dt; });
                                                    dat = ds2.filter(function (r) { return r.dt >= MUC_OC; }).length;
                                                    h = '<table class="bc-bang bc-bang-shop"><thead><tr><th>#</th><th>Nhóm shop O.C</th><th>Sale</th><th>Gộp</th><th>Máy</th><th>Doanh thu</th><th>Đạt gói ≥200M</th></tr></thead><tbody>'
                                                                     + ds2.map(function (r, i) { return '<tr' + (!r.ds ? ' class="bc-mo"' : '') + '><td>' + (i + 1) + '</td><td title="' + esc(r.ten) + '">' + esc(tenShopNgan(r.ten)) + '</td><td>' + esc(tenNgan(r.sale)) + '</td><td>' + (r.n > 1 ? r.n + ' shop' : '') + '</td><td>' + fInt(r.ds) + '</td><td><b>' + fTyNgan(r.dt) + '</b></td><td>' + (r.dt >= MUC_OC ? '<b class="bc-len-chu">✓</b>' : '<span class="bc-giam-chu">✗</span>') + '</td></tr>'; }).join('')
                                                                     + '<tr class="bc-tong"><td></td><td>' + ds2.length + ' nhóm</td><td></td><td></td><td></td><td></td><td>' + dat + ' đạt</td></tr></tbody></table>';
                                     } else {
                                                    var tSale = {}, dsN = [];
                                                    Object.keys(levelOf).forEach(function (s) {
                                                                     if (nhom(s).group === 'O.C') return;
                                                                     var sl = saleOf[s] || '(Không rõ)', a = tSale[sl] || (tSale[sl] = { co: 0, tong: 0 });
                                                                     a.tong++; var x = lk.shop[s], sl2 = x ? x.ds : 0;
                                                                     if (sl2 >= SO_MAY_NORMAL) { a.co++; dsN.push({ s: s, ds: sl2, dt: x ? x.dt : 0, sale: sl }); }
                                                    });
                                                    dat = dsN.length;
                                                    var ss2 = Object.keys(tSale).sort(function (a, b) { return tSale[b].co - tSale[a].co; });
                                                    h = '<table class="bc-bang"><thead><tr><th>Sale</th><th>Shop Normal</th><th>Shop ≥ 5 máy</th><th>Tỉ lệ</th></tr></thead><tbody>'
                                                                     + ss2.map(function (s) { var a = tSale[s]; var p = a.tong ? a.co / a.tong * 100 : 0; return '<tr><td>' + esc(tenNgan(s)) + '</td><td>' + a.tong + '</td><td>' + do_(!a.co, '<b>' + a.co + '</b>') + '</td><td>' + thanhNho(p) + '</td></tr>'; }).join('')
                                                                     + '<tr class="bc-tong"><td>Tổng</td><td></td><td>' + dat + '</td><td></td></tr></tbody></table>';
                                     }
                                     var p2 = t.tg ? dat / t.tg * 100 : null, thieu = Math.max(0, t.tg - dat);
                                     hopSo.innerHTML = '<div class="bc-mt-o"><div class="bc-mt-nhan">Đạt</div><div class="bc-mt-so">' + t.fmt(dat) + esc(t.donVi) + '</div></div>'
                                                    + '<div class="bc-mt-o"><div class="bc-mt-nhan">Target tháng</div><div class="bc-mt-so">' + t.fmt(t.tg) + esc(t.donVi) + '</div></div>'
                                                    + '<div class="bc-mt-o"><div class="bc-mt-nhan">% hoàn thành</div><div class="bc-mt-so ' + (p2 != null && p2 >= 100 ? 'bc-len-chu' : 'bc-giam-chu') + '">' + (p2 == null ? '—' : p2.toFixed(1) + '%') + '</div></div>'
                                                    + '<div class="bc-mt-o"><div class="bc-mt-nhan">Còn thiếu</div><div class="bc-mt-so">' + (thieu ? t.fmt(thieu) + esc(t.donVi) : '<span class="bc-len-chu">Đã đạt</span>') + '</div></div>'
                                                    + '<div class="bc-mt-o bc-mt-rong"><div class="bc-mt-nhan">Tiến độ</div>' + thanhNho(p2) + '</div>';
                                     box.innerHTML = h;
                                     chot(kq, 'Tháng ' + mSel + ' — luỹ kế ' + ngayDa + '/' + ngayThang + ' ngày' + (ngayCon ? ', còn ' + ngayCon + ' ngày' : '') + ': <b>' + esc(t.ten) + '</b> đạt <b>' + t.fmt(dat) + esc(t.donVi) + '</b> / ' + t.fmt(t.tg) + esc(t.donVi)
                                                      + (thieu ? ' — còn thiếu <b class="bc-giam-chu">' + t.fmt(thieu) + esc(t.donVi) + '</b>' + (ngayCon ? ' (' + t.fmt(Math.ceil(thieu / (ngayCon / 7))) + esc(t.donVi) + '/tuần)' : '') : ' — <b class="bc-len-chu">đã đạt target</b>') + '.');
                        }
                        ve();
                        grid.appendChild(kq);
             })();
       
             /* 5. Mục tiêu shop O.C — Anh Thái 06/09: gộp phần 5 (theo level) và phần 6 (từng shop) làm 1 khối,
                      dùng chung bộ lọc Tháng, thêm Target doanh thu / Thực đạt doanh thu, cột O.C tick khi DT ≥ 200M. */
             (function () {
                        var THANG_CO = (function () { var mC = d.NGAY.length ? U.thangCua(d.NGAY[d.NGAY.length - 1]) : 12; var a = []; for (var i = 1; i <= mC; i++) a.push(i); return a; })();
                        var mSel = cd === 'tuan' ? U.thangCua(k.denCo) : k.so;
                        var MOC_OC = 200e6;
                        /* Anh Thái 06/09: cột "Đạt LV" — doanh thu tháng chạm mốc DT của gói nào thì ghi gói đó
                           (Platinum 600M · Titan 400M · Gold 200M, lấy từ __bcTarget().ocTarget). Xét theo DOANH THU,
                           cùng thước đo với cột "O.C ≥200M". OC_TT xếp cao→thấp nên chỉ số nhỏ = gói cao hơn. */
                        var datLV = function (dt) {
                                     var ten = null, mocCao = 0;
                                     OC_TT.forEach(function (l) { var m = (OC_T[l] || {}).dt || 0; if (m && dt >= m && m > mocCao) { mocCao = m; ten = l; } });
                                     return ten;
                        };
                        var kq = khoi({ stt: 6, ten: 'Mục tiêu shop O.C', rong: true, dangXem: 'Trên: gộp theo level (theo mã shop) · Dưới: từng shop O.C ĐÃ GỘP mã trùng tên · Target DT lấy theo level · cột O.C: ✓ khi doanh thu tháng ≥ 200M' });var than = $('.bc-than', kq);
                $('.bc-dau-phai', kq).appendChild(selThangCT(THANG_CO, mSel, false, function (v) { mSel = +v; ve(); }));
                        var hopTren = el('div', 'bc-cuon'), tenDuoi = el('div', 'bc-bd-ten'), hopDuoi = el('div', 'bc-cuon');
                        tenDuoi.style.textAlign = 'left'; tenDuoi.textContent = 'TIẾN ĐỘ TỪNG SHOP O.C';
                        than.appendChild(hopTren); than.appendChild(tenDuoi); than.appendChild(hopDuoi);
                        /* tất cả shop O.C theo store_rows, kể cả shop chưa bán máy nào */
                        var SHOP_OC = Object.keys(levelOf).map(function (s) { var n = nhom(s); return { s: s, g: n.group, l: n.sub }; }).filter(function (x) { return x.g === 'O.C' && x.l; });
                        function ve() {
                                     var kTh = BC.khoangKy('thang', mSel);
                                     var denCo = (cd === 'tuan' && mSel === U.thangCua(k.denCo) && k.denCo < kTh.denCo) ? k.denCo : kTh.denCo;
                                     var lk = gomIND(kTh.tu, denCo);
                                     var ngayDa = soNgay(kTh.tu, denCo), ngayThang = U.soNgayThang(mSel), ngayCon = Math.max(0, ngayThang - ngayDa);
                                     var soDT = function (s) { var x = lk.shop[s]; return x ? x.dt : 0; };
                                     var soDS = function (s) { var x = lk.shop[s]; return x ? x.ds : 0; };
                                     var h = '<table class="bc-bang"><thead><tr><th>Level</th><th>Shop</th><th>Có bán</th><th>Máy</th><th>Target máy</th><th>% HT máy</th><th>Doanh thu</th><th>Target DT</th><th>% HT DT</th><th>Đạt máy</th>' + (ngayCon ? '<th>Cần/tuần</th>' : '') + '</tr></thead><tbody>';
                                     var tg = { shop: 0, ban: 0, ds: 0, tds: 0, dt: 0, tdt: 0, dat: 0 };
                                     var chiTiet = [];
                                     OC_TT.forEach(function (l) {
                                                    var ds = SHOP_OC.filter(function (x) { return x.l === l; }); if (!ds.length) return;
                                                    var t = OC_T[l] || { ds: 0, dt: 0 };
                                                    var ban = ds.filter(function (x) { return soDS(x.s) > 0; }).length;
                                                    var mDs = ds.reduce(function (z, x) { return z + soDS(x.s); }, 0), mDt = ds.reduce(function (z, x) { return z + soDT(x.s); }, 0);
                                                    var tgDs = (t.ds || 0) * ds.length, tgDt = (t.dt || 0) * ds.length;
                                                    var dat = ds.filter(function (x) { return soDS(x.s) >= (t.ds || 0); }).length;
                                                    tg.shop += ds.length; tg.ban += ban; tg.ds += mDs; tg.tds += tgDs; tg.dt += mDt; tg.tdt += tgDt; tg.dat += dat;
                                                    h += '<tr><td><b>' + esc(l) + '</b></td><td>' + ds.length + '</td><td>' + ban + '</td><td><b>' + fInt(mDs) + '</b></td><td>' + fInt(tgDs) + '</td><td>' + thanhNho(tgDs ? mDs / tgDs * 100 : null) + '</td><td><b>' + fTyNgan(mDt) + '</b></td><td>' + fTyNgan(tgDt) + '</td><td>' + thanhNho(tgDt ? mDt / tgDt * 100 : null) + '</td><td>' + dat + '/' + ds.length + '</td>'
                                                      + (ngayCon ? '<td>' + fInt(Math.max(0, tgDs - mDs) / (ngayCon / 7)) + '</td>' : '') + '</tr>';
                                                    ds.forEach(function (x) { chiTiet.push({ s: x.s, l: l, ds: soDS(x.s), dt: soDT(x.s), t: t.ds || 0, tdt: t.dt || 0, sale: saleOf[x.s] || '' }); });
                                     });
                                     h += '<tr class="bc-tong"><td>Tổng</td><td>' + tg.shop + '</td><td>' + tg.ban + '</td><td>' + fInt(tg.ds) + '</td><td>' + fInt(tg.tds) + '</td><td>' + thanhNho(tg.tds ? tg.ds / tg.tds * 100 : null) + '</td><td>' + fTyNgan(tg.dt) + '</td><td>' + fTyNgan(tg.tdt) + '</td><td>' + thanhNho(tg.tdt ? tg.dt / tg.tdt * 100 : null) + '</td><td>' + tg.dat + '/' + tg.shop + '</td>' + (ngayCon ? '<td></td>' : '') + '</tr></tbody></table>';
                                     hopTren.innerHTML = h;
                                     /* Anh Thái 06/09: gộp các mã shop O.C trùng tên trước khi liệt kê (Long Hưng & Long Hưng 2 vẫn tách) */
                                                                var mapOC = {}, nhomCT = [];
                                                                chiTiet.forEach(function (r) {
                                                                                                                       var kk = khoaOC(r.s), a = mapOC[kk];
                                                                                                                       if (!a) { a = mapOC[kk] = { s: r.s, l: r.l, sale: r.sale, ds: 0, dt: 0, t: 0, tdt: 0, n: 0, max: -1 }; nhomCT.push(a); }
                                                                                                                       a.ds += r.ds; a.dt += r.dt; a.t += r.t; a.tdt += r.tdt; a.n++;
                                                                                                                       if (r.dt > a.max) { a.max = r.dt; a.s = r.s; a.l = r.l; a.sale = r.sale; }
                                                                   });
                                                                nhomCT.sort(function (a, b) { return (a.t ? a.ds / a.t : 0) - (b.t ? b.ds / b.t : 0); });
                                                                var h2 = '<table class="bc-bang bc-bang-shop"><thead><tr><th>#</th><th>Shop</th><th>Level</th><th>Sale</th><th>Máy</th><th>Target máy</th><th>% HT máy</th><th>Doanh thu</th><th>Target DT</th><th>% HT DT</th><th>Gộp</th><th>O.C ≥200M</th><th>Đạt LV</th>' + (ngayCon ? '<th>Cần/tuần</th>' : '') + '</tr></thead><tbody>'
                                                                                                          + nhomCT.map(function (r, i) {var p = r.t ? r.ds / r.t * 100 : null, pd = r.tdt ? r.dt / r.tdt * 100 : null;
                                                        var ok = r.dt >= MOC_OC, lv = datLV(r.dt);
                                                        return '<tr' + (!r.ds ? ' class="bc-mo"' : '') + '><td>' + (i + 1) + '</td><td title="' + esc(r.s) + '">' + esc(tenShopNgan(r.s)) + '</td><td>' + esc(r.l) + '</td><td>' + esc(tenNgan(r.sale)) + '</td><td><b>' + fInt(r.ds) + '</b></td><td>' + fInt(r.t) + '</td><td>' + thanhNho(p) + '</td><td><b>' + fTyNgan(r.dt) + '</b></td><td>' + fTyNgan(r.tdt) + '</td><td>' + thanhNho(pd) + '</td>'
                                                          + '<td>' + (r.n > 1 ? '<b>' + r.n + ' mã</b>' : '<span class="bc-mo-chu">—</span>') + '</td>'
                                                           + '<td>' + (ok ? '<b class="bc-len-chu">✓</b>' : '<span class="bc-giam-chu">✗</span>') + '</td>'
                                                           + '<td>' + (lv ? '<b class="' + (OC_TT.indexOf(lv) <= OC_TT.indexOf(r.l) ? 'bc-len-chu' : 'bc-giam-chu') + '">' + esc(lv) + '</b>' : '<span class="bc-mo-chu">—</span>') + '</td>'
                                                          + (ngayCon ? '<td>' + fInt(Math.max(0, r.t - r.ds) / (ngayCon / 7)) + '</td>' : '') + '</tr>';
                                       }).join('') + '</tbody></table>';
                                     hopDuoi.innerHTML = h2;
                                     var datDs = nhomCT.filter(function (r) { return r.t && r.ds >= r.t; }).length;
                                                             var dat200 = nhomCT.filter(function (r) { return r.dt >= MOC_OC; }).length;
                                                             tenDuoi.textContent = 'TIẾN ĐỘ TỪNG SHOP O.C — ' + nhomCT.length + ' shop (đã gộp mã trùng tên)';
                                     /* Anh Thái 06/09: đếm số shop chạm mốc DT của từng gói */
                                     var demLV = {}; OC_TT.forEach(function (l) { demLV[l] = 0; });
                                     nhomCT.forEach(function (r) { var l = datLV(r.dt); if (l) demLV[l]++; });
                                     var chuoiLV = OC_TT.filter(function (l) { return demLV[l]; }).map(function (l) { return '<b>' + esc(l) + '</b> ' + demLV[l]; }).join(' · ');
                                                             chot(kq, 'Tháng ' + mSel + ' (luỹ kế ' + ngayDa + '/' + ngayThang + ' ngày): <b>' + datDs + '/' + nhomCT.length + '</b> shop O.C đạt target máy · <b>' + dat200 + '/' + nhomCT.length + '</b> shop có doanh thu ≥ 200M' + (chuoiLV ? ' · đạt gói theo doanh thu: ' + chuoiLV : '') + (ngayCon ? ' · còn ' + ngayCon + ' ngày' : '') + '.');
                        }
                        ve();
                        grid.appendChild(kq);
             })();

      /* 7. Thưởng Sale IND (mượn, chỉ tháng) · 8. Tồn kho (mượn, 2 chế độ) */
          muonKhoi(grid, 7, 'Chương trình tháng — Thưởng Sale IND', nhanThang(cd, null), timMuon(root, /Thưởng Sale/i));
          muonKhoi(grid, 8, 'Tồn kho ước tính — theo đại lý & model', 'Ảnh chụp hiện tại (Sell In − Sell Out luỹ kế) — giống nhau ở 2 chế độ', timMuon(root, /Tồn kho ước tính/i));}

    function chipDiem(d) { var cls = d > 0.3 ? 'bc-chip-len' : d < -0.3 ? 'bc-chip-giam' : 'bc-chip-0'; return '<span class="bc-chip ' + cls + '">' + (d > 0 ? '▲ +' : d < 0 ? '▼ ' : '• ') + d.toFixed(1) + '</span>'; }

    BC.dangKy('panel-mwg', { ve: veMWG, muon: [/thi đua/i] });
    BC.dangKy('panel-ka', { ve: veKA, muon: [/Thị phần/i, /chưa có PG/i] });
    BC.dangKy('panel-ind', { ve: veIND, muon: [/Thưởng Sale/i, /Tồn kho ước tính/i, /Tồn theo đại lý/i] });
  }
})();
