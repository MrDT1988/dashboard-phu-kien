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
// DB TG cham dan theo do lon cua sheet. 26/08 tung timeout 2 lan lien tiep o muc 25 phut,
// nen doi thanh MOT lan cho that lau thay vi hai lan cho ngan.
const CHO_DU_LIEU = Number(process.env.DATA_TIMEOUT || 2400000); // 40 phut de trang tinh xong
const SO_LAN_THU = Number(process.env.RETRIES || 1);

const log = (...a) => console.log('[refresh]', ...a);

// ---- Doc bang cau tra loi GIAI TRINH (CSV xuat ban tu Google Sheet) ----
// Chi chay khi co bien moi truong GT_CSV. Hong thi bo qua, khong lam vo lan chay.
var CR = String.fromCharCode(13), LF = String.fromCharCode(10);
function tachCSV(s, sep) {
  sep = sep || ',';
  var out = [], hang = [], o = '', trong = false, i = 0;
  while (i < s.length) {
    var c = s[i];
    if (trong) {
      if (c === '"') { if (s[i + 1] === '"') { o += '"'; i += 2; continue; } trong = false; i++; continue; }
      o += c; i++; continue;
    }
    if (c === '"') { trong = true; i++; continue; }
    if (c === sep) { hang.push(o); o = ''; i++; continue; }
    if (c === CR) { i++; continue; }
    if (c === LF) { hang.push(o); out.push(hang); hang = []; o = ''; i++; continue; }
    o += c; i++;
  }
  if (o.length || hang.length) { hang.push(o); out.push(hang); }
  return out;
}
async function docGiaiTrinh() {
  const url = process.env.GT_CSV;
  if (!url) { log('khong co GT_CSV, bo qua phan giai trinh'); return null; }
  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    // Phong ho: neu lo xuat ban ra .tsv thi van doc duoc
    const txt = await r.text();
    const dong1 = txt.split(LF)[0] || '';
    var demKy = function (ch) { var n = 0; for (var z = 0; z < dong1.length; z++) if (dong1[z] === ch) n++; return n; };
    var TAB = String.fromCharCode(9);
    var sep = demKy(TAB) > demKy(',') ? TAB : ',';
    if (sep === TAB) log('phat hien dinh dang TSV, van doc duoc');
    const bang = tachCSV(txt, sep);
    if (bang.length < 2) { log('bang giai trinh trong'); return []; }
    const ds = [];
    for (let k = 1; k < bang.length; k++) {
      const h = bang[k];
      if (!h || h.length < 2) continue;
      const shop = String(h[1] || '').trim();
      if (!shop) continue;
      ds.push([shop, String(h[0] || '').trim(),
               String(h[2] || '').trim().slice(0, 300),
               String(h[3] || '').trim().slice(0, 300)]);
    }
    log('doc duoc ' + ds.length + ' dong giai trinh');
    return ds;
  } catch (e) {
    log('khong doc duoc bang giai trinh: ' + String(e && e.message || e));
    return null;
  }
}

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

// Ket qua do kich thuoc goi DB TG. Phai o TANG NGOAI CUNG vi duoc gan trong
// layMotLan() nhung doc o ham chinh — de trong ham chinh la ReferenceError.
let doGoiChung = null;

