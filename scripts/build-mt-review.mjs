/* build-mt-review.mjs — ROBOT REVIEW NGÀY MIỀN TRUNG (0 token), viết 05/09/2026.
 *
 * Chạy trên GitHub Actions (cap-nhat-mt.yml). Không cần máy anh Thái, không cần trợ lý.
 *
 * 1. Gọi Apps Script Miền Trung  <MT_AS_URL>?mode=shopdaily
 *    -> số theo SHOP theo NGÀY của THÁNG ĐANG CHẠY (sheet "MWG tháng" reset đầu tháng).
 * 2. Đọc kho lịch sử data/mt-archive.json (MÃ HOÁ bằng mã admin — repo public nên không được để số thô),
 *    ghi đè tháng hiện tại, giữ nguyên các tháng trước -> nhờ vậy có "tháng trước" để so cùng kỳ / nối chuỗi đứt.
 * 3. Đóng gói theo ĐÚNG cấu trúc gói App Sale (sales[] = khu vực, s[] = shop, dk/dkp/dnB/pkD/dmN)
 *    để review-mt.html dùng chung toàn bộ code + rule với review.html Tiền Giang.
 * 4. Ghi THÔ -> data/mt-review.json (quyết định 05/09, không mã hoá) ; mốc -> data/mt-index.json (không có số kinh doanh).
 *
 * Mã: SALE_CODES.admin.pin (GitHub Secret). Không in ra log.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const URL_AS = process.env.MT_AS_URL || 'https://script.google.com/macros/s/AKfycbwP40YvjNIdymWVT6XLKSAvIxfkE23d9XtTV3xkLj3PXVnnVQOtDKW876yIDZfMaw_i/exec';
const OUTDIR = process.env.VAULT_DIR || 'data';
const VONG = Number(process.env.KDF_ITER || 600000);
const log = (...a) => console.log('[mt]', ...a);
const tr = (v) => Math.round((v || 0) / 1e6);
const AREA_ORDER = ['BINH DINH', 'DA NANG', 'HUE', 'NHA TRANG', 'TAY NGUYEN', 'VUNG TAU'];

function pinAdmin() {
  let ma; try { ma = JSON.parse(process.env.SALE_CODES || ''); } catch { throw new Error('chua dat SALE_CODES'); }
  const pin = ma.admin && ma.admin.pin; if (!pin) throw new Error('SALE_CODES khong co admin.pin');
  return String(pin);
}
function maHoa(obj, pin) {
  const muoi = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const khoa = crypto.pbkdf2Sync(pin, muoi, VONG, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', khoa, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { v: 1, kdf: 'PBKDF2-SHA256', it: VONG, alg: 'AES-256-GCM', salt: muoi.toString('base64'), iv: iv.toString('base64'), ct: Buffer.concat([ct, c.getAuthTag()]).toString('base64') };
}
function giaiMa(blob, pin) {
  const khoa = crypto.pbkdf2Sync(pin, Buffer.from(blob.salt, 'base64'), blob.it, 32, 'sha256');
  const raw = Buffer.from(blob.ct, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', khoa, Buffer.from(blob.iv, 'base64'));
  d.setAuthTag(raw.subarray(raw.length - 16));
  return JSON.parse(Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString('utf8'));
}
async function layShopDaily() {
  const u = URL_AS + '?mode=shopdaily&t=' + Date.now();
  for (let lan = 1; lan <= 3; lan++) {
    try {
      const r = await fetch(u, { redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      if (!j.shops || !j.m) throw new Error('JSON khong co shops/m');
      return j;
    } catch (e) { log(`lan ${lan} loi: ${e.message}`); if (lan < 3) await new Promise((z) => setTimeout(z, 30000)); }
  }
  throw new Error('khong lay duoc shopdaily sau 3 lan');
}
const doyOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const vec14 = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const packVec = (v) => [v[0], tr(v[1]), v[2], tr(v[3]), v[4], tr(v[5]), v[6], tr(v[7]), v[8], tr(v[9]), v[10], tr(v[11]), v[12], tr(v[13])];

/** Xây gói review từ kho lịch sử {months:{"YYYY-MM":shopdaily}} */
export function dungGoi(archive, nowIso) {
  const keys = Object.keys(archive.months || {}).sort();
  if (!keys.length) throw new Error('kho rong');
  const cur = archive.months[keys[keys.length - 1]];
  const Y = cur.y, M = cur.m, PM = keys.length > 1 ? archive.months[keys[keys.length - 2]] : null;
  const prv = (PM && PM.y === Y && PM.m === M - 1) ? PM : null;
  const MONTHS = keys.filter((k) => archive.months[k].y === Y).map((k) => archive.months[k].m).sort((a, b) => a - b);
  const DIM_CUR = dim(Y, M), DIM_PRV = prv ? dim(Y, prv.m) : 0;
  const A0 = doyOf(Y, M, 1);
  const lastDoy = A0 + (cur.maxDay || 1) - 1;
  const dnBlank = () => Array.from({ length: lastDoy }, () => vec14());
  function napDn(dn, mon) { // mon: shopdaily của một tháng
    Object.keys(mon.all.d).forEach((d) => { const q = doyOf(mon.y, mon.m, +d) - 1; if (q >= 0 && q < lastDoy) { const v = mon.all.d[d]; for (let z = 0; z < 14; z++) dn[q][z] += v[z] || 0; } });
  }
  function dnArea(area) {
    const dn = dnBlank();
    keys.forEach((k) => { const mon = archive.months[k]; if (mon.y !== Y) return; const a = mon.areas[area]; if (!a) return;
      Object.keys(a.d).forEach((d) => { const q = doyOf(mon.y, mon.m, +d) - 1; if (q >= 0 && q < lastDoy) { const v = a.d[d]; for (let z = 0; z < 14; z++) dn[q][z] += v[z] || 0; } }); });
    return dn.map(packVec);
  }
  const dnAll = dnBlank(); keys.forEach((k) => { if (archive.months[k].y === Y) napDn(dnAll, archive.months[k]); });
  // pkD tháng hiện tại: ngày -> 7 cặp [u, tr]
  const pkD = (o) => { const out = {}; Object.keys(o.pk || {}).forEach((d) => { out[d] = o.pk[d].map((p) => [p[0], tr(p[1])]); }); return Object.keys(out).length ? out : null; };
  // dmN: ngày -> hãng -> [[idx,u,dt,cumU,cumDt]] top 8 theo máy ngày, gộp theo dòng (bỏ màu)
  const dmT = [], dmI = {};
  const idxOf = (n) => { if (dmI[n] === undefined) { dmI[n] = dmT.length; dmT.push(n); } return dmI[n]; };
  function dmN(o) {
    const md = o.md || {}; const days = Object.keys(md).map(Number).sort((a, b) => a - b); if (!days.length) return null;
    const cum = {}; const out = {};
    days.forEach((d) => {
      const perBrand = md[d]; out[d] = {};
      Object.keys(perBrand).forEach((b) => {
        const g = {}; Object.keys(perBrand[b]).forEach((mdl) => { const k = gonTen(mdl); const v = perBrand[b][mdl]; (g[k] = g[k] || [0, 0]); g[k][0] += v[0]; g[k][1] += v[1]; });
        cum[b] = cum[b] || {};
        Object.keys(g).forEach((k) => { cum[b][k] = cum[b][k] || [0, 0]; cum[b][k][0] += g[k][0]; cum[b][k][1] += g[k][1]; });
        const ds = Object.keys(g).map((k) => [idxOf(k), g[k][0], tr(g[k][1]), cum[b][k][0], tr(cum[b][k][1])]).sort((a, b2) => b2[1] - a[1]).slice(0, 8);
        if (ds.length) out[d][b] = ds;
      });
    });
    return out;
  }
  // shop
  const shopsByArea = {};
  const shopMeta = {};
  keys.forEach((k) => { const mon = archive.months[k]; Object.keys(mon.shops).forEach((code) => { const s = mon.shops[code]; if (!shopMeta[code] || mon === cur) shopMeta[code] = { n: s.n, area: s.area, size: s.size, sid: s.sid }; }); });
  Object.keys(shopMeta).forEach((code) => {
    const m0 = shopMeta[code];
    const dk = Array.from({ length: DIM_CUR }, () => vec14());
    const sc = cur.shops[code]; if (sc) Object.keys(sc.d).forEach((d) => { if (+d >= 1 && +d <= DIM_CUR) { const v = sc.d[d]; for (let z = 0; z < 14; z++) dk[+d - 1][z] += v[z] || 0; } });
    let dkp = null;
    if (prv) { const sp = prv.shops[code]; if (sp) { dkp = Array.from({ length: DIM_PRV }, () => vec14()); Object.keys(sp.d).forEach((d) => { if (+d >= 1 && +d <= DIM_PRV) { const v = sp.d[d]; for (let z = 0; z < 14; z++) dkp[+d - 1][z] += v[z] || 0; } }); } }
    const sh = { n: code + ' - ' + (m0.n || code), ch2: 'MWG', size: (m0.size || '').toUpperCase(), sid: m0.sid || code, tg: 0, m: MONTHS.map(() => [0, 0]), dk: dk.map(packVec) };
    if (dkp) sh.dkp = dkp.map(packVec);
    (shopsByArea[m0.area] = shopsByArea[m0.area] || []).push(sh);
  });
  const areas = Object.keys(shopsByArea).sort((a, b) => (AREA_ORDER.indexOf(a) + 100) % 100 - (AREA_ORDER.indexOf(b) + 100) % 100 || a.localeCompare(b));
  const sales = areas.map((area) => {
    const o = { n: area, shops: shopsByArea[area].length, tg: 0, m: MONTHS.map(() => [0, 0]), s: shopsByArea[area].sort((a, b) => a.n.localeCompare(b.n, 'vi')), dnB: dnArea(area) };
    const ca = cur.areas[area]; if (ca) { const p = pkD(ca); if (p) o.pkD = p; const dm = dmN(ca); if (dm) o.dmN = dm; }
    return o;
  });
  const all = { shops: Object.keys(shopMeta).length, tg: 0, m: MONTHS.map(() => [0, 0]), dnB: dnAll.map(packVec) };
  const pa = pkD(cur.all); if (pa) all.pkD = pa; const da = dmN(cur.all); if (da) all.dmN = da;
  return { updated: nowIso, v: 2, vung: 'MT', months: MONTHS, maxDay: cur.maxDay, dimCur: DIM_CUR, dimPrv: DIM_PRV, year: Y, lastDoy,
           segs: [], sers: [], chans: ['MWG'], dmT, gt: null, vaiTro: 'admin', kenh: 'MWG', src: { at: cur.at, dong: cur.dong, dongKhopMeta: cur.dongKhopMeta, thangCoLichSu: keys },
           all, sales };
}
// Gộp model theo dòng — chép gonTen của build-app-data.js (bỏ tiền tố hãng, bỏ màu ở đuôi)
const MAU_GOC = {};
('den trang xanh vang bac xam hong tim do nau cam kem be black white blue green gold silver gray grey pink purple red orange brown beige teal lilac peach mint jade olive bronze titan titanium ivory coral lavender aqua khaki').split(' ').forEach((w) => { MAU_GOC[w] = 1; });
['đen', 'trắng', 'xanh', 'vàng', 'bạc', 'xám', 'hồng', 'tím', 'đỏ', 'nâu'].forEach((w) => { MAU_GOC[w] = 1; });
function laSpec(t) { if (t.indexOf('(') >= 0 || t.indexOf(')') >= 0) return true; for (let z = 0; z < t.length; z++) { const c = t.charCodeAt(z); if (c >= 48 && c <= 57) return true; } return false; }
export function gonTen(s) {
  let t = String(s == null ? '' : s).trim();
  ['Điện thoại ', 'Máy tính bảng '].forEach((b) => { if (t.indexOf(b) === 0) t = t.slice(b.length).trim(); });
  const hg = ['OPPO ', 'Oppo ', 'SAMSUNG ', 'Samsung ', 'XIAOMI ', 'Xiaomi ', 'REALME ', 'Realme ', 'realme ', 'vivo ', 'Vivo ', 'HONOR ', 'Honor ', 'TECNO ', 'Tecno ', 'Nubia ', 'Masstel '];
  for (const h of hg) if (t.indexOf(h) === 0) { t = t.slice(h.length).trim(); break; }
  if (t.indexOf('Galaxy ') === 0) t = t.slice(7).trim();
  const p = t.split(' '); let k = p.length;
  while (k > 1 && !laSpec(p[k - 1])) k--;
  let coMau = false; for (let q = k; q < p.length; q++) if (MAU_GOC[p[q].toLowerCase()]) coMau = true;
  if (coMau) { const z = p.slice(0, k).join(' ').trim(); if (z) return z; }
  return t;
}

