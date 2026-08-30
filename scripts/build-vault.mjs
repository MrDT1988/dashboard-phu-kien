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
  const NSG = (D.segsMkt || []).length;
  const out = {
    m: cap(NM), ac: so(NM), dy: so(N), dr: so(N), ch: {},
    sg: cap(D.segs.length), sgM: cap(D.segs.length),
    sr: cap(D.sers.length), srM: cap(D.sers.length),
    chd: {}, shops: 0, tg: 0,
  };
  const cong = (a, b) => { if (!b) return; for (let i = 0; i < a.length; i++) { a[i][0] += b[i][0]; a[i][1] += b[i][1]; } };
  const congD = (a, b) => { if (!b) return; for (let i = 0; i < a.length; i++) a[i] += (b[i] || 0); };
  const congQ = (a, b) => { if (!b) return; for (let i = 0; i < a.length; i++) for (let k = 0; k < 4; k++) a[i][k] += (b[i] ? b[i][k] : 0); };
  const quad = (n) => Array.from({ length: n }, () => [0, 0, 0, 0]);
  const gomModel = (cu, them) => {
    const g = {};
    [...(cu || []), ...(them || [])].forEach(([n2, u, r]) => { g[n2] = g[n2] || [0, 0]; g[n2][0] += u; g[n2][1] += r; });
    return Object.keys(g).map((n2) => [n2, g[n2][0], g[n2][1]]).sort((a, b) => b[1] - a[1]).slice(0, 15);
  };
  const gomTon = (cu, them) => {
    if (!them) return cu;
    const key = (x) => String(x).toUpperCase().replace(/\s+/g, ' ').replace(/\s*\+\s*/g, '+').trim();
    const g = {};
    [...(cu || []), ...them].forEach(([n2, nhap, ban]) => {
      const k = key(n2);
      if (!g[k]) g[k] = { n: n2, nhap: 0, ban: 0 };
      g[k].nhap += nhap; g[k].ban += ban;
    });
    return Object.keys(g).map((k) => [g[k].n, g[k].nhap, g[k].ban, g[k].nhap - g[k].ban])
      .sort((a2, b2) => b2[3] - a2[3]);
  };
  const gomSellin = (a, b) => {
    if (!b) return a;
    const r = a || Array.from({ length: NM }, () => [0, 0, 0]);
    for (let i = 0; i < NM; i++) for (let k = 0; k < 3; k++) r[i][k] += (b[i] ? b[i][k] : 0);
    return r;
  };

  for (const s of ds) {
    cong(out.m, s.m); congD(out.dy, s.dy); congD(out.dr, s.dr);
    congD(out.ac, s.ac);
    cong(out.sg, s.sg); cong(out.sgM, s.sgM); cong(out.sr, s.sr); cong(out.srM, s.srM);
    if (s.mo) out.mo = gomModel(out.mo, s.mo);
    if (s.sgm) { if (!out.sgm) out.sgm = s.sgm.map((x) => x.map(() => [0, 0]));
      s.sgm.forEach((sg2, k) => sg2.forEach((v, i) => { out.sgm[k][i][0] += v[0]; out.sgm[k][i][1] += v[1]; })); }
    if (s.srm) { if (!out.srm) out.srm = s.srm.map((x) => x.map(() => [0, 0]));
      s.srm.forEach((ser, k) => ser.forEach((v, i) => { out.srm[k][i][0] += v[0]; out.srm[k][i][1] += v[1]; })); }
    if (s.moM) { out.moM = out.moM || {};
      Object.keys(s.moM).forEach((m) => { out.moM[m] = gomModel(out.moM[m], s.moM[m]).slice(0, 12); }); }
    if (s.si) out.si = gomSellin(out.si, s.si);
    // ngay x hang ca nam: cong thang tung o
    if (s.dnB) {
      if (!out.dnB) out.dnB = s.dnB.map(() => [0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
      s.dnB.forEach((v, i) => {
        if (!out.dnB[i] || !v) return;
        for (let k = 0; k < 14; k++) out.dnB[i][k] += (v[k] || 0);
      });
    }
    // top model tung hang tung thang: cong het roi moi cat top 10
    if (s.mdB) {
      out._mdB = out._mdB || {};
      Object.keys(s.mdB).forEach((m2) => {
        out._mdB[m2] = out._mdB[m2] || {};
        Object.keys(s.mdB[m2]).forEach((h2) => {
          const g2 = out._mdB[m2][h2] || (out._mdB[m2][h2] = {});
          (s.mdB[m2][h2] || []).forEach(([n3, u3, r3]) => {
            g2[n3] = g2[n3] || [0, 0]; g2[n3][0] += u3; g2[n3][1] += r3;
          });
        });
      });
    }
    if (s.tk) out.tk = gomTon(out.tk, s.tk);
    if (s.tgc) { out.tgc = out.tgc || {};
      Object.keys(s.tgc).forEach((c) => { out.tgc[c] = out.tgc[c] || [0, 0];
        out.tgc[c][0] += s.tgc[c][0]; out.tgc[c][1] += s.tgc[c][1]; }); }
    out.shops += s.shops || 0; out.tg += s.tg || 0;
    for (const c of Object.keys(s.ch || {})) {
      if (!out.ch[c]) out.ch[c] = cap(NM);
      cong(out.ch[c], s.ch[c]);
    }
    for (const c of Object.keys(s.chd || {})) {
      const src = s.chd[c];
      if (!out.chd[c]) out.chd[c] = {
        m: cap(NM), ac: so(NM), dy: so(N), dr: so(N),
        sg: cap(D.segs.length), sgM: cap(D.segs.length),
        sr: cap(D.sers.length), srM: cap(D.sers.length),
      };
      const t = out.chd[c];
      cong(t.m, src.m); congD(t.dy, src.dy); congD(t.dr, src.dr);
      congD(t.ac, src.ac);
      cong(t.sg, src.sg); cong(t.sgM, src.sgM); cong(t.sr, src.sr); cong(t.srM, src.srM);
      if (src.mo) t.mo = gomModel(t.mo, src.mo);
      if (src.mkt) {
        if (!t.mkt) t.mkt = { m: Array.from({ length: NM }, () => [0, 0, 0, 0]), br: [] };
        for (let i = 0; i < NM; i++) for (let k = 0; k < 4; k++) t.mkt.m[i][k] += src.mkt.m[i][k];
        if (src.mkt.sg && NSG) { if (!t.mkt.sg) t.mkt.sg = quad(NSG); congQ(t.mkt.sg, src.mkt.sg); }
        if (src.mkt.sgY && NSG) { if (!t.mkt.sgY) t.mkt.sgY = quad(NSG); congQ(t.mkt.sgY, src.mkt.sgY); }
        const g = {};
        [...(t.mkt.br || []), ...(src.mkt.br || [])].forEach(([b, u, r]) => {
          g[b] = g[b] || [0, 0]; g[b][0] += u; g[b][1] += r;
        });
        t.mkt.br = Object.keys(g).map((b) => [b, g[b][0], g[b][1]])
          .sort((a, b) => b[1] - a[1]).slice(0, 10);
      }
    }
  }
  if (out._mdB) {
    out.mdB = {};
    Object.keys(out._mdB).forEach((m2) => {
      out.mdB[m2] = {};
      Object.keys(out._mdB[m2]).forEach((h2) => {
        const g2 = out._mdB[m2][h2];
        out.mdB[m2][h2] = Object.keys(g2).map((n3) => [n3, g2[n3][0], g2[n3][1]])
          .sort((a2, b2) => b2[1] - a2[1]).slice(0, 10);
      });
    });
    delete out._mdB;
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
  if (c.ac) o.ac = c.ac;
  if (c.mo) o.mo = c.mo;
  if (c.srm) o.srm = c.srm;
  if (c.sgm) o.sgm = c.sgm;
  if (c.moM) o.moM = c.moM;
  if (s.tgc && s.tgc[ch]) o.tgc = { [ch]: s.tgc[ch] };
  if (ch === 'IND' && s.si) o.si = s.si;   // sell-in chi co o kenh IND
  if (ch === 'IND' && s.tk) o.tk = s.tk;   // ton kho cung vay
  if (ch === 'MWG') { if (s.dnB) o.dnB = s.dnB; if (s.mdB) o.mdB = s.mdB; }
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
    v: D.v, segsMkt: D.segsMkt || [], nhomPK: D.nhomPK || null,
    shareKA: D.shareKA || null,
    src: D.src || null, tkMonths: D.tkMonths || [],
    tgK: D.tgK || null, sizes: D.sizes || [],
    tkLe: (vaiTro === 'admin' || vaiTro === 'leader') ? (D.tkLe || null) : null,
    // Ton kho chi co o kenh IND -> Leader kenh khac khong nhan gi
    dlTon: (kenh && kenh !== 'IND') ? []
      : (D.dlTon || []).filter((x) => (x.sale || []).some((sn) => tenSales.includes(sn))),
    vaiTro, kenh: kenh || null,
    all: gopAll(D, ds), sales: ds,
  };
  // Headcount la so nguoi cua ca kenh — chi dua cho quan ly vung va leader dung kenh do
  if (D.hc && vaiTro !== 'sale') {
    o.hc = {};
    (kenh ? [kenh] : D.chans).forEach((c) => { if (D.hc[c]) o.hc[c] = D.hc[c]; });
  }
  if (vaiTro === 'admin') { o.mktNote = D.mktNote; o.all.mkt = D.all.mkt; o.all.chd = D.all.chd; o.all.si = D.all.si; o.all.tk = D.all.tk; if (D.all.tgc) o.all.tgc = D.all.tgc; }
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
