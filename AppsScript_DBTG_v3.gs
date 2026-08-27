/**
 * ===================================================================
 * Apps Script DB TG — CHECKPOINT NEN + CHIA MANH + CHIA KHOA
 * ===================================================================
 *
 * VI SAO PHAI SUA:
 *   File checkpoint_DATA_MWG.json da phinh len 23 MB. Apps Script co gang
 *   tra ca file trong MOT lan qua redirect -> hong (tra ve 404) -> dashboard
 *   tuong la "chua co checkpoint" -> quay ra tai lai tu dong 1 cua sheet
 *   152.585 dong -> treo, khong load duoc.
 *
 * CACH SUA:
 *   Nen gzip (23 MB con khoang 2 MB) roi cat thanh nhieu manh nho.
 *   Dashboard tai tung manh, ghep lai roi giai nen. Khong manh nao du lon
 *   de lam hong duong truyen.
 *
 * CAM KET AN TOAN:
 *   - KHONG xoa, KHONG sua bat ky dong du lieu nao trong sheet.
 *   - KHONG xoa file checkpoint cu. No van nam nguyen lam duong lui.
 *   - MOI che do cu (info / data / checkpoint) giu nguyen hoat dong 100%.
 *     Chi THEM che do moi. Neu ban moi co van de, dashboard van chay duoc
 *     nhu truoc.
 *
 * CACH DUNG:
 *   Ban da chay chuyenDoiCheckpoint roi thi KHONG can chay lai.
 *   File nay chi THEM ham lietKeSheet so voi ban truoc.
 *
 *   1. Dan toan bo file nay de len code cu, roi Luu.
 *   2. Trien khai lai (Deploy > Manage deployments > sua > Deploy) de ban moi co hieu luc.
 *   3. Chon ham  taoChiaKhoaMoi  o thanh tren, bam Chay (Run).
 *   4. Mo Nhat ky thuc thi (Execution log), CHEP chia khoa hien ra.
 *      -> Dan vao GitHub Secret ten AS_KEY, va dan vao DB TG khi no hoi.
 *
 *   Dan file nay len MA CHUA chay taoChiaKhoaMoi thi khong doi gi ca —
 *   moi thu chay y nhu cu. Cong chi dong lai sau khi co chia khoa.
 *   Muon mo lai: chay xoaChiaKhoa().
 * ===================================================================
 */

// Moi manh toi da 3 trieu ky tu base64 (~3 MB). Du nho de khong vo duong truyen.
var CP_MANH_KY_TU = 3000000;


/* ==================== CHIA KHOA ====================
   VAN DE: dia chi /exec nay nam trong tg.html dang o tren GitHub Pages CONG KHAI.
   Da do thu 27/08: nguoi la KHONG dang nhap van goi duoc va lay ve toan bo sheet.
   Khoa Google Sheet lai KHONG bit duoc cho nay, vi Apps Script chay duoi quyen
   chu so huu nen no van doc sheet binh thuong roi tra ra cho bat ky ai hoi.

   CACH BIT: doi mot chia khoa o moi yeu cau. Chia khoa cat trong Script Properties,
   KHONG nam trong repo, KHONG nam trong file nay.

   DUONG LUI AN TOAN: neu CHUA dat chia khoa thi moi thu chay y nhu cu.
   Dan file nay len KHONG lam hong gi ca. Chi khi ban chay taoChiaKhoaMoi()
   thi cong moi dong lai. */
