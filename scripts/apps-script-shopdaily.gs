/* ==== MAU CHO VUNG KHAC (them 05/09/2026) — review ngay MWG 0 token. Doi ten sheet (SHEET_MWG_WIDE / SHEET_MWG_DAILY) va so cot (COL_DAILY.*) cho khop sheet cua ban. Can co san cac ham normStr, num, normBrandDaily, mapDailySegmentToWideBucket (project REPORT CENTRAL co san; project moi thi Claude viet them). ====
 * GET  <url>?mode=shopdaily
 * Doc MOT sheet "MWG tháng" (thang dang chay, reset dau thang) + cot Size/ten shop tu "SỐ LIỆU MWG".
 * Tra ve JSON gon: moi shop x ngay = vector 14 so, giong dung dk[] cua App Sale Tien Giang:
 *   [oppoU,oppoDT, ssU,ssDT, xmU,xmDT, ipU,ipDT, tongU,tongDT, pkOppoU,pkOppoDT, pkTongU,pkTongDT]  (DT = dong)
 * Khong dung checkpoint, khong ghi gi, khong dung cac ham cu. Robot GitHub goi moi ngay roi luu lai lich su.
 * Khoa noi shop: Ma sieu thi (cot K "MWG tháng") = PARTNER ID (cot A "SỐ LIỆU MWG"); do them STORE ID (cot B) neu khong thay.
 */
function shopDaily_0509() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const meta = {};
  const wide = ss.getSheetByName(SHEET_MWG_WIDE);
  if (wide && wide.getLastRow() > 2) {
    const wv = wide.getRange(3, 1, wide.getLastRow() - 2, 5).getValues();
    for (let i = 0; i < wv.length; i++) {
      const r = wv[i];
      const pid = (r[0] === '' || r[0] == null) ? '' : String(r[0]).trim().replace(/\.0+$/, '');
      const sid = (r[1] === '' || r[1] == null || isNaN(Number(r[1]))) ? '' : String(Math.round(Number(r[1])));
      const rec = { n: String(r[2] || '').trim(), area: normStr(r[3]), size: String(r[4] || '').trim(), pid: pid, sid: sid };
      if (pid && !meta['p' + pid]) meta['p' + pid] = rec;
      if (sid && !meta['s' + sid]) meta['s' + sid] = rec;
    }
  }
  const sh = ss.getSheetByName(SHEET_MWG_DAILY);
  if (!sh) return { error: 'khong co sheet ' + SHEET_MWG_DAILY };
  const values = sh.getDataRange().getValues();
  const BI = { oppo: 0, samsung: 2, xiaomi: 4, apple: 6 };
  const PK7 = { oppo: 0, samsung: 1, xiaomi: 2, apple: 3, vivo: 4, realme: 5, khac: 6 };
  const MD3 = { oppo: 'OPPO', samsung: 'Samsung', xiaomi: 'Xiaomi' };
  function vec(o, k) { return o[k] || (o[k] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); }
  function add(v, bi, q, r, isPk) {
    v[8] += q; v[9] += r;
    if (bi !== undefined) { v[bi] += q; v[bi + 1] += r; }
    if (isPk) { v[12] += q; v[13] += r; if (bi === 0) { v[10] += q; v[11] += r; } }
  }
  function pkAdd(o, day, brand, q, r) {
    const a = o[day] || (o[day] = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]);
    const j = PK7[brand]; if (j === undefined) return;
    a[j][0] += q; a[j][1] += r;
  }
  function mdAdd(o, day, brand, model, q, r) {
    const bn = MD3[brand]; if (!bn) return;
    const d = o[day] || (o[day] = {});
    const b = d[bn] || (d[bn] = {});
    const m = b[model] || (b[model] = [0, 0]);
    m[0] += q; m[1] += r;
  }
  // thang = thang cua ngay xuat MOI NHAT trong sheet; dong thuoc thang khac bo qua
  let latest = null;
  for (let i = 1; i < values.length; i++) {
    const dv = values[i][COL_DAILY.DATE];
    if (dv instanceof Date && (!latest || dv.getTime() > latest.getTime())) latest = dv;
  }
  const month = latest ? latest.getMonth() + 1 : null;
  const year = latest ? latest.getFullYear() : null;
  const dim = latest ? new Date(year, month, 0).getDate() : 31;
  const shops = {}, areas = {}, all = { d: {}, pk: {}, md: {} };
  let maxDay = 0, dongBo = 0, dongKhopMeta = 0, dong = 0;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const code = row[COL_DAILY.STORE_CODE];
    if (code === '' || code == null) continue;
    const dv = row[COL_DAILY.DATE];
    let day = num(row[COL_DAILY.DAY]);
    if (!day && dv instanceof Date) day = dv.getDate();
    if (!day || day < 1 || day > 31) { dongBo++; continue; }
    if (dv instanceof Date && month && dv.getMonth() + 1 !== month) { dongBo++; continue; }
    dong++;
    if (day > maxDay) maxDay = day;
    const key = String(code).trim().replace(/\.0+$/, '');
    const m = meta['p' + key] || meta['s' + key] || null;
    if (m) dongKhopMeta++;
    const area = normStr(row[COL_DAILY.AREA]) || (m ? m.area : '') || '(Không rõ)';
    const brand = normBrandDaily(row[COL_DAILY.MANUFACTURER]);
    const model = normStr(row[COL_DAILY.PRODUCT_NAME]) || '(Không rõ)';
    const q = num(row[COL_DAILY.QTY]) || 1;
    const r = q * num(row[COL_DAILY.PRICE]);
    const isPk = mapDailySegmentToWideBucket(row[COL_DAILY.SEGMENT]) === '10den20m';
    const bi = BI[brand];
    let s = shops[key];
    if (!s) s = shops[key] = { n: (m && m.n) || normStr(row[COL_DAILY.STORE_NAME]) || key, area: area, size: (m && m.size) || '', sid: (m && m.sid) || '', d: {} };
    add(vec(s.d, day), bi, q, r, isPk);
    let a = areas[area];
    if (!a) a = areas[area] = { d: {}, pk: {}, md: {} };
    add(vec(a.d, day), bi, q, r, isPk);
    add(vec(all.d, day), bi, q, r, isPk);
    if (isPk) { pkAdd(a.pk, day, brand, q, r); pkAdd(all.pk, day, brand, q, r); }
    mdAdd(a.md, day, brand, model, q, r); mdAdd(all.md, day, brand, model, q, r);
  }
  return { v: 1, m: month, y: year, dim: dim, maxDay: maxDay, dong: dong, dongBo: dongBo, dongKhopMeta: dongKhopMeta,
           shops: shops, areas: areas, all: all, at: new Date().toISOString() };
}
/* Chen vao DAU ham doGet(e) (ngay sau dong "try {"):
     if (e && e.parameter && e.parameter.mode === 'shopdaily') { return ContentService.createTextOutput(JSON.stringify(shopDaily_0509())).setMimeType(ContentService.MimeType.JSON); }
   ==== het khoi them 05/09/2026 ==== */
