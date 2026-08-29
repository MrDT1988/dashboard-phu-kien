/* demo-bang.js — AP CACH TRINH BAY BANG CUA BAN DEMO LEN CAC BANG CUA DB TG.
 *
 * VI SAO CO FILE NAY
 * ------------------
 * Ban demo co 40 muc thi 20 muc chi la the ghi "giu nguyen" kem MOT CAU DAN:
 *     "Bang Target theo Sale — giu nguyen. Cach trinh bay moi: cot % hoan thanh
 *      co thanh tien do noi dong, to xanh khi >=100% va do khi <70%; hang tong
 *      tach bang ke dam thay vi to nen."
 * Nghia la: NOI DUNG bang khong doi, chi doi cach nhin. File nay lam dung the.
 *
 * CACH LAM — VI SAO CHON KIEU NAY
 * -------------------------------
 * Khong dung vao innerHTML cua bang. Chi dat  background-image  cua tung o
 * (mot dai mau chay ngang, dung ti le voi so trong o).
 * Lam vay thi:
 *   - Chu trong o KHONG DOI mot ky tu -> sap xep, tim kiem, xuat HTML, bo loc
 *     cua DB TG van chay y nguyen.
 *   - Khong them the con -> khong the lam vo ham nao dang doc td.textContent.
 *   - Muon bo thi xoa mot thuoc tinh style, khong phai dung lai bang.
 *
 * DB TG ve lai bang moi khi doi bo loc -> style bay mat. Nen co mot bo theo doi
 * (MutationObserver) dat lai sau moi lan ve. Co chong dội de khong chay lien tuc.
 *
 * KHONG chua mot con so kinh doanh nao — an toan cho repo public.
 */
