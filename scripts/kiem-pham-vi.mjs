/* kiem-pham-vi.mjs — KIEM BO CAT PHAM VI DB TG (chang B).
 *
 * Cau hoi quan trong nhat: SALE CO NHIN THAY GI NGOAI PHAN CUA HO KHONG?
 *
 * Cach kiem manh nhat khong phai la doc tung truong, ma la:
 *   doi ca goi da cat thanh chuoi, roi TIM TEN cua shop/sale ngoai pham vi.
 *   Con mot dau vet la ro ri. Cach nay bat duoc ca nhung truong ma nguoi viet
 *   QUEN CAT — dieu ma kiem tung truong khong bao gio bat duoc.
 *
 * Chay: node scripts/kiem-pham-vi.mjs
 */
import { catPhamVi } from './pham-vi-dbtg.mjs';

const KQ = [];
const ghi = (ten, dat, ct) => {
  KQ.push({ ten, dat: !!dat, ct: ct || '' });
  console.log((dat ? '  OK  ' : '  LOI ') + ten + (ct ? '  — ' + ct : ''));
};

/* ---------- dung du lieu gia, DUNG HINH DANG THAT ---------- */
const SALE = ['SALE-A', 'SALE-B', 'SALE-C'];
const shopC = (s, i, ch) => ({
  store: 'CENTER-SHOP-' + s + '-' + i, channel: ch, level: 'L1', sale: s,
  store_id: (s === 'SALE-A' ? 1000 : s === 'SALE-B' ? 2000 : 3000) + i,
  target: 100, sellout: 10 + i, activated: 8 + i, revenue: 1000 * (i + 1), activation_rate: 80,
});
const shopM = (s, i) => ({
  shop: 'MWG-SHOP-' + s + '-' + i, tinh: 'TG', loai_shop: 'X', sale: s, shop_size: 'C',
  store_code: String((s === 'SALE-A' ? 1000 : s === 'SALE-B' ? 2000 : 3000) + i),
  brands: { Oppo: { rev: 500, units: 5 }, Apple: { rev: 900, units: 3 } },
  monthly_total_rev: 2000, monthly_total_units: 20,
  pk1020_monthly_oppo_rev: 100, pk1020_monthly_oppo_units: 1,
  pk1020_monthly_total_rev: 400, pk1020_monthly_total_units: 4,
});

const A = {
  months_sorted: [1, 2], month_labels: ['T1', 'T2'],
  channels_list: ['MWG', 'KA', 'IND'], sales_list: SALE.slice(),
  models_list: ['M1'], segments_list: ['<3M'], series_list: ['A'],
  store_rows: [
    shopC('SALE-A', 1, 'MWG'), shopC('SALE-A', 2, 'IND'),
    shopC('SALE-B', 1, 'MWG'), shopC('SALE-B', 2, 'KA'),
    shopC('SALE-C', 1, 'IND'),
  ],
  crosstab: [],
  series_detail_crosstab: [],
  sell_in_rows: [],
  shop_sale_map: {}, shop_level_map: {}, store_month_lookup: {},
  ind_daily_by_date: {}, overview_daily_by_date: {},
  channel_month_headcount: { MWG: { 1: 10 }, KA: { 1: 5 }, IND: { 1: 7 } },
  kpi: { totalSellout: 999999, totalActivated: 888888, totalRevenue: 777777, activationRate: 88, numStores: 5, numChannels: 3 },
  week_channel_units: { '2026-01-05': { MWG: 999999, IND: 999999, KA: 999999 } },
  week_revenue: { '2026-01-05': 777777 },
  week_channel_models: { '2026-01-05': { IND: { 'MODEL-CUA-NGUOI-KHAC': 50 } } },
  debug_target: { bimat: 'KHONG-DUOC-BUNG' },
};
A.store_rows.forEach((r) => {
  A.crosstab.push({ m: 1, channel: r.channel, store: r.store, model: 'M1', series: 'A',
    segment: '<3M', sales: r.sale, sellout: r.sellout, activated: r.activated, rev: r.revenue });
  A.shop_sale_map[r.store] = r.sale;
  A.shop_level_map[r.store] = 'L1';
  A.store_month_lookup[r.store] = { 1: r.sellout };
  A.sell_in_rows.push([r.store_id, 'RT', 'TG', 1, 'P', 'OPPO', 5, '']);
  const ngay = '2026-01-07';
  A.overview_daily_by_date[ngay] = A.overview_daily_by_date[ngay] || {};
  A.overview_daily_by_date[ngay][r.channel] = A.overview_daily_by_date[ngay][r.channel] || {};
  A.overview_daily_by_date[ngay][r.channel][r.store] = { sale: r.sale, sellout: r.sellout, rev: r.revenue };
  if (r.channel === 'IND') {
    A.ind_daily_by_date[ngay] = A.ind_daily_by_date[ngay] || {};
    A.ind_daily_by_date[ngay][r.store] = { ds: r.sellout, dt: r.revenue, models: { ['MODEL-' + r.sale]: 3 } };
  }
});
SALE.forEach((s) => A.series_detail_crosstab.push(
  { m: 1, channel: 'MWG', series_detail: 'X', sales: s, sellout: 5, rev: 500 }));

