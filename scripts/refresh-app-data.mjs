/* refresh-app-data.mjs
 * Chay tren may chu GitHub moi dem. Khong can may cua anh Thai.
 *
 * Cach lam: mo DB TG bang trinh duyet an (khong hien man hinh), doi trang tu tai
 * va tinh xong, roi chay dung bo trich xuat scripts/build-app-data.js ma app dang dung.
 * Nho vay so lieu cua app LUON khop voi dashboard, khong so lech logic.
 *
 * An toan: chi ghi de app-data.json khi ban moi VUOT QUA duoc cac chot kiem tra
 * so voi ban cu (so thang, so shop, ngay cuoi). Tung mat toan bo so T8 mot lan roi
 * (25/08/2026) nen buoc nay la bat buoc.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = process.env.SITE_URL || 'https://mrdt1988.github.io/dashboard-phu-kien';
const OUT = path.resolve(process.env.OUT_FILE || 'app-data.json');
const NAP_TRANG = Number(process.env.PAGE_TIMEOUT || 180000);   // 3 phut de mo trang
const CHO_DU_LIEU = Number(process.env.DATA_TIMEOUT || 1500000); // 25 phut de trang tinh xong
const SO_LAN_THU = Number(process.env.RETRIES || 2);

const log = (...a) => console.log('[refresh]', ...a);

function kiemTra(d) {
  const loi = [];
  if (!d || typeof d !== 'object') return ['khong nhan duoc du lieu'];
  if (!Array.isArray(d.months) || !d.months.length) loi.push('thieu danh sach thang');
  if (!Array.isArray(d.sales) || !d.sales.length) loi.push('khong co sale nao');
  if (!d.all || !d.all.shops) loi.push('khong co shop nao');
  if (!d.lastDoy) loi.push('khong co so lieu theo ngay');
  if (!d.maxDay) loi.push('thang hien tai chua co ngay nao co so');
  const tong = d.all && Array.isArray(d.all.m)
    ? d.all.m.reduce((t, x) => t + (x[0] || 0), 0) : 0;
  if (!tong) loi.push('tong san luong ca nam = 0');
  return loi;
}

// So voi ban cu: khong cho phep tut lui (dau hieu sheet bi xoa / tai thieu)
function soVoiBanCu(moi, cu) {
  if (!cu) return [];
  const canh = [];
  if ((moi.months?.length || 0) < (cu.months?.length || 0))
    canh.push(`so thang tut tu ${cu.months.length} xuong ${moi.months.length}`);
  if ((moi.all?.shops || 0) < (cu.all?.shops || 0) * 0.9)
    canh.push(`so shop tut tu ${cu.all.shops} xuong ${moi.all.shops}`);
  if ((moi.sales?.length || 0) < (cu.sales?.length || 0) * 0.9)
    canh.push(`so sale tut tu ${cu.sales.length} xuong ${moi.sales.length}`);
  if ((moi.lastDoy || 0) < (cu.lastDoy || 0))
    canh.push(`ngay cuoi lui tu ${cu.lastDoy} ve ${moi.lastDoy}`);
  const tongMoi = (moi.all?.m || []).reduce((t, x) => t + (x[0] || 0), 0);
  const tongCu = (cu.all?.m || []).reduce((t, x) => t + (x[0] || 0), 0);
  if (tongCu && tongMoi < tongCu * 0.9)
    canh.push(`tong san luong tut tu ${tongCu} xuong ${tongMoi} (giam qua 10%)`);
  return canh;
}

async function layMotLan(lanThu) {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    // CHROME_PATH chi dung khi chay thu o may khac; tren GitHub de trong.
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      const t = m.text();
      if (/error|Error|LOI|không|khong/.test(t)) log('  [trang]', t.slice(0, 200));
    });
    page.on('pageerror', (e) => log('  [loi trang]', String(e).slice(0, 200)));

    log(`lan ${lanThu}: mo ${SITE}/tg.html`);
    await page.goto(`${SITE}/tg.html?ci=${Date.now()}`, {
      waitUntil: 'domcontentloaded', timeout: NAP_TRANG,
    });

    log('doi trang tu tai va tinh xong (toi da 25 phut)...');
    const bd = Date.now();
    await page.waitForFunction(
      () => !!(window.__exportDataMwg && window.__exportDataMwg.crosstab
               && window.__exportDataMwg.crosstab.length && window.__exportDataMain),
      null, { timeout: CHO_DU_LIEU, polling: 3000 },
    );
    log(`trang xong sau ${Math.round((Date.now() - bd) / 1000)}s`);
    await page.waitForTimeout(8000); // de cac phan tinh sau cung kip chay

    log('chay bo trich xuat build-app-data.js');
    const data = await page.evaluate(async (site) => {
      const src = await fetch(site + '/scripts/build-app-data.js?t=' + Date.now())
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
      (0, eval)(src);
      if (typeof window.buildAppData !== 'function') throw new Error('khong nap duoc buildAppData');
      return window.buildAppData(window.__exportDataMwg, window.__exportDataMain);
    }, SITE);

    return data;
  } finally {
    await browser.close();
  }
}

(async () => {
  // Moc so sanh nam trong data/baseline.json va ĐƯỢC MÃ HOÁ (khong lo so ra ngoai)
  const MOC = process.env.BASELINE || 'data/baseline.json';
  let cu = null;
  try {
    const b = JSON.parse(fs.readFileSync(MOC, 'utf8'));
    const pin = JSON.parse(process.env.SALE_CODES || '{}').admin.pin;
    const key = crypto.pbkdf2Sync(String(pin), Buffer.from(b.salt, 'base64'), b.it, 32, 'sha256');
    const raw = Buffer.from(b.ct, 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(b.iv, 'base64'));
    d.setAuthTag(raw.subarray(raw.length - 16));
    cu = JSON.parse(Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString('utf8'));
    log('doc duoc moc so sanh cu');
  } catch { log('chua co moc so sanh (lan chay dau tien)'); }

  let data = null, loiCuoi = null;
  for (let i = 1; i <= SO_LAN_THU; i++) {
    try {
      data = await layMotLan(i);
      const loi = kiemTra(data);
      if (loi.length) { loiCuoi = 'du lieu khong dat: ' + loi.join('; '); data = null; log('  ', loiCuoi); }
      else break;
    } catch (e) {
      loiCuoi = String(e && e.message || e);
      log(`  lan ${i} that bai: ${loiCuoi.slice(0, 300)}`);
      data = null;
    }
    if (i < SO_LAN_THU) { log('  nghi 60s roi thu lai'); await new Promise((r) => setTimeout(r, 60000)); }
  }

  if (!data) {
    console.error('[refresh] KHONG LAY DUOC DU LIEU. Giu nguyen ban cu.');
    console.error('[refresh] Ly do:', loiCuoi);
    process.exit(1);
  }

  const canh = soVoiBanCu(data, cu);
  if (canh.length && process.env.FORCE !== '1') {
    console.error('[refresh] DUNG LAI - ban moi tut lui so voi ban cu:');
    canh.forEach((c) => console.error('  - ' + c));
    console.error('[refresh] Neu day la dung y (vi du sheet doi that) thi chay lai voi FORCE=1.');
    process.exit(2);
  }

  fs.writeFileSync(OUT, JSON.stringify(data));

  // Ghi lai moc so sanh (da ma hoa) cho lan chay sau
  try {
    const pin = JSON.parse(process.env.SALE_CODES || '{}').admin.pin;
    const goc = {
      months: data.months, lastDoy: data.lastDoy, maxDay: data.maxDay,
      all: { shops: data.all.shops, m: data.all.m }, sales: data.sales.map(() => 0),
    };
    const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), it = 200000;
    const key = crypto.pbkdf2Sync(String(pin), salt, it, 32, 'sha256');
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(JSON.stringify(goc), 'utf8'), c.final(), c.getAuthTag()]);
    fs.mkdirSync(path.dirname(MOC), { recursive: true });
    fs.writeFileSync(MOC, JSON.stringify({ it, salt: salt.toString('base64'),
      iv: iv.toString('base64'), ct: ct.toString('base64') }));
  } catch (e) { log('CANH BAO: khong ghi duoc moc so sanh:', String(e.message)); }

  const kb = Math.round(fs.statSync(OUT).size / 1024);
  log(`XONG: ${data.sales.length} sale · ${data.all.shops} shop · thang ${data.months.join(',')}` +
      ` · ngay cuoi ${data.maxDay}/${data.months[data.months.length - 1]} · ${kb} KB`);
})();