(function () {
  'use strict';

  /* ---- mau, lay tu bien cua trang; co mau du phong neu trang chua dat ---- */
  function bien(n, dp) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      if (v) return v;
    } catch (e) {}
    return dp;
  }
  function mo(mau, a) {
    // mo mau xuong de con doc duoc chu tren no
    var m = String(mau).match(/^#([0-9a-f]{6})$/i);
    if (m) {
      return 'rgba(' + parseInt(m[1].slice(0, 2), 16) + ',' + parseInt(m[1].slice(2, 4), 16)
        + ',' + parseInt(m[1].slice(4, 6), 16) + ',' + a + ')';
    }
    return mau;
  }
  function MAU() {
    return {
      dat:   bien('--positive', '#2ee673'),
      hong:  bien('--negative', '#ff5c72'),
      thuong: bien('--oppo-green', '#2ad998'),
      trung: bien('--text-secondary', '#8b98a9'),
    };
  }

  /* ---- doc mot so tu chu trong o ----------------------------------------
     BAY DA DINH 29/08: DB TG viet so KHONG NHAT QUAN.
        "1.234"  -> dau cham la dau NGHIN  (kieu Viet)
        "61.0%"  -> dau cham la dau THAP PHAN (kieu Anh)
        "23,1B"  -> dau phay la dau THAP PHAN (kieu Viet)
     Ban dau em coi moi dau cham la dau nghin -> "61.0%" doc ra 610, roi bi luat
     "ngoai khoang 0..200" loai bo. Ket qua: KHONG MOT THANH NAO duoc ve, ma
     cung khong bao loi — kieu hong im lang, phai chup anh ra moi thay.
     Nen phai xet TUNG TRUONG HOP, khong duoc doan mot kieu. */
  function doc(t) {
    if (t == null) return null;
    var s = String(t).replace(/\u00a0/g, ' ').trim();
    if (!s || s === '-' || s === '\u2014') return null;
    var am = /^\(.*\)$/.test(s) || /^\s*-/.test(s);
    s = s.replace(/[^\d.,]/g, '');
    if (!s) return null;
    var chamCuoi = s.lastIndexOf('.'), phayCuoi = s.lastIndexOf(',');
    if (chamCuoi >= 0 && phayCuoi >= 0) {
      // co ca hai -> cai DUNG SAU la dau thap phan, cai kia la dau nghin
      if (phayCuoi > chamCuoi) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (phayCuoi >= 0) {
      // chi co phay: kieu Viet -> thap phan (tru khi la nhom 3 chu so lap lai)
      s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (chamCuoi >= 0) {
      // chi co cham: "1.234" la nghin, "61.0" / "9.45" la thap phan
      s = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
    }
    var v = parseFloat(s);
    if (!isFinite(v)) return null;
    return am ? -v : v;
  }

  function xoaDai(td) {
    if (td.style.backgroundImage) td.style.backgroundImage = '';
  }
  function dai(td, tiLe, mau) {
    /* Ve CA MANG NEN mo chay het o, roi phan da dat de len tren. Co mang nen thi
       mat doc ra ngay "day la thanh tien do, chay tu 0 den 100"; khong co thi
       no chi la mot khoi mau lo lung canh con so, de tuong la cot khac. */
    var p = Math.max(0, Math.min(1, tiLe)) * 100;
    /* Mang nen: nen toi thi hoi sang len, nen sang thi hoi toi di. Dung mot
       mau cho ca hai thi o che do Sang mang nen bien mat, thanh lai lo lung. */
    var sang = document.documentElement.getAttribute('data-theme') === 'light';
    var ray = sang ? 'rgba(16,24,40,.07)' : 'rgba(255,255,255,.05)';
    td.style.backgroundImage = 'linear-gradient(90deg,' + mau + ' 0 ' + p.toFixed(1)
      + '%,' + ray + ' ' + p.toFixed(1) + '% 100%)';
    td.style.backgroundRepeat = 'no-repeat';
    td.style.backgroundSize = 'calc(100% - 12px) 60%';
    td.style.backgroundPosition = '6px 50%';
    td.style.borderRadius = '4px';
  }

  /* ---- nhan ra cot -------------------------------------------------------
     BAY DA DINH 29/08: bang cua DB TG co TIEU DE HAI TANG (rowspan/colspan).
     Lay thang hang cuoi cua <thead> lam ten cot thi CHI SO LECH — o "SL Shop"
     bi to nham mot mau do nho ngay giua bang "Chi tiet theo Sale/ASM".
     Nen phai dung LUOI tieu de dung cach: rai tung o theo colspan/rowspan,
     roi ghep chu cua ca hai tang lai lam ten cot.                            */
  function luoiTieuDe(bang) {
    var h = bang.tHead;
    if (!h || !h.rows.length) {
      var r0 = bang.rows[0];
      if (!r0) return [];
      var ra0 = [];
      for (var k = 0; k < r0.cells.length; k++) ra0.push((r0.cells[k].textContent || '').trim());
      return ra0;
    }
    var luoi = [];         // luoi[hang][cot] = chu
    for (var r = 0; r < h.rows.length; r++) {
      var hang = h.rows[r];
      luoi[r] = luoi[r] || [];
      var c = 0;
      for (var i2 = 0; i2 < hang.cells.length; i2++) {
        while (luoi[r][c] !== undefined) c++;      // o da bi rowspan tang tren chiem
        var o = hang.cells[i2];
        var cs = o.colSpan || 1, rs = o.rowSpan || 1;
        var chu = (o.textContent || '').replace(/\s+/g, ' ').trim();
        for (var dr = 0; dr < rs; dr++) {
          luoi[r + dr] = luoi[r + dr] || [];
          for (var dc = 0; dc < cs; dc++) luoi[r + dr][c + dc] = chu;
        }
        c += cs;
      }
    }
    var sc = 0;
    luoi.forEach(function (x) { sc = Math.max(sc, x.length); });
    var ten = [];
    for (var q = 0; q < sc; q++) {
      var phan = [];
      for (var w = 0; w < luoi.length; w++) {
        var t = luoi[w][q];
        if (t && phan[phan.length - 1] !== t) phan.push(t);
      }
      ten.push(phan.join(' \u00b7 '));
    }
    return ten;
  }

  /* Cot % co HAI LOAI, y nghia khac han nhau — to mau giong nhau la doc sai:
       "% HT Target"  -> muc dat/khong dat. Ban demo: >=100 xanh, <70 do.
       "% S.O", "% D.thu", "Share", "Ti trong" -> phan chia cua mot tong. 34%
          thi phan KHONG PHAI la "kem", to do la vu oan cho nguoi ta. Ban demo:
          so voi TRUNG BINH VUNG (hang tong cua chinh cot do) — tren thi xanh,
          duoi thi do.                                                        */
  function loaiCot(ten) {
    if (ten.indexOf('%') < 0) return null;
    var k = ten.toUpperCase();
    if (/%\s*HT|HOÀN THÀNH|HOAN THANH|ĐẠT TARGET|TIẾN ĐỘ/.test(k)) return 'ht';
    return 'ti';
  }
  function laHangTong(tr) {
    var t = (tr.cells[0] ? tr.cells[0].textContent : '').trim().toUpperCase();
    return /^(TỔNG|TONG|TỔNG CỘNG|CỘNG|TOÀN|TOAN)\b/.test(t)
      || /(^|[\s-])(tong|total)([\s-]|$)/i.test(tr.className);
  }

  /* ---- ap cho mot bang --------------------------------------------------- */
  function apBang(bang) {
    var ten = luoiTieuDe(bang);
    if (!ten.length) return;
    var M = MAU();
    var than = bang.tBodies[0] ? bang.tBodies[0].rows : bang.rows;
    var hangTong = [];
    /* Cot nao la cot phan tram?
       BAY DA DINH 29/08: chi xet chu o TIEU DE thi sot. Bang "Hieu suat theo
       Size Shop" co cot "Ti trong DS", "Share S.O", "Share DT" — tieu de khong
       co dau %, nhung o nao trong cot cung ket thuc bang %. Ket qua: ca bang
       khong duoc mot thanh nao. Nen phai NHIN CA SO TRONG O, khong chi tieu de. */
    var soCot = 0;
    for (var q0 = 0; q0 < than.length; q0++) {
      if (than[q0].cells) soCot = Math.max(soCot, than[q0].cells.length);
    }
    var cot = [];
    for (var ci = 0; ci < soCot; ci++) {
      var tenC = ten[ci] || '';
      var co = 0, khong = 0;
      for (var ri = 0; ri < than.length && co + khong < 14; ri++) {
        var oc = than[ri].cells && than[ri].cells[ci];
        if (!oc) continue;
        var tc = (oc.textContent || '').trim();
        if (!tc || tc === '-' || tc === '\u2014') continue;
        if (/%\s*$/.test(tc)) co++; else khong++;
      }
      var laPT = (tenC.indexOf('%') >= 0) || (co >= 2 && co >= (co + khong) * 0.6);
      if (!laPT) continue;
      cot.push({ i: ci, loai: loaiCot(tenC + (tenC.indexOf('%') >= 0 ? '' : ' %')) || 'ti' });
    }

    // Muc so sanh cho cot ti trong = gia tri o HANG TONG cua chinh cot do.
    // Khong co hang tong thi dung trung binh cac hang.
    var moc = {};
    if (cot.length) {
      var gom = {};
      for (var r0 = 0; r0 < than.length; r0++) {
        var t0 = than[r0];
        if (!t0.cells || !t0.cells.length) continue;
        var tong = laHangTong(t0);
        cot.forEach(function (c) {
          var o = t0.cells[c.i]; if (!o) return;
          var v = doc(o.textContent); if (v == null) return;
          if (tong) moc[c.i] = v;
          else { gom[c.i] = gom[c.i] || []; gom[c.i].push(v); }
        });
      }
      cot.forEach(function (c) {
        var ds = gom[c.i] || [];
        var tb = ds.length ? ds.reduce(function (a, b) { return a + b; }, 0) / ds.length : null;
        var cong = ds.reduce(function (a, b) { return a + b; }, 0);
        /* Cot ti trong co hai kieu:
             (a) cac dong CHIA NHAU mot tong 100%  -> hang tong ghi 100%, lay
                 no lam moc thi dong nao cung "duoi muc" -> do het bang. Phai
                 lay TRUNG BINH cac dong.
             (b) moi dong la mot ti le rieng (vd % thi phan cua tung sale) ->
                 hang tong la ti le CUA CA VUNG, do moi dung la muc so sanh. */
        if (moc[c.i] != null && ds.length > 1 && Math.abs(cong - moc[c.i]) < 1.2) {
          moc[c.i] = tb;
        }
        if (moc[c.i] == null) moc[c.i] = tb;
      });
    }

    for (var r = 0; r < than.length; r++) {
      var tr = than[r];
      if (!tr.cells || !tr.cells.length) continue;
      if (laHangTong(tr)) { hangTong.push(tr); continue; }
      cot.forEach(function (c) {
        var o = tr.cells[c.i]; if (!o) return;
        var v = doc(o.textContent);
        if (v == null || v < 0 || v > 200) { xoaDai(o); return; }
        var mau;
        if (c.loai === 'ht') {
          mau = v >= 100 ? mo(M.dat, 0.24) : (v < 70 ? mo(M.hong, 0.22) : mo(M.trung, 0.20));
        } else {
          var m0 = moc[c.i];
          mau = (m0 == null) ? mo(M.trung, 0.20)
            : (v >= m0 ? mo(M.dat, 0.20) : mo(M.hong, 0.18));
        }
        dai(o, v / 100, mau);
      });
    }

    try { chiTietRieng(bang, ten, than); } catch (e) {}

    /* Hang tong: ban demo bo to nen, thay bang KE DAM phia tren + chu dam. */
    hangTong.forEach(function (tr) {
      tr.style.background = 'transparent';
      for (var i = 0; i < tr.cells.length; i++) {
        var o = tr.cells[i];
        o.style.background = 'transparent';
        xoaDai(o);
        o.style.borderTop = '1.5px solid ' + bien('--text-secondary', 'rgba(255,255,255,.35)');
        o.style.fontWeight = '800';
      }
    });
  }


  /* ================== BA CHI TIET RIENG BAN DEMO CO GHI ==================
     Tat ca deu lam bang  background-image  — khong dong vao chu trong o.
     Xem ghi chu dau file: giu nguyen chu thi sap xep / tim kiem / xuat HTML
     cua DB TG khong the vo vi viec nay.                                     */

  /* 1. THANH SO SANH CHO COT SO LUONG (khong phai %) — ti le voi o LON NHAT
        trong cot. Ban demo ghi cho bang TOP 10: "cot so may co thanh ngang so
        sanh truc tiep trong o"; cho bang ngan sach: "them cot thanh ti trong".
        CHI ap dung o nhung bang + cot GHI RO duoi day. Khong quet bua ca trang:
        bang KA co 13 cot thang, to thanh het thi thanh ma tran mau, khong ai
        doc duoc gi.                                                          */
  var COT_SO = [
    { bang: 'top-products-table',  cot: /S\.?O|SỐ MÁY|MÁY/i },
    { bang: 'ka-no-pg-table',      cot: /TỔNG NGÂN SÁCH|NGÂN SÁCH/i },
    { bang: 'ind-commission-table', cot: /THƯỞNG|TỔNG/i },
    { bang: 'thidua-size-table',   cot: /THƯỞNG|BONUS|DOANH THU/i },
    { bang: 'thidua-sale-table',   cot: /THƯỞNG|BONUS|DOANH THU/i },
    { bang: 'ind-ton-dl-table',    cot: /TỒN/i },
  ];

  /* 2. CHAM MAU HANG canh ten model (bang TOP 10) */
  var CHAM_HANG = [{ bang: 'top-products-table', cotTen: /MODEL|SẢN PHẨM/i, cotHang: /HÃNG/i }];

  /* 3. HUY HIEU hang 1-2-3 (bang thi dua, bang TOP 10) */
  var HUY_HIEU = ['rgba(232,180,94,.45)', 'rgba(180,190,200,.40)', 'rgba(190,130,80,.38)'];

  function thanhSo(td, tiLe) {
    var p = Math.max(0, Math.min(1, tiLe)) * 100;
    var mau = mo(bien('--oppo-green', '#2ad998'), 0.26);
    td.style.backgroundImage = 'linear-gradient(90deg,' + mau + ' 0 ' + p.toFixed(1)
      + '%,rgba(255,255,255,.05) ' + p.toFixed(1) + '% 100%)';
    td.style.backgroundRepeat = 'no-repeat';
    td.style.backgroundSize = 'calc(100% - 12px) 60%';
    td.style.backgroundPosition = '6px 50%';
    td.style.borderRadius = '4px';
  }
  function chamMau(td, mau) {
    td.style.backgroundImage = 'radial-gradient(circle at 7px 50%,' + mau + ' 0 4px, transparent 4.5px)';
    td.style.backgroundRepeat = 'no-repeat';
    if (!td.__dmCham) { td.style.paddingLeft = '19px'; td.__dmCham = 1; }
  }
  function huyHieu(td, hang) {
    var m = HUY_HIEU[hang - 1]; if (!m) { td.style.backgroundImage = ''; return; }
    td.style.backgroundImage = 'radial-gradient(circle at 50% 50%,' + m + ' 0 10px, transparent 10.5px)';
    td.style.backgroundRepeat = 'no-repeat';
    td.style.fontWeight = '800';
  }

  function chiTietRieng(bang, ten, than) {
    var id = bang.id || '';
    function timCot(re) { for (var i = 0; i < ten.length; i++) if (re.test(ten[i])) return i; return -1; }

    COT_SO.forEach(function (c) {
      if (c.bang !== id) return;
      var i = timCot(c.cot); if (i < 0) return;
      var lon = 0, gt = [];
      for (var r = 0; r < than.length; r++) {
        var o = than[r].cells && than[r].cells[i];
        var v = o ? doc(o.textContent) : null;
        gt.push(v);
        if (v != null && !laHangTong(than[r]) && v > lon) lon = v;
      }
      if (!lon) return;
      for (var r2 = 0; r2 < than.length; r2++) {
        var o2 = than[r2].cells && than[r2].cells[i]; if (!o2) continue;
        if (laHangTong(than[r2])) { xoaDai(o2); continue; }
        if (gt[r2] == null || gt[r2] < 0) { xoaDai(o2); continue; }
        thanhSo(o2, gt[r2] / lon);
      }
    });

    CHAM_HANG.forEach(function (c) {
      if (c.bang !== id || !window.DMAU) return;
      var iT = timCot(c.cotTen), iH = timCot(c.cotHang);
      if (iT < 0 || iH < 0) return;
      for (var r = 0; r < than.length; r++) {
        var oT = than[r].cells && than[r].cells[iT];
        var oH = than[r].cells && than[r].cells[iH];
        if (!oT || !oH) continue;
        var m = window.DMAU.mau((oH.textContent || '').trim());
        if (m) chamMau(oT, m);
      }
    });

    // Huy hieu 1-2-3: cot dau la so thu tu
    if (/thidua|top-products/.test(id)) {
      for (var r3 = 0; r3 < than.length; r3++) {
        var o3 = than[r3].cells && than[r3].cells[0]; if (!o3) continue;
        var h = doc(o3.textContent);
        if (h != null && h >= 1 && h <= 3 && String(o3.textContent).trim().length <= 2) huyHieu(o3, h);
      }
    }
  }

  /* ---- theo doi: DB TG ve lai bang thi dat lai ---------------------------- */
  var hen = null, doi = [];
  function xepLich(b) {
    if (doi.indexOf(b) < 0) doi.push(b);
    if (hen) return;
    hen = setTimeout(function () {
      hen = null;
      var ds = doi; doi = [];
      ds.forEach(function (x) { try { apBang(x); } catch (e) {} });
    }, 220);
  }

  function gan() {
    var ds = document.querySelectorAll('table');
    ds.forEach(function (b) {
      if (b.__dmBang) { xepLich(b); return; }
      b.__dmBang = 1;
      xepLich(b);
      try {
        new MutationObserver(function () { xepLich(b); })
          .observe(b, { childList: true, subtree: true, characterData: true });
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gan);
  else gan();
  [1500, 4000, 9000, 16000].forEach(function (ms) { setTimeout(gan, ms); });
  window.__dmBangLai = gan;
})();
