/* kiem-app.mjs — TU DONG RA SOAT app.html bang DU LIEU THAT.
 *
 * Vi sao can: cac bo test o may lam viec chi co goi mock 12 shop. Du lieu that
 * co 124 shop MWG / 29 KA / 204 IND, nhieu truong hop chi lo ra o quy mo that.
 *
 * Cach chay: mo app.html trong jsdom, dang nhap bang ma quan ly vung lay tu
 * GitHub Secret, roi bam qua tung tab / tung bo loc y nhu nguoi that.
 *
 * KET QUA ghi ra data/ket-qua-kiem-app.json — CHI co ten phep kiem + dat/khong dat
 * + vai con so dem (so shop, so cot). TUYET DOI khong co ten shop, khong co
 * doanh thu, vi repo la public.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const idx = JSON.parse(fs.readFileSync('data/index.json', 'utf8'));
const codes = JSON.parse(process.env.SALE_CODES || '{}');
const admin = idx.users.find((u) => u.r === 'admin');
if (!admin) throw new Error('Khong tim thay nguoi dung admin trong data/index.json');
const pin = (codes.admin && codes.admin.pin) || '';
if (!pin) throw new Error('Khong lay duoc ma quan ly vung tu SALE_CODES');

const files = { 'data/index.json': idx };
for (const u of idx.users) files['data/' + u.id + '.json'] = JSON.parse(fs.readFileSync('data/' + u.id + '.json', 'utf8'));

const dom = new JSDOM(fs.readFileSync('app.html', 'utf8'), {
  runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
  beforeParse(w) {
    Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
    w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.scrollTo = () => {};
    w.fetch = (x) => {
      const k = String(x).split('?')[0];
      if (k === 'app.html') return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
      return files[k]
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(files[k]) })
        : Promise.resolve({ ok: false, status: 404 });
    };
    w.localStorage.setItem('oppo_sale_me_v1', JSON.stringify({ id: admin.id, n: admin.n, r: admin.r, pin }));
  },
});

const w = dom.window;
const $ = (s) => w.document.querySelector(s);
const $$ = (s) => [...w.document.querySelectorAll(s)];
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (s) => (s || '').replace(/\s+/g, ' ').trim();
const bam = (el) => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const doi = (el, v) => { if (!el) return; el.value = v; el.dispatchEvent(new w.window.Event('change', { bubbles: true })); };
const hien = (el) => { if (!el) return false; let x = el; while (x && x !== w.document.body) { if (x.hidden) return false; x = x.parentElement; } return true; };

const KQ = [];
const ghi = (ten, dat, chiTiet) => { KQ.push({ ten, dat: !!dat, chiTiet: chiTiet || '' }); console.log((dat ? '  OK  ' : '  LOI ') + ten + (chiTiet ? '  — ' + chiTiet : '')); };
const loiJS = [];

(async () => {
  w.onerror = (m) => loiJS.push(String(m));
  await cho(4000);

  if (typeof w.D === 'undefined' || !w.D) { ghi('Dang nhap va giai ma goi du lieu', false, 'khong mo khoa duoc'); ketThuc(); return; }
  ghi('Dang nhap va giai ma goi du lieu', true,
    w.D.sales.length + ' sale, ' + w.D.months.length + ' thang, ban ' + w.APP_VER);

  const tabs = $$('#segbar [data-seg]').map((b) => b.dataset.seg);
  ghi('Co du tab kenh', tabs.length >= 2, tabs.join(' / '));

  const sangTab = async (sg) => { bam($$('#segbar [data-seg]').find((b) => b.dataset.seg === sg)); await cho(700); };

  // ---------- A. bat het bo loc o MWG roi sang tab khac
  await sangTab('MWG');
  const zs = [...$('#f-size').options].slice(1).map((o) => o.value);
  if (zs.length) doi($('#f-size'), zs[0]);
  await cho(600);
  const nutPK = $$('#f-seg [data-fpk]').filter((b) => b.dataset.fpk !== '-1');
  // Phai chon DUNG nhom 10-20M. Truoc day dung /10/ nen khop nham "5-10M".
  const nut1020 = () => $$('#f-seg [data-fpk]').find((b) => /10\s*[-–]\s*20/.test(T(b.textContent)));
  if (nut1020()) bam(nut1020()); else if (nutPK.length) bam(nutPK[0]);
  await cho(600);
  if ($('#f-ngay').options.length > 2) doi($('#f-ngay'), '10');
  await cho(600);
  ghi('Bat duoc bo loc o tab MWG',
    !!(w.F_SIZE || w.F_SEGS.length || w.F_NGAY),
    'size=' + w.F_SIZE + ' PK=' + JSON.stringify(w.F_SEGS) + ' ngay=' + w.F_NGAY);

  for (const sg of tabs.filter((x) => x !== 'MWG')) {
    await sangTab(sg);
    const sach = !w.F_SIZE && !w.F_SEGS.length && !w.F_NGAY;
    ghi('Tab ' + sg + ': bo loc tu tat khi roi MWG', sach,
      sach ? '' : 'con size=' + w.F_SIZE + ' PK=' + JSON.stringify(w.F_SEGS) + ' ngay=' + w.F_NGAY);
    const con = [['#filt', 'o loc'], ['#f-seg-w', 'khoi phan khuc'], ['#filt-note', 'ghi chu'],
                 ['#tvh-h', 'bang chi tiet sale'], ['#c-shop', 'the chi tiet shop']]
      .filter(([sel]) => hien($(sel))).map(([, ten]) => ten);
    ghi('Tab ' + sg + ': moi khoi chi-danh-cho-MWG deu an', con.length === 0, con.join(', '));
  }

  // ---------- B. tung bo loc o MWG co an vao so lieu khong
  await sangTab('MWG');
  const chup = () => ({
    mkt4: T($('#o-mkt4').textContent) + '|' + hien($('#o-mkt4')),
    hang: T($('#tv-hang').textContent), ngay: T($('#tv-week').textContent),
    thang: T($('#tv-mkt-thang').textContent), shop: T($('#tv-shop').textContent),
    may: T($('#o-units').textContent), dt: T($('#o-rev').textContent),
    bd: ($('#ch-day').innerHTML || '').length,
  });
  const g0 = chup();
  ghi('Tab MWG: 4 o KPI dau the co hien', hien($('#o-mkt4')));

  const sales = [...$('#f-sale').options].slice(1);
  if (sales.length) {
    doi($('#f-sale'), sales[0].value); await cho(800);
    const g = chup();
    ghi('Loc Sale: doi bang chi tiet theo sale', g.hang !== g0.hang);
    ghi('Loc Sale: doi so may o the dau', g.may !== g0.may);
    doi($('#f-sale'), '__ALL__'); await cho(700);
  }
  // Chan doan: moi size co bao nhieu shop MWG va bao nhieu shop co so thi truong (mkm)
  const dem = {};
  w.D.sales.forEach((x) => (x.s || []).forEach((sh) => {
    if (sh.ch2 !== 'MWG') return;
    const k = sh.size || '(chua xep)';
    dem[k] = dem[k] || [0, 0];
    dem[k][0]++; if (sh.mkm) dem[k][1]++;
  }));
  ghi('Chan doan size shop MWG', true,
    Object.keys(dem).map((k) => k + ': ' + dem[k][0] + ' shop (' + dem[k][1] + ' co so thi truong)').join(' | '));
  // Chon size CO shop MWG de phep kiem co y nghia
  const zTot = Object.keys(dem).filter((k) => dem[k][1] > 0).sort((a, b) => dem[b][1] - dem[a][1])[0];
  if (zTot && zs.indexOf(zTot) < 0) zs.unshift(zTot);
  if (zs.length) {
    doi($('#f-size'), zTot || zs[0]); await cho(800);
    ghi('Dang thu voi size', true, String(zTot || zs[0]));
    const g = chup();
    ghi('Loc Size shop: doi so may', g.may !== g0.may);
    ghi('Loc Size shop: doanh thu KHONG ve 0', String(g.dt).replace(/[^0-9]/g, '') !== '0', 'DT=' + g.dt);
    ghi('Loc Size shop: 4 o KPI van hien', hien($('#o-mkt4')));
    ghi('Loc Size shop: doi bang thi phan theo thang', g.thang !== g0.thang);
    doi($('#f-size'), ''); await cho(700);
  }
  if (nutPK.length) {
    const n20 = nut1020();
    ghi('Co nut nhom 10-20M', !!n20, $$('#f-seg [data-fpk]').map(b=>T(b.textContent)).join(' / '));
    if (n20) bam(n20); await cho(900);
    const g = chup();
    ghi('Loc PK 10-20M: doi bang chi tiet theo sale', g.hang !== g0.hang);
    ghi('Loc PK 10-20M: doi bang theo ngay', g.ngay !== g0.ngay);
    ghi('Loc PK 10-20M: doi bieu do theo ngay', g.bd !== g0.bd);
    ghi('Loc PK: the theo thang co ghi chu khong loc duoc', T($('#mm-note').textContent).indexOf('⚠') >= 0);
    bam($$('#f-seg [data-fpk]').find((b) => b.dataset.fpk === '-1')); await cho(700);
  }
  if ($('#f-ngay').options.length > 2) {
    doi($('#f-ngay'), '10'); await cho(800);
    ghi('Loc Ngay: doi bang chi tiet theo sale', T($('#tv-hang').textContent) !== g0.hang);
    doi($('#f-ngay'), '0'); await cho(700);
  }

  // ---------- C. muc Shop
  bam($$('nav [data-v]').find((b) => b.dataset.v === 'find')); await cho(800);
  const pil = $$('#sh-chan [data-shc]').map((b) => b.dataset.shc);
  ghi('Muc Shop: co muc con theo kenh', pil.length >= 2, pil.join(' / '));

  for (const ch of pil) {
    bam($$('#sh-chan [data-shc]').find((b) => b.dataset.shc === ch)); await cho(800);
    const ds = $$('#f-list [data-shop]');
    const sai = ds.filter((x) => { const s = w.findShop(x.dataset.shop); return s && s.ch2 !== ch; }).length;
    ghi('Shop ' + ch + ': chi liet ke shop dung kenh', sai === 0, 'liet ke ' + ds.length + ' shop, sai ' + sai);
    // Tong so shop that cua kenh nay
    let tongThuc = 0;
    w.D.sales.forEach((x) => (x.s || []).forEach((sh) => { if (sh.ch2 === ch) tongThuc++; }));
    const coGhiChu = /Đang hiện/.test(T($('#f-list').textContent));
    ghi('Shop ' + ch + ': liet ke du shop hoac noi ro dang cat bot',
      ds.length >= tongThuc || coGhiChu,
      'hien ' + ds.length + '/' + tongThuc + (coGhiChu ? ' (co ghi chu)' : ' (KHONG co ghi chu)'));

    if (!ds.length) continue;
    bam(ds[0]); await cho(1200);
    const sheet = $('#sheet');
    const moRa = sheet.classList.contains('on');
    ghi('Shop ' + ch + ': bam vao shop mo duoc to chi tiet', moRa);
    if (!moRa) continue;

    const muc = [...sheet.querySelectorAll('.dh')].map((h) => T(h.textContent));
    const tho = [...sheet.querySelectorAll('table.tv td')].filter((c) => /<b |<small|style=/.test(c.textContent)).length;
    ghi('Shop ' + ch + ': khong o nao in ra HTML tho', tho === 0, tho ? tho + ' o bi loi' : '');
    ghi('Shop ' + ch + ': co bang Chi tiet theo tung thang',
      muc.some((x) => x.indexOf('Chi tiết theo từng tháng') >= 0));

    const bang = sheet.querySelector('.tvwrap table');
    if (bang) {
      const cot = [...bang.rows[0].cells].map((c) => T(c.textContent));
      ghi('Shop ' + ch + ': bang thang co cot Hang may + Hang DT',
        cot.indexOf('Hạng máy') >= 0 && cot.indexOf('Hạng DT') >= 0, cot.join(' | '));
      if (ch === 'MWG') {
        ghi('Shop MWG: bang thang co Share DS + Share DT',
          cot.indexOf('Share DS') >= 0 && cot.indexOf('Share DT') >= 0);
        ghi('Shop MWG: co Top 3 phan khuc', muc.some((x) => x.indexOf('Top 3 phân khúc') >= 0));
        ghi('Shop MWG: co Top 3 khung gio', muc.some((x) => x.indexOf('Top 3 khung giờ') >= 0));
        ghi('Shop MWG: co Nhan vien ban tot nhat', muc.some((x) => x.indexOf('Nhân viên bán tốt nhất') >= 0));
        ghi('Shop MWG: cot PK 10-20M theo thang (can robot chay lai)',
          cot.indexOf('PK 10–20M') >= 0, cot.indexOf('PK 10–20M') >= 0 ? '' : 'chua co sgmS — dung nhu du bao');
      }
      if (ch === 'IND') ghi('Shop IND: co khoi Ton kho', muc.some((x) => x.indexOf('Tồn kho') >= 0));
    }
    bam(sheet.querySelector('#sh-x')); await cho(400);
  }

  // ---------- D. cac tab con lai khong vo
  for (const v of ['alert', 'rank', 'ton', 'over']) {
    const n = $$('nav [data-v]').find((b) => b.dataset.v === v);
    if (!n || n.hidden) continue;
    bam(n); await cho(700);
    ghi('Tab ' + v + ' mo duoc, khong vo', true);
  }

  ketThuc();
})().catch((e) => { loiJS.push(String(e && e.stack || e)); ketThuc(); });

function ketThuc() {
  const hong = KQ.filter((x) => !x.dat);
  console.log('');
  console.log('=== KET LUAN ===');
  console.log('So phep kiem :', KQ.length);
  console.log('Khong dat    :', hong.length);
  console.log('Loi JS       :', loiJS.length ? loiJS.slice(0, 8) : 'khong co');
  hong.forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x.ten + (x.chiTiet ? '  — ' + x.chiTiet : '')));
  fs.writeFileSync('data/ket-qua-kiem-app.json', JSON.stringify({
    ban: (typeof w !== 'undefined' && w.APP_VER) || null,
    tong: KQ.length, khongDat: hong.length, loiJS,
    pheps: KQ,
  }, null, 1));
  console.log('da ghi data/ket-qua-kiem-app.json');
  process.exit(0);
}