const B = {
  months_sorted: [1, 2], month_labels: ['T1', 'T2'], segment_order: ['<3M'], segments_list: ['<3M'],
  size_shop_list: ['C'], channels_list: [], models_list: [], series_list: [],
  sales_list: ['SALE-A', 'SALE-B'],
  shop_rows_brand4: [shopM('SALE-A', 1), shopM('SALE-B', 1)],
  crosstab: [
    { m: 1, sale: 'SALE-A', seg: '<3M', brand: 'Oppo', shopSize: 'C', rev: 100, units: 1 },
    { m: 1, sale: 'SALE-B', seg: '<3M', brand: 'Oppo', shopSize: 'C', rev: 200, units: 2 },
  ],
  shop_segment_crosstab: [
    { m: 1, shop: 'MWG-SHOP-SALE-A-1', sale: 'SALE-A', seg: '<3M', shopSize: 'C', brand: 'Oppo', rev: 100, units: 1 },
    { m: 1, shop: 'MWG-SHOP-SALE-B-1', sale: 'SALE-B', seg: '<3M', shopSize: 'C', brand: 'Apple', rev: 900, units: 3 },
  ],
  shop_day_data: { 'MWG-SHOP-SALE-A-1': { '1-1': { oppo_rev: 1 } }, 'MWG-SHOP-SALE-B-1': { '1-1': { oppo_rev: 2 } } },
  shop_hour_all_brand: { 'MWG-SHOP-SALE-A-1': {}, 'MWG-SHOP-SALE-B-1': {} },
  shop_model_data: { 'MWG-SHOP-SALE-A-1': {}, 'MWG-SHOP-SALE-B-1': {} },
  shop_segment_all_brand: { 'MWG-SHOP-SALE-A-1': {}, 'MWG-SHOP-SALE-B-1': {} },
  shop_staff_pk1020: { 'MWG-SHOP-SALE-A-1': {}, 'MWG-SHOP-SALE-B-1': {} },
  mwg_target_map: { 1001: 50, 2001: 60 },
  daily: {
    sales: ['SALE-A', 'SALE-B'], segments: ['<3M'], brands: ['Oppo'], sizes: ['C'], models: ['M1'],
    rows: [[1, 1, 0, 0, 0, 100, 1, 0, 0], [1, 1, 1, 0, 0, 200, 2, 0, 0]],
  },
  kpi: { total_rev: 777777, total_units: 999, oppo_rev: 1, oppo_units: 1, apple_rev: 1,
    retail_rev: 1, oppo_rev_share: 99, oppo_units_share: 99, num_shops: 2, num_shops_with_oppo: 2 },
  brand_ranking: [{ brand: 'Apple', revenue: 777777, units: 999, rev_share: 99, units_share: 99 }],
  top_brands: ['Apple', 'Oppo'],
};

/* ================= KIEM ================= */
const kq = catPhamVi(A, B, { vaiTro: 'sale', sales: ['SALE-A'] });
const chuoi = JSON.stringify(kq.center) + JSON.stringify(kq.dataMwg);

// --- 1. RO RI: tim dau vet cua nguoi khac trong ca goi
const veta = ['SALE-B', 'SALE-C', 'CENTER-SHOP-SALE-B', 'CENTER-SHOP-SALE-C',
  'MWG-SHOP-SALE-B', 'MODEL-SALE-B', 'MODEL-CUA-NGUOI-KHAC', 'KHONG-DUOC-BUNG'];
const dinh = veta.filter((v) => chuoi.indexOf(v) >= 0);
ghi('KHONG mot dau vet nao cua nguoi khac lot vao goi', dinh.length === 0,
  dinh.length ? ('LOT: ' + dinh.join(', ')) : ('da quet ' + veta.length + ' dau vet'));

