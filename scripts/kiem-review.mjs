/* thu-review.mjs — chạy thử review.html trong jsdom bằng gói giả, soi khối "Đơn hàng dự án".
   Bơm qua window.__REVIEW_DATA (đường kiểm thử có sẵn trong review.html). */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const Y = 2026, M = 9, PM = 8;
const doy = (y, m, d) => { let n = 0; for (let i = 1; i < m; i++) n += new Date(Date.UTC(y, i, 0)).getUTCDate(); return n + d; };
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const DIMM = dim(Y, M), DIMP = dim(Y, PM);
const DMAX = 12;                       // thị trường có số tới ngày 12
const A0 = doy(Y, M, 1);

const SALES = ['CAO CHÍ BẢO', 'TRẦN THỊ QUỲNH NHƯ', 'TRƯƠNG HỮU NHÂN'];
const SIZES = ['S', 'A', 'B', 'C', 'D'];
const V0 = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/* đơn dự án cài sẵn: [tên shop, ngày, chỉ số hãng (0 OPPO,2 Samsung,4 Xiaomi,6 Apple), số máy, doanh thu] */
const CAI = [
  ['TGD_TGI_AAA - Shop 1', 12, 2, 19, 104],   // Samsung 19 máy, ĐG 5,5tr (nền ~8tr)
  ['TGD_BTR_BBB - Shop 2', 12, 2, 13, 44],    // Samsung 13 máy, ĐG 3,4tr
  ['ĐML_TGI_CCC - Shop 3', 7, 4, 9, 40],      // Xiaomi 9 máy ngày 7
  ['TGD_TGI_DDD - Shop 4', 12, 0, 11, 88],    // OPPO 11 máy — dự án của MÌNH
];

function moShop(ten, i) {
  const dk = [], dkp = [];
  for (let d = 1; d <= DIMP; d++) {
    const r = V0();
    r[0] = 1 + ((d + i) % 3); r[1] = r[0] * 7;
    r[2] = 1 + ((d + i * 2) % 3); r[3] = r[2] * 8;
    r[4] = (d + i) % 2; r[5] = r[4] * 4;
    r[6] = (d % 5 === 0) ? 1 : 0; r[7] = r[6] * 30;
    r[8] = r[0] + r[2] + r[4] + r[6] + 3; r[9] = r[1] + r[3] + r[5] + r[7] + 20;
    dkp.push(r);
  }
  for (let d = 1; d <= DMAX; d++) {
    const r = V0();
    r[0] = 1 + ((d + i) % 3); r[1] = r[0] * 7;
    r[2] = 1 + ((d + i * 2) % 3); r[3] = r[2] * 8;
    r[4] = (d + i) % 2; r[5] = r[4] * 4;
    r[6] = (d % 5 === 0) ? 1 : 0; r[7] = r[6] * 30;
    r[8] = r[0] + r[2] + r[4] + r[6] + 3; r[9] = r[1] + r[3] + r[5] + r[7] + 20;
    dk.push(r);
  }
  CAI.forEach(([sp, d, iu, u, dt]) => {
    if (sp !== ten) return;
    const r = dk[d - 1];
    r[8] += u - r[iu]; r[9] += dt - r[iu + 1];
    r[iu] = u; r[iu + 1] = dt;
  });
  return { n: ten, size: SIZES[i % SIZES.length], ch2: 'MWG', dk, dkp };
}

const TEN = ['TGD_TGI_AAA - Shop 1', 'TGD_BTR_BBB - Shop 2', 'ĐML_TGI_CCC - Shop 3', 'TGD_TGI_DDD - Shop 4',
  'TGD_TGI_EEE - Shop 5', 'ĐML_BTR_FFF - Shop 6', 'TGD_TGI_GGG - Shop 7', 'ĐML_TGI_HHH - Shop 8', 'TGD_BTR_III - Shop 9'];
const shops = TEN.map(moShop);

function dnBcua(list) {
  const a = [];
  for (let q = 1; q <= doy(Y, 12, 31); q++) a.push(null);
  for (let d = 1; d <= DIMP; d++) { const r = V0(); list.forEach(s => { const c = s.dkp[d - 1]; for (let k = 0; k < 14; k++) r[k] += c[k] || 0; }); a[doy(Y, PM, d) - 1] = r; }
  for (let d = 1; d <= DMAX; d++) { const r = V0(); list.forEach(s => { const c = s.dk[d - 1]; for (let k = 0; k < 14; k++) r[k] += c[k] || 0; }); a[doy(Y, M, d) - 1] = r; }
  return a;
}

const nhom = [shops.slice(0, 3), shops.slice(3, 6), shops.slice(6)];
const GOI = {
  __ten: 'Kiểm thử', vaiTro: 'admin', year: Y, months: [PM, M], maxDay: DMAX,
  updated: new Date().toISOString(),
  all: { dnB: dnBcua(shops), pkD: null, dmN: null },
  sales: SALES.map((n, i) => ({ n, dnB: dnBcua(nhom[i]), s: nhom[i], pkD: null, dmN: null })),
};

const html = fs.readFileSync(new URL('../review.html', import.meta.url), 'utf8');
const loi = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
  beforeParse(w) {
    w.__REVIEW_DATA = GOI;
    w.fetch = () => Promise.reject(new Error('khong goi mang trong kiem thu'));
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    w.addEventListener('error', e => loi.push(String(e.error || e.message)));
  },
});
const w = dom.window, doc = w.document;
await new Promise(r => setTimeout(r, 600));

