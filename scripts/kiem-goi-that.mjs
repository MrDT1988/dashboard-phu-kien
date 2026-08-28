/* kiem-goi-that.mjs — MO GOI THAT CUA TUNG NGUOI VA SOI CO RO RI KHONG.
 *
 * VI SAO CAN, DU DA CO kiem-pham-vi.mjs:
 *   kiem-pham-vi chay tren DU LIEU GIA. No chung minh THUAT TOAN dung.
 *   File nay chay tren GOI THAT da ma hoa cua 20 nguoi. No chung minh
 *   CAI DA GIAO TAN TAY tung nguoi la dung. Hai viec khac nhau.
 *
 * Phai chay trong GitHub Action vi can SALE_CODES de mo goi.
 *
 * KET QUA ghi ra data/ket-qua-kiem-goi.json — CHI dat/khong dat + so dem nho.
 * Moi cum 3 chu so tro len bi bit. Repo la public.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const DIR = process.env.VAULT_DIR || 'data';
const KQ = [];
const ghi = (ten, dat, ct) => {
  KQ.push({ ten, dat: !!dat, ct: ct || '' });
  console.log((dat ? '  OK  ' : '  LOI ') + ten + (ct ? '  — ' + ct : ''));
};

function moKhoi(blob, ma) {
  const salt = Buffer.from(blob.salt, 'base64');
  const iv = Buffer.from(blob.iv, 'base64');
  const all = Buffer.from(blob.ct, 'base64');
  const tag = all.subarray(all.length - 16);
  const ct = all.subarray(0, all.length - 16);
  const key = crypto.pbkdf2Sync(String(ma), salt, blob.it, 32, 'sha256');
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  const nen = Buffer.concat([d.update(ct), d.final()]);
  return JSON.parse(zlib.gunzipSync(nen).toString('utf8'));
}

let ma;
try { ma = JSON.parse(process.env.SALE_CODES || ''); }
catch { console.error('chua dat SALE_CODES'); process.exit(1); }

const idx = JSON.parse(fs.readFileSync(path.join(DIR, 'dbtg-index.json'), 'utf8'));
const users = idx.users || [];
ghi('Doc duoc con tro goi', users.length > 0, users.length + ' nguoi');

// Ma cua tung nguoi, khop ten y nhu luc dong goi
const chuan = (x) => String(x || '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
function maCua(u) {
  if (u.r === 'admin') return ma.admin && ma.admin.pin;
  if (u.r === 'leader') {
    const k = String(u.n).replace(/^Leader\s+/, '');
    const v = (ma.leader || {})[k];
    return (typeof v === 'string') ? v : (v && v.pin);
  }
  const ds = ma.sales || {};
  for (const t of Object.keys(ds)) if (chuan(t) === chuan(u.n)) return ds[t];
  return null;
}

// ---- Mo goi admin truoc: day la BAN DO GOC de doi chieu moi nguoi khac
const uAd = users.find((u) => u.r === 'admin');
if (!uAd) { ghi('Co goi cua quan ly vung', false); ketThuc(); }
const goiAd = JSON.parse(fs.readFileSync(path.join(DIR, 'dbtg-' + uAd.id + '.json'), 'utf8'));
let AD;
try { AD = moKhoi(goiAd.center, maCua(uAd)); }
catch (e) { ghi('Mo duoc goi quan ly vung', false, e.message); ketThuc(); }
ghi('Mo duoc goi quan ly vung', true, (AD.store_rows || []).length + ' shop');

const shopCuaSale = {};   // ten sale -> Set(shop)
const shopCuaKenh = {};   // kenh -> Set(shop)
(AD.store_rows || []).forEach((r) => {
  (shopCuaSale[r.sale] = shopCuaSale[r.sale] || new Set()).add(r.store);
  (shopCuaKenh[r.channel] = shopCuaKenh[r.channel] || new Set()).add(r.store);
});
// 'debug_target' bi catPhamVi CO Y bo di (chi la so lieu go roi cua admin),
// nen khong duoc tinh la "thieu truong". Test dung du lieu gia khong co truong
// nay nen lan dau chay that moi lo ra.
const BO_CO_Y = new Set(['debug_target']);
const truongGoc = Object.keys(AD).filter((k) => !BO_CO_Y.has(k)).sort();

let soMo = 0, soThieuTruong = 0, soRoRi = 0, soKhongMo = 0;
const chiTietRoRi = [];

for (const u of users) {
  if (u.r === 'admin') continue;
  const p = maCua(u);
  if (!p) { soKhongMo++; chiTietRoRi.push(u.r + ' khong tim thay ma'); continue; }
  let G;
  try {
    const f = JSON.parse(fs.readFileSync(path.join(DIR, 'dbtg-' + u.id + '.json'), 'utf8'));
    G = moKhoi(f.center, p);
  } catch (e) { soKhongMo++; chiTietRoRi.push(u.r + ' mo that bai'); continue; }
  soMo++;

  // 1. Cau truc con du khong — thieu la DB TG se vo khi ve
  const thieu = truongGoc.filter((k) => G[k] === undefined);
  if (thieu.length) { soThieuTruong++; chiTietRoRi.push(u.r + ' thieu truong: ' + thieu.join(',')); }

  // 2. RO RI: co shop nao KHONG thuoc ve nguoi nay khong
  let duocPhep;
  if (u.r === 'leader') {
    duocPhep = shopCuaKenh[String(u.n).replace(/^Leader\s+/, '')] || new Set();
  } else {
    duocPhep = shopCuaSale[u.n] || new Set();
    // khop gan dung neu ten lech dau
    if (!duocPhep.size) {
      const k = Object.keys(shopCuaSale).find((x) => chuan(x) === chuan(u.n));
      if (k) duocPhep = shopCuaSale[k];
    }
  }
  const lot = (G.store_rows || []).map((r) => r.store).filter((s) => !duocPhep.has(s));
  if (lot.length) { soRoRi++; chiTietRoRi.push(u.r + ' co ' + lot.length + ' shop ngoai pham vi'); }
}

ghi('Mo duoc goi cua MOI nguoi bang ma cua chinh ho', soKhongMo === 0,
  soMo + '/' + (users.length - 1) + ' goi mo duoc' + (soKhongMo ? (', ' + soKhongMo + ' khong mo duoc') : ''));
ghi('KHONG goi nao chua shop ngoai pham vi', soRoRi === 0,
  soRoRi ? (soRoRi + ' goi bi ro ri') : 'da soi tung shop trong tung goi');
ghi('KHONG goi nao thieu truong (DB TG se khong vo khi ve)', soThieuTruong === 0,
  soThieuTruong ? (soThieuTruong + ' goi thieu truong') : ('du ' + truongGoc.length + ' truong'));
if (chiTietRoRi.length) {
  console.log('  >>> CHI TIET:');
  chiTietRoRi.forEach((x) => console.log('      - ' + x));
  ghi('Chi tiet cho hong', false, chiTietRoRi.slice(0, 6).join(' | '));
}

// 3. So tong cua nguoi khac phai KHAC so toan vung (da tinh lai, khong bung nguyen)
{
  let giong = 0, xet = 0;
  for (const u of users) {
    if (u.r === 'admin') continue;
    const p = maCua(u); if (!p) continue;
    try {
      const f = JSON.parse(fs.readFileSync(path.join(DIR, 'dbtg-' + u.id + '.json'), 'utf8'));
      const G = moKhoi(f.center, p);
      xet++;
      if (G.kpi && AD.kpi && G.kpi.totalRevenue === AD.kpi.totalRevenue) giong++;
    } catch (e) { /* da dem o tren */ }
  }
  ghi('So tong cua tung nguoi da duoc TINH LAI, khong bung so toan vung',
    giong === 0, giong ? (giong + '/' + xet + ' goi con nguyen so ca vung') : ('da xet ' + xet + ' goi'));
}

ketThuc();

function ketThuc() {
  const hong = KQ.filter((x) => !x.dat);
  console.log('');
  console.log('=== KET LUAN (goi that) ===');
  console.log('So phep kiem :', KQ.length);
  console.log('Khong dat    :', hong.length);
  const bit = (x) => String(x || '').replace(/\d{3,}/g, '###');
  try {
    fs.writeFileSync('data/ket-qua-kiem-goi.json', JSON.stringify({
      tong: KQ.length, khongDat: hong.length,
      ghiChu: 'Mo goi THAT cua tung nguoi bang ma cua chinh ho. So 3 chu so tro len da bit.',
      pheps: KQ.map((x) => ({ ten: x.ten, dat: x.dat, ct: bit(x.ct) })),
    }, null, 1));
    console.log('da ghi data/ket-qua-kiem-goi.json');
  } catch (e) { console.log('khong ghi duoc:', e.message); }
  process.exit(hong.length ? 1 : 0);
}
