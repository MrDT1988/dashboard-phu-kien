/* probe-ind.mjs — DO THAM, khong ghi gi vao repo.
 * Muc dich: xem ten san pham ben sheet SELL IN co khop duoc voi ten model
 * ben so ban hang cua kenh IND hay khong, TRUOC khi tinh ton kho theo model.
 * Chi in ra log cua Action (ten san pham la ten hang hoa, khong phai so lieu kinh doanh).
 */
import { chromium } from 'playwright';

const SITE = process.env.SITE_URL || 'https://mrdt1988.github.io/dashboard-phu-kien';
const NAP_TRANG = 180000, CHO_DU_LIEU = 1500000;
const log = (...a) => console.log('[probe]', ...a);

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  log('mo', SITE + '/tg.html');
  await page.goto(`${SITE}/tg.html?ci=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: NAP_TRANG });
  log('doi trang tinh xong...');
  await page.waitForFunction(
    () => !!(window.__exportDataMwg && window.__exportDataMwg.crosstab
             && window.__exportDataMwg.crosstab.length && window.__exportDataMwg.sell_in_rows),
    null, { timeout: CHO_DU_LIEU, polling: 3000 });
  await page.waitForTimeout(8000);

  const kq = await page.evaluate(() => {
    const W = window.__exportDataMwg;
    const COL = { STORE_ID: 0, RETAILER: 1, PROVINCE: 2, MONTH: 3, PRODUCT: 4, GROUP: 5, QTY: 6 };
    const rows = W.sell_in_rows || [];

    // 1. Nhom hang trong sheet SELL IN
    const nhom = {};
    rows.forEach(r => { if (r && r.length >= 7) { const g = String(r[COL.GROUP] || '?').trim().toUpperCase(); nhom[g] = (nhom[g] || 0) + 1; } });

    // 2. Ten san pham SELL IN (chi nhom OPPO), theo so luong
    const sp = {};
    rows.forEach(r => {
      if (!r || r.length < 7) return;
      if (String(r[COL.GROUP] || '').trim().toUpperCase() !== 'OPPO') return;
      const p = String(r[COL.PRODUCT] || '').trim();
      const q = parseFloat(String(r[COL.QTY]).replace(/[^0-9.-]/g, '')) || 0;
      if (p) sp[p] = (sp[p] || 0) + q;
    });

    // 3. Ten model ben ban hang, chi kenh IND
    const md = {};
    (W.crosstab || []).forEach(r => {
      if (r.channel !== 'IND') return;
      const m = String(r.model || '').trim();
      if (m) md[m] = (md[m] || 0) + (r.sellout || 0);
    });

    // 4. Thang co trong SELL IN
    const thang = {};
    rows.forEach(r => { if (r && r.length >= 7) { const m = parseInt(r[COL.MONTH], 10); if (m) thang[m] = (thang[m] || 0) + 1; } });

    // 5. Store ID: SELL IN co khop duoc voi store_rows khong
    const idIND = {};
    (W.store_rows || []).forEach(r => { if (r.channel === 'IND' && r.store_id) idIND[String(r.store_id).trim()] = r.store; });
    const idSellin = {};
    rows.forEach(r => { if (r && r.length >= 7) { const s = String(r[COL.STORE_ID] || '').trim(); if (s) idSellin[s] = 1; } });
    const khopId = Object.keys(idSellin).filter(s => idIND[s]).length;

    const top = (o, n) => Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, n).map(k => k + '  ||  ' + Math.round(o[k]));

    return {
      soDong: rows.length,
      nhomHang: Object.keys(nhom).map(k => k + '=' + nhom[k]).join(', '),
      thang: Object.keys(thang).map(Number).sort((a, b) => a - b).map(m => 'T' + m + ':' + thang[m]).join(' '),
      soStoreIdSellin: Object.keys(idSellin).length,
      soStoreIdIND: Object.keys(idIND).length,
      khopStoreId: khopId,
      soTenSanPham: Object.keys(sp).length,
      soTenModelIND: Object.keys(md).length,
      spTop: top(sp, 45),
      mdTop: top(md, 45),
    };
  });

  log('=== SHEET SELL IN ===');
  log('so dong:', kq.soDong, '| nhom hang:', kq.nhomHang);
  log('thang:', kq.thang);
  log('store id: sheet co', kq.soStoreIdSellin, '| shop IND co', kq.soStoreIdIND, '| KHOP', kq.khopStoreId);
  log('so ten san pham (nhom OPPO):', kq.soTenSanPham);
  log('so ten model ben ban hang IND:', kq.soTenModelIND);
  log('');
  log('--- 45 TEN SAN PHAM SELL IN (ten || so luong nhap) ---');
  kq.spTop.forEach((x, i) => log(String(i + 1).padStart(2) + '. ' + x));
  log('');
  log('--- 45 TEN MODEL BAN HANG IND (ten || so may ban) ---');
  kq.mdTop.forEach((x, i) => log(String(i + 1).padStart(2) + '. ' + x));
} finally {
  await browser.close();
}
