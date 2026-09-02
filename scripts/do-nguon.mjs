/**
 * DO NGUON — buoc kiem RE dat truoc buoc dung lai goi.
 *
 * VI SAO CO (02/09):
 *   Truoc day robot chi chay 1 lan/ngay luc 10h. Anh Thai nhap so luc 22h thi
 *   DB TG dung yen toi 10h sang hom sau. Muon nhay som thi phai chay day hon —
 *   nhung moi lan chay la mo Playwright, doi DB TG tinh xong, ton 15-40 phut.
 *   Chay day ma lan nao cung lam du thi dot sach han muc Actions.
 *
 *   File nay hoi Apps Script mot cau duy nhat: sheet dang co bao nhieu dong?
 *   (mode=info -> {lastRow,lastColumn}). Mat ~2 giay. Bang voi lan dung goi
 *   gan nhat -> thoat, khong dung gi ca.
 *
 * KHONG SO SANH maxDay o day: muon biet maxDay thi phai tai va tinh ca bang —
 * dung dung thu can tranh. So dong la dai dien du tot: co ngay ban moi thi
 * chac chan co dong moi.
 *
 * DAU RA:
 *   - GITHUB_OUTPUT: co_moi=1|0  (0 = khong co gi moi, bo qua cac buoc sau)
 *   - /tmp/moc-nguon-moi.json    (chi ghi vao data/ SAU khi dung goi thanh cong)
 *
 * KHONG CHAN NHAM: bat ky truong hop nghi ngo nao — chua co moc cu, goi Apps
 * Script that bai, doc so khong duoc — deu tra co_moi=1 de robot cu chay.
 * Tha chay thua con hon bo sot mot ngay so lieu.
 */
import fs from 'node:fs';
import path from 'node:path';

const AS_URL = process.env.APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwmfOzNub6Ao6jmdc6RsIu1P1162aYXfB_ib25RuVByIIWI-aqFoVvINWZMM5FAI15n/exec';
const KEY = process.env.AS_KEY || '';
const SHEETS = ['CENTER', 'DATA MWG'];
const MOC_CU = path.join('data', 'moc-nguon.json');
const MOC_MOI = '/tmp/moc-nguon-moi.json';

const log = (...a) => console.log('[do-nguon]', ...a);

function ra(coMoi, vi) {
  log(coMoi ? `CO SO MOI -> chay tiep (${vi})` : `KHONG co gi moi -> bo qua (${vi})`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `co_moi=${coMoi ? 1 : 0}\n`);
  }
  process.exit(0);
}

async function hoiMotSheet(ten) {
  const u = `${AS_URL}?sheet=${encodeURIComponent(ten)}&mode=info` +
            (KEY ? `&key=${encodeURIComponent(KEY)}` : '');
  const ac = new AbortController();
  const hen = setTimeout(() => ac.abort(), 60000);
  try {
    const r = await fetch(u, { signal: ac.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j && j.error) throw new Error(String(j.error).slice(0, 120));
    const n = Number(j && j.lastRow);
    if (!Number.isFinite(n) || n <= 0) throw new Error('lastRow khong hop le: ' + JSON.stringify(j).slice(0, 120));
    return n;
  } finally {
    clearTimeout(hen);
  }
}

/* BAM TAY LA CHAY, KHONG DO GI CA.
   Nut "Lam moi ngay" tren DB TG va nut Run workflow tren GitHub deu vao day.
   Anh Thai bam la vi anh vua sua so va muon thay ngay — de buoc do chan lai
   thi nut thanh vo dung: sua cong thuc / sua nhan ma khong them dong nao thi
   so dong khong doi, buoc do se bao "khong co gi moi" roi bo qua.
   Luu y: cai nay KHAC voi FORCE. FORCE=1 con tat ca chot chan "so lieu tut
   lui" ben refresh-app-data.mjs — chot do phai giu, chi bo khi thuc su co y. */
if (process.env.SU_KIEN === 'workflow_dispatch') ra(true, 'bam tay (workflow_dispatch)');
if (process.env.FORCE === '1') ra(true, 'FORCE=1');

let cu = null;
try { cu = JSON.parse(fs.readFileSync(MOC_CU, 'utf8')); } catch { /* chua co */ }
if (!cu || !cu.sheets) ra(true, 'chua co moc cu');

const moi = { doLuc: new Date().toISOString(), sheets: {} };
for (const s of SHEETS) {
  try {
    moi.sheets[s] = await hoiMotSheet(s);
    log(`${s}: ${moi.sheets[s]} dong (cu: ${cu.sheets[s] ?? '-'})`);
  } catch (e) {
    ra(true, `khong hoi duoc sheet "${s}": ${e.message}`);
  }
}
fs.writeFileSync(MOC_MOI, JSON.stringify(moi, null, 1));

for (const s of SHEETS) {
  if (moi.sheets[s] !== cu.sheets[s]) ra(true, `sheet "${s}" doi so dong`);
}
ra(false, 'ca hai sheet giu nguyen so dong');
