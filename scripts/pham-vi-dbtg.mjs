/* pham-vi-dbtg.mjs — CAT DU LIEU DB TG THEO TUNG NGUOI (chang B).
 *
 * Nguyen tac: CAT O TANG DONG GOI, khong phai tang giao dien.
 *   An tren man hinh thi du lieu VAN NAM trong file cua ho — mo F12 la doc duoc.
 *   Cat o day thi du lieu KHONG CO trong goi cua ho. Khong co gi de ma lo.
 *
 * BA THU PHAI TU TINH LAI, khong duoc bung nguyen:
 *   kpi · week_* · brand_ranking / top_brands
 *   Day la so TOAN VUNG. Bung nguyen la 4 o KPI dau trang hien doanh thu ca tinh
 *   cho mot sale xem — dung thu can giau nhat.
 *
 * CAM BAY DA GHI LAI:
 *   1. Ten shop hai ben KHAC NHAU. CENTER ghi "FPT - TGG My Phuoc Tay - Cai Lay",
 *      DATA MWG ghi "DMS_TGI_CBE - An Thai Dong". Phai suy ra hai tap shop RIENG,
 *      moi tap tu bang cua chinh no, dua theo TEN SALE (ten sale thi khop nhau).
 *   2. DATA.daily.rows KHONG CO CHIEU SHOP (chinh tg.html ghi chu vay o dong ~10056).
 *      Cot: [thang, ngay, iSale, iPhanKhuc, iHang, doanhThu, soMay, iSize, iModel].
 *      -> chi cat duoc theo SALE. Cat nham theo shop la mat sach du lieu.
 *   3. sell_in_rows la mang tho, cot 0 = Store ID (so). Phai so sanh dang CHUOI.
 */

const nhomTuan = (iso) => {
  // Khoa tuan trong DB TG la ngay THU HAI cua tuan do
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  const thu = d.getUTCDay();                 // 0=CN
  const lui = (thu === 0) ? 6 : (thu - 1);
  d.setUTCDate(d.getUTCDate() - lui);
  return d.toISOString().slice(0, 10);
};

const locMang = (a, giu) => (Array.isArray(a) ? a.filter(giu) : a);
const locDoiTuong = (o, giuKhoa) => {
  if (!o || typeof o !== 'object') return o;
  const r = {};
  Object.keys(o).forEach((k) => { if (giuKhoa(k)) r[k] = o[k]; });
  return r;
};

/**
 * @param {object} A  khoi CENTER  (window.__exportDataMwg)
 * @param {object} B  khoi DATA MWG (window.__exportDataMain)
 * @param {{vaiTro:string, sales?:string[], kenh?:string}} ai
 *        vaiTro 'admin'  -> tra nguyen ban
 *        vaiTro 'leader' -> chi 1 kenh (ai.kenh), thay moi sale trong kenh do
 *        vaiTro 'sale'   -> chi shop cua chinh ho (ai.sales)
 */
