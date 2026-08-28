/* kiem-moc-giao-dien.mjs — FILE GIAO DIEN CON GIU DU MOC CHO LOP BAO MAT KHONG?
 *
 * DUNG CHO KHUNG GIAO DIEN, chay tren tg-thu.html trong luc dang lam.
 * KHONG can lop bao mat trong file. KHONG chay script. KHONG mang.
 *
 * VI SAO CAN:
 *   Anh Thai chot 28/08: khung giao dien lam xong het roi khung bao mat moi ghep
 *   vao. Diem yeu cua cach nay la TOI CUOI MOI BIET CO VO KHONG — lam ba ngay
 *   roi phat hien lop bao mat khong bam vao dau duoc nua thi rat dat.
 *
 *   Lop cat pham vi cho sale KHONG doc du lieu de biet phai giau gi. No bam vao
 *   CAU TRUC: id cua panel, class cua the, hai hang so kenh. Doi ten hay gom lai
 *   la no het bam duoc -> SALE NHIN THAY DU LIEU KENH KHAC, ma man hinh van dep,
 *   khong loi JS. Kieu hong im lang.
 *
 * CHAY:  node scripts/kiem-moc-giao-dien.mjs tg-thu.html [file-doi-chieu]
 *        file-doi-chieu mac dinh la tg.html (ban dang chay). Dung de DEM, khong
 *        chi hoi "con khong" — doi ten 90% the ma con sot 1 cai thi hoi "con
 *        khong" van tra loi CO. Do la lo hong that su cua ban dau tien file nay.
 *
 * DO KHONG DAT thi KHONG phai cam sua — chi la: bao khung bao mat biet de sua
 * __donManHinh cho khop TRUOC khi ghep. Bao som thi sua 5 phut.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.argv[2] || 'tg-thu.html';
const CHIEU = process.argv[3] || 'tg.html';   // file doi chieu de DEM
const KQ = [];
const ghi = (ten, dat, ct) => {
  KQ.push({ ten, dat: !!dat, ct: ct || '' });
  console.log((dat ? '  OK  ' : '  LOI ') + ten + (ct ? '  — ' + ct : ''));
};

const html = fs.readFileSync(FILE, 'utf8');
// runScripts KHONG bat: chi doc cau truc, khong chay gi cua trang
const doc = new JSDOM(html).window.document;
let docChieu = null;
try { docChieu = new JSDOM(fs.readFileSync(CHIEU, 'utf8')).window.document; } catch (e) {}
console.log('Doc      : ' + FILE + '  (' + Buffer.byteLength(html) + ' byte)');
console.log('Doi chieu: ' + (docChieu ? CHIEU : '(khong co — chi kiem CO/KHONG)') + '\n');

// ---------------------------------------------------------------- 1. id phai con
const ID = {
  'panel-overview': 'panel Tong quan — sale bi bo han phan nay',
  'panel-mwg': 'panel kenh MWG',
  'panel-ka': 'panel kenh KA — an voi nguoi khong phu trach',
  'panel-ind': 'panel kenh IND — an voi nguoi khong phu trach',
  'channel-program-mwg-result': 'the Chuong trinh MWG',
  'channel-program-ka-result': 'the Chuong trinh KA — an voi nguoi khong phu trach',
  'channel-program-ind-result': 'the Chuong trinh IND — an voi nguoi khong phu trach',
  'channel-program-total': 'tong chi phi CA VUNG — sale khong duoc thay',
  'channel-strategy-section': 'muc Chien luoc theo Kenh — co 3 the theo kenh',
  'loading-overlay': 'man hinh cho cua khoi CENTER — diem khoi dong bam vao',
  'mwg-loading-overlay': 'man hinh cho cua khoi DATA MWG — diem khoi dong bam vao',
};
const thieuId = Object.keys(ID).filter((k) => !doc.getElementById(k));
ghi('Con du 11 id ma lop bao mat bam vao', thieuId.length === 0,
  thieuId.length ? ('MAT: ' + thieuId.map((k) => k + ' (' + ID[k] + ')').join(' | '))
                 : 'du ca 11');

// ---------------------------------------------------------------- 2. selector phai con
const SEL = {
  '.chart-container': 'quet tung the, an the rong',
  'section.chart-row': 'an ca hang khi hang do het the',
  '[data-panel]': 'nut tab — an tab kenh khong phu trach',
  '.db-tg-tab': 'class cua nut tab',
  '.db-tg-panel': 'class cua panel',
  '.dashboard-container p': 'cau mo ta dau trang — viet lai theo pham vi',
};
Object.keys(SEL).forEach((s) => {
  const n = doc.querySelectorAll(s).length;
  const g = docChieu ? docChieu.querySelectorAll(s).length : 0;
  /* KHONG chi hoi "con khong". Doi ten 90% the ma sot 1 cai thi "con khong" van
     tra loi CO — lop bao mat se chi giau duoc 1 the, 90% con lai lo het.
     Nen phai DEM va so voi ban dang chay. Nguong de CHAT (tut qua 15% la bao)
     vi day la chuyen bao mat: bao thua thi mat 2 phut hoi nhau, bao thieu thi
     sale nhin thay so cua nguoi khac.
     Bao KHONG co nghia la lam sai — gom the lai la viec binh thuong cua giao dien.
     No chi co nghia: sua __donManHinh cho khop TRUOC khi ghep. */
  const tut = g > 0 && n < g * 0.85;
  ghi('Con selector  ' + s, n > 0 && !tut,
    (g ? (n + '/' + g + ' phan tu') : (n + ' phan tu'))
      + (tut ? '  <-- TUT MANH, nhieu the da doi ten' : '') + ' — ' + SEL[s]);
});