function _khoaDung_(p) {
  var k = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!k) return true;                       // chua dat -> chay nhu cu
  return String((p && p.key) || '') === k;
}
function _tuChoi_() {
  return ContentService.createTextOutput(JSON.stringify({
    error: 'Tu choi: thieu hoac sai chia khoa.'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * CHAY TAY 1 LAN. Tu sinh mot chia khoa ngau nhien, luu vao Script Properties,
 * roi in ra Nhat ky thuc thi de ban chep.
 *
 * Chay xong, chep chia khoa vao HAI cho:
 *   1. GitHub > Settings > Secrets and variables > Actions > bien moi ten AS_KEY
 *   2. Dashboard DB TG se hoi mot lan roi nho tren may ban
 *
 * Muon mo lai cong nhu cu: chay xoaChiaKhoa().
 */
function taoChiaKhoaMoi() {
  var bang = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  var k = '';
  for (var i = 0; i < 40; i++) k += bang.charAt(Math.floor(Math.random() * bang.length));
  PropertiesService.getScriptProperties().setProperty('API_KEY', k);
  Logger.log('CHIA KHOA MOI (chep dong duoi, khong chup man hinh gui ai):');
  Logger.log(k);
  Logger.log('Da luu. Tu gio moi yeu cau phai kem &key=<chia khoa> moi duoc tra loi.');
}
function xoaChiaKhoa() {
  PropertiesService.getScriptProperties().deleteProperty('API_KEY');
  Logger.log('Da xoa chia khoa. Cong mo lai nhu cu.');
}
function kiemTraChiaKhoa() {
  var k = PropertiesService.getScriptProperties().getProperty('API_KEY');
  Logger.log(k ? ('Dang CO chia khoa, dai ' + k.length + ' ky tu. Cong dang DONG.')
               : 'CHUA co chia khoa. Cong dang MO cho tat ca.');
}


/* ==================== WEB APP: doGet ==================== */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!_khoaDung_(p)) return _tuChoi_();
  var SHEET_NAME = p.sheet || 'DATA MWG';
  var mode = p.mode || 'data';

  // ---------- CHE DO MOI ----------
  if (mode === 'cpmeta') return jsonOutput_(docMeta_(SHEET_NAME));
  if (mode === 'cpart')  return textOutput_(docManh_(SHEET_NAME, parseInt(p.i || '0', 10)));

  // ---------- CHE DO CU: giu nguyen ----------
  if (mode === 'checkpoint') return getCheckpoint_(SHEET_NAME);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return jsonOutput_({ error: 'Không tìm thấy sheet tên "' + SHEET_NAME + '"' });

  var numColumns = sheet.getLastColumn();
  if (mode === 'info') return jsonOutput_({ lastRow: sheet.getLastRow(), lastColumn: numColumns });

  var lastRow = sheet.getLastRow();
  var start = parseInt(p.start || '1', 10);
  var count = parseInt(p.count || '15000', 10);
  var actualCount = Math.min(count, lastRow - start + 1);
  if (actualCount <= 0) return jsonOutput_([]);

  return jsonOutput_(sheet.getRange(start, 1, actualCount, numColumns).getValues());
}


/* ==================== WEB APP: doPost ==================== */
function doPost(e) {
  try {
    if (!_khoaDung_((e && e.parameter) || {})) return _tuChoi_();
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'saveCheckpoint') {
      return saveCheckpoint_(body.sheet, body.dataJson, body.lastProcessedRow);
    }
    return jsonOutput_({ error: 'Unknown action: ' + body.action });
  } catch (err) {
    return jsonOutput_({ error: 'Lỗi xử lý yêu cầu lưu checkpoint: ' + err.message });
  }
}


/* ==================== CHAY TAY 1 LAN ==================== */
/**
 * Doc file checkpoint 23 MB dang co, nen lai va cat thanh manh.
 * File cu VAN GIU NGUYEN, khong bi xoa.
 * Chay xong xem Nhat ky thuc thi de biet ket qua.
 */
function chuyenDoiCheckpoint() {
  var sheetName = 'DATA MWG';
  var tenCu = getCheckpointFileName_(sheetName);
  var f = timFile_(tenCu);
  if (!f) throw new Error('Khong tim thay file "' + tenCu + '" tren Drive.');

  Logger.log('Dang doc ' + tenCu + ' (' + Math.round(f.getSize() / 1048576) + ' MB)...');
  var noiDung = f.getBlob().getDataAsString();
  var o = JSON.parse(noiDung);
  if (!o || !o.data) throw new Error('File checkpoint cu khong co truong "data".');

  var chuoi = JSON.stringify(o.data);
  var kq = nenVaChia_(sheetName, chuoi, o.lastProcessedRow, o.savedAt);

  Logger.log('XONG.');
  Logger.log('  Goc      : ' + chuoi.length.toLocaleString() + ' ky tu (~'
    + (chuoi.length / 1048576).toFixed(1) + ' MB)');
  Logger.log('  Sau nen  : ' + kq.tongKyTu.toLocaleString() + ' ky tu base64 (~'
    + (kq.tongKyTu / 1048576).toFixed(1) + ' MB)');
  Logger.log('  Ti le    : giam ' + (100 - kq.tongKyTu / chuoi.length * 100).toFixed(0) + '%');
  Logger.log('  So manh  : ' + kq.soManh);
  Logger.log('  File cu vẫn còn nguyên, không bị xoá.');
  return kq;
}

/**
 * Liet ke moi sheet trong file nay kem so dong / so cot va dong tieu de.
 * Chay tay: chon ham nay o thanh tren -> Chay -> mo Nhat ky thuc thi.
 * CHI DOC, khong sua khong xoa gi. Chay xong trong 1-2 giay.
 */
function lietKeSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('FILE: ' + ss.getName());
  Logger.log('----------------------------------------');
  var ds = ss.getSheets();
  ds.forEach(function (sh, i) {
    var d = sh.getLastRow(), c = sh.getLastColumn();
    Logger.log((i + 1) + '. "' + sh.getName() + '"  —  ' + d + ' dong x ' + c + ' cot');
    if (d > 0 && c > 0) {
      try {
        var td = sh.getRange(1, 1, 1, Math.min(c, 12)).getValues()[0]
          .map(function (x) { return String(x).slice(0, 22); }).join(' | ');
        Logger.log('     tieu de: ' + td);
      } catch (e) { Logger.log('     (khong doc duoc dong tieu de)'); }
    }
  });
  Logger.log('----------------------------------------');
  Logger.log('Tong: ' + ds.length + ' sheet');
}

