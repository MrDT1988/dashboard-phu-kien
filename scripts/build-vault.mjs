/* build-vault.mjs — chia app-data.json thanh nhieu FILE MA HOA theo tung nguoi.
 *
 * Chay sau buoc lam moi so lieu, trong GitHub Actions.
 * Ma PIN lay tu bien bi mat SALE_CODES (Settings > Secrets > Actions) — KHONG bao gio
 * nam trong repo, khong bao gio in ra log.
 *
 * Nguyen tac:
 *  - Moi nguoi mot file rieng, chi chua PHAN CUA HO -> lo 1 file cung khong lo ca tinh
 *  - Ma hoa AES-256-GCM. Khoa sinh tu PIN bang PBKDF2-SHA256 600.000 vong
 *    -> moi lan doan mat ~0,3-1 giay, doan het 1 trieu ma 6 so mat nhieu ngay
 *  - File index chi co: ma so ngau nhien + ten hien thi + vai tro. Khong co so lieu.
 *
 * SALE_CODES dang:
 * {
 *   "admin":  { "pin": "1234567890", "ten": "Duy Thái" },
 *   "leader": { "MWG": "234567", "KA": "345678", "IND": "456789" },
 *   "sales":  { "CAO CHÍ BẢO": "567890", "CHU TẤN LỘC": "678901" }
 * }
 * - admin  : toan tinh, du 3 kenh
 * - leader : CHI 1 KENH, nhung thay tat ca sale co shop trong kenh do
 * - sale   : chi shop cua minh (du kenh nao)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SRC = process.env.APP_DATA || 'app-data.json';
const OUTDIR = process.env.VAULT_DIR || 'data';
const VONG = Number(process.env.KDF_ITER || 600000);

const log = (...a) => console.log('[vault]', ...a);
const che = (s) => String(s).replace(/./g, '•');   // khong bao gio in ma ra log

function maHoa(obj, pin) {
  const muoi = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const khoa = crypto.pbkdf2Sync(String(pin), muoi, VONG, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', khoa, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  // Web Crypto doi ciphertext va tag dinh lien nhau
  return {
    v: 1, kdf: 'PBKDF2-SHA256', it: VONG, alg: 'AES-256-GCM',
    salt: muoi.toString('base64'),
    iv: iv.toString('base64'),
    ct: Buffer.concat([ct, c.getAuthTag()]).toString('base64'),
  };
}

// Cong lai phan "toan bo" cho dung pham vi cua tung nguoi
function gopAll(D, ds) {
  const NM = D.months.length, N = D.lastDoy || 0;
  const cap = (n) => Array.from({ length: n }, () => [0, 0]);
  const so = (n) => Array.from({ length: n }, () => 0);
  const out = {
    m: cap(NM), dy: so(N), dr: so(N), ch: {},
    sg: cap(D.segs.length), sgM: cap(D.segs.length),
    sr: cap(D.sers.length), srM: cap(D.sers.length),
    chd: {}, shops: 0, tg: 0,
  };
  const cong = (a, b) => { if (!b) return; for (let i = 0; i < a.length; i++) { a[i][0] += b[i][0]; a[i][1] += b[i][1]; } };
  const congD = (a, b) => { if (!b) return; for (let i = 0; i < a.length; i++) a[i] += (b[i] || 0); };

  for (const s of ds) {
    cong(out.m, s.m); congD(out.dy, s.dy); congD(out.dr, s.dr);
    cong(out.sg, s.sg); cong(out.sgM, s.sgM); cong(out.sr, s.sr); cong(out.srM, s.srM);
    out.shops += s.shops || 0; out.tg += s.tg || 0;
    for (const c of Object.keys(s.ch || {})) {
      if (!out.ch[c]) out.ch[c] = cap(NM);
      cong(out.ch[c], s.ch[c]);
    }
    for (const c of Object.keys(s.chd || {})) {
      const src = s.chd[c];
      if (!out.chd[c]) out.chd[c] = {
        m: cap(NM), dy: so(N), dr: so(N),
        sg: cap(D.segs.length), sgM: cap(D.segs.length),
        sr: cap(D.sers.length), srM: cap(D.sers.length),
      };
      const t = out.chd[c];
      cong(t.m, src.m); congD(t.dy, src.dy); congD(t.dr, src.dr);
      cong(t.sg, src.sg); cong(t.sgM, src.sgM); cong(t.sr, src.sr); cong(t.srM, src.srM);
      if (src.mkt) {
        if (!t.mkt) t.mkt = { m: Array.from({ length: NM }, () => [0, 0, 0, 0]), br: [] };
        for (let i = 0; i < NM; i++) for (let k = 0; k < 4; k++) t.mkt.m[i][k] += src.mkt.m[i][k];
        const g = {};
        [...(t.mkt.br || []), ...(src.mkt.br || [])].forEach(([b, u, r]) => {
          g[b] = g[b] || [0, 0]; g[b][0] += u; g[b][1] += r;
        });
        t.mkt.br = Object.keys(g).map((b) => [b, g[b][0], g[b][1]])
          .sort((a, b) => b[1] - a[1]).slice(0, 10);
      }
    }
  }
  if (out.chd.MWG && out.chd.MWG.mkt) out.mkt = out.chd.MWG.mkt;
  return out;
}

// Cat 1 sale xuong con dung 1 kenh — dung cho Leader
function saleTheoKenh(D, s, ch) {
  const cd = (s.chd || {})[ch];
  const shops = (s.s || []).filter((x) => x.ch2 === ch);
  if (!cd && !shops.length) return null;
  const cap = (n) => Array.from({ length: n }, () => [0, 0]);
  const rong = {
    m: cap(D.months.length), dy: [], dr: [],
    sg: cap(D.segs.length), sgM: cap(D.segs.length),
    sr: cap(D.sers.length), srM: cap(D.sers.length),
  };
  const c = cd || rong;
  const o = {
    n: s.n, shops: shops.length,
    tg: shops.reduce((t, x) => t + (x.tg || 0), 0),
    m: c.m, dy: c.dy || [], dr: c.dr || [],
    ch: { [ch]: c.m },
    sg: c.sg, sgM: c.sgM, sr: c.sr, srM: c.srM,
    chd: { [ch]: c },
    s: shops,
  };
  if (c.mkt) o.mkt = c.mkt;
  return o;
}

function phamVi(D, tenSales, vaiTro, hangCuaToi, kenh) {
  let ds = D.sales.filter((s) => tenSales.includes(s.n));
  if (kenh) ds = ds.map((s) => saleTheoKenh(D, s, kenh)).filter(Boolean)
                   .sort((a, b) => b.m.reduce((t, x) => t + x[1], 0) - a.m.reduce((t, x) => t + x[1], 0));
  const o = {
    updated: D.updated, months: D.months, maxDay: D.maxDay,
    dimCur: D.dimCur, dimPrv: D.dimPrv, year: D.year, lastDoy: D.lastDoy,
    segs: D.segs, sers: D.sers,
    chans: kenh ? [kenh] : D.chans,
    vaiTro, kenh: kenh || null,
    all: gopAll(D, ds), sales: ds,
  };
  if (vaiTro === 'admin') { o.mktNote = D.mktNote; o.all.mkt = D.all.mkt; o.all.chd = D.all.chd; }
  if (hangCuaToi) o.hang = hangCuaToi;   // "4/16" — biet minh dung dau ma khong thay so nguoi khac
  return o;
}

(async () => {
  const D = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  let ma;
  try { ma = JSON.parse(process.env.SALE_CODES || ''); }
  catch { console.error('[vault] LOI: chua dat bien bi mat SALE_CODES (hoac sai dinh dang JSON)'); process.exit(1); }

  const tenTatCa = D.sales.map((s) => s.n);

  // So ten khoan dung: anh Thai go tay nen co the thua khoang trang, khac hoa/thuong,
  // hoac thieu dau. Uu tien khop chinh xac, roi moi ha tieu chuan dan.
  const chuan = (x) => String(x || '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
  const khongDau = (x) => chuan(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D');
  const mapChinhXac = {}, mapKhongDau = {};
  tenTatCa.forEach((n) => {
    mapChinhXac[chuan(n)] = n;
    const k = khongDau(n);
    mapKhongDau[k] = (mapKhongDau[k] === undefined || mapKhongDau[k] === n) ? n : null; // trung thi bo
  });
  const doiTen = (x) => {
    if (mapChinhXac[chuan(x)]) return mapChinhXac[chuan(x)];
    const k = mapKhongDau[khongDau(x)];
    if (k) { log(`  (khop gan dung) "${x}" -> "${k}"`); return k; }
    return null;
  };
  // Xep hang theo doanh thu luy ke ca nam de moi nguoi biet minh dung dau
  const xep = D.sales.slice().sort((a, b) =>
    b.m.reduce((t, x) => t + x[1], 0) - a.m.reduce((t, x) => t + x[1], 0)).map((s) => s.n);
  const hangCua = (n) => `${xep.indexOf(n) + 1}/${xep.length}`;

  // Xoa cac goi cu (theo index cu) NHUNG GIU LAI baseline.json — do la moc chong mat so
  fs.mkdirSync(OUTDIR, { recursive: true });
  try {
    const cu = JSON.parse(fs.readFileSync(path.join(OUTDIR, 'index.json'), 'utf8'));
    (cu.users || []).forEach((u) => fs.rmSync(path.join(OUTDIR, u.id + '.json'), { force: true }));
  } catch { /* chua co index cu */ }

  const index = [];
  const themNguoi = (ten, vaiTro, pin, sales, kenh) => {
    if (!pin || !/^\d{6,12}$/.test(String(pin))) {
      console.error(`[vault] BO QUA "${ten}": ma phai la 6-12 chu so`); return;
    }
    const doi = sales.map(doiTen);
    const thieu = sales.filter((_, i) => !doi[i]);
    if (thieu.length) console.error(`[vault] CANH BAO "${ten}": khong tim thay sale ${thieu.join(' | ')}`);
    sales = doi.filter(Boolean);
    if (!sales.length) { console.error(`[vault] BO QUA "${ten}": khong khop duoc sale nao`); return; }
    const goi = phamVi(D, sales, vaiTro, vaiTro === 'sale' ? hangCua(sales[0]) : null, kenh);
    if (!goi.sales.length) { console.error(`[vault] BO QUA "${ten}": khong co sale nao trong pham vi`); return; }
    const id = crypto.randomBytes(8).toString('hex');
    fs.writeFileSync(path.join(OUTDIR, id + '.json'), JSON.stringify(maHoa(goi, pin)));
    index.push({ id, n: ten, r: vaiTro });
    const kb = Math.round(fs.statSync(path.join(OUTDIR, id + '.json')).size / 1024);
    log(`${vaiTro.padEnd(6)} ${ten} — ${goi.sales.length} sale, ${goi.all.shops} shop, ma ${che(pin)}, ${kb} KB`);
  };

  if (ma.admin?.pin) themNguoi(ma.admin.ten || 'Toàn Tiền Giang', 'admin', ma.admin.pin, tenTatCa);
  for (const [kenh, v] of Object.entries(ma.leader || {})) {
    const pin = typeof v === 'string' ? v : v.pin;
    if (!(D.chans || []).includes(kenh)) { console.error(`[vault] BO QUA Leader "${kenh}": khong co kenh nay`); continue; }
    themNguoi('Leader ' + kenh, 'leader', pin, tenTatCa, kenh);
  }
  const daCap = new Set();
  for (const [ten, pin] of Object.entries(ma.sales || {})) {
    const that = doiTen(ten);
    if (!that) { console.error(`[vault] KHONG NHAN RA SALE "${ten}" — bo qua`); continue; }
    if (daCap.has(that)) { console.error(`[vault] SALE "${that}" bi cap ma 2 lan — bo qua lan sau`); continue; }
    daCap.add(that);
    themNguoi(that, 'sale', pin, [that]);
  }

  if (!index.length) { console.error('[vault] LOI: khong tao duoc nguoi dung nao'); process.exit(1); }

  fs.writeFileSync(path.join(OUTDIR, 'index.json'), JSON.stringify({
    updated: D.updated, maxDay: D.maxDay,
    months: D.months, it: VONG, users: index,
  }));
  const chuaCoMa = tenTatCa.filter((n) => !daCap.has(n));
  if (chuaCoMa.length) {
    log('!!! CHUA CO MA — nhung nguoi nay KHONG dang nhap duoc:');
    chuaCoMa.forEach((n) => log('    - ' + n));
  }
  log(`xong: ${index.length} nguoi dung -> ${OUTDIR}/`);
})();