async function layMotLan(lanThu) {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    // CHROME_PATH chi dung khi chay thu o may khac; tren GitHub de trong.
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  try {
    // MUI GIO: bat buoc dat Asia/Ho_Chi_Minh.
    // Apps Script tra o ngay ve dang chuoi UTC ("2026-08-30T17:00:00.000Z" = 0h ngay 31/8 gio VN).
    // tg.html doc lai bang getFullYear/getMonth/getDate - tuc la theo GIO CUA MAY DANG CHAY.
    // May chu GitHub chay theo UTC nen doc thanh 30/8 -> TOAN BO ngay bi lui 1 ngay: App Sale bao
    // "den ngay 30" trong khi sheet da co 31, bang nhiet theo ngay va cac tuan cung lech theo.
    // Dat mui gio VN cho trinh duyet an => robot doc y het may cua anh Thai.
    const ctx = await browser.newContext({
      viewport: { width: 1400, height: 1000 },
      timezoneId: 'Asia/Ho_Chi_Minh',
      locale: 'vi-VN',
    });
    const page = await ctx.newPage();
    // Chia khoa cho duong Apps Script. Phai bom TRUOC khi trang chay dong dau tien,
    // vi tg.html goi Apps Script ngay luc nap. Lay tu GitHub Secret AS_KEY —
    // khong nam trong repo. Chua dat secret thi bo qua, moi thu chay nhu cu.
    // Robot KHONG duoc doc goi da dong san — no la nguoi di dong goi do.
    // Khong co dong nay thi tu lan chay thu hai, robot dung o man hinh nhap ma
    // roi treo cho toi khi het gio.
    await page.addInitScript(() => { window.__BO_QUA_GOI = true; });
    if (process.env.AS_KEY) {
      await page.addInitScript((k) => { window.__AS_KEY = k; }, process.env.AS_KEY);
      log('da bom chia khoa Apps Script vao trang');
    } else {
      log('CHUA co AS_KEY — neu Apps Script da dat chia khoa thi buoc nay se that bai');
    }
    page.on('console', (m) => {
      const t = m.text();
      if (/error|Error|LOI|không|khong/.test(t)) log('  [trang]', t.slice(0, 200));
    });
    page.on('pageerror', (e) => log('  [loi trang]', String(e).slice(0, 200)));

    log(`lan ${lanThu}: mo ${SITE}/tg.html`);
    await page.goto(`${SITE}/tg.html?ci=${Date.now()}`, {
      waitUntil: 'domcontentloaded', timeout: NAP_TRANG,
    });

    log(`doi trang tu tai va tinh xong (toi da ${Math.round(CHO_DU_LIEU / 60000)} phut)...`);
    const bd = Date.now();
    await page.waitForFunction(
      () => !!(window.__exportDataMwg && window.__exportDataMwg.crosstab
               && window.__exportDataMwg.crosstab.length && window.__exportDataMain),
      null, { timeout: CHO_DU_LIEU, polling: 3000 },
    );
    log(`trang xong sau ${Math.round((Date.now() - bd) / 1000)}s`);
    await page.waitForTimeout(8000); // de cac phan tinh sau cung kip chay

    // Sheet "Share KA" (thi phan FPT + Viettel) chua duoc Apps Script day ra bien export,
    // nhung doGet da co san ?sheet=<ten>&mode=data nen goi thang duoc.
    log('lay them sheet "Share KA" (thi phan FPT + Viettel)');
    let shareKA = null;
    try {
      shareKA = await page.evaluate(async () => {
        const U = (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL) ||
          (document.documentElement.innerHTML.match(
            /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/) || [])[0];
        if (!U) throw new Error('khong tim thay duong dan Apps Script');
        const q = U + '?sheet=' + encodeURIComponent('Share KA') + '&mode=data&start=1&count=20000';
        const r = await fetch(q, { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      });
      log(`  -> Share KA: ${Array.isArray(shareKA) ? shareKA.length : 0} dong`);
    } catch (e) {
      log('  -> KHONG lay duoc Share KA: ' + e.message + ' (app se bo qua phan nay)');
      shareKA = null;
    }

    /* ---------------------------------------------------------------------
       DO KICH THUOC GOI DU LIEU CUA DB TG.
       Cau hoi phai tra loi truoc khi lam buoc "DB TG doc goi ma hoa":
       hai khoi DATA cua tg.html nang bao nhieu, nen lai con bao nhieu?
         duoi 10 MB (sau nen) -> lam duoc, DB TG mo trong vai giay
         tren 30 MB           -> phai chia nho theo thang
       Chi la CON SO KICH THUOC, khong phai so lieu kinh doanh -> ghi ra repo duoc.
       --------------------------------------------------------------------- */
    try {
      doGoiChung = await page.evaluate(async () => {
        const nen = async (txt) => {
          if (typeof CompressionStream !== 'function') return null;
          const st = new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'));
          return (await new Response(st).blob()).size;
        };
        const soi = async (o, ten) => {
          if (!o) return { ten, co: false };
          const txt = JSON.stringify(o);
          const truong = Object.keys(o).map((k) => {
            let n = 0; try { n = JSON.stringify(o[k]).length; } catch (e) { n = -1; }
            return [k, n];
          }).sort((a, b) => b[1] - a[1]).slice(0, 8);
          return { ten, co: true, tho: txt.length, nen: await nen(txt), nangNhat: truong };
        };
        // Lay luon hai khoi DA NEN ve, khoi phai mo trang them lan nua.
        // Nen ngay trong trang: 27,8 MB tho -> 2,7 MB, nhe hon nhieu khi chuyen ra.
        const nenB64 = async (o) => {
          if (!o || typeof CompressionStream !== 'function') return '';
          const st = new Blob([JSON.stringify(o)]).stream().pipeThrough(new CompressionStream('gzip'));
          const buf = new Uint8Array(await (await new Response(st)).arrayBuffer());
          let s2 = ''; const B = 0x8000;
          for (let i = 0; i < buf.length; i += B) s2 += String.fromCharCode.apply(null, buf.subarray(i, i + B));
          return btoa(s2);
        };
        return {
          center: await soi(window.__exportDataMwg, 'CENTER (so noi bo OPPO, 3 kenh)'),
          dataMwg: await soi(window.__exportDataMain, 'DATA MWG (so thi truong)'),
          centerGz: await nenB64(window.__exportDataMwg),
          dataMwgGz: await nenB64(window.__exportDataMain),
        };
      });
      // Gui kem so thi phan Share KA de dong luon vao goi ma hoa cua DB TG.
      // tg.html khong con fetch thang sheet nua (sheet da dong link cong khai).
      if (Array.isArray(shareKA) && shareKA.length) doGoiChung.shareKA = shareKA;
      const mb = (n) => (n == null ? '?' : (n / 1048576).toFixed(1) + ' MB');
      [doGoiChung.center, doGoiChung.dataMwg].forEach((x) => {
        if (!x || !x.co) return;
        log(`  do goi ${x.ten}: tho ${mb(x.tho)} -> nen ${mb(x.nen)}`);
      });
    } catch (e) {
      log('  -> khong do duoc kich thuoc goi: ' + e.message);
    }

    // doc bo rut TU DIA (repo da checkout) - tranh nhan ban cu tu bo nho dem cua Pages
    const BO_RUT = fs.readFileSync('scripts/build-app-data.js', 'utf8');
    log('chay bo trich xuat build-app-data.js');
    const data = await page.evaluate(async ([src, ka]) => {
      (0, eval)(src);
      if (typeof window.buildAppData !== 'function') throw new Error('khong nap duoc buildAppData');
      return window.buildAppData(window.__exportDataMwg, window.__exportDataMain, ka);
    }, [BO_RUT, shareKA]);

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

  var gtDS = await docGiaiTrinh();
  if (gtDS) data.gtAll = gtDS;
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

  // Ghi ket qua do kich thuoc goi DB TG. Day la CON SO KICH THUOC (byte), khong
  // phai so lieu kinh doanh, nen ghi thang vao repo public duoc.
  if (doGoiChung) {
    try {
      const mb = (n) => (n == null ? null : Math.round(n / 1048576 * 10) / 10);
      const gon = (x) => (!x || !x.co) ? { co: false } : {
        ten: x.ten, thoMB: mb(x.tho), nenMB: mb(x.nen),
        tiLeNen: x.nen ? Math.round(x.nen / x.tho * 1000) / 10 + '%' : null,
        truongNangNhat: (x.nangNhat || []).map(([k, n]) => k + ' ' + mb(n) + ' MB'),
      };
      fs.writeFileSync('data/do-goi-dbtg.json', JSON.stringify({
        doLuc: data.updated,
        ghiChu: 'Chi la kich thuoc (MB) de tinh buoc "DB TG doc goi ma hoa". Khong co so lieu kinh doanh.',
        center: gon(doGoiChung.center), dataMwg: gon(doGoiChung.dataMwg),
      }, null, 1));
      log('da ghi data/do-goi-dbtg.json');
    } catch (e) { log('khong ghi duoc ket qua do:', e.message); }
  }

  // Dong goi DB TG: nen (da lam trong trang) -> ma hoa -> data/dbtg-<id>.json
  if (doGoiChung && (doGoiChung.centerGz || doGoiChung.dataMwgGz)) {
    try {
      const { dongGoiDBTG } = await import('./build-dbtg-vault.mjs');
      const r = dongGoiDBTG(doGoiChung, {
        updated: data.updated, maxDay: data.maxDay, months: data.months,
      });
      log(`da dong goi DB TG: ${Math.round(r.bytes / 1024)} KB`);
    } catch (e) { log('CANH BAO: khong dong goi duoc DB TG:', String(e.message)); }
  } else {
    log('CANH BAO: khong co khoi nen nao — DB TG se van goi Apps Script nhu cu');
  }

  const kb = Math.round(fs.statSync(OUT).size / 1024);
  log(`XONG: ${data.sales.length} sale · ${data.all.shops} shop · thang ${data.months.join(',')}` +
      ` · ngay cuoi ${data.maxDay}/${data.months[data.months.length - 1]} · ${kb} KB`);
})();
