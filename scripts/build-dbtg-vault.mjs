/* build-dbtg-vault.mjs — DONG GOI DU LIEU DB TG THANH FILE MA HOA.
 *
 * VI SAO:
 *   DB TG dang goi Apps Script moi lan mo -> keo 152k dong -> vai phut, tung treo.
 *   Va bat ky ai co duong /exec deu keo duoc (da bit bang chia khoa 27/08).
 *   Cach dut diem: robot tinh san 1 lan/ngay, nen + ma hoa, DB TG chi tai ve va mo.
 *
 * DA DO THAT (27/08):
 *   CENTER    6,0 MB tho -> 0,5 MB nen
 *   DATA MWG 21,8 MB tho -> 2,2 MB nen
 *   Cong 2,7 MB — tai trong 2-3 giay.
 *
 * THU TU DUNG: NEN TRUOC ROI MOI MA HOA.
 *   Ma hoa xong thi du lieu thanh ngau nhien, nen khong con an thua gi.
 *
 * Ma mo goi lay tu SALE_CODES.admin.pin — KHONG bao gio nam trong repo,
 * KHONG bao gio in ra man hinh chay.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const VONG = Number(process.env.KDF_ITER || 600000);
const OUTDIR = process.env.VAULT_DIR || 'data';
const log = (...a) => console.log('[dbtg]', ...a);
const mb = (n) => (n / 1048576).toFixed(2) + ' MB';

/** Ma hoa mot khoi BYTE da nen. Cung cach voi app: PBKDF2-SHA256 -> AES-256-GCM. */
function maHoaBytes(buf, pin) {
  const muoi = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const khoa = crypto.pbkdf2Sync(String(pin), muoi, VONG, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', khoa, iv);
  const ct = Buffer.concat([c.update(buf), c.final()]);
  return {
    v: 1, kdf: 'PBKDF2-SHA256', it: VONG, alg: 'AES-256-GCM', nen: 'gzip',
    salt: muoi.toString('base64'),
    iv: iv.toString('base64'),
    // Web Crypto doi ciphertext va the xac thuc dinh lien nhau
    ct: Buffer.concat([ct, c.getAuthTag()]).toString('base64'),
  };
}

/**
 * @param {{centerGz:string, dataMwgGz:string}} goi  hai khoi da nen gzip, dang base64
 * @param {{updated:string, maxDay:number, months:number[]}} moc
 */
export function dongGoiDBTG(goi, moc) {
  let ma;
  try { ma = JSON.parse(process.env.SALE_CODES || ''); }
  catch { throw new Error('chua dat SALE_CODES (hoac sai dinh dang JSON)'); }
  const pin = ma.admin && ma.admin.pin;
  if (!pin) throw new Error('SALE_CODES khong co admin.pin');

  const center = Buffer.from(goi.centerGz || '', 'base64');
  const dataMwg = Buffer.from(goi.dataMwgGz || '', 'base64');
  if (!center.length && !dataMwg.length) throw new Error('ca hai khoi deu rong');

  fs.mkdirSync(OUTDIR, { recursive: true });

  // Ten file ngau nhien -> nhin danh sach file trong repo khong doan duoc gi.
  // Ten cu bi xoa di cho khoi rac; con tro nam trong dbtg-index.json.
  let idCu = null;
  try { idCu = JSON.parse(fs.readFileSync(path.join(OUTDIR, 'dbtg-index.json'), 'utf8')).id; }
  catch { /* lan dau */ }

  const id = crypto.randomBytes(8).toString('hex');
  const noi = {
    center: center.length ? maHoaBytes(center, pin) : null,
    dataMwg: dataMwg.length ? maHoaBytes(dataMwg, pin) : null,
  };
  const duong = path.join(OUTDIR, 'dbtg-' + id + '.json');
  fs.writeFileSync(duong, JSON.stringify(noi));

  // Con tro CONG KHAI: chi co ten file + moc thoi gian. Khong mot con so kinh doanh nao.
  fs.writeFileSync(path.join(OUTDIR, 'dbtg-index.json'), JSON.stringify({
    id, updated: moc.updated, maxDay: moc.maxDay, months: moc.months, it: VONG,
  }));

  if (idCu && idCu !== id) {
    try { fs.rmSync(path.join(OUTDIR, 'dbtg-' + idCu + '.json'), { force: true }); }
    catch { /* khong sao */ }
  }

  const co = fs.statSync(duong).size;
  log(`goi DB TG: center ${mb(center.length)} + dataMwg ${mb(dataMwg.length)} (da nen)` +
      ` -> file ma hoa ${mb(co)}`);
  return { id, bytes: co };
}
