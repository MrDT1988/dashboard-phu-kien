/* demo-chart-shim.js — DOI 20 BIEU DO CUA DB TG SANG CACH VE CUA BAN DEMO.
 *
 * CACH LAM VA VI SAO CHON CACH NAY
 * --------------------------------
 * Khong sua 20 cho goi new Chart(...) trong tg.html. Ly do:
 *   - Moi cho goi nam sau hang tram dong tinh toan rieng; sua tay 20 cho la 20
 *     co hoi lam vo mot bieu do dang chay tot.
 *   - tg.html con goi lai chart.update() khi doi bo loc. Sua tay thi phai lan
 *     theo tung duong do.
 * Nen: GIU NGUYEN Chart.js chay ben duoi (nen no van tinh, van cap nhat, van
 * biet ai an ai hien), chi PHU mot lop SVG cua ban demo len tren va lam mo canvas.
 * Doc so lieu tu chinh doi tuong chart dang song -> luon dung voi bo loc hien tai.
 *
 * DOI CHIEU voi ban demo (40 muc thi 20 muc la the "giu nguyen", 20 muc con lai
 * la 20 bieu do nay — khop 1:1):
 *     cot chong doc          -> veChong
 *     cot chong ngang        -> ve100   (doi ve % tung dong)
 *     duong                  -> veDuong
 *     tron / vanh khuyen     -> veVong
 *
 * BAY DA DINH 29/08 (lam TRANG HET bieu do o ban xem thu):
 *   Lan truoc em sua thang vao  chart.options  — trong Chart.js v4 do la ban DA
 *   PHAN GIAI qua proxy, gan nguoc vao sinh "Recursion detected: _scriptable".
 *   O day KHONG GAN GI vao chart ca — chi DOC. Nen khong dinh lai bay do.
 */
