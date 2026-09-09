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
 * Dang ky mot plugin Chart.js toan cuc, doi mau ngay TRUOC KHI VE (beforeDatasetsDraw),
 * khong sua cau hinh bieu do, khong goi update trong luc ve (khong gay vong lap).
 * Khong dong vao bc.js / bc-chitiet.js / cach tinh so. Robot doc bien JS chu khong doc
 * mau nen khong bi anh huong.
 *
 * DUONG LUI: xoa dong <script> nap file nay trong tg.html la ve nguyen trang thai cu.
 */
(function () {
  'use strict';
  if (typeof Chart === 'undefined' || !Chart.register) return;

  var ALPHA = 0.68;               /* anh Thai chot 09/09: mo nhe, chu trong long cot van doc duoc */
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

  Chart.register({
    id: 'bcNhanKy',
    beforeDatasetsDraw: function (ch) {
      try {
        if (!ch || !ch.config || ch.config.type !== 'bar') return;
        var idx = viTriNhan(ch);
        if (idx < 0) return;
        (ch.data.datasets || []).forEach(function (ds, di) {
          var meta = ch.getDatasetMeta(di);
          if (!meta || meta.hidden || !meta.data) return;
          meta.data.forEach(function (el, i) {
            if (!el || !el.options) return;
            if (el.__mauGoc === undefined) el.__mauGoc = el.options.backgroundColor;
            el.options.backgroundColor = (i === idx) ? el.__mauGoc : mo(el.__mauGoc);
          });
        });
      } catch (e) { /* co loi thi de bieu do ve nhu cu, khong lam chet trang */ }
    }
  });

  /* Ty le vang cho hang hai bieu do (cai chinh 1.618 — cai phu 1) */
  try {
    var st = document.createElement('style');
    st.id = 'bc-nhan-ky-css';
    st.textContent = '.bc-hang-bd{grid-template-columns:minmax(0,1.618fr) minmax(0,1fr)}';
    document.head.appendChild(st);
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
