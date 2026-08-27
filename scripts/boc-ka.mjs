/* boc-ka.mjs — giai ma data/probe-ka.json roi ghi ra ban TOM TAT KHONG ma hoa.
 * KHONG mo DB TG, khong dung Apps Script — chi doc file da co san trong repo.
 *
 * Ban tom tat CHI chua thong tin ve CAU TRUC (ten bang, ten cot, so dong),
 * TUYET DOI khong chua so lieu kinh doanh — vi repo la public.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const log = (...a) => console.log('[boc-ka]', ...a);

const blob = JSON.parse(fs.readFileSync('data/probe-ka.json', 'utf8'));
const pin = JSON.parse(process.env.SALE_CODES || '{}').admin.pin;
const key = crypto.pbkdf2Sync(String(pin), Buffer.from(blob.salt, 'base64'), blob.it, 32, 'sha256');
const ct = Buffer.from(blob.ct, 'base64');
const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'));
d.setAuthTag(ct.subarray(ct.length - 16));
const kq = JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString('utf8'));

// ---- chi giu phan CAU TRUC, bo het gia tri
const ra = { nguon: kq.nguon || {}, kenh: Object.keys(kq.kenh || {}), ungVien: [] };
(kq.ungVien || []).forEach((x) => {
  const t = x.ta || {};
  ra.ungVien.push({
    nguon: x.nguon, khoa: x.khoa, viSao: x.viSao || null,
    kieu: t.kieu, soDong: t.soDong, soKhoa: t.soKhoa,
    dangDong: t.dangDong, soCot: t.soCot,
    cot: t.cot || null,                 // TEN cot — khong phai gia tri
    khoaDau: (t.khoa || []).slice(0, 20),
  });
});

fs.writeFileSync('data/probe-ka-cautruc.json', JSON.stringify(ra, null, 1));
log('da ghi data/probe-ka-cautruc.json');
log('so nguon:', Object.keys(ra.nguon).length, '| so ung vien:', ra.ungVien.length);
