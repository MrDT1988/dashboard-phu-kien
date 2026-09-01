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

  /* ROBOT DI QUA, KHONG LAM GI CA.
     Robot lam du lieu cho app dien thoai (refresh-app-data.mjs) mo chinh trang
     nay, va dat window.__BO_QUA_GOI = true truoc khi trang chay. No chi can SO,
     khong nhin man hinh. Ve them mot lop SVG len 20 bieu do va gan bo theo doi
     tren moi cai bang chi lam robot cham hon va them mot cho co the vo — ma neu
     robot vo thi 20 sale mat du lieu tren app. Nen o day dung han. */
  if (window.__BO_QUA_GOI) return;

  var DOI_MAU = { rgba: 1 };  // giu cho de doc: mau lay tu phan tu da ve, la mau that

  /* ---- BANG DE THEO ID CANVAS ------------------------------------------
   * VI SAO PHAI CO BANG NAY:
   *   Cho tren, khoi ve() suy ra DANG bieu do tu chart.config.type cua Chart.js.
   *   Suy the dung cho 14/20 cho, nhung SAI cho 6 cho — vi DB TG dung cot chong
   *   DOC cho ca nhung thu ban demo ve bang thanh NGANG hoac bang DUONG:
   *     - Ti trong phan khuc gia (theo kenh / theo so luong / theo hang / hang
   *       theo phan khuc): demo ve THANH NGANG 100%, moi dong mot doi tuong.
   *       Cot doc 100% chong 7 manh thi khong doc duoc manh nao, va nhan truc x
   *       phai xoay nghieng; thanh ngang thi ten doi tuong nam ngang, doc thang.
   *     - Thi phan theo hang theo thang: demo ve DUONG, OPPO to dam cac hang khac
   *       lam mo — vi day la cau hoi "OPPO dang len hay xuong so voi ho", cot
   *       chong khong tra loi duoc.
   *   Khong the doan tu config duoc: ca 6 cai deu la bar + stacked + max 100,
   *   giong het 14 cai kia. Nen phai GHI THANG TEN CANVAS ra day.
   *   So do (rowH / PL / W / fn / fs) chep dung tu loi goi cua ban demo.
   */
  var DE = {
    // ve100('cSegKenh',SEGK.nh,SEGK.bo,PSEG,{rowH:28,PL:56,W:390,fn:11,fs:10.5})
    'chart-segment-channel': { kieu: 've100', opt: { rowH: 28, PL: 56, W: 390, fn: 11, fs: 10.5 } },
    // ve100('cSegUnits',SEGU.nh,SEGU.bo,PSEG,{rowH:30,PL:36})
    'chart-segment-units':   { kieu: 've100', opt: { rowH: 30, PL: 36 } },
    // ve100('cSeg',SEGH.nh,SEGH.bo,[--apple,--samsung,...],{rowH:26,PL:56})
    'chart-segment':         { kieu: 've100', opt: { rowH: 26, PL: 56 } },
    // ve100('cBrandSeg',HSEG.nh,HSEG.bo,PSEG,{rowH:26,PL:62})
    'chart-brand-segment':   { kieu: 've100', opt: { rowH: 26, PL: 62 } },
    // veDuong('cShare',TH,dsHang.map(k=>({...,noi:k==='OPPO'})))
    'chart-monthly-brand':   { kieu: 'veDuong', noi: 'OPPO' },
    // veVong('cPieDT',renoNam,...) ve canh veVong('cPieDS',PIE,...)
    'chart-channel-revenue-pie': { keo: 'reno' },
  };
  function deCua(ch) {
    try { return DE[ch.canvas.id] || null; } catch (e) { return null; }
  }

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

  /* Hop la flex-column. Khi coKhung() ha chieu cao hop xuong, cac the con se
     bi flex BOP LAI (flex-shrink mac dinh la 1) — SVG thap di, do lai thay
     "thua" them, lai ha nua: vong lap co dan khong dung. Khoa lai. */
  function khoaCo() {
    if (document.getElementById('dmv-khoa-co')) return;
    var st = document.createElement('style');
    st.id = 'dmv-khoa-co';
    st.textContent = '.dmv-hop>*{flex:0 0 auto}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---- hop chua lop SVG, dat de len tren canvas ------------------------- */
  function hopCua(ch) {
    khoaCo();
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

  /* ---- ve100: moi NHAN mot dong, moi dataset mot manh trong dong -------- */
  function veTiTrong(hop, ch, nhan, ds, Hv, opt) {
    var bo = ds.map(function (x) {
      return [x.s.label || ('Nhóm ' + (x.i + 1)),
        nhan.map(function (_, i) { return so((x.s.data || [])[i]); })];
    });
    /* Quy ve 100% tung dong. DB TG da tinh san ra % o may cho nay, nhung khong
       phai cho nao cung vay — chia lai la phep khong doi voi so da la %, nen
       lam that thay vi phai nho cho nao da chia roi. */
    var tongD = nhan.map(function (_, i) {
      return bo.reduce(function (a, b) { return a + b[1][i]; }, 0) || 1;
    });
    var boPT = bo.map(function (b) {
      return [b[0], b[1].map(function (v, i) { return v / tongD[i] * 100; })];
    });
    var mauN = mauBo(bo.map(function (b) { return b[0]; }),
      ds.map(function (x) { return mauCua(ch, x.i, 0); }));
    var o2 = {};
    Object.keys(opt || {}).forEach(function (k) { o2[k] = opt[k]; });
    /* Khong de bo thanh CAO HON o canvas. SVG giu ti le theo viewBox va
       overflow:visible, nen neu de nguyen rowH cua demo voi so dong nhieu hon
       demo thi no tran xuong de len bang ngay ben duoi. */
    var caoToiDa = (Hv - 14) / Math.max(nhan.length, 1);
    o2.rowH = Math.max(Math.min(o2.rowH || 30, caoToiDa), 18);
    window.DMV.ve100(hop.__ve, nhan, boPT, mauN, o2);
    chuThich(hop, bo.map(function (b) { return b[0]; }), mauN);
  }

  /* ---- veDuong: moi dataset mot duong ----------------------------------- */
  function veDuongTu(hop, ch, nhan, ds, W, Hv, opt) {
    opt = opt || {};
    /* CAT BO COT GOP.
       DB TG dan them cot "2026" (trung binh ca nam) o dau va cot "Tổng" o cuoi
       khi xem theo tuan. Voi cot chong thi hai cot do doc duoc; voi DUONG thi
       khong — noi mot diem trung binh ca nam vao chuoi thoi gian la ve mot doan
       doc khong co that. Ban demo chi co T1..T12, khong co cot gop nao. */
    var d = 0, c = nhan.length;
    if (c > 1 && /^\s*\d{4}\s*$/.test(nhan[0])) d = 1;
    if (c - d > 1 && /^\s*(tổng|tong|total)\s*$/i.test(nhan[c - 1])) c--;
    var nhan2 = nhan.slice(d, c);
    var noiTen = String(opt.noi || '').toUpperCase();
    var series = ds.map(function (x) {
      var t = x.s.label || ('Nhóm ' + (x.i + 1));
      return {
        t: t,
        v: (x.s.data || []).slice(d, c).map(so),
        c: mauDemo(t, mauCua(ch, x.i, 0)),
        /* noi = duong "chinh", ve to va dam; cac duong khac de mo di.
           Ban demo lam vay de mat bat ngay duong OPPO trong dam hang khac. */
        noi: noiTen ? (String(t).toUpperCase() === noiTen) : undefined,
      };
    });
    /* Cat duoi cac ky CHUA CO SO LIEU — xem ghi chu o nhanh 'line' ben duoi. */
    var co = nhan2.length;
    while (co > 1 && series.every(function (s2) { return !s2.v[co - 1]; })) co--;
    var coCG = series.length > 1;
    window.DMV.veDuong(hop.__ve, nhan2, series, {
      W: W, H: Hv, PR: opt.PR || 58, hau: '%', co: co,
      moc: null,
      /* Nhieu diem qua thi so tren diem chong len nhau thanh mang chu. */
      soTrenDiem: co <= 14,
      tenCuoi: opt.tenCuoi !== false,
    });
    if (coCG) chuThich(hop, series.map(function (s) { return s.t; }), series.map(function (s) { return s.c; }));
  }

  /* ---- so Reno & Find ca nam theo kenh, lay tu chinh bieu do dang song ---
     Ban demo co HAI vong o the "Ti trong dong gop theo kenh": Reno & Find (may)
     va Doanh thu. DB TG chi co vong Doanh thu. So Reno & Find theo kenh KHONG
     tinh lai o day — cong tu bieu do "Sell Out Reno & Find theo thang" dang
     hien tren trang, nen luon dung voi bo loc nguoi dung dang dat. Khong lay
     duoc thi tra ve null va chi ve mot vong nhu cu — khong bia so. */
  function bieuDo(id) {
    try {
      if (window.Chart && window.Chart.getChart) {
        var c = window.Chart.getChart(id);
        if (c) return c;
      }
      var ds = (window.Chart && window.Chart.instances) || {};
      var k = Object.keys(ds).filter(function (x) {
        return ds[x] && ds[x].canvas && ds[x].canvas.id === id;
      });
      return k.length ? ds[k[0]] : null;
    } catch (e) { return null; }
  }
  function soReno() {
    var ch = bieuDo('chart-renofind-month');
    if (!ch || !ch.data || !ch.data.datasets) return null;
    var ra = hienDs(ch).map(function (x) {
      return [String(x.s.label || ''),
        (x.s.data || []).reduce(function (a, v) { return a + so(v); }, 0)];
    }).filter(function (r) { return r[0] && r[1] > 0; });
    return ra.length ? ra : null;
  }

  /* Hai o vong tron canh nhau trong cung lop phu — dung the .haiVong cua demo. */
  function hopHaiVong(hop) {
    if (hop.__hai && hop.__hai.a.parentNode === hop.__ve) return hop.__hai;
    hop.__ve.innerHTML = '';
    hop.__ve.style.cssText = 'display:flex;gap:8px;align-items:flex-start;justify-content:center';
    var a = document.createElement('div');
    var b2 = document.createElement('div');
    a.style.cssText = b2.style.cssText = 'flex:1 1 0;min-width:0';
    hop.__ve.appendChild(a); hop.__ve.appendChild(b2);
    hop.__hai = { a: a, b: b2 };
    return hop.__hai;
  }
  function boHaiVong(hop) {
    if (!hop.__hai) return;
    hop.__ve.innerHTML = '';
    hop.__ve.style.cssText = '';     // tra lai the trong, khong con display:flex
    hop.__hai = null;
  }

  /* ---- doi mot bieu do sang cach ve cua demo ---------------------------- */
  function ve(ch) {
    if (!window.DMV) return;
    var loai = ch.config && ch.config.type;
    if (!loai) return;
    var de = deCua(ch);
    var van = soDoi(ch);
    /* Vong Reno lay so tu MOT bieu do khac, nen van tay cua rieng bieu do nay
       khong doi khi so ben kia doi. Dan them vao de con ve lai. */
    var renoNam = (de && de.keo === 'reno') ? soReno() : null;
    if (renoNam) van += '|R' + renoNam.join(',');
    if (ch.__dmvVan === van && ch.canvas.__dmvHop && ch.canvas.__dmvHop.isConnected) return;
    var hop = hopCua(ch); if (!hop) return;

    /* BAY DA DINH 29/08 — TAB KA MO RA KHONG CO BIEU DO NAO.
       DB TG dung len het bieu do ngay luc nap trang, ke ca bieu do nam trong
       tab DANG AN. The an thi offsetWidth = 0 -> lop phu rong 0 -> khung SVG
       rong 0 (khong nhin thay gi), con chu giai thi xuong dong tung chu mot,
       dinh doc ben trai. Va vi "van tay du lieu" khong doi nen no KHONG BAO GIO
       ve lai khi nguoi dung bam sang tab do.
       Nen: the con an thi KHONG ve, va xoa van tay de lan sau ve lai. Viec goi
       ve lai do ResizeObserver o duoi lo — no bao ngay khi the co kich thuoc. */
    var c00 = ch.canvas;
    theoDoiCo(ch);
    if (!c00.offsetWidth || c00.offsetWidth < 40) {
      if (!hoiSinh(ch)) { ch.__dmvVan = null; return; }
    }

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

    /* ---- BANG DE: 6 cho ban demo ve khac han cach Chart.js dang dung ----- */
    if (de && de.kieu === 've100') {
      /* CHI khi dang xem NHIEU manh. Nguoi dung loc con MOT phan khuc thi mot
         dong 100% mau kin la vo nghia — ban demo doi sang cot chong theo thang
         o dung tinh huong do (veChong cho cSegUnits khi FS.pk khac ALL). Roi
         xuong duoi la ra dung nhanh veChong. */
      if (ds.length >= 2) {
        boHaiVong(hop);
        veTiTrong(hop, ch, nhan, ds, Hv, de.opt);
        coKhung(ch, hop);
        return;
      }
    } else if (de && de.kieu === 'veDuong') {
      boHaiVong(hop);
      veDuongTu(hop, ch, nhan, ds, W, Hv, de);
      coKhung(ch, hop);
      return;
    }

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
      /* HAI VONG CANH NHAU (A7). Ban demo dat vong "Reno & Find" (may) canh
         vong "Doanh thu" trong cung mot the, de doc duoc ngay mot kenh dong gop
         bao nhieu MAY Reno so voi bao nhieu TIEN — hai ti trong nay lech nhau
         chinh la cho phai nhin. Thu tu Reno truoc, Doanh thu sau, dung nhu demo. */
      if (renoNam && renoNam.length) {
        var mauR = mauBo(renoNam.map(function (x) { return x[0]; }),
          renoNam.map(function () { return '--khac'; }));
        var oo = hopHaiVong(hop);
        window.DMV.veVong(oo.a, renoNam, {
          mau: mauR, ten: 'Reno & Find', dec: 0, dv: ' máy', dvTong: 'máy Reno',
        });
        window.DMV.veVong(oo.b, data, {
          mau: mau, ten: 'Doanh thu', dec: dec, dv: dvT ? ' ' + dvT.split(' ')[0] : '', dvTong: dvT,
        });
        chuThich(hop, data.map(function (x) { return x[0]; }), mau);
        coKhung(ch, hop);
        return;
      }
      boHaiVong(hop);
      hop.__ve.style.maxWidth = '330px';
      hop.__ve.style.margin = '0 auto';
      window.DMV.veVong(hop.__ve, data, { mau: mau, dec: dec, dvTong: dvT });
      chuThich(hop, data.map(function (x) { return x[0]; }), mau);
      coKhung(ch, hop);
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
      coKhung(ch, hop);
      return;
    }

    if (loai !== 'bar') return;   // loai khac thi de nguyen Chart.js ve

    if (ngang) {
      /* Cot chong NGANG: ban demo ve bang ve100 — moi dong quy ve 100%.
         Chi lam vay khi that su la ti trong; neu khong thi tu quy doi, vi
         mat thang do tuyet doi o day khong mat thong tin gi (so nam trong
         chu thich khi ro chuot). */
      veTiTrong(hop, ch, nhan, ds, Hv, { W: Math.max(W, 460), rowH: 40 });
      coKhung(ch, hop);
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
    /* % SO VOI CO T TRUOC, ghi thang tren dinh cot.
       Truoc day con so nay chi nam o dong "So thang truoc" cua bang mini ben
       duoi — ma bang mini thi lap lai y het cai cot nen anh Thai bao bo. Dua len
       dinh cot thi bo duoc ca cai bang ma van con so.
       CHI cho bieu do THEO THANG: theo ngay/theo tuan thi 53 cot, ghi vao la
       dac kin chu; va bieu do 100% thi % tang truong khong co nghia. */
    var tang = null;
    if (!laPT && nhan.length <= 14 && /^\s*T?\d{1,2}\s*$/.test(String(nhan[0] || ''))) {
      tang = tongC.map(function (v, i) {
        if (!i || !tongC[i - 1] || !v) return null;
        return (v - tongC[i - 1]) / tongC[i - 1] * 100;
      });
      if (tang.filter(function (x) { return x != null; }).length < 2) tang = null;
    }
    window.DMV.veChong(hop.__ve, nhan, sr, {
      W: W, H: Hv, duong: duong, rutGon: canRutGon, tang: tang,
      fx: nhan.length > 20 ? 7 : (nhan.length > 12 ? 9.5 : 11),
      dec: laPT ? 1 : (tongC.some(function (t) { return t > 0 && t < 60; }) ? 1 : 0),
      dv: laPT ? '%' : '',
      tong: !laPT,
    });
    chuThich(hop, sr.map(function (s) { return s.t; }), sr.map(function (s) { return s.c; }));
    coKhung(ch, hop);
  }

  function chuThich(hop, ten, mau) {
    if (ten.length < 2) { if (hop.__lg) hop.__lg.innerHTML = ''; return; }
    if (!hop.__lg) {
      var lg = document.createElement('div');
      hop.appendChild(lg); hop.__lg = lg;
    }
    window.DMV.legend(hop.__lg, ten, function (k, i) { return mau[i]; });
  }

  /* Theo doi KICH THUOC cua tung canvas. Khi the tu an chuyen sang hien (nguoi
     dung bam tab), be ngang nhay tu 0 len that — do la luc phai ve lai.
     Dung ResizeObserver chu khong hen gio: hen gio thi hoac ve som qua (van con
     an) hoac ve muon, nguoi dung nhin thay khoang trong roi moi thay bieu do. */
  /* ---- HOI SINH THE VE BI CO LAI BANG 0 -----------------------------------
     LOI THAT, do tren ban dang chay 29/08 (tab "Chi tiet MWG"): bon bieu do
     trong tab do co  style="width:0px;height:0px"  va NAM Y NHU VAY ke ca sau
     khi nguoi dung bam sang tab. Chart.js ghi so 0 luc dung bieu do (luc do tab
     con an), roi bo do — goi ch.resize() bang tay cung khong nhuc nhich, be
     trong cua no (ch.width/ch.height) van la 0. tg.html co ban "phong ho" la
     phat lai su kien resize cua cua so, nhung Chart.js v4 khong nghe su kien do
     nua nen khong an thua.
     Vi minh KHONG duoc sua tg.html, va vi lop phu la thu NGUOI DUNG THAT SU
     NHIN THAY (canvas da trong suot), nen o day tu dat lai kich thuoc cho the
     ve: lay be ngang cua the cha, lay chieu cao tu max-height trong CSS cua
     chinh trang. Chart.js dang nam im nen khong ai gianh lai. */
  function hoiSinh(ch) {
    var c = ch.canvas, cha = c.parentNode;
    if (!cha) return false;
    try {
      var sc = getComputedStyle(cha);
      var rong = cha.clientWidth - (parseFloat(sc.paddingLeft) || 0) - (parseFloat(sc.paddingRight) || 0);
      if (!(rong >= 40)) return false;
      var cao = parseFloat(getComputedStyle(c).maxHeight);
      if (!(cao > 40)) cao = 320;
      c.style.width = Math.round(rong) + 'px';
      c.style.height = Math.round(cao) + 'px';
      return c.offsetWidth >= 40;
    } catch (e) { return false; }
  }

  function theoDoiCo(ch) {
    var c = ch.canvas;
    if (c.__dmvRO || typeof ResizeObserver !== 'function') return;
    try {
      var ro = new ResizeObserver(function () {
        if (!c.offsetWidth || c.offsetWidth < 40) return;
        if (c.__dmvRong === c.offsetWidth) return;
        c.__dmvRong = c.offsetWidth;
        ch.__dmvVan = null;
        setTimeout(function () { try { ve(ch); } catch (e) {} }, 30);
      });
      ro.observe(c);
      /* Theo doi CA THE CHA. The ve bi co lai bang 0 thi be ngang cua no khong
         bao gio doi nua — chi co the cha la nhuc nhich khi tab hien ra. Khong
         theo doi cha thi phai doi den luc quet dinh ky moi thay bieu do. */
      var cha = c.parentNode;
      if (cha && cha.nodeType === 1) {
        var roC = new ResizeObserver(function () {
          if (!cha.clientWidth || cha.clientWidth < 40) return;
          if (c.offsetWidth >= 40) return;          // the ve on, khong can lam gi
          ch.__dmvVan = null;
          setTimeout(function () { try { ve(ch); } catch (e) {} }, 30);
        });
        roC.observe(cha);
        c.__dmvROC = roC;
      }
      c.__dmvRO = ro;
    } catch (e) {}
  }

  /* ---- CO KHUNG LAI CHO VUA VOI HINH DA VE --------------------------------
     Bieu do dang THANH NGANG va dang VONG thap hon han khung cu:
        Ti trong phan khuc theo kenh  khung 380px · ve 146px -> thua 234px
        Ti trong Reno theo kenh       khung 380px · ve 173px -> thua 207px
        Ti trong dong gop (2 vong)    khung 380px · ve 201px -> thua 179px
     Cong ca trang gan 1.200px trang phai cuon qua vo ich.

     CACH CO: dat  margin-bottom AM  cho canvas, KHONG doi chieu cao canvas.
     Vi sao khong doi chieu cao: Chart.js tu ghi style.height cua canvas theo
     ti le cua no; minh ghi de vao thi hai ben gianh nhau, bieu do nhay lien tuc.
     Margin am thi canvas van nguyen kich thuoc (no vo hinh, khong ai thay),
     chi co the CHA co lai — dung thu minh muon. */
  function coKhung(ch, hop) {
    /* Do LAI vai nhip nua. Ngay sau khi gan innerHTML, trinh duyet chua tinh
       xong bo cuc cua SVG va cua chu giai — do luc do ra chieu cao 0, tinh
       "thua" ra so am, va the khong bao gio co lai. Da dinh 29/08: bieu do
       "Ti trong phan khuc theo kenh" va "Ti trong dong gop" van thua 170-180px
       trong khi "Ti trong Reno" (do sau, kip bo cuc) thi co dung. */
    doCoKhung(ch, hop);
    requestAnimationFrame(function () { doCoKhung(ch, hop); });
    setTimeout(function () { doCoKhung(ch, hop); }, 150);
    setTimeout(function () { doCoKhung(ch, hop); }, 700);
  }
  function doCoKhung(ch, hop) {
    var c = ch.canvas;
    try {
      /* Do theo DAY THAT SU cua noi dung trong hop, khong cong don tung manh.
         Ly do: cho hai vong (A7) hai SVG nam CANH nhau trong hai the con —
         cong lai thi ra gap doi, va truoc day chi tim svg con truc tiep cua
         __ve nen khong thay gi ca, khung khong bao gio co. Do bang toa do day
         so voi dinh hop thi moi bo cuc deu dung. */
      var svgs = hop.querySelectorAll('svg');
      if (!svgs.length) return;
      var dinh = hop.getBoundingClientRect().top;
      var day = 0;
      for (var i = 0; i < svgs.length; i++) {
        var r = svgs[i].getBoundingClientRect();
        if (r.height) day = Math.max(day, r.bottom - dinh);
      }
      if (day <= 0) return;
      var lg = hop.__lg;
      if (lg && lg.offsetHeight) {
        var rl = lg.getBoundingClientRect();
        day = Math.max(day, rl.bottom - dinh);
      }
      var caoVe = Math.ceil(day) + 8;
      var thua = c.offsetHeight - caoVe;
      /* Chi co khi thua NHIEU (> 40px). Thua vai chuc pixel la khoang tho binh
         thuong cua the, co lai chi lam moi thu chat chua. */
      if (thua > 40) {
        c.style.marginBottom = (-thua) + 'px';
        hop.style.height = caoVe + 'px';
      } else if (c.style.marginBottom) {
        c.style.marginBottom = '';
      }
    } catch (e) {}
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
  /* Bam tab / tab con -> vai the vua tu an thanh hien. ResizeObserver lo duoc,
     nhung quet them mot nhip nua cho chac (co the co the doi bang CSS khac). */
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('.db-tg-tab,[data-panel],[data-tab],[class*="subtab"],[class*="sec-"]')) {
      /* Ve NGAY o khung hinh ke tiep — luc do trinh duyet da tinh xong bo cuc
         moi, the vua hien da co be ngang that. Doi 260ms nhu truoc thi anh Thai
         bam sang tab la thay the trong mot luc, nhin nhu trang bi loi. */
      requestAnimationFrame(function () { requestAnimationFrame(quet); });
      setTimeout(quet, 120); setTimeout(quet, 600); setTimeout(quet, 1600);
    }
  }, true);
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
  if (window.__BO_QUA_GOI) return;      // robot di qua — xem ghi chu o dau tep
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
