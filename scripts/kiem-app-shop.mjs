/* kiem-app-shop.mjs — soi 2 khoi moi trong CHI TIET SHOP cua app Sale:
   "Tu dau nam" (khoiNamApp) va "Ai lay cua ai" (khoiCungKyApp) o app.html,
   cong voi phan DUNG SO o scripts/build-app-data.js (truong sh.hgT).

   Cach lam giong kiem-shop-nam.mjs: CAT dung doan ma that dang chay ra roi chay,
   khong chep lai logic — sua app.html/build-app-data.js ma sai la no bao.

   Diem quan trong nhat: so cua app PHAI KHOP con so cua DB TG. Bo kiem nay dung
   CUNG mot bo du lieu gia voi kiem-shop-nam.mjs, chay ca hai duong roi so ket qua. */
import fs from 'fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const bld = fs.readFileSync(new URL('./build-app-data.js', import.meta.url), 'utf8');
const bct = fs.readFileSync(new URL('./bc-chitiet.js', import.meta.url), 'utf8');

const ok = [], xau = [];
const kt = (t, c) => (c ? ok : xau).push(t);
const chuSo = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const so = (a, b, e = 0.05) => Math.abs(a - b) <= e;

/* ---------- 1. tang DUNG SO: gonHangBuild + cach suy PK 10-20M tu gia that ---------- */
const i0 = bld.indexOf("var HANG7_BUILD = ['OPPO'");
const i1 = bld.indexOf('if (smd && Object.keys(smd).length) {', i0);
if (i0 < 0 || i1 < 0) { console.error('SAI: khong cat duoc doan gom hang o build-app-data.js'); process.exit(1); }
const B = new Function(bld.slice(i0, i1) + '\n return { HANG7_BUILD, gonHangBuild };')();
kt('Build: OPPO/Samsung/Xiaomi/Apple/vivo/realme/Khac dung 7 o',
  B.HANG7_BUILD.length === 7 && B.HANG7_BUILD[0] === 'OPPO' && B.HANG7_BUILD[6] === 'Khac');
kt('Build: Redmi va POCO ve Xiaomi', B.gonHangBuild('Redmi') === 2 && B.gonHangBuild('POCO') === 2);
kt('Build: iQOO ve vivo, iPhone ve Apple', B.gonHangBuild('iQOO') === 4 && B.gonHangBuild('iPhone') === 3);
kt('Build: Honor / Tecno / rong deu ve Khac',
  B.gonHangBuild('Honor') === 6 && B.gonHangBuild('Tecno') === 6 && B.gonHangBuild('') === 6);

/* ---------- 2. goi so gia — DUNG Y bo so cua kiem-shop-nam.mjs ---------- */
const SP = 'SHOP THU';
const md = (brand, units, rev) => ({ brand, units, rev });
const SMD = {
  [SP]: {
    8: {
      'OPPO Reno 12':   md('OPPO', 10, 130e6),    // 13,0M -> PK
      'OPPO A18':       md('OPPO', 20, 60e6),     //  3,0M
      'Samsung A16':    md('Samsung', 10, 120e6), // 12,0M -> PK
      'Xiaomi Redmi':   md('Xiaomi', 5, 50e6),    // 10,0M -> PK (bien duoi)
      'iPhone 15':      md('Apple', 2, 60e6),     // 30,0M
      'vivo Y19s':      md('vivo', 3, 15e6),      //  5,0M
      'Honor X5':       md('Honor', 4, 8e6),      //  2,0M -> Khac
    },
    9: {
      'OPPO Reno 12':   md('OPPO', 4, 52e6),      // 13,0M -> PK
      'OPPO A18':       md('OPPO', 10, 30e6),
      'Samsung A16':    md('Samsung', 12, 144e6), // 12,0M -> PK
      'Xiaomi Redmi':   md('Xiaomi', 6, 60e6),    // 10,0M -> PK
    },
  },
};

