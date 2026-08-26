/* probe-ind.mjs — DO THAM, khong ghi gi vao repo.
 * Muc dich: xem ten san pham ben sheet SELL IN co khop duoc voi ten model
 * ben so ban hang cua kenh IND hay khong, TRUOC khi tinh ton kho theo model.
 * Chi in ra log cua Action (ten san pham la ten hang hoa, khong phai so lieu kinh doanh).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';

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

    // 6. TEN DAI LY ben SELL IN vs TEN SHOP ben ban hang — de ghep bang ten
    const dl = {};      // ten dai ly -> {qty, ids:Set, coShop}
    rows.forEach(r => {
      if (!r || r.length < 7) return;
      const ten = String(r[COL.RETAILER] || '').trim();
      const sid = String(r[COL.STORE_ID] || '').trim();
      const q = parseFloat(String(r[COL.QTY]).replace(/[^0-9.-]/g, '')) || 0;
      if (!ten) return;
      if (!dl[ten]) dl[ten] = { qty: 0, ids: {}, khop: 0 };
      dl[ten].qty += q;
      if (sid) { dl[ten].ids[sid] = 1; if (idIND[sid]) dl[ten].khop = 1; }
    });
    const dlList = Object.keys(dl).map(k => ({
      ten: k, qty: Math.round(dl[k].qty), soMa: Object.keys(dl[k].ids).length, khop: dl[k].khop,
    })).sort((a, b) => b.qty - a.qty);

    // Ten shop IND ben ban hang, kem so may ban
    const banShop = {};
    (W.crosstab || []).forEach(r => {
      if (r.channel !== 'IND') return;
      banShop[r.store] = (banShop[r.store] || 0) + (r.sellout || 0);
    });
    const shopIND = Object.keys(idIND).map(id => idIND[id]);
    const shopChuaCoSellin = shopIND.filter(n => {
      // shop co ban nhung ma cua no khong xuat hien trong sheet
      return banShop[n] && !Object.keys(idSellin).some(s => idIND[s] === n);
    }).map(n => ({ ten: n, ban: banShop[n] })).sort((a, b) => b.ban - a.ban);

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
      dlList, shopChuaCoSellin,
      soShopIND: shopIND.length,
      spAll: Object.keys(sp).sort((a,b)=>sp[b]-sp[a]).map(k=>[k, Math.round(sp[k])]),
      mdAll: Object.keys(md).sort((a,b)=>md[b]-md[a]).map(k=>[k, md[k]]),
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
  log('');
  log('so dai ly ten rieng ben SELL IN:', kq.dlList.length,
      '| ten co it nhat 1 ma khop shop:', kq.dlList.filter(d => d.khop).length);
  log('so shop IND ban nhung khong co dong sell-in:', kq.shopChuaCoSellin.length);

  // Ghi ban day du ra file DA MA HOA (repo la public nen khong de tran)
  try {
    const pin = JSON.parse(process.env.SALE_CODES || '{}').admin.pin;
    const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), it = 200000;
    const key = crypto.pbkdf2Sync(String(pin), salt, it, 32, 'sha256');
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(JSON.stringify(kq), 'utf8'), c.final(), c.getAuthTag()]);
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync('data/probe-ind.json', JSON.stringify({
      it, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'),
    }));
    log('da ghi data/probe-ind.json (ma hoa)');
  } catch (e) { log('CANH BAO: khong ghi duoc file do tham:', String(e.message)); }
} finally {
  await browser.close();
}
