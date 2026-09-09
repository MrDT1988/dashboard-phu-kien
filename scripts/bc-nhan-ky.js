/* bc-nhan-ky.js — NHAN KY DANG CHON tren bieu do cot cua DB TG.
 *
 * VI SAO
 * ------
 * Bieu do cot cua DB TG ve 12 ky (hoac ca nam 37 tuan) voi moi cot mot mau nhu nhau.
 * Mat phai do theo nhan truc moi biet cot nao la ky dang xem. Quy tac trinh bay
 * "moi bieu do mot diem nhan" (anh Thai gui 09/09): cot cua ky DANG CHON giu nguyen
 * mau, cac ky khac nhat bot -> mat bat ngay diem can nhin.
 *
 * NGUYEN TAC — KHONG DUOC PHA NGHIA MAU
 * -------------------------------------
 * Cot cua DB TG la cot CHONG theo kenh (MWG xanh la · IND xanh duong · KA vang) hoac
 * theo hang. Neu doi mau thi hong cach doc. Nen o day chi HA DO DAM dong deu moi kenh
 * (alpha 0.68) — thu tu va sac mau giu nguyen, chi do tuong phan giam.
 *
 * CHI AP CHO BIEU DO THEO KY
 * --------------------------
 * Bieu do co nhan truc la ky (T1..T12 hoac W1..W53) moi duoc nhan. Bieu do co nhan la
 * ten kenh / ten hang / ten shop thi KHONG — o do khong co khai niem "ky dang chon".
 *
 * CACH LAM — AN TOAN VOI ROBOT
 * ----------------------------
 * Dang ky mot plugin Chart.js toan cuc, doi mau ngay TRUOC KHI VE (hook beforeUpdate),
 * khong sua cau hinh bieu do, khong goi update trong luc ve (khong gay vong lap).
 * Khong dong vao bc.js / bc-chitiet.js / cach tinh so. Robot doc bien JS chu khong doc
 * mau nen khong bi anh huong.
 *
 * DUONG LUI: xoa dong <script> nap file nay trong tg.html la ve nguyen trang thai cu.
 */
