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

  /* ROBOT DI QUA, KHONG LAM GI CA.
     Robot lam du lieu cho app dien thoai (refresh-app-data.mjs) mo chinh trang
     nay, va dat window.__BO_QUA_GOI = true truoc khi trang chay. No chi can SO,
     khong nhin man hinh. Ve them mot lop SVG len 20 bieu do va gan bo theo doi
     tren moi cai bang chi lam robot cham hon va them mot cho co the vo — ma neu
     robot vo thi 20 sale mat du lieu tren app. Nen o day dung han. */
  if (window.__BO_QUA_GOI) return;

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
    /* O nao da bi doi mau chu (o to theo thang xanh) thi phai TRA LAI mau cu,
       khong thi khi bo loc doi, o het to nen ma chu van trang -> mat chu. */
    if (td.__dmChu) { td.style.color = ''; td.__dmChu = 0; }
  }

  /* ---- do sang cua nen -> chon chu den hay chu trang ----------------------
     CHEP LOGIC tu ham chuTren() cua demo-ve.js, KHONG import: hai tep duoc nap
     doc lap, tep nay khong duoc phep dua vao viec tep kia da chay xong.
     VI SAO CAN: to o theo thang mot tong thi o dam va o nhat cach nhau rat xa.
     Giu mot mau chu cho ca thang thi chac chan hong mot dau — chu trang chim
     tren o nhat, chu den chim tren o dam. Tinh do sang theo dung cong thuc
     WCAG roi chon ben nao doc ro hon, y het cach ban demo lam tren bieu do. */
  function soMau(c) {
    c = String(c || '').trim();
    var m = c.match(/^#([0-9a-f]{3})$/i);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = c.match(/rgba?\(([^)]+)\)/i);
    if (m) { var t = m[1].split(','); return [+t[0], +t[1], +t[2]]; }
    return null;
  }
  function chuTren(nen) {
    var r = soMau(nen);
    if (!r) return '#fff';
    var q = r.map(function (v) {
      v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var L2 = 0.2126 * q[0] + 0.7152 * q[1] + 0.0722 * q[2];
    var voiTrang = 1.05 / (L2 + 0.05), voiDen = (L2 + 0.05) / 0.05;
    return voiDen > voiTrang ? '#14171B' : '#fff';
  }

  /* ---- doc so CO DUOI VI (B = ty, M = trieu) -----------------------------
     BAY DA DINH: fmtVND cua DB TG viet "9,7B" va "980M" trong CUNG MOT COT.
     Doc bang doc() thi ra 9,7 va 980 -> so sanh NGUOC HAN, thanh dai nhat lai
     roi vao o nho nhat. Cho nao so sanh DO LON giua cac o thi phai dung ham
     nay; cho nao doc phan tram thi van dung doc() (phan tram khong co duoi vi). */
  function docSo(t) {
    var v = doc(t);
    if (v == null) return null;
    var s = String(t).replace(/\u00a0/g, ' ').trim();
    var m = s.match(/([BMK])\s*$/i);
    if (!m) return v;
    var k = m[1].toUpperCase();
    return v * (k === 'B' ? 1e9 : (k === 'M' ? 1e6 : 1e3));
  }

  /* ---- thang MOT TONG XANH cua ban demo ---------------------------------
     Lay thang co san trong window.DMAU (chep tu :root cua ban demo), khong tu
     pha mau: hai bang mau Sang/Toi cua demo khac nhau chu khong phai cung mot
     mau doi do sang, tu pha thi mot trong hai che do se lech tone. */
  function thangMau() {
    var D = window.DMAU;
    if (!D || !D.thang || !D.thangSang) return null;
    return D.laSang() ? D.thangSang : D.thang;
  }
  /* Cam ho phach cua ban demo (mau kenh KA): nen Toi #E8B45E, nen Sang #C98A2E. */
  function CAM() {
    var D = window.DMAU;
    if (D && D.mau) { var m = D.mau('KA'); if (m) return m; }
    return '#E8B45E';
  }

  /* To CA O theo thang mot tong: gia tri cang cao -> buoc cang dam.
     VI SAO MOT TONG chu khong phai dai nhieu mau / xanh-do:
       - Du lieu o day CO THU TU (share, doanh so) — mot tong doc duoc thu tu
         ngay, dai nhieu mau thi phai tra bang chu giai moi biet cai nao lon.
       - In den trang van con doc duoc (dam/nhat giu nguyen, mau thi mat).
       - Xanh/do la ngon ngu cua "dat / khong dat"; dung cho du lieu co thu tu
         la lam nguoi xem hieu sai ban chat con so. */
  function toThang(td, tiLe) {
    var T = thangMau(); if (!T) return;
    var i = Math.round(Math.max(0, Math.min(1, tiLe)) * (T.length - 1));
    var m = T[i];
    td.style.backgroundImage = 'linear-gradient(' + m + ',' + m + ')';
    td.style.backgroundRepeat = 'no-repeat';
    td.style.backgroundSize = 'calc(100% - 6px) calc(100% - 6px)';
    td.style.backgroundPosition = '50% 50%';
    td.style.borderRadius = '4px';
    td.style.color = chuTren(m);
    td.__dmChu = 1;
  }

  /* ---- vien thuoc om sat con so -----------------------------------------
     Ban demo dan: o duoi nguong "boc vien thuoc cam" THAY VI to ca o. To ca o
     thi cot nao cung thanh mot dai mau, nhin vao la roi mat; vien thuoc chi om
     dung con so nen mat bat ngay cai nao dang canh bao.
     Ve bang BA LOP background-image (hai nap tron hai dau + mot dai o giua) chu
     khong them the con — dung nguyen tac ghi o dau tep: chu trong o khong doi
     mot ky tu nao, nen sap xep / tim kiem / xuat HTML cua DB TG khong the vo. */
  var doChu = null;
  function beNgangChu(td) {
    /* Phai DO be ngang that. Doan theo so ky tu thi "1.234" va "16.152" ra
       bang nhau trong khi tren man hinh lech han, vien thuoc se ho mot dau. */
    try {
      if (!doChu) doChu = document.createElement('canvas').getContext('2d');
      var st = getComputedStyle(td);
      doChu.font = st.fontStyle + ' ' + st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
      return doChu.measureText((td.textContent || '').replace(/\s+/g, ' ').trim()).width;
    } catch (e) { return 0; }
  }
  function vienThuoc(td, mau) {
    var w = beNgangChu(td);
    if (!w) { xoaDai(td); return; }
    var H = 19, W = Math.max(H + 2, Math.round(w) + 16), L = (W - H) / 2, R = H / 2;
    var nap = 'radial-gradient(circle at 50% 50%,' + mau + ' 0 ' + R + 'px, transparent ' + (R + 0.5) + 'px)';
    var giua = 'linear-gradient(' + mau + ',' + mau + ')';
    td.style.backgroundImage = nap + ',' + nap + ',' + giua;
    td.style.backgroundRepeat = 'no-repeat, no-repeat, no-repeat';
    td.style.backgroundSize = H + 'px ' + H + 'px,' + H + 'px ' + H + 'px,' + (W - H) + 'px ' + H + 'px';
    td.style.backgroundPosition = 'calc(50% - ' + L + 'px) 50%, calc(50% + ' + L + 'px) 50%, 50% 50%';
    td.style.borderRadius = '';
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
      if (boQuaCot(bang.id || '', tenC)) continue;
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


  /* ============== CAC CHI TIET RIENG BAN DEMO CO GHI RO ==================
     Tat ca deu lam bang  background-image  (rieng muc 6 la  opacity ) — khong
     mot cho nao dong vao chu trong o. Xem ghi chu dau file: giu nguyen chu thi
     sap xep / tim kiem / xuat HTML cua DB TG khong the vo vi viec nay.
       1. Thanh so sanh cho cot so luong          (COT_SO)
       2. Cham mau hang canh ten model            (CHAM_HANG)
       3. Huy hieu hang 1-2-3                     (HUY_HIEU)
       4. Cot share to theo thang mot tong xanh   (THANG_XANH — B6)
       5. O duoi nguong boc vien thuoc cam        (VIEN_CAM  — B20)
       6. To nhat ca dong duoi nguong             (moNhatShop — B9)
       7. Bang nhiet theo Sale mot tong xanh      (trong chiTietRieng — B16)
       8. Thanh ti trong ngan sach ba kenh        (thanhNganSach — B5)      */

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
    /* BO 'ind-ton-dl-table / TON' khoi day: ban demo dan hai bang ton kho phai
       "boc vien thuoc cam thay vi to ca o". Thanh so cua COT_SO chinh la cach
       "to ca o" ma demo che roi. Chuyen sang VIEN_CAM ben duoi. */
  ];

  /* 4. COT SHARE TO THEO THANG MOT TONG XANH (B6 — Hieu suat theo Size Shop).
        Ban demo dan: "moi size mot dong co thanh ti trong, cot share to theo
        thang xanh". Cot "Ti trong DS" giu THANH (no la ti le chia nhau mot tong
        100%, nhin do dai la doc duoc); rieng cot Share la muc do chiem linh thi
        truong — du lieu co thu tu, to theo thang mot tong moi doc ra thu tu. */
  var THANG_XANH = [
    /* moc:100 = chuan hoa tren 0..100 chu khong tren o lon nhat cua cot.
       VI SAO: share la PHAN CUA MOT TONG, moc trong dau nguoi doc luon la 100%.
       Chuan hoa theo o lon nhat thi mot cot ma ca 5 size deu 34% se den kit het
       (o nao cung "lon nhat"), va mau cua cung mot con so 34% se NHAY DOI moi
       khi doi bo loc — nguoi xem khong the nho mau nao la tot. */
    { bang: 'mwg-size-table', cot: /SHARE/i, moc: 100 },
  ];

  /* 5. O DUOI NGUONG BOC VIEN THUOC CAM (B20 — hai bang Ton kho uoc tinh).
        khi:'duong' = con so > 0 thi canh bao (Ton > 0 nghia la hang con nam
             trong dai ly — dung dung mot quy uoc voi chinh DB TG, no da to chu
             mau ho phach #e0b24d cho dung nhung o do).
        khi:'duoiTB' = duoi trung binh cot thi canh bao (ban cham hon mat bang). */
  var VIEN_CAM = [
    { bang: 'ind-ton-model-table', cot: /^TỒN$/i,      khi: 'duong' },
    { bang: 'ind-ton-model-table', cot: /%\s*ĐÃ BÁN/i, khi: 'duoiTB' },
    { bang: 'ind-ton-dl-table',    cot: /^TỒN$/i,      khi: 'duong' },
  ];

  /* Cot da co cach to RIENG (thang xanh, vien thuoc) thi khong cho thanh
     %/xanh-do chung dam vao nua: hai lop nen se de len nhau (lop sau xoa lop
     truoc), va nguoi xem doc ra hai y nghia khac nhau tren cung mot o. */
  function boQuaCot(id, tenC) {
    var b = false;
    THANG_XANH.concat(VIEN_CAM).forEach(function (c) {
      if (c.bang === id && c.cot.test(tenC)) b = true;
    });
    return b;
  }

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

  /* ---- B9: TO NHAT HANG DUOI NGUONG — bang "Chi tiet 125 shop" -----------
     Ban demo dan: "co dinh hang tieu de khi cuon · nut loc nhanh co so dem ·
     TO NHAT HANG DUOI NGUONG". Nguong o day khong duoc tu dat: chinh mo ta
     ngay tren bang cua tg.html noi ro cai dang so la "ty trong OPPO (Doanh thu,
     DA LOAI APPLE) thap hon trung binh doi", va do cung la thu ma tick "Chi
     shop te nhat (duoi TB)" dung. Nen lay dung con so do.
     Moi shop chiem BA dong (DS / DT / DG), so % can lay nam trong badge nho
     canh cot OPPO cua dong DT (span.pct-sub). Lam mo ca ba dong, khong thi mot
     shop lai nua dam nua nhat.
     To nhat bang opacity tren <tr> — KHONG dung vao chu trong o. */
  function moNhatShop(than) {
    var moc = null, khoi = [], cur = null, i, tr, cl;
    function phanTram(hang) {
      var o = hang.cells && hang.cells[1]; if (!o) return null;
      var s = o.querySelector ? o.querySelector('.pct-sub') : null;
      if (!s) return null;
      /* BAY DA DINH 29/08: badge nay viet trong NGOAC — "(43.6%)". doc() coi
         ngoac tron la dau AM kieu ke toan, tra ve -43,6 cho MOI dong. Luc do
         phep so sanh "duoi nguong" bi lat nguoc: -30,5 KHONG nho hon -43,6 nen
         khong dong nao duoc to nhat, ma cung khong bao loi — dung kieu hong im
         lang, chup anh ra van thay bang binh thuong. Phai bo ngoac truoc khi doc. */
      return doc(String(s.textContent || '').replace(/[()]/g, ''));
    }
    for (i = 0; i < than.length; i++) {
      tr = than[i]; cl = String(tr.className || '');
      if (/total-row/.test(cl)) {
        // hang TONG cua bang chinh la ty trong OPPO cua ca doi -> lay lam nguong
        if (/row-revenue/.test(cl)) { var vT = phanTram(tr); if (vT != null) moc = vT; }
        tr.style.opacity = ''; cur = null; continue;
      }
      if (/row-units/.test(cl)) { cur = { tr: [tr], v: null }; khoi.push(cur); continue; }
      if (cur && /row-revenue/.test(cl)) { cur.tr.push(tr); cur.v = phanTram(tr); continue; }
      if (cur && /row-avgprice/.test(cl)) { cur.tr.push(tr); continue; }
      tr.style.opacity = ''; cur = null;      // dong chi tiet mo rong: de nguyen
    }
    if (moc == null) {
      // khong co hang TONG (bang dang loc) -> lay trung binh cac shop dang xem
      var c = 0, n = 0;
      khoi.forEach(function (k) { if (k.v != null) { c += k.v; n++; } });
      moc = n ? c / n : null;
    }
    khoi.forEach(function (k) {
      /* 0.55 la muc do em chon sau khi chup anh ra nhin: con doc duoc con so,
         nhung luot mat qua la biet ngay dong nao dang duoi nguong. */
      var m = (moc != null && k.v != null && k.v < moc) ? '0.55' : '';
      k.tr.forEach(function (x) { x.style.opacity = m; });
    });
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
        /* docSo chu khong doc: cot ngan sach viet lan "9,7B" voi "980M", doc
           tho thi 980 > 9,7 -> thanh dai nhat roi vao o be nhat. */
        var v = o ? docSo(o.textContent) : null;
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

    /* ---- B6: cot SHARE to theo thang mot tong xanh ---------------------- */
    THANG_XANH.forEach(function (c) {
      if (c.bang !== id) return;
      for (var ic = 0; ic < ten.length; ic++) {
        if (!c.cot.test(ten[ic] || '')) continue;
        var lonC = 0, gtC = [];
        for (var r = 0; r < than.length; r++) {
          var o = than[r].cells && than[r].cells[ic];
          var v = o ? doc(o.textContent) : null;
          gtC.push(v);
          if (v != null && !laHangTong(than[r]) && v > lonC) lonC = v;
        }
        if (c.moc) lonC = c.moc;       // cot phan tram: chuan hoa co dinh 0..100
        if (!lonC) continue;
        for (var r2 = 0; r2 < than.length; r2++) {
          var o2 = than[r2].cells && than[r2].cells[ic]; if (!o2) continue;
          if (laHangTong(than[r2]) || gtC[r2] == null || gtC[r2] < 0) { xoaDai(o2); continue; }
          toThang(o2, gtC[r2] / lonC);
        }
      }
    });

    /* ---- B20: o duoi nguong boc vien thuoc cam -------------------------- */
    VIEN_CAM.forEach(function (c) {
      if (c.bang !== id) return;
      var i = timCot(c.cot); if (i < 0) return;
      var gt = [], cong = 0, dem = 0;
      for (var r = 0; r < than.length; r++) {
        var o = than[r].cells && than[r].cells[i];
        var v = (o && !laHangTong(than[r])) ? docSo(o.textContent) : null;
        gt.push(v);
        if (v != null) { cong += v; dem++; }
      }
      var tb = dem ? cong / dem : null;
      for (var r2 = 0; r2 < than.length; r2++) {
        var o2 = than[r2].cells && than[r2].cells[i]; if (!o2) continue;
        var v2 = gt[r2], canhBao = false;
        if (v2 != null) {
          /* duoiTB chi co nghia khi co it nhat HAI so de lay trung binh; mot
             dong thi trung binh chinh la no, so voi chinh minh la vo nghia. */
          canhBao = (c.khi === 'duong') ? (v2 > 0) : (dem >= 2 && tb != null && v2 < tb);
        }
        if (canhBao) vienThuoc(o2, mo(CAM(), 0.34));
        else xoaDai(o2);
      }
    });

    /* ---- B16: bang nhiet theo Sale — mot tong xanh OPPO nhat -> dam ------
       Bang nhiet nay khong co id, nhan ra bang lop .ind-sale-heat-table.
       Chuan hoa theo o lon nhat cua CA BANG (bo hang TONG ra, khong thi hang
       tong lon gap chuc lan se dim moi o con lai xuong buoc nhat nhat). */
    if (/ind-sale-heat-table/.test(bang.className || '')) {
      var lonN = 0, gtN = [];
      for (var rh = 0; rh < than.length; rh++) {
        var hg = than[rh], dong = [], bo = laHangTong(hg);
        for (var ch = 1; ch < hg.cells.length; ch++) {
          var vN = docSo(hg.cells[ch].textContent);
          dong.push(vN);
          if (!bo && vN != null && vN > lonN) lonN = vN;
        }
        gtN.push(dong);
      }
      for (var rh2 = 0; rh2 < than.length; rh2++) {
        var hg2 = than[rh2];
        if (laHangTong(hg2)) continue;              // hang TONG da co ke dam + chu dam
        for (var ch2 = 1; ch2 < hg2.cells.length; ch2++) {
          var o6 = hg2.cells[ch2], v6 = gtN[rh2][ch2 - 1];
          if (!lonN || v6 == null || v6 <= 0) { xoaDai(o6); continue; }
          toThang(o6, v6 / lonN);
        }
      }
    }

    /* ---- B9: to nhat hang duoi nguong (bang chi tiet 125 shop) ---------- */
    if (id === 'shop-combined-table') { moNhatShop(than); }

    // Huy hieu 1-2-3: cot dau la so thu tu
    if (/thidua|top-products/.test(id)) {
      for (var r3 = 0; r3 < than.length; r3++) {
        var o3 = than[r3].cells && than[r3].cells[0]; if (!o3) continue;
        var h = doc(o3.textContent);
        if (h != null && h >= 1 && h <= 3 && String(o3.textContent).trim().length <= 2) huyHieu(o3, h);
      }
    }
  }

  /* ================== B5 · THANH TI TRONG NGAN SACH THEO KENH ==============
     Ban demo dan cho muc "Tong Chuong trinh Ban hang theo Kenh":
        "Giu du cot. Them cot thanh ti trong ngan sach de so nhanh giua cac kenh."
     LUU Y KHAC VOI 4 MUC KIA: muc nay trong tg.html KHONG PHAI mot <table>, ma
     la BA THE canh nhau (MWG / KA / IND), moi the ket bang mot dong "Tong". Da
     grep het id bang trong tg.html, khong co bang nao thuoc muc nay. Nen khong
     dung duoc COT_SO; nhung y cua cau dan van lam duoc nguyen ven: ve mot thanh
     ngang duoi dong "Tong" cua tung the, dai ti le voi the co ngan sach LON
     NHAT. Nhin ba the mot luot la biet kenh nao dang an nhieu tien nhat, khong
     phai doc ba con so co duoi vi khac nhau roi tu chia trong dau.
     Van la background-image tren the CO SAN — khong dung vao chu, khong them
     the con, dung nguyen tac ghi o dau tep.                                  */
  var THE_KENH = [
    ['channel-program-mwg-result', 'MWG'],
    ['channel-program-ka-result',  'KA'],
    ['channel-program-ind-result', 'IND'],
  ];
  function dongTong(el) {
    // programCardWrap boc cac dong trong mot khung; dong cuoi cung la dong "Tong"
    var boc = el.firstElementChild;
    if (!boc || !boc.children || !boc.children.length) return null;
    return boc.children[boc.children.length - 1];
  }
  function thanhNganSach() {
    var ds = [], lon = 0;
    THE_KENH.forEach(function (k) {
      var el = document.getElementById(k[0]); if (!el) return;
      var d = dongTong(el); if (!d) return;
      /* Con so nam trong <div> cuoi cua <span> ben phai. Doc ca dong cung ra
         dung so vi nhan "Tong" khong co chu so nao, nhung nhat dung o cho no
         thi doi nhan sau nay cung khong vo. */
      var oSo = d.querySelector('span:last-child > div:last-child');
      var v = docSo(oSo ? oSo.textContent : d.textContent);
      ds.push({ d: d, ten: k[1], v: v });
      if (v != null && v > lon) lon = v;
    });
    ds.forEach(function (x) {
      // chua chon Thang -> the dang la loi nhac, khong co so de so
      if (!lon || x.v == null || x.v < 0) { x.d.style.backgroundImage = ''; return; }
      var mau = (window.DMAU && window.DMAU.mau(x.ten)) || bien('--oppo-green', '#2ad998');
      var p = Math.max(0, Math.min(1, x.v / lon)) * 100;
      /* Mang nen: nen toi thi hoi sang len, nen sang thi hoi toi di — khong co
         mang thi thanh ngan cua kenh nho nhin nhu mot vach lo lung. */
      var sang = document.documentElement.getAttribute('data-theme') === 'light';
      var ray = sang ? 'rgba(16,24,40,.10)' : 'rgba(255,255,255,.08)';
      x.d.style.backgroundImage = 'linear-gradient(90deg,' + mau + ' 0 ' + p.toFixed(1)
        + '%,' + ray + ' ' + p.toFixed(1) + '% 100%)';
      x.d.style.backgroundRepeat = 'no-repeat';
      x.d.style.backgroundSize = '100% 6px';
      x.d.style.backgroundPosition = '0 100%';
      x.d.style.paddingBottom = '13px';
      x.d.style.borderRadius = '3px';
    });
  }
  function ganKenh() {
    var s = document.getElementById('channel-program-section');
    if (!s) return;
    try { thanhNganSach(); } catch (e) {}
    if (s.__dmKenh) return;
    s.__dmKenh = 1;
    /* Doi Thang thi DB TG dung lai ca ba the -> style bay mat, phai dat lai.
       Bo theo doi chi nghe childList/characterData nen viec minh doi style
       (thuoc tinh) khong tu goi lai chinh minh. */
    var h2 = null;
    try {
      new MutationObserver(function () {
        if (h2) return;
        h2 = setTimeout(function () { h2 = null; try { thanhNganSach(); } catch (e) {} }, 220);
      }).observe(s, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
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
    try { ganKenh(); } catch (e) {}
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