// Tab phai co ca class LAN data-panel tren CUNG mot phan tu
const tabDu = doc.querySelectorAll('.db-tg-tab[data-panel]').length;
ghi('Nut tab co ca .db-tg-tab lan [data-panel]', tabDu >= 4,
  tabDu + ' nut (can it nhat 4)');

// ---------------------------------------------------------------- 3. Chien luoc theo Kenh
{
  const cl = doc.getElementById('channel-strategy-section');
  const ten = cl ? [...cl.querySelectorAll('h4')].map((h) => (h.textContent || '').trim()) : [];
  const du = ['MWG', 'KA', 'IND'].filter((k) => ten.includes(k));
  ghi('Chien luoc theo Kenh: 3 the co <h4> ghi DUNG ten kenh', du.length === 3,
    'thay: ' + JSON.stringify(ten.slice(0, 6))
      + ' — lop bao mat tim the theo dung chu MWG / KA / IND trong h4');
}

// ---------------------------------------------------------------- 4. hang so trong JS
const JS = {
  'CHANNEL_GROUP_ORDER': 'thu tu kenh — 12+ cho lap theo no, thu hep tai day la moi cho tu dung',
  'CHANNEL_TARGETS': 'target theo kenh — nhan ti trong that cua tung nguoi vao day',
  'PRODUCT_TARGETS': 'target Reno16 — diem CHEN khoi thu hep pham vi',
  'computeSaleTargetAllocation': 'ham chia target theo ti trong',
};
Object.keys(JS).forEach((k) => {
  const n = (html.match(new RegExp(k, 'g')) || []).length;
  ghi('Con hang so/ham  ' + k, n > 0, n ? (n + ' lan — ' + JS[k]) : ('MAT — ' + JS[k]));
});

// CHANNEL_GROUP_ORDER phai la MANG khai bao mot lan — lop bao mat sua TAI CHO
ghi('CHANNEL_GROUP_ORDER van khai bao dang mang',
  /CHANNEL_GROUP_ORDER\s*=\s*\[/.test(html),
  'lop bao mat dung splice() sua tai cho, doi kieu la hong');

// ---------------------------------------------------------------- 5. diem ghep
const MOC = {
  'papaparse': 'diem chen khoi dang nhap / mo goi (ngay sau the papaparse)',
  'const PRODUCT_TARGETS = {': 'diem chen khoi thu hep pham vi',
  'function initDashboard(DATA) {': 'ham ve dashboard — diem khoi dong goi vao',
};
Object.keys(MOC).forEach((k) => {
  const n = html.split(k).length - 1;
  ghi('Con moc ghep  "' + k.slice(0, 34) + '"', n > 0, n + ' lan — ' + MOC[k]);
});
ghi('Con DU HAI ham initDashboard (hai khoi script)',
  (html.split('function initDashboard(DATA) {').length - 1) === 2,
  'CENTER mot khoi, DATA MWG mot khoi — diem khoi dong phai gan vao dung khoi cua no');

// Diem khoi dong: hoac con loadAndRender() tho, hoac da la __khoiDongDBTG
{
  const tho = (html.match(/^\s*loadAndRender\(\);\s*$/gm) || []).length;
  const daGhep = (html.match(/window\.__khoiDongDBTG\(initDashboard/g) || []).length;
  ghi('Con 2 diem khoi dong de gan vao', tho === 2 || daGhep === 2,
    'loadAndRender() tho: ' + tho + ' · da ghep: ' + daGhep + ' (can mot trong hai bang 2)');
}

// ---------------------------------------------------------------- 6. bang tuan
ghi('Bang tuan nho: con dung duoc',
  /rowHtml\('MWG'/.test(html) || /dongKenh\.map/.test(html),
  /dongKenh\.map/.test(html) ? 'da lap theo CHANNEL_GROUP_ORDER (tot)'
                             : 'con viet cung 3 dong — lop bao mat se doi thanh lap theo hang so');

const hong = KQ.filter((x) => !x.dat);
console.log('\n=== KET LUAN (moc giao dien) ===');
console.log('So phep kiem :', KQ.length);
console.log('Khong dat    :', hong.length);
if (hong.length) {
  console.log('\nKHONG PHAI CAM SUA. Chi la: bao khung bao mat biet de sua __donManHinh');
  console.log('cho khop TRUOC khi ghep. Bao som thi sua 5 phut, de toi cuoi thi rat dat.\n');
  hong.forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x.ten + '\n     ' + x.ct));
}
process.exit(hong.length ? 1 : 0);
