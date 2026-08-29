/* demo-bo-cuc.js — DUNG LAI BO CUC MOT SO KHOI THEO BAN DEMO.
 *
 * Khac voi demo-bang.js (chi to nen o, khong dung vao chu), tep nay BUOC PHAI
 * dung lai the HTML — vi ban demo doi doi hinh dang cua khoi, khong phai doi mau:
 *   B3  Chien luoc Kenh      -> moi kenh mot the, gach mau ben trai theo mau kenh
 *   B4  Chinh sach Nhan su   -> danh sach co dau dau dong
 *   B10 So sanh cung ky      -> hai cot canh nhau, chenh lech boc vien thuoc
 *   B17 Muc tieu Shop IND    -> moi muc tieu mot vong tien do nho
 *   B18 Target Shop O.C      -> xep theo % con thieu, shop nguy co len dau
 *   B2/B9 nut loc nhanh co san so dem
 *
 * VI SAO PHAI CAN THAN O DAY:
 *   Dung vao the la dung vao thu ma ham cua DB TG dang doc. Nguyen tac:
 *     - Chi doc va SAP XEP LAI cac the da co, khong viet lai noi dung chu.
 *     - Lam mot lan sau khi DB TG ve xong; ve lai thi lam lai (co dau).
 *     - Moi khoi mot ham rieng, boc trong try/catch — mot cho hong khong keo
 *       cac cho khac hong theo.
 */
