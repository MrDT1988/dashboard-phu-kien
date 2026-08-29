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
import zlib from 'node:zlib';
import { catPhamVi } from './pham-vi-dbtg.mjs';

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
 * @param {{centerGz:string, dataMwgGz:string, shareKA?:any[]}} goi
 *        hai khoi da nen gzip dang base64, va (tuy chon) cac dong tho cua
 *        sheet "Share KA" — robot lay qua Apps Script, chua nen.
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

  /* SO THI PHAN FPT + VIETTEL (sheet "Share KA").
     Truoc day tg.html fetch thang sheet qua duong gviz cong khai, nen sheet phai
     de che do "ai co link cung xem duoc". Anh Thai dong link do lai 29/08 ->
     bang thi phan trong. Nay dong luon vao goi ma hoa: sheet giu kin, ma bang
     van co so. Chi bo vao goi cua nguoi DUOC XEM KENH KA. */
  const shareKaGz = (Array.isArray(goi.shareKA) && goi.shareKA.length > 5)
    ? zlib.gzipSync(Buffer.from(JSON.stringify(goi.shareKA), 'utf8'))
    : null;
  if (shareKaGz) log(`co so thi phan Share KA: ${goi.shareKA.length} dong -> ${mb(shareKaGz.length)} (da nen)`);
  else log('khong co so thi phan Share KA trong lan chay nay');

  fs.mkdirSync(OUTDIR, { recursive: true });

  // Ten file ngau nhien -> nhin danh sach file trong repo khong doan duoc gi.
  // Ten cu bi xoa di cho khoi rac; con tro nam trong dbtg-index.json.
  let idCu = [];
  try {
    const cu0 = JSON.parse(fs.readFileSync(path.join(OUTDIR, 'dbtg-index.json'), 'utf8'));
    idCu = (cu0.users || []).map((u) => u.id).concat(cu0.id ? [cu0.id] : []);
  } catch { /* lan dau */ }

  // ---------- CHANG B: moi nguoi mot goi rieng, da CAT PHAM VI ----------
  // Bung nen ra de cat, roi nen lai tung goi. Ton them vai giay CPU cua robot,
  // doi lai moi nguoi chi tai ve dung phan cua ho.
  const A = JSON.parse(zlib.gunzipSync(center).toString('utf8'));
  const Bm = dataMwg.length ? JSON.parse(zlib.gunzipSync(dataMwg).toString('utf8')) : null;

  const nguoi = [];
  if (ma.admin && ma.admin.pin) {
    nguoi.push({ ten: ma.admin.ten || 'Toàn Tiền Giang', vaiTro: 'admin', pin: ma.admin.pin, ai: { vaiTro: 'admin' } });
  }
  for (const [kenh, v] of Object.entries(ma.leader || {})) {
    const p = (typeof v === 'string') ? v : v.pin;
    if (p) nguoi.push({ ten: 'Leader ' + kenh, vaiTro: 'leader', pin: p, ai: { vaiTro: 'leader', kenh } });
  }
  // Ten sale anh Thai go tay -> co the thua khoang trang / khac hoa thuong / thieu dau
  const tenThat = [...new Set((A.store_rows || []).map((r) => r.sale).filter(Boolean))];
  const chuan = (x) => String(x || '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
  const khongDau = (x) => chuan(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D');
  const mapC = {}, mapK = {};
  tenThat.forEach((n) => { mapC[chuan(n)] = n; const k = khongDau(n);
    mapK[k] = (mapK[k] === undefined || mapK[k] === n) ? n : null; });
  const doiTen = (x) => mapC[chuan(x)] || mapK[khongDau(x)] || null;
  for (const [ten, p] of Object.entries(ma.sales || {})) {
    const that = doiTen(ten);
    if (!that) { log(`BO QUA sale "${ten}": khong khop ten nao trong du lieu`); continue; }
    nguoi.push({ ten: that, vaiTro: 'sale', pin: p, ai: { vaiTro: 'sale', sales: [that] } });
  }

  const danhSach = [];
  let tongByte = 0;
  for (const ng of nguoi) {
    if (!ng.pin) { log(`BO QUA "${ng.ten}": chua co ma`); continue; }
    let cat;
    try { cat = catPhamVi(A, Bm, ng.ai); }
    catch (e) { log(`BO QUA "${ng.ten}": cat pham vi loi — ${e.message}`); continue; }
    if (ng.vaiTro !== 'admin' && (!cat.center.store_rows || !cat.center.store_rows.length)) {
      log(`BO QUA "${ng.ten}": khong co shop nao trong pham vi`); continue;
    }
    const gzA = zlib.gzipSync(Buffer.from(JSON.stringify(cat.center), 'utf8'));
    const gzB = cat.dataMwg ? zlib.gzipSync(Buffer.from(JSON.stringify(cat.dataMwg), 'utf8')) : null;
    const id2 = crypto.randomBytes(8).toString('hex');
    // Admin xem ca 3 kenh; leader chi xem kenh cua minh. Chi ai co kenh KA moi
    // duoc nhan so thi phan — dung nguyen tac "chi giao dung phan cua ho".
    const xemKA = ng.vaiTro === 'admin' || (ng.ai && ng.ai.kenh === 'KA');
    fs.writeFileSync(path.join(OUTDIR, 'dbtg-' + id2 + '.json'), JSON.stringify({
      center: maHoaBytes(gzA, ng.pin),
      dataMwg: gzB ? maHoaBytes(gzB, ng.pin) : null,
      shareKa: (shareKaGz && xemKA) ? maHoaBytes(shareKaGz, ng.pin) : null,
    }));
    const co2 = fs.statSync(path.join(OUTDIR, 'dbtg-' + id2 + '.json')).size;
    tongByte += co2;
    danhSach.push({ id: id2, n: ng.ten, r: ng.vaiTro });
    const tk = cat.thongKe || {};
    log(`  ${ng.vaiTro.padEnd(6)} ${ng.ten} — ${tk.nguyenBan ? 'toan bo' :
      (tk.shopCENTER + ' shop' + (tk.shopMWG ? ' (MWG ' + tk.shopMWG + ')' : ''))} — ${mb(co2)}`);
  }
  if (!danhSach.length) throw new Error('khong tao duoc goi nao');

  // Con tro CONG KHAI: chi co ten file + ten hien thi + vai tro. Khong mot con so kinh doanh nao.
  const idsCu = new Set(idCu || []);
  fs.writeFileSync(path.join(OUTDIR, 'dbtg-index.json'), JSON.stringify({
    updated: moc.updated, maxDay: moc.maxDay, months: moc.months, it: VONG, users: danhSach,
  }));
  // Xoa goi cu cho khoi rac
  idsCu.forEach((x) => {
    if (!danhSach.some((u) => u.id === x)) {
      try { fs.rmSync(path.join(OUTDIR, 'dbtg-' + x + '.json'), { force: true }); } catch { /* */ }
    }
  });

  log(`goi DB TG: ${danhSach.length} nguoi, tong ${mb(tongByte)}`);
  return { soNguoi: danhSach.length, bytes: tongByte };
}
