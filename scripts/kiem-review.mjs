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
  /* 13/09: ngày 12 phải làm CẢ CHỢ vọt >30% so nền cùng thứ, nếu không thì theo luật mới
     sẽ không có ngày đột biến nào và mọi phép kiểm bên dưới đều vô nghĩa. */
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

/* --- 1. section có mặt, đúng chỗ --- */
const h2 = [...doc.querySelectorAll('h2')].map(x => x.textContent.trim());
kt('Có mục "Đơn hàng dự án"', h2.includes('Đơn hàng dự án'));
kt('Nằm NGAY DƯỚI "Đối thủ bán gì"', h2.indexOf('Đơn hàng dự án') === h2.indexOf('Đối thủ bán gì') + 1);

/* --- 2. CHỈ hiện ngày đột biến, không phải mọi ngày --- */
const box = doc.getElementById('dabox');
const ngay = [...box.querySelectorAll('[data-dam]')].map(b => +b.getAttribute('data-dam'));
kt('Chỉ hiện ngày ĐỘT BIẾN (' + ngay.length + ' ngày trên ' + DMAX + ' ngày có số): ' + ngay.join(', '),
  ngay.length >= 1 && ngay.length < DMAX);
kt('Ngày 12 (cả chợ vọt) có trong danh sách', ngay.includes(12));
kt('Ngày 7 (chỉ 1 shop Xiaomi nhảy, cả chợ không vọt) KHÔNG bị kêu', !ngay.includes(7));
kt('Có dòng tổng kết "N ngày đột biến trên M ngày có số"', /ngày đột biến trên \d+ ngày có số/.test(box.textContent));

/* --- 3. đầu mỗi ngày ghi % vượt + nền cùng thứ --- */
const hd = box.querySelector('[data-dam="12"]').textContent.replace(/\s+/g, ' ');
kt('Đầu ngày ghi % vượt + cả chợ + nền theo THỨ: ' + hd.slice(0, 90),
  /\+\d+%/.test(hd) && /cả chợ/.test(hd) && /nền (Thứ|Chủ)/.test(hd));

/* --- 4. bung ra: dải hãng + bảng shop --- */
const hg = [...box.querySelectorAll('.da-ng.open .da-hg1')].map(x => x.textContent.replace(/\s+/g, ' '));
kt('Có dải 4 hãng kèm nền và %: ' + hg.join(' | ').slice(0, 110), hg.length === 4 && /nền/.test(hg.join('')));
const lay = r => [...r.querySelectorAll('td')].map(t => t.textContent.trim());
const ds12 = [...box.querySelectorAll('.da-ng.open .da-tb tbody tr')].map(lay);
const co = (id, hang) => ds12.some(r => r[0].includes(id) && r[2] === hang);
kt('Bảng shop trong ngày 12 có Shop 1 / Samsung', co('Shop 1', 'Samsung'));
kt('Có Shop 4 / OPPO (dự án của mình cũng hiện)', co('Shop 4', 'OPPO'));
kt('KHÔNG lôi nhầm shop bán đều (Shop 5..9)', !ds12.some(r => /Shop [5-9]/.test(r[0])));
const r1 = ds12.find(r => r[0].includes('Shop 1'));
kt('Dòng Shop 1 đủ cột: máy=' + r1[3] + ' nền=' + r1[4] + ' đỉnh=' + r1[5] + ' bội=' + r1[6],
  r1[3] === '19' && /×$/.test(r1[6]) && r1[5].includes('kỷ lục'));
kt('Đơn giá tụt >20% so nền được tô đỏ', [...box.querySelectorAll('.da-ng.open .da-tb .da-re')].length >= 2);

/* --- 5. bấm mở/đóng --- */
box.querySelector('[data-dam="12"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
kt('Bấm vào ngày thì ĐÓNG lại',
  !doc.getElementById('dabox').querySelector('[data-dam="12"]').closest('.da-ng').classList.contains('open'));
doc.getElementById('dabox').querySelector('[data-dam="12"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
kt('Bấm lần nữa thì MỞ lại, vẫn có bảng shop',
  doc.getElementById('dabox').querySelectorAll('.da-ng.open .da-tb tbody tr').length >= 3);

/* --- 6. tháng không có ngày nào đột biến thì IM, nói rõ một dòng --- */
{
  const sach = JSON.parse(JSON.stringify(GOI));
  sach.sales.forEach(s => s.s.forEach(sh => { for (let d = 1; d <= DMAX; d++) { const r = sh.dk[d - 1]; r[0] = 2; r[1] = 14; r[2] = 2; r[3] = 16; r[4] = 1; r[5] = 4; r[6] = 0; r[7] = 0; r[8] = 8; r[9] = 40; } }));
  sach.all.dnB = dnBcua(sach.sales.flatMap(s => s.s));
  sach.sales.forEach(s => { s.dnB = dnBcua(s.s); });
  const d2 = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
    beforeParse(ww) { ww.__REVIEW_DATA = sach; ww.fetch = () => Promise.reject(new Error('x')); } });
  await new Promise(r => setTimeout(r, 600));
  const b2 = d2.window.document.getElementById('dabox');
  kt('Chợ đều đặn thì KHÔNG cảnh báo ngày nào, chỉ một dòng nói rõ',
    !!b2 && /chưa có ngày nào đột biến/.test(b2.textContent) && !b2.querySelector('[data-dam]'));
}

console.log('\n--- KIEM REVIEW: DON HANG DU AN ---');
ok.forEach(x => console.log('  OK  ' + x));
xau.forEach(x => console.log('  SAI ' + x));
console.log('\nLOI CHAY:', loi.length ? loi.slice(0, 3) : 'khong co');
process.exit(xau.length || loi.length ? 1 : 0);