(function () {
  'use strict';
  if (window.__BO_QUA_GOI) return;   // robot di qua

  /* ==================================================================
     0. DUNG CU CHUNG
     ================================================================== */

  /* VI SAO CO HAM NAY: moi lan dat lai, minh se ghi de style/chu cua chinh
     minh. Neu ghi de bang GIA TRI Y HET cai dang co, MutationObserver van coi
     do la mot thay doi -> no goi lai minh -> minh lai ghi -> vong lap vo tan,
     trang dung hinh. Nen MOI lan ghi deu phai so truoc, khac moi ghi. */
  function datChu(el, t) {
    if (!el) return;
    if (el.textContent !== t) el.textContent = t;
  }
  function datKieu(el, ten, gt) {
    if (!el) return;
    if (el.style.getPropertyValue(ten) !== gt) el.style.setProperty(ten, gt);
  }

  function bien(n, dp) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      if (v) return v;
    } catch (e) {}
    return dp;
  }
  function soMau(c) {
    c = String(c || '').trim();
    var m = c.match(/^#([0-9a-f]{3})$/i);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = c.match(/rgba?\(([^)]+)\)/i);
    if (m) { var t = m[1].split(',').map(parseFloat); return [t[0], t[1], t[2]]; }
    return null;
  }
  /* Nen NHAT cua vien thuoc: lay dung mau chu roi ha do duc xuong. Tinh tu mau
     THAT (da qua getComputedStyle) chu khong tu chuoi "var(--positive)", vi
     hai che do Sang/Toi dat --positive khac nhau. */
  function nenNhat(mau, a) {
    var r = soMau(mau);
    if (!r) return 'transparent';
    return 'rgba(' + Math.round(r[0]) + ',' + Math.round(r[1]) + ',' + Math.round(r[2]) + ',' + a + ')';
  }
  /* Do sang tuong doi theo WCAG — dung de kiem tra mau chu co doc duoc tren nen
     khong. Chep cong thuc, khong import: cac tep demo-*.js duoc nap doc lap. */
  function doSang(rgb) {
    var f = rgb.map(function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  }
  function tiSo(a, b) {
    var x = doSang(a), y = doSang(b);
    if (x < y) { var t = x; x = y; y = t; }
    return (x + 0.05) / (y + 0.05);
  }
  /* Mau kenh cua ban demo dep tren BIEU DO nhung khong phai lúc nao cung du
     tuong phan khi dem lam MAU CHU. Vi du KA che do Sang la #C98A2E, dat len
     the nen trang chi duoc 2,9 — duoi chuan 4,5, anh Thai se bao "chu mo".
     Nen: giu nguyen mau neu da du, chua du thi day dan cho toi/sang hon cho
     den khi dat. Van la mau do, chi dam hon — nguoi xem van nhan ra kenh. */
  function mauDocDuoc(mau, nen) {
    var c = soMau(mau), n = soMau(nen);
    if (!c || !n) return mau;
    if (tiSo(c, n) >= 4.5) return mau;
    var toiDan = doSang(n) > 0.4;   // nen sang -> phai lam mau TOI di
    for (var i = 0; i < 24; i++) {
      c = c.map(function (v) { return toiDan ? Math.max(0, v * 0.9) : Math.min(255, v * 1.12 + 6); });
      if (tiSo(c, n) >= 4.5) break;
    }
    return 'rgb(' + c.map(Math.round).join(',') + ')';
  }
  function nenThat(el) {
    // Lan nguoc len cha de tim mau nen THAT SU (o gan nhat khong trong suot)
    var x = el;
    while (x && x !== document.documentElement) {
      var c = '';
      try { c = getComputedStyle(x).backgroundColor; } catch (e) {}
      var r = soMau(c);
      if (r && !/rgba\([^)]*,\s*0\s*\)/.test(c)) return c;
      x = x.parentElement;
    }
    return bien('--bg-card', '#141b24');
  }
  /* Doc mot so tu chu trong o. DB TG viet so khong nhat quan ("1.234" nghin
     kieu Viet, "61.0%" thap phan kieu Anh, "23,1B" thap phan kieu Viet) nen
     phai xet tung truong hop, khong doan mot kieu. */
  function docSo(t) {
    if (t == null) return null;
    var s = String(t).replace(/ /g, ' ').trim();
    if (!s || s === '-' || s === '—') return null;
    var am = /^\(.*\)$/.test(s) || /^\s*-/.test(s);
    s = s.replace(/[^\d.,]/g, '');
    if (!s) return null;
    var ch = s.lastIndexOf('.'), ph = s.lastIndexOf(',');
    if (ch >= 0 && ph >= 0) {
      if (ph > ch) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (ph >= 0) {
      s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (ch >= 0) {
      s = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
    }
    var v = parseFloat(s);
    if (!isFinite(v)) return null;
    return am ? -v : v;
  }

  /* Mot lan duy nhat: nap bang CSS rieng cua tep nay. VI SAO DUNG CSS chu khong
     dat style tung the: cac lop nay khong doi theo du lieu, dat mot lan roi
     thoi — bo theo doi khoi phai ghi lai hang tram thuoc tinh sau moi lan
     DB TG ve lai bang. */
  var CSS = [
    /* --- B4: danh sach co dau dau dong --- */
    '.dm-b4-ds{margin:0 0 10px;padding-left:19px;list-style:disc}',
    '.dm-b4-ds > li{margin:0 0 6px}',
    '.dm-b4-ds > li:last-child{margin-bottom:0}',
    '.dm-b4-ds > li > div{margin-bottom:0 !important}',
    /* --- B10: hai cot canh nhau + vien thuoc chenh lech --- */
    '.dm-b10{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;min-height:44px}',
    '.dm-b10-cot{display:flex;flex-direction:column;gap:1px;min-width:0}',
    '.dm-b10-nhan{font-size:9.5px;font-weight:700;letter-spacing:.2px;',
    '  color:var(--text-secondary);text-transform:uppercase;white-space:nowrap}',
    '.dm-b10-truoc{font-size:13px;font-weight:700;color:var(--text-secondary);white-space:nowrap}',
    '.dm-b10-vach{width:1px;align-self:stretch;background:var(--border-color);margin:2px 1px}',
    '.dm-vien{display:inline-block;border-radius:11px;padding:1px 8px;font-size:10.5px;',
    '  font-weight:800;white-space:nowrap;line-height:1.5}',
    '.dm-b10-oppo{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;min-height:22px}',
    '.dm-b10-oppo .dm-b10-truoc{font-size:11px}',
    /* --- B17: vong tien do nho --- */
    '.dm-b17{display:flex;align-items:center;gap:14px}',
    '.dm-b17-ben{min-width:0;flex:1 1 auto}',
    '.dm-b17 svg{flex:0 0 auto;display:block}',
    /* --- B2/B9/B18: so dem gan tren nut loc nhanh --- */
    '.dm-dem{display:inline-block;margin-left:6px;border:1px solid currentColor;',
    '  border-radius:9px;padding:0 5px;font-size:9.5px;font-weight:800;line-height:15px;',
    '  vertical-align:middle;opacity:.95}',
  ].join('\n');
  function napCSS() {
    if (document.getElementById('dm-bo-cuc-css')) return;
    var st = document.createElement('style');
    st.id = 'dm-bo-cuc-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ==================================================================
     B3 — CHIEN LUOC KENH: gach mau ben trai theo mau kenh
     ==================================================================
     tg.html da co 3 the, moi the mot <h4> ghi ten kenh. Con thieu dung mot
     thu: gach mau ben trai. Va mau dang dung la mau CU cua DB TG (MWG vang,
     KA xam, IND xanh la) — nguoc voi ban demo (MWG xanh la, KA ho phach,
     IND xanh duong). Lay mau qua DMAU de tu doi theo che do Sang/Toi.

     KHONG dung vao <h4> va khong doi cau truc the: lop bao mat cua DB TG tim
     the theo  h4.closest('div[style*="border"]')  de an the cua kenh khac.
     Doi style thi thuoc tinh style van con chu "border" -> lop do van chay. */
  function b3ChienLuocKenh() {
    var s = document.getElementById('channel-strategy-section');
    if (!s) return;
    var hs = s.querySelectorAll('h4');
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      var ten = (h.textContent || '').trim();
      var the = h.closest('div[style*="border"]');
      if (!the || !ten) continue;
      var mau = (window.DMAU && window.DMAU.mau(ten)) || bien('--oppo-green', '#2ad998');
      /* Dat kem !important: demo-sang.js co luat
           :root[data-theme="light"] [style*="solid #FFC800"]{border-top-color:... !important}
         Luat trong bang CSS co !important thang style noi dong THUONG. Neu
         khong danh dau important o day thi o che do Sang, vach mau tren cua
         the cu van con — thanh ra the co CA hai gach, tren lan trai. */
      the.style.setProperty('border-top', '1px solid var(--border-color)', 'important');
      the.style.setProperty('border-left', '4px solid ' + mau, 'important');
      /* Cham tron va dong chu tieu de doi theo cung mau kenh, neu khong thi
         gach trai mot mau ma cham mot mau — nguoi xem doc ra hai kenh khac nhau.

         BAY DA DINH: KHONG duoc tim lai hai the nay bang bo chon theo thuoc
         tinh style ([style*="border-radius:50%"], [style*="font-weight:700"]).
         Ngay khi minh ghi mot thuoc tinh vao el.style, trinh duyet viet lai ca
         chuoi style theo kieu chuan CO KHOANG TRANG ("border-radius: 50%"),
         nen tu lan chay thu hai tro di bo chon do khong khop nua. Lan dau em
         lam vay: mau kenh dong lai o lan chay dau, doi Sang/Toi thi gach trai
         doi mau ma chu tieu de thi khong — do tuong phan bat ra 3 cho chu mo.
         Nen: tim MOT LAN roi nho lai bang thuoc tinh rieng tren the. */
      if (!the.__dmB3) {
        var td = h.parentElement && h.parentElement.nextElementSibling;
        the.__dmB3 = {
          cham: the.querySelector('span[style*="border-radius:50%"]'),
          td: (td && /font-weight:\s*(700|bold)/i.test(td.getAttribute('style') || '')) ? td : null,
        };
      }
      if (the.__dmB3.cham) the.__dmB3.cham.style.setProperty('background', mau, 'important');
      if (the.__dmB3.td) {
        the.__dmB3.td.style.setProperty('color', mauDocDuoc(mau, nenThat(the)), 'important');
      }
    }
  }

  /* ==================================================================
     B4 — CHINH SACH NHAN SU: danh sach co dau dau dong
     ==================================================================
     Chi BOC lai: moi doan van san co duoc nhac vao mot <li>. Khong cat chu,
     khong viet lai, khong gop doan — nguoi doc van doc dung tung chu nhu cu,
     chi them dau dau dong de luot mat nhanh hon.

     Cac dong "Target 1/2/3" va "2..5 sao" KHONG dua vao danh sach: chung von
     da la the co vien, co nen, tu no da la mot danh sach nhin thay duoc —
     them dau cham tron vao chi lam roi. */
  function b4ChinhSachNS() {
    var s = document.getElementById('hr-policy-section');
    if (!s) return;
    if (s.querySelector('ul.dm-b4-ds')) return;   // lam mot lan la du
    var the = s.querySelectorAll(':scope > div > div');
    for (var i = 0; i < the.length; i++) {
      var doan = the[i].querySelectorAll(':scope > div[style*="line-height:1.6"]');
      if (!doan.length) continue;
      var ds = document.createElement('ul');
      ds.className = 'dm-b4-ds';
      doan[0].parentNode.insertBefore(ds, doan[0]);
      for (var j = 0; j < doan.length; j++) {
        var li = document.createElement('li');
        li.appendChild(doan[j]);   // NHAC the cu vao, khong chep lai chu
        ds.appendChild(li);
      }
    }
  }

  /* ==================================================================
     B10 — SO SANH CUNG KY: hai cot canh nhau, chenh lech boc vien thuoc
     ==================================================================
     DB TG viet ca ba manh vao MOT dong chu:
         "T8 ngày 1-23 · +3.2% (T7: 6.085 máy)"
     Ba manh do la ba thu khac nhau (ky dang xem / chenh lech / so thang
     truoc) nhung bi ep thanh mot dong, phai doc het ca cau moi biet thang
     truoc bao nhieu. Tach ra: thang nay mot cot, thang truoc mot cot, chenh
     lech boc vien thuoc xanh/do.

     TUNG CHU DEU LA CHU CU, chi cat ra dat vao dung cho — khong viet them
     mot tu nao. Nhan cot cung lay tu chinh dong do ("T8 ngày 1-23" va "T7"),
     nen khong co nguy co nhan sai thang.

     The .kpi-sub goc duoc GIU LAI (chi an di) vi renderMonthlyCompare() van
     ghi vao no moi lan doi bo loc — xoa la vo ham cua DB TG. */
  function b10TachDong(sub) {
    // -> { ky, chenh, mauChenh, nhanTruoc, soTruoc }  hoac null neu khong doc duoc
    var t = (sub.textContent || '').replace(/ /g, ' ').trim();
    if (!t || t === '-') return null;
    var m = t.match(/^(.*?)\s*·\s*(\S+)\s*\((.*)\)\s*$/);
    if (!m) return null;
    var trong = m[3];
    var k = trong.indexOf(':');
    var nhan = k >= 0 ? trong.slice(0, k).trim() : '';
    var so = k >= 0 ? trong.slice(k + 1).trim() : trong.trim();
    var sp = sub.querySelector('span');
    var mauChenh = '';
    try { if (sp) mauChenh = getComputedStyle(sp).color; } catch (e) {}
    return { ky: m[1].trim(), chenh: m[2], mauChenh: mauChenh, nhanTruoc: nhan, soTruoc: so };
  }
  function b10ToVien(vien, chu, mau) {
    datChu(vien, chu);
    var m = mau || bien('--text-secondary', '#8b98a9');
    datKieu(vien, 'color', m);
    datKieu(vien, 'background', nenNhat(m, 0.14));
  }
  function b10SoSanh() {
    var hang = document.getElementById('mc-kpi-row');
    if (!hang) return;
    var the = hang.querySelectorAll('.kpi-card');
    for (var i = 0; i < the.length; i++) {
      var c = the[i];
      var giaTri = c.querySelector('.kpi-value');
      var sub = c.querySelector('.kpi-sub');
      if (!giaTri || !sub) continue;

      /* --- phan TONG THI TRUONG: dung hai cot --- */
      var khoi = c.querySelector(':scope > .dm-b10');
      if (!khoi) {
        khoi = document.createElement('div');
        khoi.className = 'dm-b10';
        var cotNay = document.createElement('div'); cotNay.className = 'dm-b10-cot';
        var nhanNay = document.createElement('div'); nhanNay.className = 'dm-b10-nhan';
        cotNay.appendChild(nhanNay);
        var vach = document.createElement('div'); vach.className = 'dm-b10-vach';
        var cotTruoc = document.createElement('div'); cotTruoc.className = 'dm-b10-cot';
        var nhanTruoc = document.createElement('div'); nhanTruoc.className = 'dm-b10-nhan';
        var soTruoc = document.createElement('div'); soTruoc.className = 'dm-b10-truoc';
        cotTruoc.appendChild(nhanTruoc); cotTruoc.appendChild(soTruoc);
        var vien = document.createElement('span'); vien.className = 'dm-vien';
        khoi.appendChild(cotNay); khoi.appendChild(vach);
        khoi.appendChild(cotTruoc); khoi.appendChild(vien);
        sub.parentNode.insertBefore(khoi, sub);
        cotNay.appendChild(giaTri);            // NHAC the cu vao, giu nguyen id
        khoi.__nhanNay = nhanNay; khoi.__nhanTruoc = nhanTruoc;
        khoi.__soTruoc = soTruoc; khoi.__vien = vien;
      }
      var d = b10TachDong(sub);
      if (d) {
        datChu(khoi.__nhanNay, d.ky);
        datChu(khoi.__nhanTruoc, d.nhanTruoc);
        datChu(khoi.__soTruoc, d.soTruoc);
        b10ToVien(khoi.__vien, d.chenh, d.mauChenh);
        datKieu(sub, 'display', 'none');
      } else {
        // Chua chon Thang / chua co so: tra lai dong goc cho nguoi dung doc
        datKieu(sub, 'display', '');
      }

      /* --- phan OPPO: them so thang truoc + vien thuoc, an dong gop cu --- */
      var oppo = c.querySelector('.mc-kpi-oppo');
      var oSub = c.querySelector('.mc-kpi-oppo-sub');
      if (!oppo || !oSub) continue;
      var oTruoc = oppo.querySelector(':scope > .dm-b10-truoc');
      var oVien = oppo.querySelector(':scope > .dm-vien');
      if (!oTruoc) {
        oppo.classList.add('dm-b10-oppo');
        oTruoc = document.createElement('span'); oTruoc.className = 'dm-b10-truoc';
        oVien = document.createElement('span'); oVien.className = 'dm-vien';
        oppo.appendChild(oTruoc); oppo.appendChild(oVien);
      }
      /* Dong OPPO viet kieu khac dong tong: "+3.2% (T7: 2.068 máy)" — khong co
         phan "ky" o dau. Nen tach rieng, khong dung lai b10TachDong(). */
      var ot = (oSub.textContent || '').replace(/ /g, ' ').trim();
      var om = ot.match(/^(\S+)\s*\((.*)\)\s*$/);
      if (om) {
        var mauO = '';
        try { mauO = getComputedStyle(oSub).color; } catch (e) {}
        datChu(oTruoc, om[2]);
        b10ToVien(oVien, om[1], mauO);
        datKieu(oSub, 'display', 'none');
      } else {
        datChu(oTruoc, ''); datChu(oVien, '');
        datKieu(oSub, 'display', '');
      }
    }
  }

  /* ==================================================================
     B17 — TONG QUAN MUC TIEU SHOP IND: moi muc tieu mot vong tien do nho
     ==================================================================
     The cu: mot thanh ngang mong 8px. Voi cac muc tieu dang dat 0,9% thi
     thanh do gan nhu khong nhin thay gi — chi con doc duoc con so. Vong tron
     co con so % ngay o giua nen du 0,9% van doc duoc ngay.

     KHONG dung chu: ba the con o trong (tieu de / "0 / 25 shop" / "0,0% muc
     tieu") duoc NHAC nguyen si sang bo cuc moi. Nho vay cac luat cua
     demo-sang.js viet theo thuoc tinh style (vi du [style*="color:#B0B7BD"])
     van bam dung the cu.

     renderIndGoalCards() ghi de innerHTML moi lan doi Thang -> phai dung lai.
     Ghi nho ban minh vua tao (__dmRa) de biet luc nao la ban cua DB TG. */
  function b17MotThe(el) {
    if (!el) return;
    if (el.__dmRa && el.innerHTML === el.__dmRa) return;   // van la ban cua minh
    var con = el.children;
    if (con.length < 4) return;
    var tieuDe = con[0], soTuyetDoi = con[1], thanh = con[2], phanTram = con[3];
    var pt = docSo((phanTram.textContent || '').split('%')[0]);
    if (pt == null) pt = 0;
    pt = Math.max(0, Math.min(100, pt));
    /* Mau vong = dung mau ma DB TG da chon cho dong "% muc tieu" (xanh khi
       >=100, mau kenh khi >=70, do khi thap). Lay nguyen chuoi trong thuoc
       tinh style — thuong la var(--positive)/var(--negative) — de vong tu doi
       mau khi doi che do Sang/Toi, khong phai ve lai. */
    var mv = ((phanTram.getAttribute('style') || '').match(/color\s*:\s*([^;]+)/) || [])[1];
    mv = (mv || '').trim() || 'var(--oppo-green)';

    var R = 24, CV = 2 * Math.PI * R;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '62'); svg.setAttribute('height', '62');
    svg.setAttribute('viewBox', '0 0 62 62');
    svg.setAttribute('aria-hidden', 'true');
    function vong(mau, dash) {
      var c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', '31'); c.setAttribute('cy', '31'); c.setAttribute('r', String(R));
      c.setAttribute('fill', 'none'); c.setAttribute('stroke', mau);
      c.setAttribute('stroke-width', '7');
      if (dash != null) {
        c.setAttribute('stroke-dasharray', dash.toFixed(2) + ' ' + CV.toFixed(2));
        c.setAttribute('stroke-linecap', 'round');
        c.setAttribute('transform', 'rotate(-90 31 31)');
      }
      return c;
    }
    var sang = !!(window.DMAU && window.DMAU.laSang && window.DMAU.laSang());
    svg.appendChild(vong(sang ? 'rgba(16,24,40,.10)' : 'rgba(255,255,255,.10)', null));
    if (pt > 0) svg.appendChild(vong(mv, CV * pt / 100));
    var chu = document.createElementNS(svgNS, 'text');
    chu.setAttribute('x', '31'); chu.setAttribute('y', '35');
    chu.setAttribute('text-anchor', 'middle');
    chu.setAttribute('font-size', '12.5'); chu.setAttribute('font-weight', '800');
    /* Chu giua vong dung --text-primary chu khong dung mau vong: mau vong co
       the la mau do/xam nhat, dat lam chu 12px thi tut duoi nguong doc duoc. */
    chu.setAttribute('fill', 'var(--text-primary)');
    chu.style.color = 'var(--text-primary)';
    chu.textContent = (Math.round(pt * 10) / 10).toFixed(1) + '%';
    svg.appendChild(chu);

    var boc = document.createElement('div'); boc.className = 'dm-b17';
    var ben = document.createElement('div'); ben.className = 'dm-b17-ben';
    boc.appendChild(svg); boc.appendChild(ben);
    ben.appendChild(tieuDe); ben.appendChild(soTuyetDoi); ben.appendChild(phanTram);
    thanh.parentNode.removeChild(thanh);      // thanh ngang cu -> vong thay cho
    el.innerHTML = '';
    el.appendChild(boc);
    el.__dmRa = el.innerHTML;
  }
  function b17MucTieuIND() {
    ['ind-goal-oc', 'ind-goal-perf', 'ind-goal-so'].forEach(function (id) {
      try { b17MotThe(document.getElementById(id)); } catch (e) {}
    });
  }

  /* ==================================================================
     B18 — TIEN DO TARGET THEO SHOP O.C: shop nguy co len dau
     ==================================================================
     DB TG xep mac dinh theo Goi (Platinum -> Titan -> Gold). Xep vay thi shop
     dang thieu 90% target co the nam tan cuoi bang, khong ai nhin thay. Doi
     thu tu MAC DINH: % con thieu nhieu nhat len tren dau.

     CAN THAN — day la cho de lam hong nhat cua ca tep:
     bang nay CO SAP XEP RIENG khi bam tieu de cot. Neu cu ep thu tu cua minh
     sau moi lan ve thi nguoi dung bam "S.O" xong bang van khong nhuc nhich —
     nhin nhu chuc nang sap xep bi hong. Nen: chi dat thu tu luc MAC DINH.
     Nguoi dung bam mot cai vao tieu de cot la tu do bo han, khong ep nua. */
  var daBamXep = false;
  function b18GanNgheBam() {
    var th = document.querySelectorAll('#ind-oc-target-table thead th[data-field]');
    for (var i = 0; i < th.length; i++) {
      if (th[i].__dmB18) continue;
      th[i].__dmB18 = 1;
      // nghe o vong BAT (capture): chac chan chay truoc ham sap xep cua DB TG
      th[i].addEventListener('click', function () { daBamXep = true; }, true);
    }
  }
  function b18XepShopOC() {
    b18GanNgheBam();
    if (daBamXep) return;
    var than = document.getElementById('ind-oc-target-table-body');
    if (!than) return;
    var dong = than.querySelectorAll(':scope > tr');
    if (dong.length < 2) return;                 // rong hoac chi mot dong -> khoi xep
    var ds = [];
    for (var i = 0; i < dong.length; i++) {
      var o = dong[i].children;
      if (o.length < 6) return;                  // dong bao "khong co shop nao" -> bo qua ca bang
      var p = docSo(o[5].textContent);
      // Shop khong co target (%HT la "-") khong do duoc muc nguy co -> xep cuoi
      ds.push({ tr: dong[i], p: p == null ? Infinity : p, i: i });
    }
    var moi = ds.slice().sort(function (a, b) { return a.p - b.p || a.i - b.i; });
    var doi = false;
    for (var j = 0; j < moi.length; j++) if (moi[j].tr !== ds[j].tr) { doi = true; break; }
    if (!doi) return;                            // dang dung thu tu roi -> khong dong vao
    var manh = document.createDocumentFragment();
    for (var k = 0; k < moi.length; k++) manh.appendChild(moi[k].tr);
    than.appendChild(manh);
  }

  /* ==================================================================
     B2 / B9 — NUT LOC NHANH CO SAN SO DEM
     ==================================================================
     Trong tg.html chi co HAI cho that su la "nut loc nhanh" (bam mot cai la
     bot dong trong bang):
        - hai nut Goi "Platinum & Titan" / "Gold" cua bang Target Shop O.C
        - o tich "Chi shop te nhat (duoi TB)" cua bang chi tiet 125 shop
     Cac nut con lai (DS/DT/DG, Thang/Tuan, FPT/Viettel...) chi doi CHI SO dang
     ve, khong loc dong nao — gan so dem vao do la ghi mot con so vo nghia.

     So dem gan them bang mot the con rieng (.dm-dem), KHONG sua chu tren nut:
     ham bam nut doc btn.dataset.levels chu khong doc chu, nhung van co cho
     khac so khop theo chu — sua chu la mot canh bac khong can thiet.

     PHAI DEM TU DOM, KHONG GOI DUOC HAM CUA DB TG. Da thu:
     computeOcTargetProgressRows / getFilteredRows / DATA deu KHONG nam o tang
     toan cuc (do trong trinh duyet: typeof ra "undefined") — ca khoi ve bang
     nam trong mot pham vi dong. Nen moi con so o day deu doc lai tu chinh cac
     dong bang dang hien, la con so nguoi dung dang nhin thay. */
  function demGan(nut, so) {
    if (!nut) return;
    var d = nut.querySelector(':scope > .dm-dem');
    if (so == null) { if (d) datKieu(d, 'display', 'none'); return; }
    if (!d) {
      d = document.createElement('span');
      d.className = 'dm-dem';
      nut.appendChild(d);
    }
    datKieu(d, 'display', '');
    datChu(d, String(so));
  }
  /* Dem so DONG SHOP that trong than bang, bo dong bao "khong co ... nao khop
     bo loc" (dong do chi co mot o colspan). */
  function demDongOC() {
    var than = document.getElementById('ind-oc-target-table-body');
    if (!than) return null;
    var tr = than.querySelectorAll(':scope > tr');
    if (!tr.length) return null;
    if (tr.length === 1 && tr[0].children.length < 6) return 0;
    return tr.length;
  }

  /* BAY DA DINH: khong the doc nut nao dang bat qua class "active".
     tg.html co dong (renderIndSaleChart):
        querySelectorAll('.ind-sale-metric-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.metric === indSaleChartMetric))
     Hai nut Goi cung mang class .ind-sale-metric-btn nhung KHONG co data-metric
     -> moi lan ve lai bieu do Sale IND la ca hai nut deu bi go "active". Do do
     tren man hinh that, hai nut Goi trong nhu nhau, khong biet dang xem cai nao.
     Nen tu ghi nho lay: mac dinh la nut dau (dung nhu HTML tinh ghi), nguoi
     dung bam cai nao thi nho cai do. */
  var ocNutBat = null;
  function b2NhoNutGoi(nut) {
    for (var i = 0; i < nut.length; i++) {
      if (!ocNutBat && nut[i].classList.contains('active')) ocNutBat = nut[i];
      if (nut[i].__dmNghe) continue;
      nut[i].__dmNghe = 1;
      // vong BAT: chac chan chay truoc ham cua DB TG
      nut[i].addEventListener('click', function () { ocNutBat = this; }, true);
    }
    if (!ocNutBat && nut.length) ocNutBat = nut[0];
    /* Tra lai dau hieu "dang bat" cho nut nguoi dung chon. Khong co no thi so
       dem ben canh hai nut khong con y nghia — nguoi xem khong biet con so nao
       la bang dang hien. */
    var coBat = false;
    for (var j = 0; j < nut.length; j++) if (nut[j].classList.contains('active')) coBat = true;
    if (!coBat && ocNutBat) ocNutBat.classList.add('active');
  }
  function b2DemNutGoi() {
    var nut = document.querySelectorAll('.oc-target-tab');
    if (nut.length < 2) return;
    b2NhoNutGoi(nut);
    var than = document.getElementById('ind-oc-target-table-body');
    if (!than) return;
    var soNay = demDongOC();
    if (soNay == null) return;             // bang chua ve lan nao
    var bat = null;
    for (var i = 0; i < nut.length; i++) if (nut[i] === ocNutBat) bat = nut[i];
    if (!bat) return;
    var sel = document.getElementById('ind-review-month-select');
    var ky = sel ? sel.value : '';
    /* CHI DEM DUOC NUT DANG BAT — va co ly do phai chiu vay.
       Y dau la: bam nhanh nut kia mot cai de doc so roi tra lai ngay trong
       cung mot luot chay JS (mat nguoi khong kip thay). Da lam thu va PHAI BO:
       hai nut Goi mang ca class .ind-sale-metric-btn, ma tg.html co dong
           querySelectorAll('.ind-sale-metric-btn').forEach(btn =>
               btn.addEventListener('click', () => {
                   indSaleChartMetric = btn.dataset.metric; renderIndSaleTrendChart(); }))
       Hai nut Goi khong co data-metric -> mot cai bam la indSaleChartMetric
       thanh undefined va renderIndSaleTrendChart() vo ("Cannot read properties
       of undefined"). Do la loi san co cua tg.html, nguoi dung bam that cung
       dinh; nhung minh thi tuyet doi khong duoc TU MINH goi no ra.
       Nen: dem nut dang bat, nho lai; nut kia hien so ngay khi nguoi dung ghe
       qua lan dau. Con so hien ra luon la so THAT, khong bao gio doan. */
    bat.__dmSo = soNay;
    bat.__dmKy = ky;
    for (var q = 0; q < nut.length; q++) {
      demGan(nut[q], nut[q].__dmKy === ky ? nut[q].__dmSo : null);
    }
  }

  /* O tich "Chi shop te nhat (duoi TB)" cua bang chi tiet 125 shop.
     Dinh nghia "te nhat" cua DB TG: ti trong OPPO theo DOANH THU, da loai
     Apple khoi mau so, thap hon trung binh doi. Ca hai con so do deu dang
     nam san trong bang: moi shop mot dong "DT" co huy hieu (37.7%) o cot
     OPPO, va dong TONG cung co huy hieu do — chinh la trung binh doi. Nen
     dem bang cach so hai con so ay, khong tu tinh lai tu du lieu goc. */
  function b2DemNutTeNhat() {
    var o = document.getElementById('filter-only-worst');
    if (!o) return;
    var nhan = o.closest('label');
    if (!nhan) return;
    var than = document.getElementById('shop-combined-table-body');
    if (!than) { demGan(nhan, null); return; }
    var dongShop = than.querySelectorAll(':scope > tr.row-revenue:not(.total-row)');
    if (!dongShop.length) { demGan(nhan, null); return; }
    if (o.checked) {
      // Da bat loc roi -> so shop dang hien CHINH LA so shop te nhat
      demGan(nhan, dongShop.length);
      return;
    }
    var tong = than.querySelector(':scope > tr.total-row.row-revenue');
    if (!tong || tong.children.length < 2) { demGan(nhan, null); return; }
    /* BAY DA DINH 29/08 — DEM RA 37 MA TO NHAT CHI 34 SHOP.
       Huy hieu nay viet TRONG NGOAC: "(43.6%)". docSo() dung lai doc() ben
       trong, ma doc() coi ngoac tron la dau AM kieu ke toan -> ca hai con so
       deu ra AM. Luc do phep so sanh "duoi trung binh" bi LAT NGUOC: no dem
       nham cac shop TREN trung binh. demo-bang.js da bo ngoac truoc khi doc
       (nen to nhat dung 34 shop), tep nay thi quen -> hai ben lech nhau 3 shop.
       Nut noi 37 ma tren bang chi thay 34 dong mo la nguoi dung mat tin ngay.
       Bo ngoac truoc khi doc, giong het demo-bang.js. */
    function pct(el) {
      var x = el ? (el.querySelector('.pct-sub') || {}).textContent : null;
      return x == null ? null : docSo(String(x).replace(/[()]/g, ''));
    }
    var tb = pct(tong.children[1]);
    if (tb == null) { demGan(nhan, null); return; }
    var dem = 0;
    for (var i = 0; i < dongShop.length; i++) {
      var v = pct(dongShop[i].children[1]);
      if (v != null && v < tb) dem++;
    }
    demGan(nhan, dem);
  }
  function b2SoDemNut() {
    chay('b2-goi', b2DemNutGoi);
    chay('b2-tenhat', b2DemNutTeNhat);
  }

  /* ==================================================================
     CHAY VA DAT LAI
     ================================================================== */
  /* Moi khoi mot lan chay rieng, hong khoi nao chi mat khoi do. Loi duoc ghi
     lai vao window.__dmBoCucLoi — khong in ra console (trang nay nguoi dung
     that dang dung, khong nen do chu do len), nhung co cho de soi khi go loi:
     mot khoi im lang khong ve gi la kieu hong kho tim nhat. */
  window.__dmBoCucLoi = {};
  function chay(ten, f) {
    try { f(); } catch (e) { window.__dmBoCucLoi[ten] = String((e && e.stack) || e).slice(0, 300); }
  }
  function datLai() {
    chay('css', napCSS);
    chay('b3', b3ChienLuocKenh);
    chay('b4', b4ChinhSachNS);
    chay('b10', b10SoSanh);
    chay('b17', b17MucTieuIND);
    chay('b18', b18XepShopOC);
    chay('b2', b2SoDemNut);
  }

  /* Chong doi: DB TG ve lai bang/the la ban ra hang tram thay doi lien tiep.
     Chay ngay tung cai thi trang giat. Gom lai, 220ms sau moi lam mot lan —
     dung con so cua demo-bang.js cho dong bo. */
  var hen = null;
  function xepLich() {
    if (hen) return;
    hen = setTimeout(function () { hen = null; datLai(); }, 220);
  }

  var DOI = ['channel-strategy-section', 'hr-policy-section', 'mc-kpi-row',
             'ind-goal-oc', 'ind-goal-perf', 'ind-goal-so',
             'ind-oc-target-table-body', 'shop-combined-table-body'];
  function ganTheoDoi() {
    for (var i = 0; i < DOI.length; i++) {
      var el = document.getElementById(DOI[i]);
      if (!el || el.__dmBoCuc) continue;
      el.__dmBoCuc = 1;
      try {
        /* Chi nghe childList/characterData, KHONG nghe attributes: viec minh
           dat style la doi thuoc tinh — nghe ca attributes thi minh tu goi lai
           chinh minh sau moi lan ghi. */
        new MutationObserver(xepLich)
          .observe(el, { childList: true, subtree: true, characterData: true });
      } catch (e) {}
    }
    /* Doi che do Sang/Toi: mau kenh, mau vien thuoc deu doi theo. demo-sang.js
       chi goi lai __dmvVeLai/__dmBangLai/__dmChamLai — khong biet toi tep nay,
       nen tu nghe lay tren the <html>. */
    if (!document.documentElement.__dmBoCucChe) {
      document.documentElement.__dmBoCucChe = 1;
      try {
        new MutationObserver(xepLich)
          .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      } catch (e) {}
    }
  }

  function gan() { ganTheoDoi(); datLai(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gan);
  else gan();
  [1500, 4000, 9000, 16000].forEach(function (ms) { setTimeout(gan, ms); });

  window.__dmBoCuc = gan;
})();