(function () {
  'use strict';

  var DOI_MAU = { rgba: 1 };  // giu cho de doc: mau lay tu phan tu da ve, la mau that

  function soDoi(ch) {
    /* Van tay cua du lieu dang ve. Chi ve lai khi doi -> khong dot CPU moi khung. */
    var d = ch.data || {}, r = (d.labels || []).length + '|';
    (d.datasets || []).forEach(function (s, i) {
      var m = null; try { m = ch.getDatasetMeta(i); } catch (e) {}
      r += (s.label || i) + ':' + (m && m.hidden ? 'x' : 'o') + ':'
        + (s.data || []).map(function (v) {
          return (v && typeof v === 'object') ? (v.y != null ? v.y : v.x) : v;
        }).join(',') + ';';
    });
    return r;
  }

  function mauCua(ch, i, j) {
    /* Mau THAT sau khi Chart.js phan giai (co the la ham, mang, hoac chuoi). */
    try {
      var m = ch.getDatasetMeta(i);
      var el = m && m.data && m.data[j || 0];
      if (el && el.options && el.options.backgroundColor) return el.options.backgroundColor;
      if (el && el.options && el.options.borderColor) return el.options.borderColor;
    } catch (e) {}
    var s = (ch.data.datasets[i] || {});
    var c = s.backgroundColor != null ? s.backgroundColor : s.borderColor;
    if (Array.isArray(c)) return c[j || 0];
    if (typeof c === 'string') return c;
    return '#8b98a9';
  }

  /* Doi mau sang bang mau cua ban demo khi nhan doi chieu duoc. Nhan nao khong
     co trong bang thi GIU NGUYEN mau cu cua DB TG — khong bao gio tu che mau. */
  function mauDemo(ten, mauCu) {
    if (!window.DMAU) return mauCu;
    return window.DMAU.mau(ten) || mauCu;
  }
  function mauBo(tenDs, mauCu) {
    if (!window.DMAU) return mauCu;
    var thang = window.DMAU.thangPhanKhuc(tenDs);
    if (thang) return thang;
    return tenDs.map(function (t, i) { return window.DMAU.mau(t) || mauCu[i]; });
  }

  function so(v) {
    if (v == null) return 0;
    if (typeof v === 'object') return Number(v.y != null ? v.y : v.x) || 0;
    return Number(v) || 0;
  }

  function hienDs(ch) {
    var goc = ch.config && ch.config.type;
    return (ch.data.datasets || []).map(function (s, i) {
      var an = false; try { an = !!ch.getDatasetMeta(i).hidden; } catch (e) {}
      return { i: i, s: s, an: an };
    }).filter(function (x) {
      if (x.an) return false;
      /* Bo duong "Tổng (xu hướng)" gan chong len bieu do cot.
         DB TG them duong nay de nhin ra tang/giam ma khong phai cong nham hai
         cot. Cach ve cua ban demo GHI SAN TONG tren dinh tung cot — nen duong
         do thanh thua, va neu de lai thi no bi cong vao chong, tong sai gap doi.
         Day la dataset DUY NHAT trong tg.html co type rieng (da soi het file). */
      if (x.s.type && goc && x.s.type !== goc) return false;
      return true;
    });
  }

  /* ---- hop chua lop SVG, dat de len tren canvas ------------------------- */
  function hopCua(ch) {
    var c = ch.canvas;
    if (c.__dmvHop && c.__dmvHop.isConnected) return c.__dmvHop;
    var cha = c.parentNode;
    if (!cha) return null;
    if (getComputedStyle(cha).position === 'static') cha.style.position = 'relative';
    var h = document.createElement('div');
    h.className = 'dmv dmv-hop';
    /* BAY DA DINH 29/08: dat inset:0 thi lop phu trum CA the cha — ma the cha
       con chua tieu de, mo ta, nut loc. Ket qua: bieu do bi keo len de vao chu,
       chu giai de vao nhan truc x. Phai dat DUNG O CANVAS, khong phai o the cha. */
    h.style.cssText = 'position:absolute;display:flex;flex-direction:column;'
      + 'justify-content:flex-start;pointer-events:auto';
    cha.appendChild(h);
    var trong = document.createElement('div');
    h.appendChild(trong);
    h.__ve = trong;
    // Canvas van song (Chart.js van tinh, van bat su kien chu giai cua no) —
    // chi khong nhin thay nua. KHONG display:none: se lam Chart.js co lai bang 0.
    c.style.opacity = '0';
    c.style.pointerEvents = 'none';
    c.__dmvHop = h;
    return h;
  }

  /* ---- doi mot bieu do sang cach ve cua demo ---------------------------- */
  function ve(ch) {
    if (!window.DMV) return;
    var loai = ch.config && ch.config.type;
    if (!loai) return;
    var van = soDoi(ch);
    if (ch.__dmvVan === van && ch.canvas.__dmvHop && ch.canvas.__dmvHop.isConnected) return;
    var hop = hopCua(ch); if (!hop) return;
    ch.__dmvVan = van;
    // Bam theo o cua canvas, tinh lai moi lan ve (bo loc doi -> canvas doi co)
    var c0 = ch.canvas;
    hop.style.left = c0.offsetLeft + 'px';
    hop.style.top = c0.offsetTop + 'px';
    hop.style.width = c0.offsetWidth + 'px';
    hop.style.height = c0.offsetHeight + 'px';

    var nhan = (ch.data.labels || []).map(function (x) { return String(x); });
    var ds = hienDs(ch);
    if (!nhan.length || !ds.length) { hop.__ve.innerHTML = ''; return; }

    var W = Math.max(c0.offsetWidth || 0, 320);
    var H = Math.max(c0.offsetHeight || 0, 180);
    /* Chu giai nam DUOI bieu do, khong de len chu truc x. SVG co ti le co dinh
       theo viewBox nen phai chua san cho: bot chieu cao truyen cho bo ve. */
    var coCG = ds.length > 1;
    var Hv = coCG ? Math.max(H - 30, 140) : H;

    var o = ch.options || {};
    var truc = (o.scales || {});
    var chong = !!((truc.x && truc.x.stacked) || (truc.y && truc.y.stacked));
    var ngang = o.indexAxis === 'y';

    if (loai === 'pie' || loai === 'doughnut') {
      var d0 = ds[0].s;
      var data = nhan.map(function (t, i) { return [t, so((d0.data || [])[i])]; })
        .filter(function (x) { return x[1] > 0; });
      var mau = mauBo(data.map(function (x) { return x[0]; }),
        data.map(function (x) { return mauCua(ch, ds[0].i, nhan.indexOf(x[0])); }));
      /* So o giua vanh phai RUT GON. Do 29/08: doanh thu ghi tho
         "274.010.000.000" tran ra ngoai vanh, de len ca nhan %.
         Ban demo ghi "37,0" kem chu "tỷ" — lam dung nhu vay. */
      var lon = Math.max.apply(null, data.map(function (x) { return x[1]; }));
      var chia = 1, dvT = '', dec = 0;
      if (lon >= 1e9) { chia = 1e9; dvT = 'tỷ đồng'; dec = 1; }
      else if (lon >= 1e6) { chia = 1e6; dvT = 'triệu đồng'; dec = 1; }
      if (chia > 1) data = data.map(function (x) { return [x[0], x[1] / chia]; });
      hop.__ve.style.maxWidth = '330px';
      hop.__ve.style.margin = '0 auto';
      window.DMV.veVong(hop.__ve, data, { mau: mau, dec: dec, dvTong: dvT });
      chuThich(hop, data.map(function (x) { return x[0]; }), mau);
      return;
    }

    if (loai === 'line') {
      var series = ds.map(function (x) {
        return {
          t: x.s.label || ('Nhóm ' + (x.i + 1)),
          v: (x.s.data || []).map(so),
          c: mauDemo(x.s.label, mauCua(ch, x.i, 0)),
          noi: ds.length === 1 ? true : undefined,
        };
      });
      /* CAT DUOI cac ky CHUA CO SO LIEU.
         DB TG luon tra ve du 12 thang, thang chua toi thi bang 0. Ve nguyen thi
         duong lao thang xuong 0 tu T9 den T12 — nhin nhu ca vung sup do, trong
         khi that ra la chua toi thang do. Ban demo dung tham so "co" de cat.  */
      var co = nhan.length;
      while (co > 1 && series.every(function (s2) { return !s2.v[co - 1]; })) co--;
      /* Duong moc: bieu do % hoan thanh target thi 100% la moc dat/khong dat.
         Nhan ra qua chu "%" hoac chu "target" trong tieu de truc / ten bieu do. */
      var chuTruc = '';
      try {
        chuTruc = JSON.stringify([(o.plugins && o.plugins.title && o.plugins.title.text) || '',
          ch.canvas.id || '']).toLowerCase();
      } catch (e) {}
      var laHT = /target|hoan|%/.test(chuTruc)
        || series.some(function (s2) { return s2.v.some(function (v) { return v > 60 && v < 400; }); });
      window.DMV.veDuong(hop.__ve, nhan, series, {
        W: W, H: Hv, PR: coCG ? 22 : 68, hau: '%', co: co,
        moc: laHT ? 100 : null,
        soTrenDiem: co <= 14,
        /* Co chu giai duoi roi thi bo ten dat o cuoi duong — cac duong hoi tu
           o thang cuoi thi ba cai ten chong len nhau, doc khong ra. */
        tenCuoi: !coCG,
      });
      chuThich(hop, series.map(function (s) { return s.t; }), series.map(function (s) { return s.c; }));
      return;
    }

    if (loai !== 'bar') return;   // loai khac thi de nguyen Chart.js ve

    if (ngang) {
      /* Cot chong NGANG: ban demo ve bang ve100 — moi dong quy ve 100%.
         Chi lam vay khi that su la ti trong; neu khong thi tu quy doi, vi
         mat thang do tuyet doi o day khong mat thong tin gi (so nam trong
         chu thich khi ro chuot). */
      var bo = ds.map(function (x) {
        return [x.s.label || ('Nhóm ' + (x.i + 1)), nhan.map(function (_, i) { return so((x.s.data || [])[i]); })];
      });
      var tongD = nhan.map(function (_, i) {
        return bo.reduce(function (a, b) { return a + b[1][i]; }, 0) || 1;
      });
      var boPT = bo.map(function (b) {
        return [b[0], b[1].map(function (v, i) { return v / tongD[i] * 100; })];
      });
      var mauN = mauBo(bo.map(function (b2) { return b2[0]; }),
        ds.map(function (x) { return mauCua(ch, x.i, 0); }));
      window.DMV.ve100(hop.__ve, nhan, boPT, mauN, { W: Math.max(W, 460), rowH: Math.max(Math.min(Hv / nhan.length, 40), 24) });
      chuThich(hop, bo.map(function (b) { return b[0]; }), mauN);
      return;
    }

    var sr = ds.map(function (x) {
      return { t: x.s.label || ('Nhóm ' + (x.i + 1)), v: (x.s.data || []).map(so), c: mauCua(ch, x.i, 0) };
    });
    var mauSr = mauBo(sr.map(function (x) { return x.t; }), sr.map(function (x) { return x.c; }));
    sr.forEach(function (x, i) { x.c = mauSr[i]; });
    /* Cot chong 100%: tong cot nao cung ~100 -> ghi "100" tren dinh moi cot la
       rac. Bo so tong di, va doi don vi sang %. */
    var tongC = nhan.map(function (_, i) { return sr.reduce(function (a, s) { return a + s.v[i]; }, 0); });
    var laPT = tongC.length > 1 && tongC.every(function (t) { return t === 0 || Math.abs(t - 100) < 0.6; });
    /* Bieu do THEO NGAY: ban demo dan them duong trung binh 7 ngay.
       Chi ap cho bieu do theo ngay (nhan la so ngay, >= 20 cot) — bieu do theo
       thang chi co 12 cot, trung binh truot o do khong noi len dieu gi. */
    var duong = null;
    if (/daily|ngay/i.test(ch.canvas.id || '') && nhan.length >= 20 && !laPT) {
      duong = tongC.map(function (_, i) {
        if (i < 6) return null;
        var c2 = 0, n2 = 0;
        for (var k = i - 6; k <= i; k++) { if (tongC[k] > 0) { c2 += tongC[k]; n2++; } }
        return n2 ? c2 / n2 : null;
      });
      if (duong.filter(function (x) { return x != null; }).length < 3) duong = null;
    }
    /* So tien (hang trieu tro len) phai rut gon, neu khong cac so tren dinh cot
       de chong len nhau. Nhan ra bang DO LON, khong bang ten cot — ten cot cua
       DB TG khong nhat quan. */
    var lonNhat = Math.max.apply(null, tongC.concat([0]));
    var canRutGon = lonNhat >= 1e6;
    window.DMV.veChong(hop.__ve, nhan, sr, {
      W: W, H: Hv, duong: duong, rutGon: canRutGon,
      fx: nhan.length > 20 ? 7 : (nhan.length > 12 ? 9.5 : 11),
      dec: laPT ? 1 : (tongC.some(function (t) { return t > 0 && t < 60; }) ? 1 : 0),
      dv: laPT ? '%' : '',
      tong: !laPT,
    });
    chuThich(hop, sr.map(function (s) { return s.t; }), sr.map(function (s) { return s.c; }));
  }

  function chuThich(hop, ten, mau) {
    if (ten.length < 2) { if (hop.__lg) hop.__lg.innerHTML = ''; return; }
    if (!hop.__lg) {
      var lg = document.createElement('div');
      hop.appendChild(lg); hop.__lg = lg;
    }
    window.DMV.legend(hop.__lg, ten, function (k, i) { return mau[i]; });
  }

  /* ---- gan vao Chart.js -------------------------------------------------- */
  function gan() {
    if (!window.Chart || !window.Chart.register || window.Chart.__dmvDaGan) return false;
    window.Chart.__dmvDaGan = true;
    window.Chart.register({
      id: 'dmvDemo',
      afterRender: function (ch) { try { ve(ch); } catch (e) { console.warn('dmv:', e && e.message); } },
      afterDatasetsUpdate: function (ch) { ch.__dmvVan = null; },
      afterDestroy: function (ch) {
        try { var h = ch.canvas.__dmvHop; if (h) h.remove(); ch.canvas.__dmvHop = null; } catch (e) {}
      },
    });
    return true;
  }

  function quet() {
    try {
      var ds = (window.Chart && window.Chart.instances) || {};
      Object.keys(ds).forEach(function (k) { try { ve(ds[k]); } catch (e) {} });
    } catch (e) {}
  }

  if (!gan()) {
    var n = 0;
    var t = setInterval(function () { if (gan() || ++n > 200) clearInterval(t); }, 60);
  }
  // Bieu do da dung len truoc khi khoi nay chay, va nhung cai ve lai khi doi bo loc
  [800, 2500, 6000, 12000, 20000].forEach(function (ms) { setTimeout(quet, ms); });
  addEventListener('resize', function () {
    try {
      var ds = (window.Chart && window.Chart.instances) || {};
      Object.keys(ds).forEach(function (k) { if (ds[k]) ds[k].__dmvVan = null; });
    } catch (e) {}
    setTimeout(quet, 250);
  });
  /* Doi Sang/Toi -> mau doi HET, nhung du lieu khong doi nen van tay khong doi
     -> quet() se bo qua sach. Phai XOA van tay truoc roi moi ve lai. */
  window.__dmvVeLai = function () {
    try {
      var ds = (window.Chart && window.Chart.instances) || {};
      Object.keys(ds).forEach(function (k) { if (ds[k]) ds[k].__dmvVan = null; });
    } catch (e) {}
    quet();
  };
})();