async function main() {
  const pin = pinAdmin();
  const fresh = await layShopDaily();
  log(`shopdaily: thang ${fresh.m}/${fresh.y}, ngay cuoi ${fresh.maxDay}, ${Object.keys(fresh.shops).length} shop, ${fresh.dong} dong (khop meta ${fresh.dongKhopMeta}, bo ${fresh.dongBo})`);
  if (!fresh.maxDay || !Object.keys(fresh.shops).length) throw new Error('shopdaily rong — khong ghi de');
  fs.mkdirSync(OUTDIR, { recursive: true });
  const archPath = OUTDIR + '/mt-archive.json';
  let archive = { months: {} };
  if (fs.existsSync(archPath)) { try { archive = giaiMa(JSON.parse(fs.readFileSync(archPath, 'utf8')), pin); log('doc kho lich su: ' + Object.keys(archive.months).join(',')); } catch (e) { log('CANH BAO: khong mo duoc kho cu (' + e.message + ') — tao kho moi'); } }
  const key = fresh.y + '-' + String(fresh.m).padStart(2, '0');
  const cu = archive.months[key];
  if (cu && cu.maxDay > fresh.maxDay) { log(`DUNG: kho da co toi ngay ${cu.maxDay} ma nguon chi toi ngay ${fresh.maxDay} — nguon tut lui, giu ban cu`); process.exit(2); }
  archive.months[key] = fresh;
  // giữ tối đa 3 tháng gần nhất cho kho nhẹ
  Object.keys(archive.months).sort().slice(0, -3).forEach((k) => delete archive.months[k]);
  const goi = dungGoi(archive, new Date().toISOString());
  fs.writeFileSync(archPath, JSON.stringify(maHoa(archive, pin)));
  // 05/09/2026: Quản lý vùng quyết định gói review Miền Trung ĐỂ THÔ (không mã hoá, trang không đăng nhập). Kho lịch sử vẫn mã hoá.
  fs.writeFileSync(OUTDIR + '/mt-review.json', JSON.stringify(goi));
  fs.writeFileSync(OUTDIR + '/mt-index.json', JSON.stringify({ updated: goi.updated, maxDay: goi.maxDay, month: goi.months[goi.months.length - 1], year: goi.year, it: VONG, thang: Object.keys(archive.months) }));
  log(`XONG: ${goi.sales.length} khu vuc · ${goi.all.shops} shop · thang ${goi.months.join(',')} · ngay cuoi ${goi.maxDay} · goi ${Math.round(fs.statSync(OUTDIR + '/mt-review.json').size / 1024)} KB`);
}
if (process.argv[1] && process.argv[1].endsWith('build-mt-review.mjs')) main().catch((e) => { console.error('[mt] LOI:', e.message); process.exit(1); });