/* chay dung vong lap gom cua build-app-data.js de ra sh.hgT */
const tr = (v) => Math.round((v || 0) / 1e6);
function dungHgT(smd, ten) {
  const byM = smd[ten] || {}, out = {};
  Object.keys(byM).forEach((mk) => {
    const m = parseInt(String(mk).replace(/\D/g, ''), 10); if (!m) return;
    const cell = byM[mk] || {}, o = []; let co = 0;
    for (let q = 0; q < 7; q++) o.push([0, 0, 0, 0]);
    Object.keys(cell).forEach((mdl) => {
      const v = cell[mdl] || {}, u = v.units || 0, rv = v.rev || 0;
      if (!u && !rv) return;
      co = 1;
      const i = B.gonHangBuild(v.brand);
      o[i][0] += u; o[i][1] += rv;
      if (u) { const gia = rv / u; if (gia >= 1e7 && gia < 2e7) { o[i][2] += u; o[i][3] += rv; } }
    });
    if (co) out[m] = o.map((x) => [x[0], tr(x[1]), x[2], tr(x[3])]);
  });
  return out;
}
const hgT = dungHgT(SMD, SP);
kt('Dung duoc hgT cho 2 thang -> ' + Object.keys(hgT).join(','), Object.keys(hgT).sort().join(',') === '8,9');
kt('T8: OPPO 30 may, PK cua OPPO 10 may', hgT[8][0][0] === 30 && hgT[8][0][2] === 10);
kt('T8: Honor 4 may don vao o Khac', hgT[8][6][0] === 4 && hgT[8][6][2] === 0);
kt('T8: Apple 2 may, KHONG lot vao PK 10-20M', hgT[8][3][0] === 2 && hgT[8][3][2] === 0);
kt('T9: Samsung 12 may deu la PK 10-20M', hgT[9][1][0] === 12 && hgT[9][1][2] === 12);

/* ---------- 3. cat 2 ham render tu app.html roi chay that ---------- */
const j0 = app.indexOf("var HANG7_APP = ['OPPO'");
const j1 = app.indexOf('function bangThangShop(s){');
if (j0 < 0 || j1 < 0 || j1 < j0) { console.error('SAI: khong cat duoc 2 khoi o app.html'); process.exit(1); }
const phu = {
  D: { months: [8, 9] },
  MI: 1,
  n0: (v) => Math.round(v || 0).toLocaleString('vi-VN'),
  pct: (v, d) => (v || 0).toFixed(d === undefined ? 1 : d) + '%',
  money: (t) => { t = t || 0; return Math.abs(t) >= 1000 ? (t / 1000).toFixed(1) + ' tỷ' : Math.round(t).toLocaleString('vi-VN') + ' tr'; },
  tvTableHtml: (head, rows) => '<table class="tv"><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>'
    + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>',
};
const A = new Function(...Object.keys(phu), app.slice(j0, j1) + '\n return { khoiNamApp, khoiCungKyApp, hgtGom };')(...Object.values(phu));

const S = { hgT, nCS: { 8: 30, 9: 12 } };
const hN = A.khoiNamApp(S), tN = chuSo(hN);
const hK = A.khoiCungKyApp(S), tK = chuSo(hK);

kt('Khoi "Tu dau nam" co chay ra noi dung', !!hN && /Từ đầu năm/.test(tN));
kt('Khoi nam: khong lot NaN / undefined', !/NaN|undefined/.test(hN));
kt('Khoi nam: co du 6 hang + Khac', ['OPPO', 'Samsung', 'Xiaomi', 'Apple', 'vivo', 'Khác'].every((b) => tN.includes(b)));
kt('Khoi nam: KHONG hien dong Honor rieng', !/>Honor</.test(hN));
kt('Khoi nam: tong may ca nam = 86', /Máy cả chợ 86/.test(tN));