/* ---- CHAM MAU TREN NUT TAB PHAI KHOP VOI BIEU DO ------------------------
   DB TG ghi cham bang emoji: 🟡 MWG · 🔵 KA · 🟢 IND. Bieu do gio ve theo bang
   mau cua ban demo (MWG xanh la · IND xanh duong · KA ho phach) — de nguyen
   emoji thi tab noi mot dang, bieu do noi mot dang, nguoi xem doc sai kenh.
   Doi emoji thanh mot cham to dung mau. Chi dong vao ba nut tab, khong dong
   vao bat ky chu nao khac cua trang.                                        */
(function () {
  'use strict';
  function cham(mau) {
    return '<span style="display:inline-block;width:9px;height:9px;border-radius:3px;'
      + 'background:' + mau + ';margin-right:7px;vertical-align:1px"></span>';
  }
  function doiCham() {
    if (!window.DMAU) return false;
    var ds = document.querySelectorAll('.db-tg-tab');
    if (!ds.length) return false;
    var co = { '🟡': 1, '🔵': 1, '🟢': 1 };
    ds.forEach(function (b) {
      if (b.__dmvCham) return;
      var t = b.textContent || '';
      var e = t.trim().charAt(0) + (t.trim().charAt(1) === '️' ? '️' : '');
      var dau = t.trim().slice(0, 2);
      if (!co[dau] && !co[e]) return;
      var ten = t.replace(/^[^A-Za-zÀ-ỹ]+/, '').trim();          // "Chi tiết MWG"
      var kenh = (ten.match(/MWG|KA|IND/) || [])[0];
      if (!kenh) return;
      /* Nut tab nam tren DAI XANH DAM cua dau trang o CA HAI che do. Nen phai
         lay mau cua bang NEN TOI, khong lay theo che do dang chon — neu khong
         thi o che do Sang cham MWG (#006B33) nam tren dai xanh dam va bien mat. */
      var nenToi = true;
      try {
        var bg = getComputedStyle(b).backgroundColor
          || getComputedStyle(b.parentNode).backgroundColor;
        var q = String(bg).match(/rgba?\(([^)]+)\)/);
        if (q) {
          var v = q[1].split(',').map(Number);
          if ((v.length < 4 || v[3] > 0.5) && (v[0] + v[1] + v[2]) / 3 > 140) nenToi = false;
        }
      } catch (e) {}
      var m = nenToi ? window.DMAU.mauToi(kenh) : window.DMAU.mau(kenh);
      if (!m) return;
      b.innerHTML = cham(m) + ten;
      b.__dmvCham = true;
    });
    return true;
  }
  var n = 0;
  var t = setInterval(function () { if (doiCham() || ++n > 100) clearInterval(t); }, 120);
  // Doi Sang/Toi thi cham cung phai doi mau theo
  window.__dmChamLai = function () {
    [].forEach.call(document.querySelectorAll('.db-tg-tab'), function (b) { b.__dmvCham = 0; });
    doiCham();
  };
})();