(function () {
  'use strict';
  if (typeof Chart === 'undefined' || !Chart.register) return;

  var ALPHA = 0.50;   /* 09/09 lan 2: anh Thai bao "khong thay thay doi gi nhieu" -> nhan manh hon, tu 0.68 xuong 0.50 */               /* anh Thai chot 09/09: mo nhe, chu trong long cot van doc duoc */
  var O_KY  = 'bc-ky';            /* id o chon ky tren dau trang */

  /* ha do dam, giu nguyen sac mau */
  function mo(c) {
    if (typeof c !== 'string') return c;
    if (c.charAt(0) === '#') {
      var m = c.slice(1);
      if (m.length === 3) m = m.split('').map(function (x) { return x + x; }).join('');
      if (m.length < 6) return c;
      var n = parseInt(m.slice(0, 6), 16);
      if (isNaN(n)) return c;
      return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + ALPHA + ')';
    }
    var g = /rgba?\(([^)]+)\)/.exec(c);
    if (!g) return c;
    var p = g[1].split(',');
    if (p.length < 3) return c;
    return 'rgba(' + p[0].trim() + ',' + p[1].trim() + ',' + p[2].trim() + ',' + ALPHA + ')';
  }

  /* "Tuan 36 · 31/08 – 06/09" -> "W36" · "Thang 9" -> "T9" */
  function kyDangChon() {
    var s = document.getElementById(O_KY);
    if (!s || s.selectedIndex < 0) return null;
    var t = (s.options[s.selectedIndex] || {}).text || '';
    var m = /Tu[ầâ]n\s*(\d+)/i.exec(t);
    if (m) return 'W' + m[1];
    m = /Th[áa]ng\s*(\d+)/i.exec(t);
    if (m) return 'T' + m[1];
    return null;
  }

  /* nhan truc co phai ky khong (T1..T12 / W1..W53) */
  function laTrucKy(labels) {
    if (!labels || labels.length < 3) return false;
    var dat = 0;
    for (var i = 0; i < labels.length; i++) {
      if (/^[TW]\d{1,2}(\.\d+)?\*?$/i.test(String(labels[i]).trim())) dat++;
    }
    return dat >= labels.length * 0.8;
  }

  /* cot nao duoc nhan: dung ky dang chon; khong tim thay thi cot cuoi CO SO */
  function viTriNhan(ch) {
    var L = (ch.data.labels || []).map(function (x) { return String(x).trim(); });
    if (!laTrucKy(L)) return -1;
    var k = kyDangChon();
    if (k) {
      var i = L.indexOf(k);
      if (i >= 0) return i;
    }
    for (var j = L.length - 1; j >= 0; j--) {
      var co = (ch.data.datasets || []).some(function (d) {
        var v = d.data ? d.data[j] : null;
        return v != null && v !== 0;
      });
      if (co) return j;
    }
    return L.length - 1;
  }

  /* BAY DA MAC 09/09: khong duoc gan mau vao tung element (el.options).
     Chart.js cho MOI COT dung CHUNG mot object options khi cau hinh giong nhau —
     gan cho cot 8 xong cot 9 ghi de len chinh object do, ket qua ca 12 cot mot mau.
     Cach dung: dat dataset.backgroundColor thanh MANG o hook beforeUpdate, de
     Chart.js tu resolve mau rieng cho tung cot. */
  Chart.register({
    id: 'bcNhanKy',
    beforeUpdate: function (ch) {
      try {
        if (!ch || !ch.config || ch.config.type !== 'bar') return;
        var idx = viTriNhan(ch);
        var n = (ch.data.labels || []).length;
        (ch.data.datasets || []).forEach(function (ds) {
          if (ds.__mauGoc === undefined) ds.__mauGoc = ds.backgroundColor;   /* chi luu 1 lan */
          var goc = ds.__mauGoc;
          if (idx < 0 || typeof goc !== 'string') { ds.backgroundColor = goc; return; }
          var mau = [];
          for (var i = 0; i < n; i++) mau.push(i === idx ? goc : mo(goc));
          ds.backgroundColor = mau;
        });
      } catch (e) { /* co loi thi de bieu do ve nhu cu, khong lam chet trang */ }
      try { ganTooltipModel(ch); } catch (e) {}
    }
  });

  /* ============================================================
     09/09 viec 2 (anh Thai): RE CHUOT VAO COT -> HIEN MODEL BAN TRONG DO
     ------------------------------------------------------------
     Cot cua DB TG khong phai cot nao cung co model dang sau. Nen o day chi hien
     khi TINH DUNG duoc, con lai de nguyen — tha khong hien con hon hien so sai:
       (a) Cot la KY (T1..T12 / W1..W53) + duong so la KENH (MWG/IND/KA)
           -> model OPPO ban trong ky do, lay bang ham modelKy() san co cua bc.js
              (thang thi doc crosstab, tuan thi doc week_channel_models).
       (b) Cot la KY + dang o tab "Chi tiet MWG", duong so la TEN HANG
           -> model cua hang do ban tai cho MWG, quet daily.rows theo dung khoang ngay.
     Cot khong phai ky (truc la ten kenh / ten hang / ten shop) thi khong co khai niem
     "ban trong cot nay" theo thoi gian -> khong hien them gi.
     Co bo nho tam theo (khoang ngay + hang) de re chuot nhieu lan khong quet lai. */

  var BOTAM = {};                        /* bo nho tam ket qua quet */
  function BCC() { return window.__bc || null; }
  function p2(n) { return String(n).padStart(2, '0'); }

  /* "T5" -> khoang thang 5 · "W36" -> khoang tuan 36 · khac -> null */
  function kyTuNhan(nhan) {
    var B = BCC(); if (!B) return null;
    var s = String(nhan == null ? '' : nhan).trim();
    var m = /^T(\d{1,2})/i.exec(s);
    if (m) { try { var k = B.khoangKy('thang', +m[1]); return k ? { cd: 'thang', k: k } : null; } catch (e) { return null; } }
    m = /^W(\d{1,2})/i.exec(s);
    if (m) {
      try {
        var ds = (B.du() || {}).TUAN || [];
        for (var i = 0; i < ds.length; i++) if (ds[i].so === +m[1]) return { cd: 'tuan', k: ds[i] };
      } catch (e) {}
    }
    return null;
  }

  /* model OPPO theo kenh — dung ham san co cua bc.js nen so trung voi bao cao */
  function modelKenh(ky, kenhs) {
    var B = BCC(); if (!B || !B.modelKy) return null;
    var mk; try { mk = B.modelKy(ky.cd, ky.k); } catch (e) { return null; }
    if (!mk) return null;
    var g = {};
    kenhs.forEach(function (c) {
      var o = mk[c] || {};
      Object.keys(o).forEach(function (t) { g[t] = (g[t] || 0) + (o[t] || 0); });
    });
    return g;
  }

  /* "<5M" -> [0,5] · "5-10M" -> [5,10] · ">30M" -> [30,999] · khac -> null.
     Bieu do gop phan khuc lai ("<5M" = <3M + 3-5M) nen phai so theo khoang gia. */
  function bien(s) {
    var t = String(s == null ? '' : s).replace(/\s/g, '');
    var m = /^<(\d+)M$/i.exec(t); if (m) return [0, +m[1]];
    m = /^>(\d+)M$/i.exec(t); if (m) return [+m[1], 9999];
    m = /^(\d+)-(\d+)M$/i.exec(t); if (m) return [+m[1], +m[2]];
    return null;
  }

  /* model tai cho MWG — loc theo khoang ngay + (tuy chon) hang + (tuy chon) phan khuc */
  function modelChoMWG(tu, den, hangs, segs) {
    var B = BCC(); if (!B || !B.du) return null;
    var d; try { d = B.du(); } catch (e) { return null; }
    var DL = d && d.B && d.B.daily; if (!DL || !DL.rows) return null;
    var TEN = (DL.brands || []).map(function (x) { return String(x).toLowerCase(); });
    var SEG = DL.segments || [], MODEL = DL.models || [];

    var chiH = null;
    if (hangs && hangs.length) {
      chiH = [];
      hangs.forEach(function (h) { var i = TEN.indexOf(String(h).toLowerCase()); if (i >= 0) chiH.push(i); });
      if (!chiH.length) return null;                 /* co doi hang ma khong khop -> khong doan bua */
    }
    var chiS = null;
    if (segs && segs.length) {
      chiS = [];
      segs.forEach(function (s) {
        var b = bien(s); if (!b) return;
        SEG.forEach(function (ten, i) {
          var c = bien(ten); if (!c) return;
          if (c[0] >= b[0] && c[1] <= b[1] && chiS.indexOf(i) < 0) chiS.push(i);
        });
      });
      if (!chiS.length) return null;
    }
    var khoa = tu + '|' + den + '|' + (chiH ? chiH.join(',') : '*') + '|' + (chiS ? chiS.join(',') : '*');
    if (BOTAM[khoa]) return BOTAM[khoa];
    var R = DL.rows, g = {};
    for (var i = 0; i < R.length; i++) {
      var x = R[i];
      if (chiH && chiH.indexOf(x[4]) < 0) continue;
      if (chiS && chiS.indexOf(x[3]) < 0) continue;
      var ng = '2026-' + p2(x[0]) + '-' + p2(x[1]);
      if (ng < tu || ng > den) continue;
      var u = x[6] || 0; if (!u) continue;
      var t = MODEL[x[8]] || '(không rõ)';
      g[t] = (g[t] || 0) + u;
    }
    BOTAM[khoa] = g;
    return g;
  }

  /* mot nhan la gi: ky / ten hang / phan khuc / khong ro */
  function loaiNhan(s) {
    if (kyTuNhan(s)) return 'ky';
    var B = BCC();
    try {
      var DL = B.du().B.daily, TEN = (DL.brands || []).map(function (x) { return String(x).toLowerCase(); });
      if (TEN.indexOf(String(s).toLowerCase()) >= 0) return 'hang';
    } catch (e) {}
    if (bien(s)) return 'seg';
    return '';
  }

  /* ky dang chon cua tab MWG (dung khi bieu do khong co truc thoi gian) */
  function kyHienTai() {
    var B = BCC(); if (!B || !B.boiCanh) return null;
    try { var c = B.boiCanh(); return (c && c.mwg && c.mwg.k) || (c && c.k) || null; } catch (e) { return null; }
  }

  function dongModel(g, tieu) {
    if (!g) return [];
    var ds = Object.keys(g).map(function (t) { return { t: t, u: g[t] }; })
                .filter(function (z) { return z.u > 0; })
                .sort(function (a, b) { return b.u - a.u; });
    if (!ds.length) return [];
    var tong = ds.reduce(function (s, z) { return s + z.u; }, 0);
    var r = ['', tieu + ':'];
    ds.slice(0, 5).forEach(function (z, i) {
      var ten = String(z.t).replace(/^Điện thoại\s*/i, '');
      if (ten.length > 34) ten = ten.slice(0, 32) + '…';
      r.push('  ' + (i + 1) + '. ' + ten + '  ' + z.u.toLocaleString('vi-VN')
             + '  (' + (z.u / tong * 100).toFixed(0) + '%)');
    });
    if (ds.length > 5) r.push('  … và ' + (ds.length - 5) + ' model khác');
    return r;
  }

  function chiTietCot(ch, items) {
    if (!items || !items.length) return [];
    var nhan = (ch.data.labels || [])[items[0].dataIndex];
    var tens = [];
    items.forEach(function (it) {
      var l = ((ch.data.datasets || [])[it.datasetIndex] || {}).label;
      if (l && tens.indexOf(l) < 0) tens.push(l);
    });
    if (!tens.length) return [];

    /* (a) truc la KY + duong so la KENH -> so OPPO noi bo, dung ham modelKy cua bc.js */
    var ky = kyTuNhan(nhan);
    var laKenh = tens.every(function (t) { return /^(MWG|IND|KA)$/i.test(String(t).trim()); });
    if (ky && laKenh) {
      var g = modelKenh(ky, tens.map(function (t) { return String(t).trim().toUpperCase(); }));
      return dongModel(g, 'Model OPPO ' + (tens.length > 1 ? '(cả 3 kênh)' : tens[0]) + ' bán trong kỳ');
    }

    /* (b) tab Chi tiet MWG: truc va duong so co the la KY / HANG / PHAN KHUC — gom lai
           thanh bo loc roi quet daily.rows. Thieu truc thoi gian thi lay ky dang chon. */
    var pan = null;
    try { pan = ch.canvas && ch.canvas.closest ? ch.canvas.closest('[id^="panel-"]') : null; } catch (e) {}
    if (pan && pan.id === 'panel-mwg') {
      var hangs = [], segs = [], kKy = ky ? ky.k : null, nhanPhu = [], lac = false;
      /* MOI nhan deu phai doc duoc la ky / hang / phan khuc. Chi can MOT nhan khong doc duoc
         ("Khác", "TỔNG", "2026"…) la BO LUON — vi neu bo qua no thi so trong tooltip se
         khong con la so cua dung cai cot dang re chuot. Tha khong hien con hon hien sai. */
      var xet = function (s) {
        var l = loaiNhan(s);
        if (l === 'hang') { hangs.push(s); nhanPhu.push(s); }
        else if (l === 'seg') { segs.push(s); nhanPhu.push(s); }
        else if (l !== 'ky') lac = true;
      };
      if (!ky) xet(nhan);
      tens.forEach(function (t) { xet(t); });
      if (lac) return [];
      if (!kKy) kKy = kyHienTai();
      if (kKy && (hangs.length || segs.length)) {
        var g2 = modelChoMWG(kKy.tu, kKy.denCo || kKy.den, hangs, segs);
        if (g2) {
          var mo_ = nhanPhu.length > 3 ? nhanPhu.slice(0, 3).join(' · ') + '…' : nhanPhu.join(' · ');
          return dongModel(g2, 'Model bán tại chợ MWG — ' + mo_);
        }
      }
    }
    return [];
  }

  function ganTooltipModel(ch) {
    if (!ch || !ch.config || ch.config.type !== 'bar') return;
    var o = ch.options || (ch.options = {});
    var pl = o.plugins || (o.plugins = {});
    var tt = pl.tooltip || (pl.tooltip = {});
    var cb = tt.callbacks || (tt.callbacks = {});
    if (cb.__bcModel) return;                       /* da gan roi */
    var cu = cb.afterBody;                          /* giu lai cai cu neu co */
    cb.afterBody = function (items) {
      var truoc = [];
      try { if (typeof cu === 'function') { var v = cu.apply(this, arguments); truoc = Array.isArray(v) ? v : (v ? [v] : []); } } catch (e) {}
      var them = [];
      try { them = chiTietCot(ch, items) || []; } catch (e) { them = []; }
      return truoc.concat(them);
    };
    cb.__bcModel = 1;
    /* tooltip dai hon thi cho phep rong ra mot chut */
    if (tt.boxPadding == null) tt.boxPadding = 4;
  }

  /* Ty le vang cho hang hai bieu do (cai chinh 1.618 — cai phu 1) */
  try {
    var st = document.createElement('style');
    st.id = 'bc-nhan-ky-css';
    st.textContent = [
      /* Ty le vang cho hang hai bieu do (cai chinh 1.618 — cai phu 1) */
      '.bc-hang-bd{grid-template-columns:minmax(0,1.618fr) minmax(0,1fr) !important}',
      /* 09/09 — KHOANG TRANG & DUONG KE (quy tac trinh bay anh Thai gui):
         bang so dai doc de moi mat vi ke ngang lien tuc va dong qua sat. Gian dong ra,
         ha duong ke xuong con rat mo, giu dam moi 5 dong mot vach de mat con bam duoc hang. */
      '.bc-bang th,.bc-bang td{padding:9px 10px !important}',
      '.bc-bang td{border-bottom-color:color-mix(in srgb,currentColor 8%,transparent) !important}',
      '.bc-bang tbody tr:nth-child(5n) td{border-bottom-color:color-mix(in srgb,currentColor 20%,transparent) !important}',
      '.bc-bang tbody tr:hover td{background:color-mix(in srgb,currentColor 4%,transparent)}',
      '.bc-mini th,.bc-mini td{padding:7px 5px !important}',
      '.bc-mini td{border-bottom-color:color-mix(in srgb,currentColor 8%,transparent) !important}',
      /* khoi tho hon mot chut */
      '.bc-khoi{padding:18px 20px 16px !important}',
      '.bc-luoi{gap:22px !important}',
      /* 09/09 — SIET MAN HINH DAU MOI TAB (viec 4).
         Truoc: dau trang cao 352px tren man 885px, nen khoi "Ket qua" bi cat doi —
         mo dashboard len la phai cuon moi thay du so. Gio ep dau trang con ~261px de
         MAN HINH DAU CHI CON: chon ky + the ket qua. Chi cat phan trang tri, KHONG cat so:
         giu nguyen dong "So lieu toi ngay…", nut Lam moi, the Sellout, Cai dat nang cao.
         Chi an dong mo ta tinh ("Tong quan + Chi tiet MWG / KA / IND — …") vi no khong
         bao gio doi, doc mot lan la biet. Ap chung cho ca 4 tab vi dau trang dung chung. */
      '.dashboard-header{padding:10px 20px !important;margin-bottom:8px !important}',
      '.dashboard-header-main h1{font-size:17px !important;margin:0 0 2px !important;line-height:1.25 !important}',
      '.dashboard-header-main>p:first-of-type{display:none !important}',
      '.bc-bar{padding-top:4px !important;padding-bottom:4px !important;margin:6px 0 4px !important}',
      '.db-tg-tabnav button{padding-top:6px !important;padding-bottom:6px !important}',
      '.bc-ky-bar{padding:6px 12px !important;margin-bottom:-6px !important}',
      /* 09/09 (viec 1 dot D) — CO DINH DAU TRANG.
         Anh Thai: cuon xuong cuoi bang van doi tab / doi ky duoc ngay, khong phai keo len.
         Thanh "Bao cao thang / tuan + Ky" va 4 the tab duoc gom vao mot khoi #bc-dinh
         dan ngay duoi dau trang, position:sticky top:0 nen no bam dinh khi cuon. */
      '#bc-dinh{position:sticky;top:0;z-index:900;padding:6px 20px 8px;margin:0 0 10px;' +
        'background:linear-gradient(135deg,#00431F 0%,#00622F 55%,#0A7A45 100%);' +
        'border-radius:0 0 10px 10px;box-shadow:0 6px 18px rgba(0,0,0,.20)}',
      '#bc-dinh .bc-bar{margin:0 0 6px !important;padding:0 !important}',
      '#bc-dinh .db-tg-tabnav{margin:0 !important}',
      '.dashboard-header{position:relative !important;margin-bottom:0 !important;border-radius:10px 10px 0 0 !important}',
      /* the "Duy Thai / Dang xuat": truoc ghim goc duoi trai, DE MAT dau dong cua bang so
         (da phai lam mo di khi cuon cho do vuong). Nay dua len goc phai dau trang, doi dien
         tieu de "Report Tien Giang" — het che so, khong can lam mo nua. */
      '#dbtg-the-ai.bc-ai-tren{position:absolute !important;right:20px !important;top:10px !important;' +
        'left:auto !important;bottom:auto !important;z-index:5;opacity:1 !important;' +
        'display:flex;align-items:center;gap:10px;background:transparent !important;' +
        'border:0 !important;box-shadow:none !important;padding:0 !important}',
      'html.dm-dang-cuon #dbtg-the-ai.bc-ai-tren{opacity:1 !important}',
      /* Sang/Toi ve dung mot hang ngang voi May tinh/Dien thoai, o cuoi thanh chon ky */
      '.bc-hang-nut{margin-left:auto;display:inline-flex;align-items:center;gap:8px}',
      '.bc-hang-nut .bc-tb{margin-left:0 !important}',
      '#dm-sang-nut.bc-sang-hang{position:static !important;right:auto !important;bottom:auto !important;' +
        'opacity:1 !important;box-shadow:none !important;z-index:auto !important}',
      'html.dm-dang-cuon #dm-sang-nut.bc-sang-hang{opacity:1 !important}',
      '@media (max-width:720px){#bc-dinh{padding:4px 12px 6px}#dbtg-the-ai.bc-ai-tren{position:static !important;margin-top:6px}}'
    ].join('\n');
    document.head.appendChild(st);
  } catch (e) {}

  /* ===== 09/09 viec 1: gom dau trang lai =====
     Ba viec: (a) thanh ky + 4 tab vao khoi dinh #bc-dinh, (b) the "Duy Thai / Dang xuat"
     len goc phai dau trang, (c) Sang/Toi dung cung hang voi May tinh/Dien thoai.
     Hai cai (b)(c) do script khac tao SAU nen phai thu lai vai lan roi moi thoi.
     DUONG LUI: van nam trong dung file nay — xoa dong <script> la ve nhu cu. */
  function gomDauTrang() {
    var header = document.querySelector('.dashboard-header');
    var bar = document.querySelector('.bc-bar');
    var tabs = document.querySelector('.db-tg-tabnav');
    if (!header || !bar || !tabs) return false;

    var dinh = document.getElementById('bc-dinh');
    if (!dinh) {
      dinh = document.createElement('div');
      dinh.id = 'bc-dinh';
      header.parentNode.insertBefore(dinh, header.nextSibling);
    }
    if (bar.parentNode !== dinh) dinh.appendChild(bar);
    if (tabs.parentNode !== dinh) dinh.appendChild(tabs);

    /* hang nut ben phai: Sang/Toi + May tinh/Dien thoai */
    var tb = bar.querySelector('.bc-tb');
    var hang = bar.querySelector('.bc-hang-nut');
    if (tb && !hang) {
      hang = document.createElement('div');
      hang.className = 'bc-hang-nut';
      tb.parentNode.insertBefore(hang, tb);
      hang.appendChild(tb);
    }
    var sang = document.getElementById('dm-sang-nut');
    if (sang && hang && sang.parentNode !== hang) {
      hang.insertBefore(sang, hang.firstChild);
      sang.classList.add('bc-sang-hang');
    }

    /* the nguoi dung len goc phai dau trang */
    var ai = document.getElementById('dbtg-the-ai');
    if (ai && ai.parentNode !== header) {
      header.appendChild(ai); ai.classList.add('bc-ai-tren');
      /* The nay duoc script khac dat style THANG VAO THE (inline) va con mot luat !important
         khac de nen trang, nen CSS thuong khong an. Phai dat inline kem 'important' moi thang. */
      var q = function (el, k, v) { try { el.style.setProperty(k, v, 'important'); } catch (e) {} };
      q(ai, 'background', 'transparent'); q(ai, 'background-color', 'transparent');
      q(ai, 'border', '0'); q(ai, 'box-shadow', 'none'); q(ai, 'padding', '0'); q(ai, 'max-width', 'none');
      q(ai, 'color', '#EAF6EE');
      Array.prototype.forEach.call(ai.querySelectorAll('div'), function (d) { q(d, 'color', '#EAF6EE'); });
      var vai = ai.querySelectorAll('div>div>div')[1];
      if (vai) q(vai, 'color', 'rgba(234,246,238,.72)');
      var nutThoat = document.getElementById('dbtg-thoat');
      if (nutThoat) {
        q(nutThoat, 'color', '#EAF6EE'); q(nutThoat, 'background', 'transparent');
        q(nutThoat, 'border', '1px solid rgba(255,255,255,.35)'); q(nutThoat, 'border-radius', '8px');
        q(nutThoat, 'padding', '4px 10px'); q(nutThoat, 'cursor', 'pointer');
      }
    }

    return !!(ai && sang);
  }

  try {
    var lan = 0;
    var nhip = setInterval(function () {
      lan++;
      var xong = false;
      try { xong = gomDauTrang(); } catch (e) {}
      if (xong || lan > 40) clearInterval(nhip);   /* thu toi ~16 giay roi thoi */
    }, 400);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.db-tg-tabnav')) setTimeout(gomDauTrang, 120);
    }, true);
  } catch (e) {}

  /* doi ky / doi che do -> ve lai de diem nhan nhay theo */
  function veLai() {
    try {
      var ds = Chart.instances ? Object.keys(Chart.instances).map(function (k) { return Chart.instances[k]; }) : [];
      ds.forEach(function (c) { try { c.update('none'); } catch (e) {} });
    } catch (e) {}
  }
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === O_KY) setTimeout(veLai, 80);
  }, true);
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.bc-chedo, .bc-nut')) setTimeout(veLai, 120);
  }, true);

  veLai();
  window.__bcNhanKy = { veLai: veLai, kyDangChon: kyDangChon };
})();
