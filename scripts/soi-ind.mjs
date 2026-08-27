/* soi-ind.mjs — TRA LOI MOT CAU HOI DUY NHAT:
 *
 *   Con so "hon 100 shop IND chua ban thang 8" la THAT, hay do cach ghi nhan?
 *
 * Chay trong GitHub Action (co SALE_CODES) vi phai giai ma goi du lieu.
 * Ket qua ghi ra data/soi-ind.json.
 *
 * REPO LA PUBLIC nen file ket qua CHI GHI TI LE va so nho (ngay 1-31).
 * Khong mot con so may / doanh thu tuyet doi nao duoc ghi ra.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const idx = JSON.parse(fs.readFileSync('data/index.json', 'utf8'));
const codes = JSON.parse(process.env.SALE_CODES || '{}');
const admin = idx.users.find((u) => u.r === 'admin');
if (!admin) throw new Error('Khong tim thay nguoi dung admin');
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
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const p1 = (x) => Math.round(x * 10) / 10;

await cho(4500);
if (!w.D) throw new Error('Khong mo khoa duoc goi du lieu');
const D = w.D;
const MI = D.months.length - 1;

// Gom shop theo kenh (moi shop chi dem 1 lan)
const theoKenh = {};
D.sales.forEach((x) => (x.s || []).forEach((sh) => {
  (theoKenh[sh.ch2] = theoKenh[sh.ch2] || []).push(sh);
}));

const may = (sh, i) => ((sh.m && sh.m[i]) ? (sh.m[i][0] || 0) : 0);
const tien = (sh, i) => ((sh.m && sh.m[i]) ? (sh.m[i][1] || 0) : 0);
const kichHoat = (sh, i) => ((sh.ac && sh.ac[i] != null) ? (sh.ac[i] || 0) : null);

const bao = {};
for (const ch of Object.keys(theoKenh)) {
  const ds = theoKenh[ch], n = ds.length;
  const o = { soShop: n };

  // 1. Ti le shop CO ban, theo tung thang. Neu thang 8 thut xuong han so voi
  //    cac thang truoc thi la chuyen cua thang 8; neu thang nao cung vay thi
  //    la cau truc danh sach shop, khong phai loi so lieu.
  o.tyLeShopCoBanTheoThang = D.months.map((mm, i) => ({
    thang: mm, tyLe: p1(ds.filter((s) => may(s, i) > 0).length / n * 100),
  }));

  // 2. Nhom "chua ban thang nay" — ho la ai?
  const chua = ds.filter((s) => !may(s, MI));
  o.chuaBanThangNay = { tyLeSoShop: p1(chua.length / n * 100) };
  if (chua.length) {
    // Ho dong gop bao nhieu % doanh thu ca nam cua kenh? Neu ~0% thi day la
    // nhung shop von da khong ban gi ca nam, khong phai shop moi chet.
    const dtNam = (s) => (s.m || []).reduce((t, v) => t + (v[1] || 0), 0);
    const tongKenh = ds.reduce((t, s) => t + dtNam(s), 0);
    const tongChua = chua.reduce((t, s) => t + dtNam(s), 0);
    o.chuaBanThangNay.tyLeDoanhThuCaNam = tongKenh ? p1(tongChua / tongKenh * 100) : 0;

    // Trong nhom nay, bao nhieu % chua he ban may nao SUOT CA NAM?
    const chetHan = chua.filter((s) => !(s.m || []).some((v) => v[0]));
    o.chuaBanThangNay.tyLeChuaBanCaNam = p1(chetHan.length / chua.length * 100);

    // Bao nhieu % tung ban thang truoc? Day moi la nhom "vua rot".
    const vuaRot = MI >= 1 ? chua.filter((s) => may(s, MI - 1) > 0) : [];
    o.chuaBanThangNay.tyLeVuaRotTuThangTruoc = MI >= 1 ? p1(vuaRot.length / chua.length * 100) : null;

    // MAU CHOT: co so KICH HOAT ma khong co so BAN khong?
    // Neu co thi khong phai "chua ban" — la hai nguon ghi nhan khac nhau.
    const coAc = chua.filter((s) => kichHoat(s, MI) > 0);
    o.chuaBanThangNay.tyLeCoKichHoatNhungKhongCoBan =
      (chua.some((s) => kichHoat(s, MI) !== null)) ? p1(coAc.length / chua.length * 100) : null;
  }

  // 3. Shop chet han ca nam, tinh tren toan kenh
  o.tyLeChuaBanBatKyThangNao = p1(ds.filter((s) => !(s.m || []).some((v) => v[0])).length / n * 100);

  // 4. So lieu thang nay chay toi NGAY thu may? Neu IND dung som hon MWG thi
  //    la du lieu ve cham, khong phai shop nghi ban.
  let ngayCuoi = 0;
  ds.forEach((s) => (s.d || []).forEach((u, i) => { if (u > 0 && i + 1 > ngayCuoi) ngayCuoi = i + 1; }));
  o.ngayCuoiCoSoTrongThang = ngayCuoi;

  // 5. Kenh nay co cot kich hoat khong (co thi moi so sanh duoc)
  o.coCotKichHoat = ds.some((s) => Array.isArray(s.ac) && s.ac.some((v) => v > 0));

  bao[ch] = o;
}

const kq = {
  ban: w.APP_VER, thang: D.months, thangDangXem: D.months[MI],
  ngayChotCuaGoi: D.maxDay || null,
  ghiChu: 'Repo PUBLIC — file nay chi ghi TI LE (%) va so ngay. Khong co so may / doanh thu tuyet doi.',
  kenh: bao,
};
fs.writeFileSync('data/soi-ind.json', JSON.stringify(kq, null, 1));
console.log(JSON.stringify(kq, null, 1));
process.exit(0);