/** Kiem tra nhanh: ban moi da san sang chua. Chay tay, xem Nhat ky. */
function kiemTraCheckpointMoi() {
  var m = docMeta_('DATA MWG');
  Logger.log(JSON.stringify(m, null, 2));
  if (m && m.co) {
    var d = docManh_('DATA MWG', 0);
    Logger.log('Manh 0 doc thu: ' + d.length.toLocaleString() + ' ky tu.');
  }
  return m;
}


/* ==================== BEP NUC ==================== */
function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function textOutput_(s) {
  return ContentService.createTextOutput(s || '')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getCheckpointFileName_(sheetName) {
  return 'checkpoint_' + sheetName.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
}
function tenGoc_(sheetName) {
  return 'checkpoint_' + sheetName.replace(/[^a-zA-Z0-9]/g, '_');
}
function tenMeta_(sheetName) { return tenGoc_(sheetName) + '__meta.json'; }
function tenManh_(sheetName, i) { return tenGoc_(sheetName) + '__gz_' + ('00' + i).slice(-3); }

function timFile_(ten) {
  var it = DriveApp.getFilesByName(ten);
  return it.hasNext() ? it.next() : null;
}
function ghiFile_(ten, noiDung) {
  var f = timFile_(ten);
  if (f) { f.setContent(noiDung); return f; }
  return DriveApp.createFile(ten, noiDung, MimeType.PLAIN_TEXT);
}

/** Nen chuoi JSON roi cat thanh manh, ghi ra Drive kem file mo ta. */
function nenVaChia_(sheetName, chuoiJson, lastProcessedRow, savedAt) {
  var blob = Utilities.newBlob(chuoiJson, 'application/json', 'cp.json');
  var nen  = Utilities.gzip(blob);
  var b64  = Utilities.base64Encode(nen.getBytes());

  var soManh = Math.max(1, Math.ceil(b64.length / CP_MANH_KY_TU));
  for (var i = 0; i < soManh; i++) {
    ghiFile_(tenManh_(sheetName, i), b64.substr(i * CP_MANH_KY_TU, CP_MANH_KY_TU));
  }
  // Lan truoc co the nhieu manh hon -> don manh thua di cho khoi lan
  for (var j = soManh; j < soManh + 30; j++) {
    var thua = timFile_(tenManh_(sheetName, j));
    if (!thua) break;
    thua.setTrashed(true);
  }

  ghiFile_(tenMeta_(sheetName), JSON.stringify({
    co: true,
    nen: 'gzip',
    soManh: soManh,
    kyTuManh: CP_MANH_KY_TU,
    tongKyTu: b64.length,
    lastProcessedRow: lastProcessedRow,
    savedAt: savedAt || new Date().toISOString()
  }));

  return { soManh: soManh, tongKyTu: b64.length };
}

function docMeta_(sheetName) {
  var f = timFile_(tenMeta_(sheetName));
  if (!f) return { co: false };
  try { return JSON.parse(f.getBlob().getDataAsString()); }
  catch (err) { return { co: false, loi: String(err) }; }
}
function docManh_(sheetName, i) {
  var f = timFile_(tenManh_(sheetName, i));
  return f ? f.getBlob().getDataAsString() : '';
}

/**
 * Luu checkpoint moi (khi bam "Chot ky ngay").
 * Ghi ban NEN + CHIA MANH truoc — day la ban dashboard doc.
 * Sau do co ghi them ban cu de con duong lui; neu buoc nay loi thi bo qua,
 * khong lam hong ban moi.
 */
function saveCheckpoint_(sheetName, dataJson, lastProcessedRow) {
  var savedAt = new Date().toISOString();
  var kq = nenVaChia_(sheetName, dataJson, lastProcessedRow, savedAt);

  var ghiBanCu = true;
  try {
    ghiFile_(getCheckpointFileName_(sheetName), JSON.stringify({
      lastProcessedRow: lastProcessedRow,
      savedAt: savedAt,
      data: JSON.parse(dataJson)
    }));
  } catch (err) {
    ghiBanCu = false;   // ban cu qua nang -> bo qua, ban moi da xong roi
  }

  return jsonOutput_({
    ok: true,
    lastProcessedRow: lastProcessedRow,
    soManh: kq.soManh,
    tongKyTu: kq.tongKyTu,
    coGhiBanCu: ghiBanCu
  });
}

/** Doc checkpoint kieu cu — giu nguyen de con duong lui. */
function getCheckpoint_(sheetName) {
  var f = timFile_(getCheckpointFileName_(sheetName));
  if (!f) return jsonOutput_({ exists: false });
  var content = f.getBlob().getDataAsString();
  return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JSON);
}