kt('Khoi "Ai lay cua ai" co chay ra noi dung', !!hK && /Ai lấy của ai/.test(tK));
kt('Cung ky: khong lot NaN / undefined', !/NaN|undefined/.test(hK));
kt('Cung ky: so thang 9 voi thang 8', /tháng 9 so tháng 8/.test(tK));
kt('Cung ky: ket luan OPPO MAT thi phan PK 10-20M', /OPPO mất 21,8 điểm/.test(tK));
kt('Cung ky: chi dich danh Samsung va Xiaomi la ben lay duoc',
  /rơi vào tay/.test(tK) && /Samsung \+14,5 điểm/.test(tK) && /Xiaomi \+7,3 điểm/.test(tK));
kt('Cung ky: noi ro thang 9 moi co 13 hay 12 ngay co so', /tháng 9 mới có 12 ngày/i.test(tK));
kt('Cung ky: co ca 2 bang (so tong + PK 10-20M)', /Số tổng toàn shop/.test(tK) && /PK 10–20M — trọng tâm/.test(tK));
kt('Shop khong co hgT thi tra ve rong, khong vo',
  A.khoiNamApp({}) === '' && A.khoiCungKyApp({}) === '');

/* ---------- 4. SO KHOP voi DB TG: cung bo so phai ra cung con so ---------- */
{
  const k0 = bct.indexOf('var giaPK = function (u, dt)');
  const k1 = bct.indexOf('function chiTietShop(shop, thang) {');
  const Bm = { shop_model_data: SMD, shop_day_data: {} };
  for (let d = 1; d <= 30; d++) Bm.shop_day_data[SP] = Object.assign(Bm.shop_day_data[SP] || {}, { ['8-' + d]: { total_units: 9 } });
  for (let d = 1; d <= 12; d++) Bm.shop_day_data[SP]['9-' + d] = { total_units: 9 };
  const F = new Function('B', 'tenHoa', 'mauHang', 'esc', 'fInt', 'fTr',
    bct.slice(k0, k1) + '\n return { gomMD, dsHangNam };')(
    Bm, (x) => String(x == null ? '' : x).replace(/oppo/gi, 'OPPO'), () => '#000', (x) => String(x == null ? '' : x),
    (v) => String(Math.round(v || 0)), (v) => String(v));
  const R = F.gomMD(SP, null);                 // DB TG
  const G = A.hgtGom(S, null);                 // app
  kt('KHOP tong may ca nam: DB TG ' + R.tU + ' = app ' + G.tU, R.tU === G.tU);
  kt('KHOP may OPPO: DB TG ' + R.hang.OPPO.u + ' = app ' + G.h[0].u, R.hang.OPPO.u === G.h[0].u);
  kt('KHOP PK 10-20M ca cho: DB TG ' + R.pU + ' = app ' + G.pU, R.pU === G.pU);
  kt('KHOP PK 10-20M cua OPPO: DB TG ' + R.hang.OPPO.pu + ' = app ' + G.h[0].pu, R.hang.OPPO.pu === G.h[0].pu);
  kt('KHOP o "Khac": DB TG ' + R.hang['Khác'].u + ' = app ' + G.h[6].u, R.hang['Khác'].u === G.h[6].u);
  const sDbtg = R.tU ? R.hang.OPPO.u / R.tU * 100 : 0, sApp = G.tU ? G.h[0].u / G.tU * 100 : 0;
  kt('KHOP thi phan D.S cua OPPO: ' + sDbtg.toFixed(2) + '% = ' + sApp.toFixed(2) + '%', so(sDbtg, sApp, 0.001));
}

console.log('\n--- KIEM APP SALE: CHI TIET SHOP (TU DAU NAM + AI LAY CUA AI) ---');
ok.forEach((x) => console.log('  OK  ' + x));
xau.forEach((x) => console.log('  SAI ' + x));
console.log('\nTong: ' + ok.length + ' OK, ' + xau.length + ' SAI');
process.exit(xau.length ? 1 : 0);
