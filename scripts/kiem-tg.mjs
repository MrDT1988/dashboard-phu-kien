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
function moTrang({ khoaSan = null, maSan = null, aiSan = null, dapTraLoi = null } = {}) {
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
      if (aiSan) w.localStorage.setItem('dbtg_ai', JSON.stringify(aiSan));
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

  // ============ F. CHANG B: MOI NGUOI MOT GOI, DUNG PHAM VI CUA HO ============
  {
    const MA_AD = '1111111111', MA_SALE = '2222222222';
    const shopC = (s2, i, ch) => ({ store: 'CS-' + s2 + '-' + i, channel: ch, level: 'L1', sale: s2,
      store_id: (s2 === 'SALE-A' ? 1000 : 2000) + i, target: 100,
      sellout: 10, activated: 8, revenue: 1000, activation_rate: 80 });
    const A = {
      months_sorted: [1], month_labels: ['T1'], channels_list: ['MWG', 'IND'],
      sales_list: ['SALE-A', 'SALE-B'], models_list: [], segments_list: [], series_list: [],
      store_rows: [shopC('SALE-A', 1, 'MWG'), shopC('SALE-B', 1, 'MWG'), shopC('SALE-B', 2, 'IND')],
      crosstab: [], series_detail_crosstab: [], sell_in_rows: [],
      shop_sale_map: {}, shop_level_map: {}, store_month_lookup: {},
      ind_daily_by_date: {}, overview_daily_by_date: {}, channel_month_headcount: {},
      kpi: {}, week_channel_units: {}, week_revenue: {}, week_channel_models: {},
      danhDau: 'TOI-LA-CENTER',
    };
    const B2 = {
      months_sorted: [1], month_labels: ['T1'], segment_order: [], segments_list: [],
      size_shop_list: [], channels_list: [], models_list: [], series_list: [],
      sales_list: ['SALE-A', 'SALE-B'],
      shop_rows_brand4: [
        { shop: 'MS-A-1', sale: 'SALE-A', brands: {}, monthly_total_rev: 10, monthly_total_units: 1 },
        { shop: 'MS-B-1', sale: 'SALE-B', brands: {}, monthly_total_rev: 20, monthly_total_units: 2 }],
      crosstab: [], shop_segment_crosstab: [],
      shop_day_data: {}, shop_hour_all_brand: {}, shop_model_data: {},
      shop_segment_all_brand: {}, shop_staff_pk1020: {}, mwg_target_map: {},
      daily: { sales: ['SALE-A', 'SALE-B'], segments: [], brands: [], sizes: [], models: [], rows: [] },
      kpi: {}, brand_ranking: [], top_brands: [], danhDau: 'TOI-LA-DATAMWG',
    };
    const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'kiemtg-'));
    process.env.SALE_CODES = JSON.stringify({
      admin: { pin: MA_AD, ten: 'Quan ly vung' }, sales: { 'SALE-A': MA_SALE } });
    process.env.VAULT_DIR = thuMuc;
    const { dongGoiDBTG } = await import('./build-dbtg-vault.mjs');
    dongGoiDBTG({
      centerGz: gzipSync(Buffer.from(JSON.stringify(A))).toString('base64'),
      dataMwgGz: gzipSync(Buffer.from(JSON.stringify(B2))).toString('base64'),
    }, { updated: '2026-08-27T16:00:00Z', maxDay: 23, months: [1] });
    const chiMuc = JSON.parse(fs.readFileSync(path.join(thuMuc, 'dbtg-index.json'), 'utf8'));
    const chiMucTxt = JSON.stringify(chiMuc);
    const uAd = chiMuc.users.find((u) => u.r === 'admin');
    const uSale = chiMuc.users.find((u) => u.r === 'sale');
    const doc = (id) => fs.readFileSync(path.join(thuMuc, 'dbtg-' + id + '.json'), 'utf8');
    const phucVu = (u) => {
      if (u.indexOf('dbtg-index.json') >= 0) return chiMucTxt;
      const m = u.match(/dbtg-([0-9a-f]{16})\.json/);
      if (m) { try { return doc(m[1]); } catch (e) { return false; } }
      return null;
    };

    ghi('Chang B: con tro liet ke tung nguoi', !!(uAd && uSale),
      (chiMuc.users || []).map((u) => u.r).join(', '));
    ghi('Chang B: con tro khong lo so lieu',
      chiMucTxt.indexOf('TOI-LA-') < 0 && chiMucTxt.indexOf('CS-SALE') < 0);
    ghi('Chang B: goi cua sale KHONG chua shop nguoi khac',
      doc(uSale.id).indexOf('CS-SALE-B') < 0 && doc(uSale.id).indexOf('MS-B-1') < 0,
      'da ma hoa nen khong doc duoc gi ca — day la kiem theo nghia den');

    // --- F1. Admin: mo duoc, va van duoc phep roi ve duong cu
    {
      const { w, daGoi } = moTrang({ maSan: MA_AD, aiSan: uAd, dapTraLoi: phucVu });
      await cho(4000);
      ghi('Admin: mo duoc goi cua minh',
        !!(w.__exportDataMwg && w.__exportDataMwg.danhDau === 'TOI-LA-CENTER'));
      let daLui = false;
      w.__khoiDongDBTG(() => { throw new Error('ve loi'); }, 'center', 'loading-overlay', () => { daLui = true; });
      await cho(600);
      ghi('Admin: ve loi thi VAN duoc roi ve duong cu', daLui === true,
        'anh Thai von duoc xem het nen khong sao');
      w.close();
    }

    // --- F2. Sale: chi thay phan cua minh
    {
      const { w } = moTrang({ maSan: MA_SALE, aiSan: uSale, dapTraLoi: phucVu });
      await cho(4000);
      const C = w.__exportDataMwg;
      ghi('Sale: mo duoc goi cua minh', !!C);
      if (C) {
        const ten = (C.store_rows || []).map((r) => r.store);
        ghi('Sale: chi thay shop cua chinh minh', ten.length === 1 && ten[0] === 'CS-SALE-A-1',
          'thay: ' + JSON.stringify(ten));
        ghi('Sale: KHONG thay dau vet nguoi khac trong trang',
          JSON.stringify(C).indexOf('SALE-B') < 0);
      }
      w.close();
    }

    // --- F3. QUAN TRONG NHAT: sale gap su co thi KHONG duoc roi ve duong lay TOAN BO
    {
      const { w, daGoi } = moTrang({
        khoaSan: 'K', maSan: MA_SALE, aiSan: uSale,
        dapTraLoi: (u) => (u.indexOf('dbtg-index.json') >= 0 ? chiMucTxt
          : (u.indexOf('dbtg-') >= 0 ? '{"center":{"v":1,"it":10,"salt":"AAAA","iv":"AAAA","ct":"AAAA"}}' : null)),
      });
      await cho(4500);
      const nutBo = w.document.getElementById('dbtg-ma-bo');
      ghi('Sale: KHONG co nut "Bo qua" (bo qua la thay ca vung)', !nutBo,
        'nut do chi danh cho admin');
      const oNhap = w.document.getElementById('dbtg-ma-lop');
      if (oNhap) {
        const nutDoi = w.document.getElementById('dbtg-ma-doi');
        ghi('Sale: co duong thoat lanh manh (chon ten khac)', !!nutDoi);
      }
      let daLui = false;
      w.__khoiDongDBTG(() => {}, 'center', 'loading-overlay', () => { daLui = true; });
      await cho(800);
      // Dieu PHAI dung: khong roi ve duong lay toan bo. Con man hinh dang hien
      // la o nhap ma hay man chan thi deu duoc — mien la nguoi dung co cho bam.
      const coManHinh = !!(w.document.getElementById('dbtg-chan')
        || w.document.getElementById('dbtg-ma-lop')
        || w.document.getElementById('dbtg-ai-lop'));
      ghi('Sale: goi hong thi KHONG tai toan bo du lieu vung', daLui === false,
        'co quay ve duong cu=' + daLui);
      ghi('Sale: goi hong van co man hinh de nguoi dung xu ly', coManHinh,
        'khong bo ho truoc man hinh chet');
      const goiAS = daGoi.filter((u) => u.indexOf('script.google.com') >= 0);
      ghi('Sale: khong mot loi goi Apps Script nao', goiAS.length === 0,
        goiAS.length ? (goiAS.length + ' loi goi — LO HONG') : 'sach');
      w.close();
    }

    // --- F4. Chua chon ai -> phai hien man hinh chon nguoi
    {
      const { w } = moTrang({ dapTraLoi: phucVu });
      await cho(3000);
      ghi('Chua chon ai: hien man hinh chon nguoi',
        !!w.document.getElementById('dbtg-ai-lop'));
      const nut = [...w.document.querySelectorAll('[data-ai]')];
      ghi('Man hinh chon nguoi: liet ke du nguoi', nut.length === chiMuc.users.length,
        nut.length + '/' + chiMuc.users.length);
      w.close();
    }

    // --- F5. Khong co goi -> admin ve duong cu duoc
    {
      const { w, daGoi } = moTrang({ khoaSan: 'K', dapTraLoi: (u) => (u.indexOf('dbtg-') >= 0 ? false : null) });
      await cho(3000);
      const goiAS = daGoi.filter((u) => u.indexOf('script.google.com') >= 0);
      ghi('Khong co goi: tu quay ve duong cu', goiAS.length > 0, goiAS.length + ' loi goi');
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