export function catPhamVi(A, B, ai) {
  if (!ai || ai.vaiTro === 'admin') return { center: A, dataMwg: B, thongKe: { nguyenBan: true } };

  // ---------- 1. Suy ra pham vi TU CHINH DU LIEU, khong tin danh sach truyen vao
  const rowsC = (A && A.store_rows) || [];
  const rowsM = (B && B.shop_rows_brand4) || [];

  let saleCho;
  if (ai.vaiTro === 'leader') {
    const kenh = ai.kenh;
    const trongKenh = new Set(rowsC.filter((r) => r.channel === kenh).map((r) => r.sale));
    saleCho = trongKenh;
  } else {
    saleCho = new Set(ai.sales || []);
  }

  // Hai tap shop RIENG BIET — ten shop hai ben khong giong nhau
  const shopC = new Set(rowsC
    .filter((r) => saleCho.has(r.sale) && (ai.vaiTro !== 'leader' || r.channel === ai.kenh))
    .map((r) => r.store));
  const shopM = new Set(rowsM.filter((r) => saleCho.has(r.sale)).map((r) => r.shop));
  const storeIds = new Set(rowsC
    .filter((r) => shopC.has(r.store) && r.store_id != null)
    .map((r) => String(r.store_id).trim()));
  const kenhCon = new Set(rowsC.filter((r) => shopC.has(r.store)).map((r) => r.channel));
  const coMWG = kenhCon.has('MWG');

  // ---------- 2. CENTER
  const C = {};
  // giu nguyen cac danh muc (khong phai so lieu)
  ['months_sorted', 'month_labels', 'models_list', 'segments_list', 'series_list']
    .forEach((k) => { if (A[k] !== undefined) C[k] = A[k]; });
  C.channels_list = (A.channels_list || []).filter((c) => kenhCon.has(c));
  C.sales_list = (A.sales_list || []).filter((s) => saleCho.has(s));

  C.store_rows = locMang(A.store_rows, (r) => shopC.has(r.store));
  C.crosstab = locMang(A.crosstab, (r) => shopC.has(r.store));
  C.series_detail_crosstab = locMang(A.series_detail_crosstab,
    (r) => saleCho.has(r.sales) && kenhCon.has(r.channel));
  C.sell_in_rows = locMang(A.sell_in_rows, (r) => storeIds.has(String(r && r[0]).trim()));
  C.shop_sale_map = locDoiTuong(A.shop_sale_map, (k) => shopC.has(k));
  C.shop_level_map = locDoiTuong(A.shop_level_map, (k) => shopC.has(k));
  /* ==== them 04/09/2026 — shop_sale_by_id (tg.html them 03/09 cho tab MWG, bc-chitiet.js).
     Thieu dong nay -> moi goi leader/sale thieu truong -> kiem-goi-that do -> robot KHONG phat hanh
     goi moi -> app/DB TG dung so tu 03/09 11:32 toi 04/09 dem. Loc theo Store ID trong pham vi. */
  C.shop_sale_by_id = locDoiTuong(A.shop_sale_by_id || {}, (k) => storeIds.has(String(k).trim()));
  /* ==== het khoi them 04/09/2026 ==== */
  C.store_month_lookup = locDoiTuong(A.store_month_lookup, (k) => shopC.has(k));
  C.ind_daily_by_date = {};
  Object.keys(A.ind_daily_by_date || {}).forEach((ngay) => {
    const giu = locDoiTuong(A.ind_daily_by_date[ngay], (s) => shopC.has(s));
    if (Object.keys(giu).length) C.ind_daily_by_date[ngay] = giu;
  });
  C.overview_daily_by_date = {};
  Object.keys(A.overview_daily_by_date || {}).forEach((ngay) => {
    const theoKenh = A.overview_daily_by_date[ngay] || {};
    const giuNgay = {};
    Object.keys(theoKenh).forEach((ch) => {
      if (!kenhCon.has(ch)) return;
      const giu = locDoiTuong(theoKenh[ch], (s) => shopC.has(s));
      if (Object.keys(giu).length) giuNgay[ch] = giu;
    });
    if (Object.keys(giuNgay).length) C.overview_daily_by_date[ngay] = giuNgay;
  });
  // Bien che chi cho quan ly — sale khong can va khong nen thay
  if (ai.vaiTro === 'leader' && A.channel_month_headcount && A.channel_month_headcount[ai.kenh]) {
    C.channel_month_headcount = { [ai.kenh]: A.channel_month_headcount[ai.kenh] };
  } else {
    C.channel_month_headcount = {};
  }

  // --- TINH LAI so tong, KHONG duoc bung nguyen so toan vung
  let sl = 0, kh = 0, dt = 0;
  C.store_rows.forEach((r) => { sl += r.sellout || 0; kh += r.activated || 0; dt += r.revenue || 0; });
  C.kpi = {
    totalSellout: sl, totalActivated: kh, totalRevenue: dt,
    activationRate: sl ? Math.round(kh / sl * 1000) / 10 : 0,
    numStores: C.store_rows.length, numChannels: C.channels_list.length,
  };

  // --- TINH LAI so theo tuan tu du lieu da cat
  const tuanU = {}, tuanR = {}, tuanM = {};
  Object.keys(C.overview_daily_by_date).forEach((ngay) => {
    const t = nhomTuan(ngay); if (!t) return;
    const theoKenh = C.overview_daily_by_date[ngay];
    Object.keys(theoKenh).forEach((ch) => {
      Object.keys(theoKenh[ch]).forEach((s) => {
        const v = theoKenh[ch][s] || {};
        tuanU[t] = tuanU[t] || {}; tuanU[t][ch] = (tuanU[t][ch] || 0) + (v.sellout || 0);
        tuanR[t] = (tuanR[t] || 0) + (v.rev || 0);
      });
    });
  });
  Object.keys(C.ind_daily_by_date).forEach((ngay) => {
    const t = nhomTuan(ngay); if (!t) return;
    Object.keys(C.ind_daily_by_date[ngay]).forEach((s) => {
      const md = (C.ind_daily_by_date[ngay][s] || {}).models || {};
      tuanM[t] = tuanM[t] || {}; tuanM[t].IND = tuanM[t].IND || {};
      Object.keys(md).forEach((m) => { tuanM[t].IND[m] = (tuanM[t].IND[m] || 0) + md[m]; });
    });
  });
  C.week_channel_units = tuanU;
  C.week_revenue = tuanR;
  C.week_channel_models = tuanM;

  /* ---------- 2b. TI TRONG TARGET — phai tinh voi MAU SO TOAN VUNG
     Loi da mac, lo ra 28/08 khi soi tai khoan CAO CHI BAO:
       tg.html chia target kenh theo ti trong cua sale trong chinh DATA.crosstab:
           target_sale = target_kenh x (doanh so sale / doanh so CA KENH)
       Trong goi da cat, DATA.crosstab CHI CON MINH HO -> mau so = tu so
       -> ti trong 100% -> ho om tron target ca kenh (3.500 may). % HT sai gap 4 lan.

     Khong sua duoc o tg.html mot minh, vi mau so toan vung DA BI CAT MAT roi.
     Nen tinh o day — noi con giu ban day du — roi gui theo goi mot con so.

     CHI GUI TI TRONG, khong gui target tuyet doi: hang so target van nam DUY NHAT
     mot cho trong tg.html, khong nhan doi sang file nay de roi lech nhau. */
  {
    const tuSo = {}, mauSo = {};
    (A.crosstab || []).forEach((r) => {
      const ch = r.channel; if (!ch) return;
      mauSo[ch] = mauSo[ch] || { sellout: 0, rev: 0 };
      mauSo[ch].sellout += r.sellout || 0;
      mauSo[ch].rev += r.rev || 0;
      if (!shopC.has(r.store)) return;
      tuSo[ch] = tuSo[ch] || { sellout: 0, rev: 0 };
      tuSo[ch].sellout += r.sellout || 0;
      tuSo[ch].rev += r.rev || 0;
    });
    C.target_share = {};
    Object.keys(tuSo).forEach((ch) => {
      const m = mauSo[ch] || { sellout: 0, rev: 0 };
      C.target_share[ch] = {
        sellout: m.sellout ? tuSo[ch].sellout / m.sellout : 0,
        revenue: m.rev ? tuSo[ch].rev / m.rev : 0,
      };
    });
  }

  // ---------- 3. DATA MWG (chi co nghia khi pham vi con kenh MWG)
  let M = null;
  if (coMWG && B) {
    M = {};
    ['months_sorted', 'month_labels', 'segment_order', 'segments_list', 'size_shop_list',
     'channels_list', 'models_list', 'series_list']
      .forEach((k) => { if (B[k] !== undefined) M[k] = B[k]; });
    M.sales_list = (B.sales_list || []).filter((s) => saleCho.has(s));
    M.shop_rows_brand4 = locMang(B.shop_rows_brand4, (r) => shopM.has(r.shop));
    M.crosstab = locMang(B.crosstab, (r) => saleCho.has(r.sale));
    M.shop_segment_crosstab = locMang(B.shop_segment_crosstab, (r) => shopM.has(r.shop));
    ['shop_day_data', 'shop_hour_all_brand', 'shop_model_data',
     'shop_segment_all_brand', 'shop_staff_pk1020']
      .forEach((k) => { M[k] = locDoiTuong(B[k], (s) => shopM.has(s)); });
    M.mwg_target_map = locDoiTuong(B.mwg_target_map, (id) => storeIds.has(String(id).trim()));

    /* daily.rows KHONG CO CHIEU SHOP -> chi cat duoc theo SALE (cot 2 = chi so sale).
       BAY DA DINH: loc dong thoi thi xong, nhung neu giu nguyen bang tra cuu
       daily.sales thi TEN CAC SALE KHAC VAN NAM TRONG GOI. Bo kiem quet dau vet
       bat duoc; soi tung truong thi khong bao gio thay.
       -> Phai dung lai bang tra cuu chi gom sale duoc phep, roi DANH SO LAI cot 2. */
    const dsSale = (B.daily && B.daily.sales) ? B.daily.sales : [];
    const saleMoi = dsSale.filter((s) => saleCho.has(s));
    const doiSo = {};
    dsSale.forEach((s, i) => { const j = saleMoi.indexOf(s); if (j >= 0) doiSo[i] = j; });
    M.daily = {
      sales: saleMoi, segments: (B.daily || {}).segments, brands: (B.daily || {}).brands,
      sizes: (B.daily || {}).sizes, models: (B.daily || {}).models,
      rows: ((B.daily || {}).rows || [])
        .filter((r) => doiSo[r[2]] !== undefined)
        .map((r) => { const x = r.slice(); x[2] = doiSo[r[2]]; return x; }),
    };

    // --- TINH LAI so tong cua MWG
    let tr = 0, tu = 0, orv = 0, oun = 0, arv = 0, coOppo = 0;
    M.shop_rows_brand4.forEach((r) => {
      tr += r.monthly_total_rev || 0; tu += r.monthly_total_units || 0;
      const br = r.brands || {};
      const o = br.Oppo || br.OPPO || {};
      orv += o.rev || 0; oun += o.units || 0;
      const ap = br.Apple || {}; arv += ap.rev || 0;
      if ((o.units || 0) > 0) coOppo++;
    });
    M.kpi = {
      total_rev: tr, total_units: tu, oppo_rev: orv, oppo_units: oun,
      apple_rev: arv, retail_rev: tr - arv,
      oppo_rev_share: tr ? Math.round(orv / tr * 1000) / 10 : 0,
      oppo_units_share: tu ? Math.round(oun / tu * 1000) / 10 : 0,
      num_shops: M.shop_rows_brand4.length, num_shops_with_oppo: coOppo,
    };

    // --- TINH LAI xep hang hang, tu bang da cat
    const theoHang = {};
    M.shop_segment_crosstab.forEach((r) => {
      const h = r.brand || 'Khác';
      theoHang[h] = theoHang[h] || { revenue: 0, units: 0 };
      theoHang[h].revenue += r.rev || 0; theoHang[h].units += r.units || 0;
    });
    const tongR = Object.values(theoHang).reduce((t, x) => t + x.revenue, 0);
    const tongU = Object.values(theoHang).reduce((t, x) => t + x.units, 0);
    M.brand_ranking = Object.keys(theoHang)
      .map((h) => ({
        brand: h, revenue: Math.round(theoHang[h].revenue), units: theoHang[h].units,
        rev_share: tongR ? Math.round(theoHang[h].revenue / tongR * 1000) / 10 : 0,
        units_share: tongU ? Math.round(theoHang[h].units / tongU * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    M.top_brands = M.brand_ranking.slice(0, 6).map((x) => x.brand);
  }

  /* ==== them 04/09/2026 — LUOI AN TOAN: truong MOI trong tg.html ma file nay chua biet cat.
     Truoc: truong la bi BO im lang -> goi thieu truong -> kiem-goi-that do -> robot dung phat hanh
     (1,5 ngay 03-04/09 app khong co so moi). Nay: truong la duoc dua vao goi o dang RONG cung kieu
     ({} / [] / 0 / '') -> khong lo so cua ai, DB TG khong vo, robot van phat hanh; ten truong ghi
     vao thongKe.truongChuaCat de bo kiem in ra cho nguoi sua pham-vi-dbtg.mjs sau. */
  const BO_CO_Y = new Set(['debug_target']);
  const truongChuaCat = [];
  const rongCungKieu = (v) => (Array.isArray(v) ? [] : (v && typeof v === 'object') ? {} : (typeof v === 'number') ? 0 : (typeof v === 'string') ? '' : null);
  [[A, C], [B, M]].forEach(([goc, cat]) => {
    if (!goc || !cat) return;
    Object.keys(goc).forEach((k) => {
      if (cat[k] !== undefined || BO_CO_Y.has(k)) return;
      cat[k] = rongCungKieu(goc[k]);
      truongChuaCat.push(k);
    });
  });
  if (truongChuaCat.length) console.warn('[pham-vi] truong moi chua co luat cat, da de RONG: ' + truongChuaCat.join(', ') + ' -> them luat vao scripts/pham-vi-dbtg.mjs');
  /* ==== het khoi them 04/09/2026 ==== */

  return {
    center: C, dataMwg: M,
    thongKe: {
      vaiTro: ai.vaiTro, soSale: saleCho.size,
      shopCENTER: shopC.size, shopMWG: shopM.size, kenh: [...kenhCon].sort(),
      truongChuaCat,
    },
  };
}