// --- 2. Phan cua chinh minh phai CON DU
ghi('Giu du phan cua chinh sale', chuoi.indexOf('CENTER-SHOP-SALE-A-1') >= 0
  && chuoi.indexOf('MWG-SHOP-SALE-A-1') >= 0);
ghi('Giu du ca shop kenh khac cua sale do (IND)', chuoi.indexOf('CENTER-SHOP-SALE-A-2') >= 0,
  'sale phu trach nhieu kenh thi phai thay het cac kenh cua minh');

// --- 3. So tong PHAI duoc tinh lai, khong bung nguyen so toan vung
ghi('kpi CENTER duoc tinh lai (khong bung so toan vung)',
  kq.center.kpi.totalRevenue !== A.kpi.totalRevenue && kq.center.kpi.numStores === 2,
  'doanh thu=' + kq.center.kpi.totalRevenue + ' | so shop=' + kq.center.kpi.numStores);
ghi('kpi MWG duoc tinh lai',
  kq.dataMwg.kpi.total_rev !== B.kpi.total_rev && kq.dataMwg.kpi.num_shops === 1,
  'doanh thu=' + kq.dataMwg.kpi.total_rev + ' | so shop=' + kq.dataMwg.kpi.num_shops);
ghi('Xep hang hang duoc tinh lai',
  JSON.stringify(kq.dataMwg.brand_ranking) !== JSON.stringify(B.brand_ranking),
  'so hang=' + kq.dataMwg.brand_ranking.length);
ghi('So theo tuan duoc tinh lai',
  JSON.stringify(kq.center.week_channel_units) !== JSON.stringify(A.week_channel_units),
  JSON.stringify(kq.center.week_channel_units));

// --- 4. Cau truc phai con nguyen, neu khong DB TG se vo khi ve
const thieuC = Object.keys(A).filter((k) => k !== 'debug_target' && kq.center[k] === undefined);
ghi('CENTER: khong thieu truong nao (tru debug)', thieuC.length === 0,
  thieuC.length ? ('thieu: ' + thieuC.join(', ')) : 'du ' + Object.keys(kq.center).length + ' truong');
const thieuM = Object.keys(B).filter((k) => kq.dataMwg[k] === undefined);
ghi('DATA MWG: khong thieu truong nao', thieuM.length === 0,
  thieuM.length ? ('thieu: ' + thieuM.join(', ')) : 'du ' + Object.keys(kq.dataMwg).length + ' truong');

// --- 5. daily.rows cat theo SALE (khong co chieu shop)
ghi('daily.rows cat dung theo sale', kq.dataMwg.daily.rows.length === 1
  && kq.dataMwg.daily.rows[0][2] === 0, 'con ' + kq.dataMwg.daily.rows.length + '/2 dong');

// --- 6. sell_in_rows so sanh Store ID dang chuoi (bay kieu du lieu)
ghi('sell_in cat dung theo Store ID', kq.center.sell_in_rows.length === 2,
  'con ' + kq.center.sell_in_rows.length + '/5 dong');

// --- 7. Bien che: sale KHONG duoc thay
ghi('Sale khong thay bien che nhan su',
  Object.keys(kq.center.channel_month_headcount).length === 0);

// --- 8. Leader: chi kenh cua minh
{
  const L = catPhamVi(A, B, { vaiTro: 'leader', kenh: 'IND' });
  const s2 = JSON.stringify(L.center) + JSON.stringify(L.dataMwg);
  ghi('Leader IND: chi thay shop kenh IND',
    s2.indexOf('CENTER-SHOP-SALE-A-2') >= 0 && s2.indexOf('CENTER-SHOP-SALE-A-1') < 0,
    'thay shop IND, khong thay shop MWG cua cung sale do');
  ghi('Leader IND: khong nhan khoi DATA MWG', L.dataMwg === null,
    'kenh IND khong lien quan bang thi truong MWG');
  ghi('Leader IND: co bien che kenh minh',
    !!(L.center.channel_month_headcount && L.center.channel_month_headcount.IND));
}

// --- 9. Admin: tra nguyen ban
{
  const Ad = catPhamVi(A, B, { vaiTro: 'admin' });
  ghi('Admin: van nhan nguyen ban', Ad.center === A && Ad.dataMwg === B);
}

const hong = KQ.filter((x) => !x.dat);
console.log('');
console.log('=== KET LUAN (cat pham vi) ===');
console.log('So phep kiem :', KQ.length);
console.log('Khong dat    :', hong.length);
hong.forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x.ten + (x.ct ? '  — ' + x.ct : '')));
process.exit(hong.length ? 1 : 0);
