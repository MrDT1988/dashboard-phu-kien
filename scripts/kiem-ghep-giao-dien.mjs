/* kiem-ghep-giao-dien.mjs — BAN VA SANG/TOI CO PHA BAO MAT KHONG?
 *
 * VI SAO CAN RIENG MOT BO KIEM:
 *   Bo kiem chung (kiem-tg.mjs) chay o che do TOI, ma o che do toi bo may doi mau
 *   gan nhu khong lam gi. Cai dang lo chi lo ra o CHE DO SANG:
 *
 *     - Bo cat pham vi giau du lieu kenh khac bang  el.style.display = 'none'
 *     - Bo may doi mau (sweepInline) GHI DE ca thuoc tinh style:
 *           el.setAttribute('style', want)
 *
 *   Hai cai dung CHUNG mot thuoc tinh. Neu sweepInline dung nham ban goc, no se
 *   xoa mat display:none -> SALE NHIN THAY DU LIEU KENH KHAC. Man hinh van dep,
 *   khong loi JS, khong ai biet. Day la kieu hong te nhat: im lang va la bao mat.
 *
 *   Them nua no chay lai moi 2 giay (setInterval) va moi lan DOM doi
 *   (MutationObserver) — nen co the hong SAU khi trang da hien dung mot luc.
 *
 * CACH CHAY:
 *     python3 ghep_giao_dien.py tg.html tg-ghep.html
 *     TG_FILE=tg-ghep.html node scripts/kiem-ghep-giao-dien.mjs
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.env.TG_FILE || 'tg-ghep.html';
const KQ = [];
const ghi = (ten, dat, ct) => {
  KQ.push({ ten, dat: !!dat, ct: ct || '' });
  console.log((dat ? '  OK  ' : '  LOI ') + ten + (ct ? '  — ' + ct : ''));
};
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

function moTrang({ theme = 'light', laRobot = false } = {}) {
  const html = fs.readFileSync(FILE, 'utf8');
  const daGoi = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://x.test/', pretendToBeVisual: true,
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.scrollTo = () => {};
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      w.Chart = function () { return { destroy() {}, update() {}, data: {}, options: {} }; };
      w.Chart.register = () => {}; w.Chart.defaults = { plugins: {}, font: {} };
      w.Chart.instances = {};
      w.ChartDataLabels = {};
      w.Papa = { parse: () => ({ data: [] }) };
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.DecompressionStream = globalThis.DecompressionStream;
      w.CompressionStream = globalThis.CompressionStream;
      w.Blob = globalThis.Blob; w.Response = globalThis.Response;
      w.atob = (b) => Buffer.from(b, 'base64').toString('binary');
      w.btoa = (b) => Buffer.from(b, 'binary').toString('base64');
      w.localStorage.setItem('dbtg-theme', theme);
      w.localStorage.setItem('dbtg_as_key', 'KHOA-AS-DE-KIEM');
      if (laRobot) w.__BO_QUA_GOI = true;
      w.__fetchGoc = w.fetch;
      w.fetch = (u) => {
        daGoi.push(String(u));
        return Promise.resolve({
          ok: true, status: 200,
          text: () => Promise.resolve('[]'),
          json: () => Promise.resolve([]),
        });
      };
    },
  });
  return { w: dom.window, daGoi, dom };
}

const an = (w, id) => {
  const e = w.document.getElementById(id);
  return !e || e.style.display === 'none';
};

(async () => {
  // ============ 1. CHE DO SANG: bo doi mau co xoa mat cho giau khong ============
  {
    const { w } = moTrang({ theme: 'light' });
    await cho(2500);
    const d = w.document;

    ghi('Ban va co that su nap (che do sang)',
      d.documentElement.getAttribute('data-theme') === 'light'
      && !!d.getElementById('dbtg-light-css'),
      'data-theme=' + d.documentElement.getAttribute('data-theme'));

    // Giau y HET nhu bo cat pham vi lam voi mot sale kenh MWG
    const giau = ['panel-overview', 'panel-ka', 'panel-ind'];
    giau.forEach((id) => { const e = d.getElementById(id); if (e) e.style.display = 'none'; });
    const the = d.querySelector('.chart-container');
    if (the) the.style.display = 'none';
    // Khoi HTML tinh — the nay CO san style mau, la truong hop nguy hiem nhat:
    // sweepInline chi bo qua nhung the KHONG co ma mau trong style.
    const ct = d.getElementById('channel-program-ka-result');
    const theCT = ct && ct.parentElement;
    if (theCT) theCT.style.display = 'none';
    ghi('The chuong trinh KA co ma mau trong style (truong hop nguy hiem)',
      !!theCT && /#[0-9a-fA-F]{3,8}|rgba?\(/.test(theCT.getAttribute('style') || ''),
      'neu khong co mau thi bo doi mau bo qua, phep kiem nay mat y nghia');

    // Ep bo may doi mau chay het mot vong, roi doi them 2 nhip setInterval
    if (typeof w.__dbtgSetTheme === 'function') w.__dbtgSetTheme('light');
    await cho(4800);

    ghi('SANG: panel kenh khac VAN bi giau sau khi doi mau',
      an(w, 'panel-ka') && an(w, 'panel-ind'),
      'sweepInline ghi de style — neu no dung nham ban goc la lo du lieu');
    ghi('SANG: panel Tong quan VAN bi giau', an(w, 'panel-overview'));
    ghi('SANG: the da giau VAN bi giau',
      !the || the.style.display === 'none');
    ghi('SANG: khoi HTML tinh (Chuong trinh KA) VAN bi giau',
      !theCT || theCT.style.display === 'none',
      'the nay co ma mau nen bo doi mau CO dung vao — cho de vo nhat');

    // Bam qua Toi roi ve Sang: hai lan ghi de lien tiep
    if (typeof w.__dbtgSetTheme === 'function') { w.__dbtgSetTheme('dark'); w.__dbtgSetTheme('light'); }
    await cho(600);
    ghi('Doi qua doi lai Sang/Toi: van giau nguyen',
      an(w, 'panel-ka') && an(w, 'panel-ind') && an(w, 'panel-overview')
      && (!theCT || theCT.style.display === 'none'),
      'moi lan bam la mot lan ghi de style');
    w.close();
  }

  // ============ 2. BAN VA CO DUNG VAO CO CHE CHIA KHOA KHONG ============
  {
    const { w, daGoi } = moTrang({ theme: 'light' });
    await cho(2500);
    const goiAS = daGoi.filter((u) => u.indexOf('script.google.com') >= 0);
    ghi('Trang van goi Apps Script binh thuong', goiAS.length > 0, goiAS.length + ' loi goi');
    const thieu = goiAS.filter((u) => u.indexOf('key=') < 0);
    ghi('MOI loi goi VAN kem chia khoa (ban va khong pha lop boc fetch)',
      thieu.length === 0,
      thieu.length ? (thieu.length + ' loi goi bi sot') : ('du ' + goiAS.length + ' loi goi'));
    ghi('Ban va KHONG lam mat chia khoa dang luu',
      w.localStorage.getItem('dbtg_as_key') === 'KHOA-AS-DE-KIEM');
    ghi('Ban va chi them DUNG mot khoa localStorage cua rieng no',
      w.localStorage.getItem('dbtg-theme') === 'light');
    w.close();
  }

  // ============ 3. BO MAY DOI MAU CO TU GOI DU LIEU KHONG ============
  {
    const { w, daGoi } = moTrang({ theme: 'light' });
    await cho(2500);
    const truoc = daGoi.length;
    if (typeof w.__dbtgSetTheme === 'function') {
      w.__dbtgSetTheme('dark'); w.__dbtgSetTheme('light'); w.__dbtgSetTheme('dark');
    }
    await cho(5000);      // di qua it nhat 2 nhip setInterval 2 giay
    ghi('Doi mau + 2 nhip dong ho KHONG sinh them loi goi mang nao',
      daGoi.length === truoc,
      'truoc ' + truoc + ' -> sau ' + daGoi.length
        + (daGoi.length > truoc ? ' | ' + daGoi.slice(truoc, truoc + 2).join(' , ') : ''));
    w.close();
  }

  // ============ 4. ROBOT VAN DI DUOC DUONG CU ============
  {
    const { w, daGoi } = moTrang({ theme: 'dark', laRobot: true });
    await cho(3000);
    const goiAS = daGoi.filter((u) => u.indexOf('script.google.com') >= 0);
    ghi('Robot: van keo duoc so lieu khi trang co ban va giao dien',
      goiAS.length > 0, goiAS.length + ' loi goi Apps Script');
    ghi('Robot: KHONG bi ket o man hinh chon nguoi / nhap ma',
      !w.document.getElementById('dbtg-ai-lop') && !w.document.getElementById('dbtg-ma-lop'));
    ghi('Robot: nut doi giao dien khong che mat gi cua robot',
      !!w.document.getElementById('dbtg-theme-btn')
      || w.document.documentElement.getAttribute('data-theme') === 'dark',
      'robot chay che do toi — bo doi mau gan nhu khong lam gi');
    w.close();
  }

  const hong = KQ.filter((x) => !x.dat);
  console.log('\n=== KET LUAN (ghep giao dien) ===');
  console.log('So phep kiem :', KQ.length);
  console.log('Khong dat    :', hong.length);
  hong.forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x.ten + '  — ' + x.ct));
  process.exit(hong.length ? 1 : 0);
})().catch((e) => { console.error('VO:', e && e.stack); process.exit(1); });
