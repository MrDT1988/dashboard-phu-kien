/* probe-ka.mjs — DO THAM sheet "share KA" trong DB TG.
 * Muc dich: xem tg.html co day sheet share KA ra window.__exportData... hay khong,
 * va neu co thi cau truc tung dong the nao (cot gi, hang gi, theo thang hay khong).
 * Khong ghi de bat ky so lieu nao. Ket qua ghi ra file DA MA HOA vi repo la public.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';

const SITE = process.env.SITE_URL || 'https://mrdt1988.github.io/dashboard-phu-kien';
const NAP_TRANG = 180000, CHO_DU_LIEU = 1500000;
const log = (...a) => console.log('[probe-ka]', ...a);

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  log('mo', SITE + '/tg.html');
  await page.goto(`${SITE}/tg.html?ci=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: NAP_TRANG });
  log('doi trang tinh xong...');
  await page.waitForFunction(
    () => !!(window.__exportDataMwg && window.__exportDataMwg.crosstab && window.__exportDataMwg.crosstab.length),
    null, { timeout: CHO_DU_LIEU, polling: 3000 });
  await page.waitForTimeout(10000);

  const kq = await page.evaluate(() => {
    const RE_KA = /ka|share|fpt|viettel|cellphone|the ?gioi ?di ?dong|dien ?may/i;

    // Mo ta ngan gon 1 gia tri bat ky: kieu, kich thuoc, vai mau
    function taKieu(v, sauMau) {
      if (v === null || v === undefined) return { kieu: 'rong' };
      if (Array.isArray(v)) {
        const o = { kieu: 'mang', soDong: v.length };
        if (v.length) {
          const d = v[0];
          if (Array.isArray(d)) { o.dangDong = 'mang'; o.soCot = d.length; }
          else if (d && typeof d === 'object') { o.dangDong = 'object'; o.cot = Object.keys(d); }
          else o.dangDong = typeof d;
          if (sauMau) o.mau = v.slice(0, 3);
        }
        return o;
      }
      if (typeof v === 'object') {
        const k = Object.keys(v);
        const o = { kieu: 'object', soKhoa: k.length, khoa: k.slice(0, 25) };
        if (sauMau && k.length) {
          const k0 = k[0];
          o.mauKhoa = k0;
          o.mauGiaTri = taKieu(v[k0], false);
          try { o.mauJson = JSON.stringify(v[k0]).slice(0, 600); } catch (e) {}
        }
        return o;
      }
      return { kieu: typeof v, giaTri: String(v).slice(0, 120) };
    }

    const ra = { nguon: {}, ungVien: [] };
    ['__exportDataMwg', '__exportDataMain', '__exportDataKa', '__exportDataShare'].forEach((ten) => {
      const W = window[ten];
      if (!W || typeof W !== 'object') return;
      const khoa = Object.keys(W);
      ra.nguon[ten] = khoa.map((k) => {
        const t = taKieu(W[k], false);
        return k + '  [' + t.kieu + (t.soDong !== undefined ? ' ' + t.soDong + ' dong' : '') +
          (t.soKhoa !== undefined ? ' ' + t.soKhoa + ' khoa' : '') + ']';
      });
      // khoa nao nghi la share KA thi mo ra xem ky
      khoa.forEach((k) => {
        if (!RE_KA.test(k)) return;
        ra.ungVien.push({ nguon: ten, khoa: k, ta: taKieu(W[k], true) });
      });
    });

    // Quet them: bang nao co truong chua ten hang doi thu -> co the la bang share
    ['__exportDataMwg', '__exportDataMain'].forEach((ten) => {
      const W = window[ten]; if (!W) return;
      Object.keys(W).forEach((k) => {
        const v = W[k];
        if (!Array.isArray(v) || !v.length) return;
        const d0 = v[0];
        if (!d0 || typeof d0 !== 'object' || Array.isArray(d0)) return;
        const cot = Object.keys(d0).join(' ').toLowerCase();
        const vals = JSON.stringify(v.slice(0, 40)).toLowerCase();
        if (/fpt|viettel|cellphone/.test(cot) || /fpt|viettel|cellphone/.test(vals)) {
          if (!ra.ungVien.some((x) => x.nguon === ten && x.khoa === k))
            ra.ungVien.push({ nguon: ten, khoa: k, ta: taKieu(v, true), viSao: 'co ten doi thu trong du lieu' });
        }
      });
    });

    // Kenh nao dang co trong bang ban hang — de biet ten kenh KA ghi the nao
    const kenh = {};
    ((window.__exportDataMwg || {}).crosstab || []).forEach((r) => { if (r.channel) kenh[r.channel] = (kenh[r.channel] || 0) + 1; });
    ra.kenh = kenh;

    return ra;
  });

  log('=== CAC KHOA CO TRONG TUNG NGUON ===');
  Object.keys(kq.nguon).forEach((ten) => {
    log('--- ' + ten + ' (' + kq.nguon[ten].length + ' khoa)');
    kq.nguon[ten].forEach((x) => log('   ' + x));
  });
  log('');
  log('kenh trong bang ban hang:', JSON.stringify(kq.kenh));
  log('');
  log('=== UNG VIEN LA SHEET SHARE KA: ' + kq.ungVien.length + ' ===');
  kq.ungVien.forEach((x, i) => {
    log((i + 1) + '. ' + x.nguon + '.' + x.khoa + (x.viSao ? '  (' + x.viSao + ')' : ''));
    log('   ' + JSON.stringify(x.ta).slice(0, 900));
  });
  if (!kq.ungVien.length)
    log('KHONG THAY. Nhieu kha nang Apps Script chua day sheet "share KA" ra bien export ->'
      + ' phai bo sung ben Apps Script truoc, app khong tu doc duoc.');

  // Ban day du, ma hoa (repo public)
  try {
    const pin = JSON.parse(process.env.SALE_CODES || '{}').admin.pin;
    const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), it = 200000;
    const key = crypto.pbkdf2Sync(String(pin), salt, it, 32, 'sha256');
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(JSON.stringify(kq), 'utf8'), c.final(), c.getAuthTag()]);
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync('data/probe-ka.json', JSON.stringify({
      it, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'),
    }));
    log('da ghi data/probe-ka.json (ma hoa)');
  } catch (e) { log('CANH BAO: khong ghi duoc file do tham:', String(e.message)); }
} finally {
  await browser.close();
}
