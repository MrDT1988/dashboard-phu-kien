/* kiem-tg.mjs — RA SOAT tg.html (DB TG).
 *
 * VI SAO CO FILE NAY:
 *   27/08 em gan chia khoa cho duong Apps Script. Cong dong dung, robot qua duoc,
 *   nhung anh Thai mo DB TG ra chi thay man hinh do "Tu choi" ma KHONG CO CHO NAO
 *   DE NHAP. Em viet ham hoi chia khoa roi quen noi no vao dau ca.
 *
 *   Bo kiem cu (kiem-app.mjs) khong bat duoc, vi no chi chay app.html —
 *   CHUA BAO GIO chay tg.html. Day la lo hong trong cach kiem, khong phai xui.
 *
 * File nay chay tg.html trong jsdom, KHONG mang, va hoi dung nhung cau ma
 * nguoi dung se gap:
 *   - Chua co chia khoa thi co cho nhap khong?
 *   - Chia khoa sai thi co duoc hoi lai khong?
 *   - Lop boc fetch co dinh chia khoa dung cho khong, va co dinh nham noi khac khong?
 *   - Trang co vo ngay luc nap khong?
 *
 * KHONG dung mang, KHONG dung Apps Script, KHONG dung DB TG that.
 * Chay duoc ca o may lam viec lan trong GitHub Action.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import { JSDOM } from 'jsdom';

const FILE = process.env.TG_FILE || 'tg.html';
const KQ = [];
const loiJS = [];
const ghi = (ten, dat, chiTiet) => {
  KQ.push({ ten, dat: !!dat, chiTiet: chiTiet || '' });
  console.log((dat ? '  OK  ' : '  LOI ') + ten + (chiTiet ? '  — ' + chiTiet : ''));
};
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- dung trang gia
// tg.html nap Chart.js / papaparse tu CDN. jsdom khong tai script ngoai, nen
// phai dat san vai bien gia, neu khong trang vo vi ly do khong lien quan.
function moTrang({ khoaSan = null, maSan = null, dapTraLoi = null } = {}) {
  const html = fs.readFileSync(FILE, 'utf8');
  const daGoi = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.scrollTo = () => {};
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      // thay cho thu vien ngoai
      w.Chart = function () { return { destroy() {}, update() {}, data: {}, options: {} }; };
      w.Chart.register = () => {}; w.Chart.defaults = { plugins: {}, font: {} };
      w.ChartDataLabels = {};
      w.Papa = { parse: () => ({ data: [] }) };
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      // Goi ma hoa can may thu nay. jsdom khong co san -> muon cua Node.
      w.DecompressionStream = globalThis.DecompressionStream;
      w.CompressionStream = globalThis.CompressionStream;
      w.Blob = globalThis.Blob;
      w.Response = globalThis.Response;
      w.atob = (b) => Buffer.from(b, 'base64').toString('binary');
      w.btoa = (b) => Buffer.from(b, 'binary').toString('base64');
      if (khoaSan) w.localStorage.setItem('dbtg_as_key', khoaSan);
      if (maSan) w.localStorage.setItem('dbtg_ma', maSan);
      // Moi loi goi ra ngoai deu bi chan lai va ghi so
      w.fetch = (u, o) => {
        daGoi.push(String(u));
        const tra = (typeof dapTraLoi === 'function') ? dapTraLoi(String(u)) : null;
        if (tra === false) return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve(''), json: () => Promise.reject(new Error('404')) });
        const body = tra !== null && tra !== undefined ? tra : '[]';
        return Promise.resolve({
          ok: true, status: 200,
          text: () => Promise.resolve(body),
          json: () => Promise.resolve(JSON.parse(body)),
        });
      };
    },
  });
  const w = dom.window;
  w.onerror = (m) => loiJS.push(String(m).slice(0, 160));
  w.addEventListener('error', (e) => { if (e && e.message) loiJS.push(String(e.message).slice(0, 160)); });
  return { w, daGoi, dom };
}

(async () => {
  // ============ A. CHUA CO CHIA KHOA -> PHAI CO CHO NHAP ============
  // Day chinh la loi da mac: cong dong ma khong co o nhap.
  {
    const { w } = moTrang();
    await cho(1500);
    const lop = w.document.getElementById('as-key-lop');
    ghi('Chua co chia khoa: hien man hinh nhap', !!lop,
      lop ? 'co lop #as-key-lop' : 'KHONG co cho nao de nhap — dung loi da mac 27/08');
    if (lop) {
      const o = w.document.getElementById('as-key-o');
      const nut = w.document.getElementById('as-key-ok');
      ghi('Man hinh nhap: co o nhap va nut bam', !!o && !!nut);
      ghi('Man hinh nhap: o nhap dang mat khau', !!o && o.type === 'password',
        o ? ('type=' + o.type) : '');
      ghi('Man hinh nhap: nam tren cung, khong bi che',
        !!lop && /z-index:\s*9{4,}/.test(lop.style.cssText || ''));
      ghi('Man hinh nhap: co chi cho nguoi dung cach lay lai chia khoa',
        /taoChiaKhoaMoi/.test(lop.textContent || ''));
    }
    w.close();
  }

  // ============ B. DA CO CHIA KHOA -> KHONG HOI NUA ============
  {
    const { w, daGoi } = moTrang({ khoaSan: 'KHOA-CU-DA-LUU' });
    await cho(1500);
    ghi('Da co chia khoa: khong hien man hinh nhap nua',
      !w.document.getElementById('as-key-lop'));

    // Lop boc fetch phai dinh chia khoa vao MOI loi goi Apps Script
    const goiAS = daGoi.filter((u) => u.indexOf('script.google.com') >= 0);
    ghi('Trang co that su goi Apps Script luc nap', goiAS.length > 0,
      goiAS.length + ' loi goi');
    if (goiAS.length) {
      const thieu = goiAS.filter((u) => u.indexOf('key=') < 0);
      ghi('MOI loi goi Apps Script deu kem chia khoa', thieu.length === 0,
        thieu.length ? (thieu.length + '/' + goiAS.length + ' loi goi bi sot: ' + thieu[0].slice(0, 80))
                     : ('du ' + goiAS.length + ' loi goi'));
    }
    // Khong duoc dinh chia khoa vao noi khac — do la lam lo chia khoa
    const goiKhac = daGoi.filter((u) => u.indexOf('script.google.com') < 0);
    const loDia = goiKhac.filter((u) => u.indexOf('key=KHOA-CU-DA-LUU') >= 0);
    ghi('KHONG dinh chia khoa vao dia chi ngoai Apps Script', loDia.length === 0,
      loDia.length ? ('LO CHIA KHOA sang: ' + loDia[0].slice(0, 90))
                   : ('da kiem ' + goiKhac.length + ' loi goi khac'));
    w.close();
  }

  // ============ C. CHIA KHOA SAI -> PHAI DUOC HOI LAI ============
  {
    const { w } = moTrang({
      khoaSan: 'KHOA-SAI',
      dapTraLoi: (u) => (u.indexOf('script.google.com') >= 0
        ? JSON.stringify({ error: 'Tu choi: thieu hoac sai chia khoa.' }) : '[]'),
    });
    await cho(2000);
    ghi('Chia khoa sai: bat duoc va hoi lai',
      !!w.document.getElementById('as-key-lop'),
      'Apps Script tra "Tu choi" -> phai mo lai o nhap');
    ghi('Chia khoa sai: xoa chia khoa cu di, khong giu lai cai hong',
      !w.localStorage.getItem('dbtg_as_key'),
      'con lai: ' + JSON.stringify(w.localStorage.getItem('dbtg_as_key')));
    w.close();
  }

  // ============ D. BAT DUNG LOI, KHONG BAT NHAM ============
  {
    const { w } = moTrang({ khoaSan: 'K' });
    await cho(1200);
    ghi('Bat dung cau tu choi cua Apps Script',
      w.__batTuChoi('Apps Script bao loi: Tu choi: thieu hoac sai chia khoa.') === true);
    ghi('KHONG bat nham loi mang thong thuong',
      w.__batTuChoi('HTTP 500 — may chu qua tai') === false,
      'loi mang khong duoc lam mat chia khoa dang dung');
    ghi('KHONG bat nham khi khong co gi',
      w.__batTuChoi('') === false && w.__batTuChoi(null) === false);
    w.close();
  }

  // ============ E. TRANG KHONG VO LUC NAP ============
  {
    const { w } = moTrang({ khoaSan: 'K' });
    await cho(2000);
    const nang = loiJS.filter((m) => /is not defined|is not a function|Cannot read/i.test(m));
    ghi('Nap trang khong co loi JS nang', nang.length === 0,
      nang.length ? nang.slice(0, 3).join(' | ') : 'sach');
    w.close();
  }

  // ============ F. DUONG MOI: DOC GOI MA HOA ============
  // Day la chang A. Neu hong thi anh Thai mo DB TG ra thay man hinh trang,
  // nen phai kiem ky hon moi thu khac.
  {
    const MA = '9182736450';
    const tho = {
      center:  { danhDau: 'TOI-LA-CENTER',  store_rows: [{ store: 'S1' }], crosstab: [1, 2, 3] },
      dataMwg: { danhDau: 'TOI-LA-DATAMWG', shop_day_data: { S1: {} } },
    };
    const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'kiemtg-'));
    process.env.SALE_CODES = JSON.stringify({ admin: { pin: MA } });
    process.env.VAULT_DIR = thuMuc;
    const { dongGoiDBTG } = await import('./build-dbtg-vault.mjs');
    const r = dongGoiDBTG({
      centerGz: gzipSync(Buffer.from(JSON.stringify(tho.center))).toString('base64'),
      dataMwgGz: gzipSync(Buffer.from(JSON.stringify(tho.dataMwg))).toString('base64'),
    }, { updated: '2026-08-27T16:00:00Z', maxDay: 23, months: [1, 2, 3] });
    const chiMuc = fs.readFileSync(path.join(thuMuc, 'dbtg-index.json'), 'utf8');
    const goiFile = fs.readFileSync(path.join(thuMuc, 'dbtg-' + r.id + '.json'), 'utf8');
    const phucVu = (u) => {
      if (u.indexOf('dbtg-index.json') >= 0) return chiMuc;
      if (u.indexOf('dbtg-' + r.id + '.json') >= 0) return goiFile;
      return null;
    };

    ghi('Goi ma hoa: con tro cong khai khong lo so lieu',
      chiMuc.indexOf('TOI-LA-') < 0 && chiMuc.indexOf('store_rows') < 0, chiMuc.slice(0, 90));
    ghi('Goi ma hoa: file goi khong lo so lieu',
      goiFile.indexOf('TOI-LA-') < 0 && goiFile.indexOf('crosstab') < 0,
      'da ma hoa that, khong doc duoc bang mat thuong');

    // --- F1. Co goi + ma DUNG -> ve tu goi, KHONG goi Apps Script
    {
      const { w, daGoi } = moTrang({ maSan: MA, dapTraLoi: phucVu });
      await cho(4000);
      ghi('Goi + ma dung: DB TG ve tu goi (khoi CENTER)',
        !!(w.__exportDataMwg && w.__exportDataMwg.danhDau === 'TOI-LA-CENTER'),
        'nhan duoc: ' + JSON.stringify((w.__exportDataMwg || {}).danhDau));
      ghi('Goi + ma dung: DB TG ve tu goi (khoi DATA MWG)',
        !!(w.__exportDataMain && w.__exportDataMain.danhDau === 'TOI-LA-DATAMWG'),
        'nhan duoc: ' + JSON.stringify((w.__exportDataMain || {}).danhDau));
      // Kiem THANG co che khoi dong, khong phu thuoc phan ve khong lo cua tg.html:
      // dua vao mot ham ve gia, xem no co dung goi va co TRANH duong cu khong.
      let nhanDuoc = null, daLui = false;
      w.__khoiDongDBTG((d) => { nhanDuoc = d; }, 'center', 'loading-overlay', () => { daLui = true; });
      await cho(600);
      ghi('Goi + ma dung: khoi dong bang goi, KHONG dung duong cu',
        !!(nhanDuoc && nhanDuoc.danhDau === 'TOI-LA-CENTER') && daLui === false,
        'nhan=' + JSON.stringify((nhanDuoc || {}).danhDau) + ' | co quay ve duong cu=' + daLui);
      // Ham ve nem loi -> BAT BUOC phai quay ve duong cu, khong duoc de man hinh trang
      let daLui2 = false;
      w.__khoiDongDBTG(() => { throw new Error('ve loi'); }, 'center', 'loading-overlay', () => { daLui2 = true; });
      await cho(600);
      ghi('Ham ve nem loi: tu quay ve duong cu', daLui2 === true,
        'day la luoi an toan cuoi cung');
      ghi('Goi + ma dung: khong hoi chia khoa Apps Script nua',
        !w.document.getElementById('as-key-lop'),
        'da co goi thi khong bat nho hai thu');
      w.close();
    }

    // --- F2. Khong co goi -> quay ve duong cu
    {
      const { w, daGoi } = moTrang({ khoaSan: 'K', dapTraLoi: (u) => (u.indexOf('dbtg-') >= 0 ? false : null) });
      await cho(3000);
      const goiAS = daGoi.filter((u) => u.indexOf('script.google.com') >= 0);
      ghi('Khong co goi: tu quay ve goi Apps Script nhu cu', goiAS.length > 0,
        goiAS.length + ' loi goi — duong lui con nguyen');
      w.close();
    }

    // --- F3. Goi HONG (khong phai ma sai) -> khong duoc bo anh Thai o man hinh chet
    {
      const { w, daGoi } = moTrang({
        khoaSan: 'K', maSan: MA,
        dapTraLoi: (u) => (u.indexOf('dbtg-index.json') >= 0 ? chiMuc
          : (u.indexOf('dbtg-') >= 0 ? '{"center":{"v":1,"it":10,"salt":"AAAA","iv":"AAAA","ct":"AAAA"}}' : null)),
      });
      await cho(3000);
      const oNhap = w.document.getElementById('dbtg-ma-lop');
      ghi('Goi hong: co hien o nhap lai (khong im lang)', !!oNhap);
      ghi('Goi hong: loi noi RO la co the do goi hong, khong do loi ma sai',
        !!oNhap && /gói dữ liệu hỏng/i.test(oNhap.textContent || ''),
        (oNhap ? (oNhap.textContent || '').replace(/\s+/g, ' ').slice(0, 100) : ''));
      // Nguoi dung bam "Bo qua" -> BAT BUOC quay ve duong cu
      const nutBo = w.document.getElementById('dbtg-ma-bo');
      ghi('Goi hong: co nut thoat ra duong cu', !!nutBo);
      if (nutBo) {
        nutBo.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
        await cho(2500);
        const goiAS = daGoi.filter((u) => u.indexOf('script.google.com') >= 0);
        ghi('Goi hong: bam "Bo qua" thi quay ve duong cu that', goiAS.length > 0,
          goiAS.length + ' loi goi Apps Script — duong lui chay');
        ghi('Goi hong: co bang bao dang chay duong cham',
          !!w.document.getElementById('dbtg-cham'),
          'khong de anh Thai tuong dashboard van dang nhanh');
      }
      w.close();
    }

    // --- F4. Ma SAI -> phai hoi lai, khong im lang bo qua
    {
      const { w } = moTrang({ maSan: 'MA-SAI-BET', dapTraLoi: phucVu });
      await cho(4000);
      ghi('Ma sai: hien o nhap lai', !!w.document.getElementById('dbtg-ma-lop'));
      ghi('Ma sai: xoa ma hong di, khong giu lai',
        !w.localStorage.getItem('dbtg_ma'),
        'con lai: ' + JSON.stringify(w.localStorage.getItem('dbtg_ma')));
      w.close();
    }

    try { fs.rmSync(thuMuc, { recursive: true, force: true }); } catch (e) {}
  }

  ketThuc();
})().catch((e) => { loiJS.push(String((e && e.stack) || e).slice(0, 300)); ketThuc(); });

function ketThuc() {
  const hong = KQ.filter((x) => !x.dat);
  console.log('');
  console.log('=== KET LUAN (tg.html) ===');
  console.log('So phep kiem :', KQ.length);
  console.log('Khong dat    :', hong.length);
  hong.forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x.ten + (x.chiTiet ? '  — ' + x.chiTiet : '')));
  // Repo la PUBLIC — bit moi cum tu 3 chu so tro len, giong bo kiem app.
  const bit = (x) => String(x || '').replace(/\d{3,}/g, '###');
  try {
    fs.writeFileSync('data/ket-qua-kiem-tg.json', JSON.stringify({
      tong: KQ.length, khongDat: hong.length,
      ghiChu: 'So tu 3 chu so tro len da duoc bit (###) vi repo la public.',
      pheps: KQ.map((x) => ({ ten: x.ten, dat: x.dat, chiTiet: bit(x.chiTiet) })),
    }, null, 1));
    console.log('da ghi data/ket-qua-kiem-tg.json');
  } catch (e) { console.log('khong ghi duoc ket qua:', e.message); }
  process.exit(hong.length ? 1 : 0);
}