const ok = [], xau = [];
const kt = (t, c) => (c ? ok : xau).push(t);
const txt = () => doc.body.textContent;

/* --- 1. section có mặt, đúng chỗ --- */
const h2 = [...doc.querySelectorAll('h2')].map(x => x.textContent.trim());
kt('Có mục "Đơn hàng dự án": ' + h2.join(' | ').slice(0, 120), h2.includes('Đơn hàng dự án'));
kt('Nằm NGAY DƯỚI "Đối thủ bán gì"', h2.indexOf('Đơn hàng dự án') === h2.indexOf('Đối thủ bán gì') + 1);

/* --- 2. bắt đúng ngày đã cài --- */
const box = doc.getElementById('dabox');
const ngay = [...box.querySelectorAll('[data-dam]')].map(b => +b.getAttribute('data-dam'));
kt('Bắt được các ngày bất thường: ' + ngay.join(', '), ngay.includes(12) && ngay.includes(7));
kt('Ngày mới nhất đứng đầu', ngay[0] === Math.max(...ngay));

/* --- 3. ngày mới nhất tự bung, có đủ dòng --- */
let rows = [...box.querySelectorAll('.da-ng.open .da-tb tbody tr')];
const lay = r => [...r.querySelectorAll('td')].map(t => t.textContent.trim());
const ds12 = rows.map(lay);
kt('Ngày 12 tự bung, ra ' + rows.length + ' dòng', rows.length >= 3);
const co = (id, hang) => ds12.some(r => r[0].includes(id) && r[2] === hang);
kt('Có Shop 1 / Samsung', co('Shop 1', 'Samsung'));
kt('Có Shop 2 / Samsung', co('Shop 2', 'Samsung'));
kt('Có Shop 4 / OPPO (dự án của mình cũng phải hiện)', co('Shop 4', 'OPPO'));
kt('KHÔNG lôi nhầm shop bán đều (Shop 5..9)', !ds12.some(r => /Shop [5-9]/.test(r[0])));

/* --- 4. các cột có số đúng dạng --- */
const r1 = ds12.find(r => r[0].includes('Shop 1'));
kt('Dòng Shop 1: máy=' + r1[3] + ' nền=' + r1[4] + ' đỉnh=' + r1[5] + ' bội=' + r1[6] + ' ĐGngày=' + r1[7] + ' ĐGnền=' + r1[8],
  r1[3] === '19' && /×$/.test(r1[6]) && /tr$/.test(r1[7]) && /tr$/.test(r1[8]));
kt('Shop 1 được gắn nhãn "kỷ lục" (vượt đỉnh cũ)', r1[5].includes('kỷ lục'));
const reDo = [...box.querySelectorAll('.da-ng.open .da-tb .da-re')].length;
kt('Đơn giá tụt >20% so nền được tô đỏ (' + reDo + ' ô)', reDo >= 2);

/* --- 5. bấm mở/đóng --- */
const nut12 = [...box.querySelectorAll('[data-dam]')].find(b => b.getAttribute('data-dam') === '12');
nut12.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const sauDong = doc.getElementById('dabox').querySelector('[data-dam="12"]').closest('.da-ng').classList.contains('open');
kt('Bấm vào ngày 12 thì ĐÓNG lại', !sauDong);
doc.getElementById('dabox').querySelector('[data-dam="7"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const mo7 = doc.getElementById('dabox').querySelector('[data-dam="7"]').closest('.da-ng').classList.contains('open');
const r7 = [...doc.getElementById('dabox').querySelectorAll('.da-ng.open .da-tb tbody tr')].map(lay);
kt('Bấm ngày 7 thì MỞ ra, có Shop 3 / Xiaomi', mo7 && r7.some(r => r[0].includes('Shop 3') && r[2] === 'Xiaomi'));

/* --- 6. tóm tắt trên đầu mỗi ngày --- */
kt('Đầu mỗi ngày ghi số shop + số máy vượt nền + hãng',
  /\d+ shop/.test(box.textContent) && /\+\d+ máy vượt nền/.test(box.textContent) && !!box.querySelector('.da-h-samsung'));

/* --- 7. không có bất thường thì báo rõ --- */
{
  const sach = JSON.parse(JSON.stringify(GOI));
  sach.sales.forEach(s => s.s.forEach(sh => { for (let d = 1; d <= DMAX; d++) { const r = sh.dk[d - 1]; r[0] = 2; r[1] = 14; r[2] = 2; r[3] = 16; r[4] = 1; r[5] = 4; r[6] = 0; r[7] = 0; r[8] = 8; r[9] = 40; } }));
  const d2 = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
    beforeParse(ww) { ww.__REVIEW_DATA = sach; ww.fetch = () => Promise.reject(new Error('x')); } });
  await new Promise(r => setTimeout(r, 600));
  const b2 = d2.window.document.getElementById('dabox');
  kt('Không có ngày nào bất thường thì báo rõ, không để trống',
    !!b2 && /Không có ngày nào bất thường/.test(b2.textContent));
}

console.log('\n--- KIEM REVIEW: DON HANG DU AN ---');
ok.forEach(x => console.log('  OK  ' + x));
xau.forEach(x => console.log('  SAI ' + x));
console.log('\nLOI CHAY:', loi.length ? loi.slice(0, 3) : 'khong co');
process.exit(xau.length || loi.length ? 1 : 0);
