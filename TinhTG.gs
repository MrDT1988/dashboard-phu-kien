var TG_CENTER = (function () {
  // COL
  const COL = {
    DATE: 0, MONTH: 1, STORE_ID: 2, STORE: 3, PG: 4, SALES: 5, CHANNEL: 6,
    LEVEL: 7, DISTRICT: 8, PROVINCE: 9, AREA: 10, SERIES_DETAIL: 11, SERIES: 12,
    MODEL: 13, MODEL_CODE: 14, CATEGORY: 15, COLOR: 16, PRICE: 17, SEGMENT: 18,
    SELLOUT: 19, SELLOUT_ACTIVATED: 20, DOANH_THU: 21, TARGET: 22
};
  // CHANNEL_GROUP_ORDER
  const CHANNEL_GROUP_ORDER = ['MWG', 'IND', 'KA'];
  // MWG_CHANNEL_NAMES
  const MWG_CHANNEL_NAMES = new Set(['TGDĐ', 'TGDD', 'ĐMX', 'DMX']);
  // SEGMENT_HINT_ORDER
  const SEGMENT_HINT_ORDER = ['<3M','< 5M','3-5M','5-7M','7-10M','10-15M','15-20M','20-30M','>20M','>30M'];
  function groupChannel(raw) {
    const c = (raw || '').trim();
    if (MWG_CHANNEL_NAMES.has(c)) return 'MWG';
    if (c.toUpperCase() === 'IND') return 'IND';
    return 'KA';
}
  function normStr(s) {
    if (s === null || s === undefined) return '';
    return String(s).trim().replace(/\s+/g, ' ');
}
  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
}
  function parseMonthNum(v) {
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
}
  function parseDateCell(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    // VA CHAM CHO APPS SCRIPT: getValues() tra o ngay la DOI TUONG Date (khong phai chuoi).
    // String(Date) trong Apps Script ra "Sun Aug 23 2026 00:00:00 GMT+0700" -> khong khop
    // regex nao ben duoi -> roi xuong new Date(s) -> getUTC* LUI 1 NGAY. Doc thang bang
    // Utilities.formatDate theo mui gio VN de khoi phu thuoc mui gio cua du an.
    if (Object.prototype.toString.call(raw) === '[object Date]') {
      if (isNaN(raw.getTime())) return null;
      var _iso = Utilities.formatDate(raw, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      return new Date(_iso + 'T00:00:00Z');
    }
    const s = String(raw).trim();
    // Apps Script tra o ngay dang Date -> JSON hoa theo gio UTC. Sheet de mui gio GMT+7 nen ngay
    // 23/8 (00:00 gio VN) thanh chuoi "2026-08-22T17:00:00.000Z"; cat 10 ky tu dau se ra 22/8,
    // LUI DUNG 1 NGAY. Vi vay khi chuoi CO phan gio thi quy ve ngay theo gio dia phuong cua trinh
    // duyet thay vi cat chuoi. Chuoi chi co ngay (khong gio) giu nguyen cach cu.
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const dt = new Date(s);
        if (!isNaN(dt.getTime())) return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    }
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(Date.UTC(+m[3], +m[2]-1, +m[1]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}
  function weekStartIso(raw) {
    const d = parseDateCell(raw);
    if (!d) return null;
    const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayNum));
    return monday.toISOString().slice(0, 10);
}
  function segmentSortKey(seg) {
    const idx = SEGMENT_HINT_ORDER.indexOf(seg);
    if (idx >= 0) return idx;
    const m = /(\d+)/.exec(seg || '');
    return m ? parseInt(m[1], 10) + 100 : 999;
}
  function computeData(rows) {
    // Crosstab hợp nhất: mọi biểu đồ/bảng (trừ store) đều lọc+gộp từ đây
    const crosstabMap = new Map(); // key m|channel|model|series|segment|sales -> {sellout, activated, rev}
    const storeMap = new Map(); // key store -> {sellout, activated, rev}
    const storeMonthMap = new Map(); // key store|month -> {sellout, activated, rev, channel}
    const storeChannelRevMap = new Map(); // store -> {channel: rev} để chọn kênh chính
    const storeLevelRevMap = new Map(); // store -> {level: rev} để chọn level chính
    const storeSaleRevMap = new Map(); // store -> {sale: rev} để chọn sale chính
    const storeTargetMap = new Map(); // store -> target (lấy giá trị lớn nhất từng thấy, nếu có cột Target ngay trong CENTER)
    const storeIdRevMap = new Map(); // store -> {storeId: rev} để chọn Store ID chính (dùng khớp với sheet Target 2026)
    const channelMonthSales = new Map(); // key channel|month -> Set(sale) — đếm số lượng Sale hoạt động
    const channelMonthPgs = new Map(); // key channel|month -> Set(pg) — đếm số lượng PG hoạt động
    const weekChannelUnitsMap = new Map(); // key = Thứ 2 đầu tuần (ISO yyyy-mm-dd) -> {MWG,IND,KA} doanh số (số máy)
    const weekRevMap = new Map(); // key = Thứ 2 đầu tuần (ISO yyyy-mm-dd) -> tổng doanh thu cả 3 kênh (dùng cho hàng DT ở bảng mini)
    const weekChannelModelsMap = new Map(); // key = Thứ 2 đầu tuần -> { MWG:{model:qty}, IND:{...}, KA:{...} } - breakdown
    // sản phẩm cho tooltip biểu đồ "Doanh số theo tuần — Cả năm 2026" (giống biểu đồ tuần IND).
    const indDailyMap = new Map(); // key = ngày ISO yyyy-mm-dd -> { [store]: {ds,dt} } - CHỈ kênh IND, dùng cho so
    // sánh "cùng kỳ ngày" ở bảng nhiệt Chi tiết IND khi tháng gần nhất chưa đủ dữ liệu cả tháng. Gộp theo
    // SHOP (không theo Sale) vì Sale "không rõ" còn được backfill theo tỉnh SAU khi computeData() chạy
    // xong (xem backfillUnknownIndSaleByProvince) - nếu gộp thẳng theo Sale ở đây sẽ bị lệch với Sale cuối
    // cùng hiển thị trên UI. Khi truy vấn (indCumulativeThroughDay) sẽ tự quy đổi Shop -> Sale hiện tại.
    const overviewDailyMap = new Map(); // key = ngày ISO -> { [channel]: { [store]: {sale, sellout, rev} } } - CẢ
    // 3 kênh (MWG/IND/KA), dùng cho 4 thẻ KPI Tổng quan so sánh "cùng kỳ ngày" khi tháng đang xem chưa đủ
    // dữ liệu cả tháng. Gộp theo Shop (Sale lấy giá trị dòng cuối cùng gặp - đủ dùng để lọc theo Sale).

    const monthsSet = new Set();
    const channelsSet = new Set();
    const seriesSet = new Set();
    const segmentsSet = new Set();
    const modelsSet = new Set();
    const salesSet = new Set();
    const seriesDetailMap = new Map(); // key m|channel|seriesDetail -> {sellout, rev}

    let totalSellout = 0, totalActivated = 0, totalRevenue = 0;

    for (const row of rows) {
        if (!row || row.length < 5) continue;
        const dateStr = row[COL.DATE];
        if (!dateStr) continue;
        const month = parseMonthNum(row[COL.MONTH]);
        const store = row[COL.STORE] || '(Không rõ)';
        const channel = groupChannel(row[COL.CHANNEL]);
        const series = row[COL.SERIES] || '(Không rõ)';
        const seriesDetail = row[COL.SERIES_DETAIL] || '(Không rõ)';
        const model = row[COL.MODEL] || '(Không rõ)';
        const level = row[COL.LEVEL] || '(Không rõ)';
        const segment = row[COL.SEGMENT] || '(Không rõ)';
        const sales = normStr(row[COL.SALES]) || '(Không rõ)';
        const pg = normStr(row[COL.PG]) || '(Không rõ)';
        const storeId = row[COL.STORE_ID] !== undefined && row[COL.STORE_ID] !== '' ? String(row[COL.STORE_ID]).trim() : '';
        const sellout = num(row[COL.SELLOUT]);
        const activated = num(row[COL.SELLOUT_ACTIVATED]);
        const revenue = num(row[COL.DOANH_THU]);
        const targetVal = num(row[COL.TARGET]);

        if (month) monthsSet.add(month);
        channelsSet.add(channel);
        seriesSet.add(series);
        segmentsSet.add(segment);
        modelsSet.add(model);
        salesSet.add(sales);

        totalSellout += sellout;
        totalActivated += activated;
        totalRevenue += revenue;

        const weekStart = weekStartIso(dateStr);
        if (weekStart) {
            if (!weekChannelUnitsMap.has(weekStart)) weekChannelUnitsMap.set(weekStart, { MWG: 0, IND: 0, KA: 0 });
            const wu = weekChannelUnitsMap.get(weekStart);
            wu[channel] = (wu[channel] || 0) + sellout;
            weekRevMap.set(weekStart, (weekRevMap.get(weekStart) || 0) + revenue);
            if (!weekChannelModelsMap.has(weekStart)) weekChannelModelsMap.set(weekStart, {});
            const wmBucket = weekChannelModelsMap.get(weekStart);
            if (!wmBucket[channel]) wmBucket[channel] = {};
            const wmModelName = model || '(Không rõ)';
            wmBucket[channel][wmModelName] = (wmBucket[channel][wmModelName] || 0) + sellout;
        }
        // Gộp riêng theo NGÀY (cùng 1 lần parse ngày cho cả 2 map bên dưới - tránh gọi parseDateCell 2 lần).
        // - indDailyMap: CHỈ kênh IND, phục vụ bảng nhiệt Chi tiết IND so sánh "cùng kỳ ngày".
        // - overviewDailyMap: CẢ 3 kênh, phục vụ 4 thẻ KPI Tổng quan so sánh "cùng kỳ ngày".
        const dayDate = parseDateCell(dateStr);
        if (dayDate) {
            const dayIso = dayDate.toISOString().slice(0, 10);
            if (channel === 'IND') {
                if (!indDailyMap.has(dayIso)) indDailyMap.set(dayIso, {});
                const dayBucket = indDailyMap.get(dayIso);
                if (!dayBucket[store]) dayBucket[store] = { ds: 0, dt: 0, models: {} };
                dayBucket[store].ds += sellout;
                dayBucket[store].dt += revenue;
                const modelName = model || '(Không rõ)';
                dayBucket[store].models[modelName] = (dayBucket[store].models[modelName] || 0) + sellout;
            }
            if (!overviewDailyMap.has(dayIso)) overviewDailyMap.set(dayIso, {});
            const ovChBucket = overviewDailyMap.get(dayIso);
            if (!ovChBucket[channel]) ovChBucket[channel] = {};
            if (!ovChBucket[channel][store]) ovChBucket[channel][store] = { sale: sales, sellout: 0, rev: 0 };
            const ovStoreBucket = ovChBucket[channel][store];
            ovStoreBucket.sellout += sellout;
            ovStoreBucket.rev += revenue;
            if (sales) ovStoreBucket.sale = sales;
        }

        if (month) {
            const key = month + '|' + channel + '|' + store + '|' + model + '|' + series + '|' + segment + '|' + sales;
            let rec = crosstabMap.get(key);
            if (!rec) { rec = { sellout: 0, activated: 0, rev: 0 }; crosstabMap.set(key, rec); }
            rec.sellout += sellout; rec.activated += activated; rec.rev += revenue;

            const cmKey = channel + '|' + month;
            if (sales && sales !== '(Không rõ)') {
                if (!channelMonthSales.has(cmKey)) channelMonthSales.set(cmKey, new Set());
                channelMonthSales.get(cmKey).add(sales);
            }
            if (pg && pg !== '(Không rõ)') {
                if (!channelMonthPgs.has(cmKey)) channelMonthPgs.set(cmKey, new Set());
                channelMonthPgs.get(cmKey).add(pg);
            }
        }

        if (!storeMap.has(store)) storeMap.set(store, { sellout: 0, activated: 0, rev: 0 });
        const st = storeMap.get(store);
        st.sellout += sellout; st.activated += activated; st.rev += revenue;

        if (!storeChannelRevMap.has(store)) storeChannelRevMap.set(store, {});
        const scr = storeChannelRevMap.get(store); scr[channel] = (scr[channel]||0) + revenue;
        if (!storeLevelRevMap.has(store)) storeLevelRevMap.set(store, {});
        const slr = storeLevelRevMap.get(store); slr[level] = (slr[level]||0) + revenue;
        if (!storeSaleRevMap.has(store)) storeSaleRevMap.set(store, {});
        const ssr = storeSaleRevMap.get(store); ssr[sales] = (ssr[sales]||0) + revenue;
        if (targetVal > 0) storeTargetMap.set(store, Math.max(storeTargetMap.get(store) || 0, targetVal));
        if (month) {
            const sdKey = month + '|' + channel + '|' + seriesDetail + '|' + sales;
            let sdRec = seriesDetailMap.get(sdKey);
            if (!sdRec) { sdRec = { sellout: 0, rev: 0 }; seriesDetailMap.set(sdKey, sdRec); }
            sdRec.sellout += sellout; sdRec.rev += revenue;
        }
        if (storeId) {
            if (!storeIdRevMap.has(store)) storeIdRevMap.set(store, {});
            const sir = storeIdRevMap.get(store); sir[storeId] = (sir[storeId]||0) + revenue;
        }

        if (month) {
            const smKey = store + '|' + month;
            if (!storeMonthMap.has(smKey)) storeMonthMap.set(smKey, { channel, sellout: 0, activated: 0, rev: 0 });
            const sm = storeMonthMap.get(smKey);
            sm.sellout += sellout; sm.activated += activated; sm.rev += revenue;
        }
    }

    function argmaxKey(obj) {
        let best = null, bestVal = -1;
        Object.entries(obj).forEach(([k,v]) => { if (v > bestVal) { bestVal = v; best = k; } });
        return best;
    }

    const monthLabels = Array.from(monthsSet).sort((a, b) => a - b).map(m => 'T' + m);
    const monthsSorted = Array.from(monthsSet).sort((a, b) => a - b);
    const channelsList = CHANNEL_GROUP_ORDER.filter(c => channelsSet.has(c));
    const seriesList = Array.from(seriesSet).sort();
    const segmentsList = Array.from(segmentsSet).sort((a, b) => segmentSortKey(a) - segmentSortKey(b));
    const modelsList = Array.from(modelsSet).sort();
    const salesList = Array.from(salesSet).sort();

    const crosstab = [];
    crosstabMap.forEach((v, key) => {
        const [m, channel, store, model, series, segment, sales] = key.split('|');
        crosstab.push({ m: parseInt(m, 10), channel, store, model, series, segment, sales, sellout: v.sellout, activated: v.activated, rev: v.rev });
    });

    const storeRows = [];
    storeMap.forEach((v, store) => {
        storeRows.push({
            store,
            channel: argmaxKey(storeChannelRevMap.get(store) || {}) || '(Không rõ)',
            level: argmaxKey(storeLevelRevMap.get(store) || {}) || '(Không rõ)',
            sale: argmaxKey(storeSaleRevMap.get(store) || {}) || '(Không rõ)',
            store_id: argmaxKey(storeIdRevMap.get(store) || {}) || '',
            target: storeTargetMap.get(store) || 0,
            sellout: v.sellout, activated: v.activated, revenue: v.rev,
            activation_rate: v.sellout ? +(v.activated / v.sellout * 100).toFixed(1) : 0,
        });
    });

    const storeMonthLookup = {};
    storeMonthMap.forEach((v, key) => {
        const [store, month] = key.split('|');
        if (!storeMonthLookup[store]) storeMonthLookup[store] = {};
        storeMonthLookup[store][month] = { sellout: v.sellout, activated: v.activated, rev: v.rev, channel: v.channel };
    });

    const seriesDetailCrosstab = [];
    seriesDetailMap.forEach((v, key) => {
        const [m, channel, seriesDetail, sales] = key.split('|');
        seriesDetailCrosstab.push({ m: parseInt(m, 10), channel, series_detail: seriesDetail, sales, sellout: v.sellout, rev: v.rev });
    });

    // channel_month_headcount: { channel: { month: { sales: [...names], pgs: [...names] } } } — dùng để đếm số lượng Sale/PG hoạt động
    const channelMonthHeadcount = {};
    channelMonthSales.forEach((set, key) => {
        const [channel, month] = key.split('|');
        if (!channelMonthHeadcount[channel]) channelMonthHeadcount[channel] = {};
        if (!channelMonthHeadcount[channel][month]) channelMonthHeadcount[channel][month] = { sales: [], pgs: [] };
        channelMonthHeadcount[channel][month].sales = Array.from(set);
    });
    channelMonthPgs.forEach((set, key) => {
        const [channel, month] = key.split('|');
        if (!channelMonthHeadcount[channel]) channelMonthHeadcount[channel] = {};
        if (!channelMonthHeadcount[channel][month]) channelMonthHeadcount[channel][month] = { sales: [], pgs: [] };
        channelMonthHeadcount[channel][month].pgs = Array.from(set);
    });

    return {
        kpi: {
            totalSellout, totalActivated, totalRevenue,
            activationRate: totalSellout ? +(totalActivated / totalSellout * 100).toFixed(1) : 0,
            numStores: storeMap.size,
            numChannels: channelsList.length,
        },
        month_labels: monthLabels,
        months_sorted: monthsSorted,
        channels_list: channelsList,
        series_list: seriesList,
        segments_list: segmentsList,
        models_list: modelsList,
        sales_list: salesList,
        crosstab: crosstab,
        series_detail_crosstab: seriesDetailCrosstab,
        week_channel_units: Object.fromEntries(weekChannelUnitsMap),
        week_revenue: Object.fromEntries(weekRevMap),
        week_channel_models: Object.fromEntries(weekChannelModelsMap),
        ind_daily_by_date: Object.fromEntries(indDailyMap),
        overview_daily_by_date: Object.fromEntries(overviewDailyMap),
        store_rows: storeRows,
        store_month_lookup: storeMonthLookup,
        channel_month_headcount: channelMonthHeadcount,
    };
}
  return { tinh: computeData };
})();
var TG_MWG = (function () {
  // COL
  const COL = {
    LOAI_SHOP: 0, MIEN: 2, TINH: 4, PHAN_KHUC: 5, NGUOI_TAO: 8, // NGUOI_TAO = cột I "Người tạo" = nhân viên bán hàng tại shop
    NGAY_XUAT: 9, // cột J "Ngày xuất hàng" — có giờ bán kèm theo sau ngày (dd/mm/yyyy hh:mm:ss). LƯU Ý: phần NGÀY/THÁNG của cột này có lỗi lẫn DD/MM (xem ghi chú "Lưu ý/rủi ro"), nhưng phần GIỜ:PHÚT:GIÂY phía sau không bị ảnh hưởng bởi lỗi đó nên vẫn dùng được để tách khung giờ bán.
    MA_SIEU_THI: 10, SIEU_THI_XUAT: 11, TEN_SAN_PHAM: 12, SO_LUONG: 13, NHA_SAN_XUAT: 15,
    THANG_SO: 17, NGAY: 18, SALE: 19, DOANH_THU: 20,
};
  // EXCLUDED_SHOPS
  const EXCLUDED_SHOPS = new Set([
    'AAR_BTR_BAT - 21A1 Trần Hưng Đạo (Ba Tri)',
    'AAR_TGI_GCO - 313 Nguyễn Huệ',
    'AAR_BTR_BTR - 591B Đồng Khởi',
    'AAR_TGI_CBE - Cái Bè',
    'AAR_TGI_MTH - 49/2 Ấp Bắc',
]);
  // SEGMENT_CANONICAL
  const SEGMENT_CANONICAL = ['<3M', '3-5M', '5-7M', '7-10M', '10-15M', '15-20M', '20-30M', '>20M', '>30M'];
  // PK1020_SEGMENTS
  const PK1020_SEGMENTS = ['10-15M', '15-20M'];
  // TARGET_BRANDS_4
  const TARGET_BRANDS_4 = ['Oppo', 'Samsung', 'Xiaomi', 'Apple'];
  // TOP_BRANDS_FIXED
  const TOP_BRANDS_FIXED = ['Apple', 'Samsung', 'Oppo', 'Xiaomi', 'Vivo', 'Realme'];
  // SHOP_SIZE_BY_STORE_ID
  const SHOP_SIZE_BY_STORE_ID = {"189": "S", "752": "S", "456": "S", "823": "S", "361": "S", "724": "S", "614": "S", "953": "S", "954": "S", "435": "S", "9390": "A", "716": "S", "303": "A", "1660": "B", "1840": "B", "155": "A", "552": "A", "1498": "A", "650": "A", "9257": "A", "1570": "B", "1051": "A", "863": "A", "1683": "B", "938": "A", "647": "B", "1457": "C", "6270": "B", "644": "C", "9105": "B", "5321": "C", "1348": "A", "1882": "B", "434": "B", "1050": "B", "3063": "C", "2342": "C", "1982": "C", "627": "D", "10510": "C", "6325": "D", "2410": "B", "7051": "C", "5248": "C", "3062": "C", "1166": "C", "1887": "C", "5499": "C", "13861": "C", "1503": "C", "2054": "D", "744": "C", "984": "B", "2413": "D", "1784": "C", "2245": "C", "7340": "C", "2870": "C", "12327": "C", "1581": "C", "9256": "C", "2244": "D", "2755": "C", "9189": "D", "8076": "C", "1922": "D", "1677": "D", "8742": "C", "2204": "C", "7803": "D", "2469": "D", "2881": "D", "7146": "C", "7095": "C", "6600": "D", "9236": "D", "5751": "D", "2740": "D", "6324": "D", "7825": "D", "9201": "D", "9987": "D", "7008": "D", "1397": "D", "10731": "D", "7610": "D", "9408": "D", "7826": "D", "6883": "D", "8983": "D", "7755": "D", "10177": "D", "6977": "D", "7094": "D", "7142": "D", "13900": "D", "10006": "D", "7125": "D", "6881": "D", "7620": "D", "7701": "D", "7611": "D", "7249": "D", "7693": "D", "7084": "D", "6929": "D", "7093": "D", "10344": "D", "8011": "D", "10471": "D", "7692": "D", "10544": "D", "10705": "D", "10479": "D", "6997": "D", "7318": "D", "7009": "D", "12061": "D", "7562": "D", "7092": "D", "9976": "D", "7702": "D", "7621": "D", "6909": "D"};
  function normStr(s) {
    if (s === null || s === undefined) return '';
    return String(s).trim().replace(/\s+/g, ' ');
}
  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
}
  function parseMonthNum(s) {
    if (!s) return null;
    const m = /THÁNG\s*(\d+)/i.exec(String(s));
    return m ? parseInt(m[1], 10) : null;
}
  function hourSlotLabel(h) {
    const start = Math.floor(h / 2) * 2;
    return start + 'h-' + (start + 2) + 'h';
}
  function parseHourFromDateTimeCell(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    // VA CHAM CHO APPS SCRIPT: xem chu thich o parseDateCell.
    if (Object.prototype.toString.call(raw) === '[object Date]') {
      if (isNaN(raw.getTime())) return null;
      var _h = parseInt(Utilities.formatDate(raw, 'Asia/Ho_Chi_Minh', 'H'), 10);
      return (_h >= 0 && _h <= 23) ? _h : null;
    }
    const s = String(raw).trim();
    let m = s.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+(\d{1,2}):(\d{2})/);
    if (m) {
        const h = parseInt(m[1], 10);
        if (h >= 0 && h <= 23) return h;
    }
    m = s.match(/T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(Z|\+00:?00)?$/);
    if (m) {
        let h = parseInt(m[1], 10);
        if (h >= 0 && h <= 23) {
            if (m[3]) h = (h + 7) % 24; // UTC -> giờ Việt Nam (UTC+7)
            return h;
        }
    }
    return null;
}
  function computeData(rows) {
    const brandTotalRev = {}, brandTotalUnits = {};
    const crosstabMap = new Map();
    const shopMeta = {};
    const shopSaleRev = {};
    const shopBrand4Month = {};
    const shopMonthTotal = {};
    const shopDayData = {}; // shop -> "m-d" -> { oppo_rev, oppo_units, samsung_rev, samsung_units, xiaomi_rev, xiaomi_units, apple_rev, apple_units, total_rev, total_units } — dùng cho bộ lọc Ngày
    const shopModelData = {}; // shop -> monthNum -> model -> { brand, rev, units } — dùng cho xem chi tiết sản phẩm theo shop, theo tháng
    const shopPk1020Month = {}; // shop -> monthNum -> { oppo_rev, oppo_units, total_rev, total_units } — riêng phân khúc giá 10-20M (gộp 10-15M + 15-20M)
    const shopStaffPk1020Month = {}; // shop -> monthNum -> nhân viên (cột "Người tạo") -> { rev, units } — riêng PK 10-20M, KHÔNG gồm Apple — dùng cho "Review 360 shop S/A/B" (Top 5 nhân viên bán hàng)
    const shopSegmentAllBrandMonth = {}; // shop -> monthNum -> phân khúc -> { rev, units } — TẤT CẢ hãng, dùng để xếp hạng "Top 3 phân khúc bán tốt nhất tại shop" (Review 360)
    const shopHourAllBrandMonth = {}; // shop -> monthNum -> khung giờ (2 tiếng) -> { rev, units } — TẤT CẢ hãng, dùng để xếp hạng "Top 3 khung giờ bán tốt nhất tại shop" (Review 360)
    const shopSegCrosstabMap = new Map(); // key m|shop|seg|brand -> { m, shop, sale, seg, shopSize, brand, rev, units } — dùng cho bộ lọc Shop ở khối "Tỉ trọng phân khúc"
    const monthsSet = new Set();
    const segmentsSet = new Set();
    const salesSet = new Set();
    const brandsSet = new Set();
    const saleOppoRev = {}, saleOppoUnits = {}, saleOtherRev = {}, saleOtherUnits = {};
    const saleShops = {};
    const dailyMap = new Map();

    for (const row of rows) {
        if (!row || row.length < 2) continue;
        const mien = row[COL.MIEN];
        if (!mien) continue;
        const shop = normStr(row[COL.SIEU_THI_XUAT]);
        if (!shop || EXCLUDED_SHOPS.has(shop)) continue;
        const brand = normStr(row[COL.NHA_SAN_XUAT]);
        const monthNum = parseMonthNum(row[COL.THANG_SO]);
        if (!monthNum) continue;
        const segment = normStr(row[COL.PHAN_KHUC]);
        const revenue = num(row[COL.DOANH_THU]);
        const qty = num(row[COL.SO_LUONG]);
        const tinh = normStr(row[COL.TINH]);
        const loaiShopRaw = row[COL.LOAI_SHOP];
        const dayStr = row[COL.NGAY];
        const sale = normStr(row[COL.SALE]) || '#N/A';
        const nguoiTao = normStr(row[COL.NGUOI_TAO]) || '(Không rõ)'; // cột I "Người tạo" = nhân viên bán hàng tại shop
        const gioBanHour = parseHourFromDateTimeCell(row[COL.NGAY_XUAT]); // giờ bán (0-23), tách từ cột J "Ngày xuất hàng" — null nếu không tách được
        const storeCode = normStr(row[COL.MA_SIEU_THI]);
        const rowShopSize = (storeCode && SHOP_SIZE_BY_STORE_ID[storeCode]) ? SHOP_SIZE_BY_STORE_ID[storeCode] : 'Chưa xếp size';
        const model = normStr(row[COL.TEN_SAN_PHAM]) || '(Không rõ model)';

        let loaiShop = 'Không xác định';
        if (loaiShopRaw) {
            const ls = String(loaiShopRaw).trim().toLowerCase();
            if (ls === 'focus') loaiShop = 'Focus';
            else if (ls === 'normal') loaiShop = 'Normal';
        }

        monthsSet.add(monthNum);
        if (segment) segmentsSet.add(segment);
        salesSet.add(sale);
        if (brand) brandsSet.add(brand);

        brandTotalRev[brand] = (brandTotalRev[brand] || 0) + revenue;
        brandTotalUnits[brand] = (brandTotalUnits[brand] || 0) + qty;

        const ctKey = monthNum + '|' + sale + '|' + segment + '|' + brand + '|' + rowShopSize;
        let ctRec = crosstabMap.get(ctKey);
        if (!ctRec) { ctRec = { m: monthNum, sale, seg: segment, brand, shopSize: rowShopSize, rev: 0, units: 0 }; crosstabMap.set(ctKey, ctRec); }
        ctRec.rev += revenue; ctRec.units += qty;

        const ssKey = monthNum + '|' + shop + '|' + segment + '|' + brand;
        let ssRec = shopSegCrosstabMap.get(ssKey);
        if (!ssRec) { ssRec = { m: monthNum, shop, sale, seg: segment, shopSize: rowShopSize, brand, rev: 0, units: 0 }; shopSegCrosstabMap.set(ssKey, ssRec); }
        ssRec.rev += revenue; ssRec.units += qty;

        const dayNum = parseInt(dayStr, 10);
        if (!isNaN(dayNum)) {
            const dKey = monthNum + '|' + dayNum + '|' + sale + '|' + segment + '|' + brand + '|' + rowShopSize + '|' + model;
            let dRec = dailyMap.get(dKey);
            if (!dRec) { dRec = { m: monthNum, d: dayNum, sale, seg: segment, brand, shopSize: rowShopSize, model, rev: 0, units: 0 }; dailyMap.set(dKey, dRec); }
            dRec.rev += revenue; dRec.units += qty;
        }

        if (!shopMeta[shop]) shopMeta[shop] = { loai_shop: loaiShop, tinh, store_code: storeCode };
        else if (shopMeta[shop].loai_shop === 'Không xác định' && loaiShop !== 'Không xác định') shopMeta[shop].loai_shop = loaiShop;
        if (!shopMeta[shop].store_code && storeCode) shopMeta[shop].store_code = storeCode;

        if (!shopSaleRev[shop]) shopSaleRev[shop] = {};
        shopSaleRev[shop][sale] = (shopSaleRev[shop][sale] || 0) + revenue;

        if (!shopMonthTotal[shop]) shopMonthTotal[shop] = {};
        if (!shopMonthTotal[shop][monthNum]) shopMonthTotal[shop][monthNum] = { rev: 0, units: 0 };
        shopMonthTotal[shop][monthNum].rev += revenue;
        shopMonthTotal[shop][monthNum].units += qty;

        if (TARGET_BRANDS_4.includes(brand)) {
            if (!shopBrand4Month[shop]) shopBrand4Month[shop] = {};
            if (!shopBrand4Month[shop][brand]) shopBrand4Month[shop][brand] = {};
            if (!shopBrand4Month[shop][brand][monthNum]) shopBrand4Month[shop][brand][monthNum] = { rev: 0, units: 0 };
            shopBrand4Month[shop][brand][monthNum].rev += revenue;
            shopBrand4Month[shop][brand][monthNum].units += qty;
        }

        if (PK1020_SEGMENTS.includes(segment)) {
            if (!shopPk1020Month[shop]) shopPk1020Month[shop] = {};
            if (!shopPk1020Month[shop][monthNum]) shopPk1020Month[shop][monthNum] = { oppo_rev:0, oppo_units:0, total_rev:0, total_units:0 };
            const pkCell = shopPk1020Month[shop][monthNum];
            pkCell.total_rev += revenue; pkCell.total_units += qty;
            if (brand === 'Oppo') { pkCell.oppo_rev += revenue; pkCell.oppo_units += qty; }

            // Top 5 nhân viên bán hàng (Review 360) — riêng PK 10-20M, KHÔNG tính Apple. Mỗi nhân viên giữ thêm breakdown theo model
            // để hiện "Top 5 sản phẩm 10-20M mà họ bán" bên cạnh tên khi bấm xem chi tiết.
            if (brand !== 'Apple') {
                if (!shopStaffPk1020Month[shop]) shopStaffPk1020Month[shop] = {};
                if (!shopStaffPk1020Month[shop][monthNum]) shopStaffPk1020Month[shop][monthNum] = {};
                if (!shopStaffPk1020Month[shop][monthNum][nguoiTao]) shopStaffPk1020Month[shop][monthNum][nguoiTao] = { rev: 0, units: 0, models: {} };
                const staffCell = shopStaffPk1020Month[shop][monthNum][nguoiTao];
                staffCell.rev += revenue;
                staffCell.units += qty;
                if (!staffCell.models[model]) staffCell.models[model] = { rev: 0, units: 0, brand };
                staffCell.models[model].rev += revenue;
                staffCell.models[model].units += qty;
            }
        }

        // Top 3 phân khúc bán tốt nhất tại shop (Review 360) — TẤT CẢ hãng (bức tranh thị trường chung tại shop, không riêng OPPO)
        if (segment) {
            if (!shopSegmentAllBrandMonth[shop]) shopSegmentAllBrandMonth[shop] = {};
            if (!shopSegmentAllBrandMonth[shop][monthNum]) shopSegmentAllBrandMonth[shop][monthNum] = {};
            if (!shopSegmentAllBrandMonth[shop][monthNum][segment]) shopSegmentAllBrandMonth[shop][monthNum][segment] = { rev: 0, units: 0 };
            shopSegmentAllBrandMonth[shop][monthNum][segment].rev += revenue;
            shopSegmentAllBrandMonth[shop][monthNum][segment].units += qty;
        }

        // Top 3 khung giờ bán tốt nhất tại shop (Review 360) — TẤT CẢ hãng, gộp theo khung 2 tiếng từ cột "Ngày xuất hàng"
        if (gioBanHour !== null) {
            const slot = hourSlotLabel(gioBanHour);
            if (!shopHourAllBrandMonth[shop]) shopHourAllBrandMonth[shop] = {};
            if (!shopHourAllBrandMonth[shop][monthNum]) shopHourAllBrandMonth[shop][monthNum] = {};
            if (!shopHourAllBrandMonth[shop][monthNum][slot]) shopHourAllBrandMonth[shop][monthNum][slot] = { rev: 0, units: 0 };
            shopHourAllBrandMonth[shop][monthNum][slot].rev += revenue;
            shopHourAllBrandMonth[shop][monthNum][slot].units += qty;
        }

        if (!isNaN(dayNum)) {
            const dayKey = monthNum + '-' + dayNum;
            if (!shopDayData[shop]) shopDayData[shop] = {};
            if (!shopDayData[shop][dayKey]) shopDayData[shop][dayKey] = {
                oppo_rev:0, oppo_units:0, samsung_rev:0, samsung_units:0,
                xiaomi_rev:0, xiaomi_units:0, apple_rev:0, apple_units:0,
                total_rev:0, total_units:0,
                pk1020_oppo_rev:0, pk1020_oppo_units:0, pk1020_total_rev:0, pk1020_total_units:0,
            };
            const dCell = shopDayData[shop][dayKey];
            dCell.total_rev += revenue; dCell.total_units += qty;
            if (brand === 'Oppo') { dCell.oppo_rev += revenue; dCell.oppo_units += qty; }
            else if (brand === 'Samsung') { dCell.samsung_rev += revenue; dCell.samsung_units += qty; }
            else if (brand === 'Xiaomi') { dCell.xiaomi_rev += revenue; dCell.xiaomi_units += qty; }
            else if (brand === 'Apple') { dCell.apple_rev += revenue; dCell.apple_units += qty; }
            if (PK1020_SEGMENTS.includes(segment)) {
                dCell.pk1020_total_rev += revenue; dCell.pk1020_total_units += qty;
                if (brand === 'Oppo') { dCell.pk1020_oppo_rev += revenue; dCell.pk1020_oppo_units += qty; }
            }
        }

        if (!shopModelData[shop]) shopModelData[shop] = {};
        if (!shopModelData[shop][monthNum]) shopModelData[shop][monthNum] = {};
        if (!shopModelData[shop][monthNum][model]) shopModelData[shop][monthNum][model] = { brand, rev: 0, units: 0 };
        shopModelData[shop][monthNum][model].rev += revenue;
        shopModelData[shop][monthNum][model].units += qty;

        if (!saleShops[sale]) saleShops[sale] = new Set();
        saleShops[sale].add(shop);
        if (brand === 'Oppo') {
            saleOppoRev[sale] = (saleOppoRev[sale] || 0) + revenue;
            saleOppoUnits[sale] = (saleOppoUnits[sale] || 0) + qty;
        } else {
            saleOtherRev[sale] = (saleOtherRev[sale] || 0) + revenue;
            saleOtherUnits[sale] = (saleOtherUnits[sale] || 0) + qty;
        }
    }

    const maxMonth = monthsSet.size ? Math.max(...monthsSet) : 0;
    const monthLabels = [];
    for (let i = 1; i <= maxMonth; i++) monthLabels.push('T' + i);

    const totalRev = Object.values(brandTotalRev).reduce((a, b) => a + b, 0);
    const totalUnits = Object.values(brandTotalUnits).reduce((a, b) => a + b, 0);
    const oppoRev = brandTotalRev['Oppo'] || 0;
    const oppoUnits = brandTotalUnits['Oppo'] || 0;
    const appleRevTotal = brandTotalRev['Apple'] || 0;
    const retailRevTotal = totalRev - appleRevTotal; // thị trường loại Apple — dùng để tính % OPPO/thị trường

    const shopRowsBrand4 = [];
    const shopPrimarySale = {};
    Object.keys(shopMeta).forEach(shop => {
        const smap = shopSaleRev[shop] || {};
        let best = null, bestVal = -1;
        Object.entries(smap).forEach(([s, v]) => { if (v > bestVal) { bestVal = v; best = s; } });
        shopPrimarySale[shop] = best || '#N/A';
    });

    let numShopsWithOppo = 0;
    Object.keys(shopMeta).forEach(shop => {
        const brandsObj = {};
        TARGET_BRANDS_4.forEach(bn => {
            const monthlyRev = [], monthlyUnits = [];
            for (let m = 1; m <= maxMonth; m++) {
                const cell = (shopBrand4Month[shop] && shopBrand4Month[shop][bn] && shopBrand4Month[shop][bn][m]) || { rev: 0, units: 0 };
                monthlyRev.push(cell.rev); monthlyUnits.push(cell.units);
            }
            const totalRevB = monthlyRev.reduce((a, b) => a + b, 0);
            const totalUnitsB = monthlyUnits.reduce((a, b) => a + b, 0);
            brandsObj[bn] = { monthly_rev: monthlyRev, monthly_units: monthlyUnits, total_rev: totalRevB, total_units: totalUnitsB };
        });
        if (brandsObj['Oppo'].total_rev > 0) numShopsWithOppo++;

        const monthlyTotalRev = [], monthlyTotalUnits = [];
        for (let m = 1; m <= maxMonth; m++) {
            const cell = (shopMonthTotal[shop] && shopMonthTotal[shop][m]) || { rev: 0, units: 0 };
            monthlyTotalRev.push(cell.rev); monthlyTotalUnits.push(cell.units);
        }

        // Doanh thu/doanh số riêng phân khúc giá PK 10-20M (10-15M + 15-20M), theo tháng
        const pk1020MonthlyOppoRev = [], pk1020MonthlyOppoUnits = [], pk1020MonthlyTotalRev = [], pk1020MonthlyTotalUnits = [];
        for (let m = 1; m <= maxMonth; m++) {
            const pkCell = (shopPk1020Month[shop] && shopPk1020Month[shop][m]) || { oppo_rev:0, oppo_units:0, total_rev:0, total_units:0 };
            pk1020MonthlyOppoRev.push(pkCell.oppo_rev); pk1020MonthlyOppoUnits.push(pkCell.oppo_units);
            pk1020MonthlyTotalRev.push(pkCell.total_rev); pk1020MonthlyTotalUnits.push(pkCell.total_units);
        }

        // Phân Size shop: dùng đúng bảng phân loại anh Thái cung cấp, khớp theo Mã siêu thị xuất hàng (store_code)
        const storeCode = shopMeta[shop].store_code;
        const shopSize = (storeCode && SHOP_SIZE_BY_STORE_ID[storeCode]) ? SHOP_SIZE_BY_STORE_ID[storeCode] : 'Chưa xếp size';

        shopRowsBrand4.push({
            shop, tinh: shopMeta[shop].tinh, loai_shop: shopMeta[shop].loai_shop,
            sale: shopPrimarySale[shop], brands: brandsObj,
            monthly_total_rev: monthlyTotalRev, monthly_total_units: monthlyTotalUnits,
            pk1020_monthly_oppo_rev: pk1020MonthlyOppoRev, pk1020_monthly_oppo_units: pk1020MonthlyOppoUnits,
            pk1020_monthly_total_rev: pk1020MonthlyTotalRev, pk1020_monthly_total_units: pk1020MonthlyTotalUnits,
            shop_size: shopSize, store_code: storeCode,
        });
    });

    const saleRows = [];
    Array.from(salesSet).forEach(sale => {
        const orev = saleOppoRev[sale] || 0, ounits = saleOppoUnits[sale] || 0;
        const orrev = saleOtherRev[sale] || 0, orunits = saleOtherUnits[sale] || 0;
        const totalRevS = orev + orrev, totalUnitsS = ounits + orunits;
        saleRows.push({
            sale, num_shops: (saleShops[sale] || new Set()).size,
            oppo_revenue: orev, oppo_units: Math.round(ounits),
            other_revenue: orrev, other_units: Math.round(orunits),
            pct_oppo_rev: totalRevS ? +(orev / totalRevS * 100).toFixed(1) : 0,
            pct_oppo_units: totalUnitsS ? +(ounits / totalUnitsS * 100).toFixed(1) : 0,
        });
    });
    saleRows.sort((a, b) => b.oppo_revenue - a.oppo_revenue);

    const segmentsList = SEGMENT_CANONICAL.filter(s => segmentsSet.has(s));
    Array.from(segmentsSet).forEach(s => { if (!segmentsList.includes(s)) segmentsList.push(s); });
    const salesList = Array.from(salesSet).sort();
    const crosstab = Array.from(crosstabMap.values());
    const shopSegmentCrosstab = Array.from(shopSegCrosstabMap.values());

    const dailySalesArr = salesList.slice();
    const dailySegArr = segmentsList.slice();
    const dailyBrandArr = Array.from(brandsSet).sort();
    const dailySizeArr = ['S','A','B','C','D','Chưa xếp size'];
    const dailyModelSet = new Set();
    dailyMap.forEach(rec => dailyModelSet.add(rec.model));
    const dailyModelArr = Array.from(dailyModelSet).sort();
    const saleIdxMap = new Map(dailySalesArr.map((s, i) => [s, i]));
    const segIdxMap = new Map(dailySegArr.map((s, i) => [s, i]));
    const brandIdxMap = new Map(dailyBrandArr.map((s, i) => [s, i]));
    const sizeIdxMap = new Map(dailySizeArr.map((s, i) => [s, i]));
    const modelIdxMap = new Map(dailyModelArr.map((s, i) => [s, i]));
    const dailyRows = [];
    dailyMap.forEach(rec => {
        const si = saleIdxMap.has(rec.sale) ? saleIdxMap.get(rec.sale) : -1;
        const gi = segIdxMap.has(rec.seg) ? segIdxMap.get(rec.seg) : -1;
        const bi = brandIdxMap.has(rec.brand) ? brandIdxMap.get(rec.brand) : -1;
        const zi = sizeIdxMap.has(rec.shopSize) ? sizeIdxMap.get(rec.shopSize) : -1;
        const mi = modelIdxMap.has(rec.model) ? modelIdxMap.get(rec.model) : -1;
        if (si < 0 || gi < 0 || bi < 0 || zi < 0 || mi < 0) return;
        dailyRows.push([rec.m, rec.d, si, gi, bi, Math.round(rec.rev), rec.units, zi, mi]);
    });

    const brandRanking = Object.entries(brandTotalRev).sort((a, b) => b[1] - a[1]).map(([brand, rev]) => ({
        brand, revenue: rev, units: Math.round(brandTotalUnits[brand] || 0),
        rev_share: totalRev ? +(rev / totalRev * 100).toFixed(1) : 0,
        units_share: totalUnits ? +((brandTotalUnits[brand] || 0) / totalUnits * 100).toFixed(1) : 0,
    }));

    return {
        kpi: {
            total_rev: totalRev, total_units: Math.round(totalUnits),
            oppo_rev: oppoRev, oppo_units: Math.round(oppoUnits),
            apple_rev: appleRevTotal, retail_rev: retailRevTotal,
            oppo_rev_share: retailRevTotal > 0 ? +(oppoRev / retailRevTotal * 100).toFixed(1) : 0, // đã loại Apple khỏi mẫu số
            oppo_units_share: totalUnits ? +(oppoUnits / totalUnits * 100).toFixed(1) : 0,
            num_shops: Object.keys(shopMeta).length,
            num_shops_with_oppo: numShopsWithOppo,
        },
        brand_ranking: brandRanking,
        month_labels: monthLabels,
        segment_order: segmentsList,
        segments_list: segmentsList,
        sales_list: salesList,
        size_shop_list: ['S','A','B','C','D','Chưa xếp size'],
        top_brands: TOP_BRANDS_FIXED.filter(b => brandsSet.has(b)),
        crosstab,
        shop_segment_crosstab: shopSegmentCrosstab,
        daily: { sales: dailySalesArr, segments: dailySegArr, brands: dailyBrandArr, sizes: dailySizeArr, models: dailyModelArr, rows: dailyRows },
        shop_rows_brand4: shopRowsBrand4,
        shop_day_data: shopDayData,
        shop_model_data: shopModelData,
        sale_rows: saleRows,
        shop_staff_pk1020: shopStaffPk1020Month, // Review 360: shop -> monthNum -> nhân viên -> {rev, units} (PK 10-20M, trừ Apple)
        shop_segment_all_brand: shopSegmentAllBrandMonth, // Review 360: shop -> monthNum -> phân khúc -> {rev, units} (tất cả hãng)
        shop_hour_all_brand: shopHourAllBrandMonth, // Review 360: shop -> monthNum -> khung giờ (2 tiếng) -> {rev, units} (tất cả hãng)
    };
}
  return { tinh: computeData };
})();
/**
 * ===================================================================
 * TÍNH SỐ NGAY TRÊN APPS SCRIPT — cho DB TG (tg.html)
 * ===================================================================
 *
 * VÌ SAO CÓ FILE NÀY (02/09/2026):
 *   Trước đây tg.html tải 152.000 dòng thô về TRÌNH DUYỆT rồi mới tính.
 *   Vì quá nặng nên phải đẻ thêm ba tầng chống đỡ: checkpoint trong trình
 *   duyệt, robot GitHub mở trang để đóng gói, và gói mã hoá từng người.
 *   Mỗi tầng là một chỗ để số liệu cũ đi và một chỗ để hỏng — ngày 02/09
 *   cả ba cùng lộ: gói cũ 23/8, checkpoint cũ 25/8, robot hỏng 4 lượt,
 *   và robot chạy giờ UTC nên mọi ngày lùi lại một hôm.
 *
 *   Dashboard Miền Trung không có vấn đề đó vì nó TÍNH NGAY TRÊN APPS
 *   SCRIPT rồi lưu kết quả — doGet chỉ đọc file đã tính. File này bê đúng
 *   cách làm đó sang cho DB TG.
 *
 * CÁCH DÙNG:
 *   1. Chạy tay hàm  TG_chotKy()  một lần (menu chọn hàm > Chạy).
 *      Nó đọc CENTER + DATA MWG, tính toàn bộ, lưu 2 file JSON lên Drive.
 *   2. Từ đó tg.html chỉ cần gọi:  ?mode=tinh&phan=center  và  ?mode=tinh&phan=mwg
 *   3. Có số liệu mới thì chạy lại TG_chotKy() (hoặc bấm nút trên dashboard).
 *
 * AN TOÀN: file này chỉ THÊM. Không sửa, không xoá bất cứ hàm cũ nào.
 * Mọi chế độ cũ (info/data/checkpoint/cpmeta/cpart/lammoi) giữ nguyên.
 * ===================================================================
 */

var TG_TEP = { center: 'TG_tinh_CENTER.json', mwg: 'TG_tinh_DATA_MWG.json' };

/** Đọc toàn bộ một sheet, bỏ dòng tiêu đề. */
function TG_docSheet_(ten) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ten);
  if (!sh) throw new Error('Không tìm thấy sheet "' + ten + '"');
  var soDong = sh.getLastRow(), soCot = sh.getLastColumn();
  if (soDong < 2) return [];
  return sh.getRange(2, 1, soDong - 1, soCot).getValues();
}

/** Ghi đè (hoặc tạo mới) một file JSON trên Drive của chính tài khoản. */
function TG_luuTep_(ten, chuoi) {
  var it = DriveApp.getFilesByName(ten);
  if (it.hasNext()) { var f = it.next(); f.setContent(chuoi); return f.getId(); }
  return DriveApp.createFile(ten, chuoi, MimeType.PLAIN_TEXT).getId();
}

function TG_docTep_(ten) {
  var it = DriveApp.getFilesByName(ten);
  if (!it.hasNext()) return null;
  return it.next().getBlob().getDataAsString();
}

/**
 * CHỐT KỲ — tính lại toàn bộ rồi lưu. Chạy tay, hoặc gọi qua ?mode=chotky.
 * Trả về vài con số để đối chiếu nhanh.
 */
function TG_chotKy() {
  var t0 = new Date().getTime();
  var bienNhan = { chotLuc: new Date().toISOString() };

  var rowsC = TG_docSheet_('CENTER');
  var dataC = TG_CENTER.tinh(rowsC);
  TG_luuTep_(TG_TEP.center, JSON.stringify({ chotLuc: bienNhan.chotLuc, soDong: rowsC.length, data: dataC }));
  bienNhan.center = { dong: rowsC.length, thang: (dataC.months_sorted || dataC.months || []).length };

  var rowsM = TG_docSheet_('DATA MWG');
  var dataM = TG_MWG.tinh(rowsM);
  TG_luuTep_(TG_TEP.mwg, JSON.stringify({ chotLuc: bienNhan.chotLuc, soDong: rowsM.length, data: dataM }));
  bienNhan.mwg = { dong: rowsM.length };

  bienNhan.giay = Math.round((new Date().getTime() - t0) / 100) / 10;
  Logger.log(JSON.stringify(bienNhan));
  return bienNhan;
}

/** Dùng trong doGet: trả về nội dung đã tính sẵn. */
function TG_traKetQua_(phan) {
  /* BOC TOAN BO TRONG try/catch.
     Apps Script nem loi ra ngoai doGet thi tra ve mot trang HTML bao loi, va
     trang do KHONG co header CORS -> trinh duyet chi thay "Failed to fetch",
     khong doc duoc ly do that. Da mat mot luc moi lan ra la do thieu
     SALE_CODES. Nay loi gi cung tra ve JSON doc duoc. */
  try { return TG_traKetQuaThat_(phan); }
  catch (e) { return { error: String(e && e.message || e) }; }
}

function TG_traKetQuaThat_(phan) {
  phan = String(phan || 'center');
  /* DUONG CHAY TAY QUA HTTP.
     Trinh don chon ham trong trinh soan Apps Script rat kho bam tu dong (menu
     dong lai truoc khi kip chon). Cac "phan" duoi day cho phep goi thang mot ham
     chan doan bang URL: ?mode=tinh&phan=<ten>. Chi doc, KHONG sua gi trong sheet. */
  if (phan === 'soiphu')  return { soi: TG_soiSheetPhu() };
  if (phan === 'soicot')  return { soi: TG_soiCotDT() };
  if (phan === 'xemlich') return { lich: TG_xemLich() };
  if (phan === 'soiapp')  return { soi: TG_soiAppData() };
  if (phan === 'appindex') return TG_traIndexApp_();
  if (phan === 'dunggoi')  return TG_dungGoiApp();
  if (phan === 'kiempv')   return TG_kiemPhamViApp();

  /* Lay goi cua dung mot nguoi: phan = "goi/<id>/<ban bam>".
     Nhet ca ba thu vao MOT tham so "phan" de KHONG phai sua Ma.gs — file do
     dang co phien lam viec khac dung chung, cham vao la de dam nhau. Khi nao
     ranh se don lai cho gon. */
  if (phan.indexOf('goi/') === 0) {
    var pt = phan.split('/');
    return TG_traGoiNguoi_(pt[1], pt[2]);
  }

  var ten = TG_TEP[phan];
  if (!ten) return { error: 'phan phai la center | mwg | soiphu | soicot | soiapp | xemlich' };
  var txt = TG_docTep_(ten);
  if (!txt) return { error: 'Chua chot ky lan nao. Chay ham TG_chotKy() mot lan.' };
  return txt; // đã là chuỗi JSON
}

/**
 * TG_datLich — dat lich TU DONG chot ky, chay TRONG Apps Script.
 *
 * VI SAO: mode=tinh chi DOC lai goi da chot san (nhanh, khong ton gi). Neu khong
 * ai bam chot ky thi goi do dung yen. Lich nay chay TG_chotKy moi 2 gio, hoan
 * toan tren may chu Google: khong can may anh Thai bat, khong can token, khong
 * can robot GitHub. Co so moi tren sheet -> cham nhat 2 tieng sau F5 la ra so.
 *
 * Chay ham nay MOT LAN. Chay lai cung khong sao: no xoa lich cu cua TG_chotKy
 * truoc khi tao lich moi nen khong bao gio bi nhan doi.
 */
function TG_datLich() {
  var cu = ScriptApp.getProjectTriggers();
  var daXoa = 0;
  for (var i = 0; i < cu.length; i++) {
    if (cu[i].getHandlerFunction() === 'TG_chotKy') { ScriptApp.deleteTrigger(cu[i]); daXoa++; }
  }
  ScriptApp.newTrigger('TG_chotKy').timeBased().everyHours(2).create();
  var con = ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'TG_chotKy'; }).length;
  var bao = 'Da xoa ' + daXoa + ' lich cu, dat lich moi: TG_chotKy moi 2 gio. Dang co ' + con + ' lich.';
  Logger.log(bao);
  return bao;
}

/** Xem dang co nhung lich nao (de kiem lai). */
function TG_xemLich() {
  var t = ScriptApp.getProjectTriggers().map(function (x) {
    return x.getHandlerFunction() + ' | ' + x.getEventType();
  });
  Logger.log(JSON.stringify(t));
  return t;
}

/* ===========================================================================
 * SUA COT DOANH THU THANG 8 CUA SHEET CENTER
 * Thang 1-7: 100% dong co Doanh thu = Gia x Sellout. Rieng thang 8 hong:
 * 2.189/5.138 dong bo trong, so con lai khong khop (ban 3 may chi ghi gia 1 may).
 * Hau qua: T8 hien 13,8B thay vi ~48B; ASP 2,7M thay vi 9,35M; MoM -66,5%
 * thay vi +16%. Doi chieu so MWG tu gui (31,8B) da xac nhan.
 * CHAY TG_soiCotDT() TRUOC - ham do khong sua gi, chi bao cao.
 * =========================================================================*/

function TG_soiCotDT() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CENTER');
  var n = sh.getLastRow();
  var bao = { tongDong: n };
  var ct = sh.getRange(1, 22, Math.min(n, 40), 1).getFormulas();
  var coCT = ct.filter(function (r) { return r[0] !== ''; });
  bao.congThucTrong40DongDau = coCT.length;
  bao.viDuCongThuc = coCT.length ? coCT[0][0].slice(0, 80) : '(khong co - so cung)';
  var thang = sh.getRange(1, 2, n, 1).getValues();
  var dau = -1, cuoi = -1;
  for (var i = 0; i < n; i++) {
    if (Number(thang[i][0]) === 8) { if (dau < 0) dau = i + 1; cuoi = i + 1; }
  }
  bao.dongDauT8 = dau; bao.dongCuoiT8 = cuoi;
  if (dau > 0) {
    var so = cuoi - dau + 1;
    var v = sh.getRange(dau, 1, so, 22).getValues();
    var ctV = sh.getRange(dau, 22, so, 1).getFormulas();
    var cCT = 0, trong = 0, khop = 0, lech = 0, thieu = 0, may = 0, dtCu = 0, dtMoi = 0;
    for (var j = 0; j < so; j++) {
      if (ctV[j][0] !== '') cCT++;
      var gia = Number(v[j][17]) || 0, sl = Number(v[j][19]) || 0, dt = Number(v[j][21]) || 0;
      if (!gia || !sl) { thieu++; continue; }
      may += sl; dtCu += dt; dtMoi += gia * sl;
      if (v[j][21] === '' || v[j][21] === null) trong++;
      else if (Math.abs(dt - gia * sl) < 1000) khop++;
      else lech++;
    }
    bao.soDongT8 = so; bao.dongCoCongThucTrongV = cCT;
    bao.dongTrongDT = trong; bao.dongKhopGiaXSL = khop; bao.dongLECH = lech;
    bao.dongThieuGiaHoacSL = thieu; bao.tongMay = may;
    bao.doanhThuHienTai = Math.round(dtCu / 1e6) / 1000 + 'B';
    bao.doanhThuSauKhiSua = Math.round(dtMoi / 1e6) / 1000 + 'B';
  }
  Logger.log(JSON.stringify(bao));
  return bao;
}
/* Ham TG_suaDoanhThuT8 DA BI XOA (02/09/2026).
 * Ly do: cot Doanh thu la CONG THUC =R2*T2 chay song, khong phai so cung.
 * Ghi de bang setValues() se pha cong thuc -> thang sau nhap so lai phai sua tay.
 * Neu thay so doanh thu sai, chay TG_soiCotDT() de biet dong nao hong, roi
 * keo lai cong thuc trong sheet - dung ghi de bang script. */

/* ============================================================================
 * CHANG 2 — PHAN 1: BON SHEET PHU
 * ----------------------------------------------------------------------------
 * tg.html khong chi doc CENTER va DATA MWG. No con doc them 4 sheet nua roi VA
 * vao goi truoc khi ve. Neu Apps Script bo qua 4 sheet nay thi goi cua sale se
 * thieu Target, thieu Sell In, va dung SAI ten sale phu trach kenh IND.
 *
 *   Target 2026     cot B = Store ID, cot C = Target doanh thu
 *   SELL IN         Store ID | Retailer | Province | Thang | Product | Nhom | SL
 *   SHOP THEO SALE  A=StoreID B=Store C=Sales D=Channel E=Size shop  (chi IND)
 *   Share KA        thi phan FPT + Viettel, hai bang canh nhau
 *
 * Sheet nao khong co thi bo qua em ai, KHONG lam hong ca goi — giong het cach
 * tg.html xu ly (no bat try/catch tung sheet mot).
 * ==========================================================================*/

var TG_SHEET_PHU = {
  TARGET: 'Target 2026',
  SELL_IN: 'SELL IN',
  SHOP_SALE: 'SHOP THEO SALE',
  SHARE_KA: 'Share KA',
};

/** Doc ca sheet, tra ve mang dong (da bo dong tieu de). Khong co sheet -> []. */
function TG_docSheetPhu_(ten) {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ten);
    if (!sh) { Logger.log('Khong co sheet "' + ten + '" - bo qua.'); return []; }
    var n = sh.getLastRow(), c = sh.getLastColumn();
    if (n < 2 || c < 1) return [];
    var v = sh.getRange(1, 1, n, c).getValues();
    v.shift(); // bo tieu de, giong tg.html
    return v;
  } catch (e) {
    Logger.log('Loi doc sheet "' + ten + '": ' + e.message + ' - bo qua.');
    return [];
  }
}

function TG_soPhu_(v) {
  if (v === null || v === undefined || v === '') return 0;
  var n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * Va 3 sheet phu vao goi CENTER — dung thu tu va dung cach tg.html lam
 * (xem tg.html doan 3775-3830). Tra ve bang thong ke de doi chieu.
 */
function TG_ganSheetPhu_(A) {
  var tk = {};

  // ---- 1. Target theo Store ID ----
  var tRows = TG_docSheetPhu_(TG_SHEET_PHU.TARGET);
  var target = {};
  tRows.forEach(function (r) {
    if (!r || r.length < 3) return;
    var id = (r[1] !== undefined && r[1] !== '') ? String(r[1]).trim() : '';
    if (id) target[id] = TG_soPhu_(r[2]);
  });
  var khop = 0;
  (A.store_rows || []).forEach(function (r) {
    if (r.store_id != null && target[String(r.store_id).trim()] !== undefined) {
      r.target = target[String(r.store_id).trim()];
      if (r.target > 0) khop++;
    } else { r.target = 0; }
  });
  tk.targetDong = Object.keys(target).length;
  tk.targetKhop = khop;

  // ---- 2. SELL IN (chi kenh IND dung) ----
  A.sell_in_rows = TG_docSheetPhu_(TG_SHEET_PHU.SELL_IN);
  tk.sellInDong = A.sell_in_rows.length;

  // ---- 3. SHOP THEO SALE — nguon CHUAN cho Sale phu trach + Goi O.C cua IND ----
  var sRows = TG_docSheetPhu_(TG_SHEET_PHU.SHOP_SALE);
  var theoTen = {}, mucTheoTen = {};
  sRows.forEach(function (r) {
    if (!r || r.length < 3) return;
    var ten = String(r[1] || '').trim();
    var sale = String(r[2] || '').trim();
    var kenh = String(r[3] || '').trim().toUpperCase();
    var muc = String(r[4] || '').trim();
    if (kenh !== 'IND') return;              // sheet chi dung cho IND
    if (ten && sale) theoTen[ten] = sale;
    if (ten && muc) mucTheoTen[ten] = muc;
  });
  A.shop_sale_map = theoTen;
  A.shop_level_map = mucTheoTen;

  var vaCross = 0, vaSale = 0, vaMuc = 0;
  if (Object.keys(theoTen).length) {
    (A.crosstab || []).forEach(function (rec) {
      if (rec.channel !== 'IND' || !rec.store) return;
      var s = theoTen[rec.store];
      if (s && s !== rec.sales) { rec.sales = s; vaCross++; }
    });
    (A.store_rows || []).forEach(function (r) {
      if (r.channel !== 'IND' || !r.store) return;
      var s = theoTen[r.store];
      if (s && s !== r.sale) { r.sale = s; vaSale++; }
      var m = mucTheoTen[r.store];
      if (m && m !== r.level) { r.level = m; vaMuc++; }
    });
    // sales_list phai theo Sale ĐÃ VÁ, khong con theo CENTER nua
    var tapSale = {};
    (A.store_rows || []).forEach(function (r) { if (r.sale) tapSale[r.sale] = 1; });
    (A.crosstab || []).forEach(function (r) { if (r.sales) tapSale[r.sales] = 1; });
    A.sales_list = Object.keys(tapSale).sort();
  }
  tk.vaCrosstab = vaCross; tk.vaStoreSale = vaSale; tk.vaStoreMuc = vaMuc;
  tk.soSale = (A.sales_list || []).length;

  return tk;
}

/** Doc rieng Share KA (thi phan FPT + Viettel) - di kem goi MWG. */
function TG_docShareKa_() {
  return TG_docSheetPhu_(TG_SHEET_PHU.SHARE_KA);
}

/** Chay tay de xem 4 sheet phu doc ra sao, KHONG sua gi. */
function TG_soiSheetPhu() {
  var bao = {};
  Object.keys(TG_SHEET_PHU).forEach(function (k) {
    var r = TG_docSheetPhu_(TG_SHEET_PHU[k]);
    bao[TG_SHEET_PHU[k]] = r.length + ' dong' + (r.length ? ' x ' + r[0].length + ' cot' : '');
  });
  Logger.log(JSON.stringify(bao));
  return bao;
}


/* ============================================================================
 * CHANG 2 — PHAN 2: BO TRICH XUAT build-app-data.js CHAY TRONG APPS SCRIPT
 * ----------------------------------------------------------------------------
 * Day la NGUYEN VAN scripts/build-app-data.js ma robot GitHub dang chay trong
 * trinh duyet, chi doi 2 dong: vo IIFE gan vao bien TG_BUILD_APP_DATA thay vi
 * gan vao window. KHONG doi mot dong logic nao — de con doi chieu duoc voi ban
 * robot, va de lan sau sua thi sua o MOT cho (scripts/build-app-data.js) roi
 * sinh lai.
 *
 * No khong dung DOM, khong dung fetch — chi bien doi du lieu thuan, nen chay
 * trong Apps Script y het trong trinh duyet.
 *
 * build(MWG, MAIN, SHARE_KA):
 *   MWG      = goi CENTER  (da va 3 sheet phu, xem TG_ganSheetPhu_)
 *   MAIN     = goi DATA MWG
 *   SHARE_KA = cac dong sheet "Share KA"
 * ==========================================================================*/
/* build-app-data.js — v2 "day du"
 * Chay TRONG trang tg.html (hoac trong GitHub Action qua Playwright).
 *
 * Doc 2 kho du lieu da tinh san cua DB TG:
 *   window.__exportDataMwg  = so lieu OPPO toan tinh, 3 kenh (MWG / KA / IND)
 *   window.__exportDataMain = so lieu TOAN THI TRUONG (moi hang) - chi co o kenh MWG
 *
 * v2 lay them (so voi v1):
 *   - kich hoat (activated) vs sellout, o cap tinh / sale / kenh
 *   - sell-in kenh IND (OPPO / phu kien / khac) theo thang, tra ve tan shop
 *   - so sale + PG tung kenh tung thang (headcount) -> doanh thu dau nguoi
 *   - TAN SHOP: thi phan theo phan khuc, top model moi hang, thi phan theo ngay,
 *               khung gio ban, nhan vien ban gioi PK 10-20M, size shop, ma shop
 *
 * Quy uoc: doanh thu luu bang TRIEU DONG (lam tron). So may = so nguyen.
 * Nguon nao khong co thi bo qua, KHONG doan - co co "src" bao ro lay duoc gi.
 */
var TG_BUILD_APP_DATA = (function () {
  'use strict';

  /* ============ THI PHAN KENH FPT + VIETTEL (sheet "Share KA") ============
     Sheet gom HAI bang canh nhau, chi co SO MAY (khong co doanh thu):
       FPT     cot 0-7 : Ngay | Ma Shop | Ten Shop | Brand2 | So Luong | PK | AREA | Mien
       VIETTEL cot 12-18: SHOP | KV | MIEN | HANG | SL | PK | THANG
     Ten hang viet lung tung (SAMSUNG / Samsung, XIAOMI / Xiaomi) -> gom khong phan biet
     hoa thuong. FPT viet tat (OP, IP, SS, XM, HO) -> doi ve ten day du.
     Phan khuc hai bang ghi khac nhau -> quy ve 4 nhom gia chung.
     Anh Thai chot: chi lay o MUC KENH, khong ghep xuong tung shop. */
  function tinhShareKA(rows, MONTHS) {
    if (!Array.isArray(rows) || rows.length < 2) return null;

    var TEN_HANG = {
      op: 'OPPO', oppo: 'OPPO', ip: 'Apple', apple: 'Apple',
      ss: 'Samsung', samsung: 'Samsung', xm: 'Xiaomi', xiaomi: 'Xiaomi',
      ho: 'Honor', honor: 'Honor', vivo: 'vivo', fp: 'Khác', others: 'Khác',
      other: 'Khác', khac: 'Khác',
    };
    function chuanHang(x) {
      var k = String(x || '').trim().toLowerCase();
      return TEN_HANG[k] || (k ? (k.charAt(0).toUpperCase() + k.slice(1)) : 'Khác');
    }
    // 4 nhom gia chung, nhan dien theo con SO trong chuoi nen ca hai kieu ghi deu trung
    function nhomGia(x) {
      var t = String(x || '').replace(/\s+/g, '').toUpperCase();
      if (/(^|[^0-9])(<3M|<5M|1_)/.test(t) || /^\D*[0-4]M?-5M/.test(t)) return 0;   // duoi 5M
      if (/3M-5M/.test(t)) return 0;
      if (/5M-7M|7M-10M|2_|3_/.test(t)) return 1;                                    // 5-10M
      if (/10M-15M|15M-20M|4_|5_/.test(t)) return 2;                                 // 10-20M
      if (/20M-30M|6_/.test(t)) return 3;                                            // 20-30M
      if (/>30M|7_/.test(t)) return 4;                                               // tren 30M
      return -1;
    }
    function thangCuaNgay(x) {
      var t = String(x || '').trim();
      var m = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);   // 01.01.2026
      if (m) return parseInt(m[2], 10);
      var d = new Date(t);
      if (isNaN(d.getTime())) return 0;
      /* BAY MUI GIO. O ngay that qua Apps Script thanh chuoi UTC: ngay 01.01.2026
         (gio VN) ra "2025-12-31T17:00:00.000Z". Robot chay tren may chu GitHub
         (gio UTC) nen doc ra THANG 12 — moi dong ghi ngay mung 1 bi day nham
         sang thang truoc. Ep doc theo dung mui gio cua sheet. */
      try {
        var s2 = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(d);
        return parseInt(s2.slice(5, 7), 10);
      } catch (e) { return d.getMonth() + 1; }
    }
    function thangCuaChu(x) {
      var m = String(x || '').match(/(\d{1,2})/);
      return m ? parseInt(m[1], 10) : 0;
    }
    function soCua(x) {
      var n = parseFloat(String(x == null ? '' : x).replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? 0 : n;
    }

    var NM = MONTHS.length;
    function honKhoi() {
      return { m: MONTHS.map(function () { return [0, 0]; }),      // [oppo, tong] tung thang
               pk: [0, 1, 2, 3, 4].map(function () { return [0, 0]; }),
               hang: {}, shop: {}, dong: 0 };
    }
    var K = { fpt: honKhoi(), viettel: honKhoi() };

    function nap(o, thang, hang, sl, pk, shop) {
      if (!sl) return;
      o.dong++;
      var laOppo = (hang === 'OPPO');
      var i = MONTHS.indexOf(thang);
      if (i >= 0) { o.m[i][1] += sl; if (laOppo) o.m[i][0] += sl; }
      var g = nhomGia(pk);
      if (g >= 0) { o.pk[g][1] += sl; if (laOppo) o.pk[g][0] += sl; }
      o.hang[hang] = (o.hang[hang] || 0) + sl;
      if (shop) o.shop[shop] = 1;
    }

    for (var r = 1; r < rows.length; r++) {           // bo dong tieu de
      var v = rows[r] || [];
      // --- FPT: cot 0..7
      if (v[2] && soCua(v[4])) {
        nap(K.fpt, thangCuaNgay(v[0]), chuanHang(v[3]), soCua(v[4]), v[5], String(v[2]).trim());
      }
      // --- VIETTEL: cot 12..18
      if (v[12] && soCua(v[16])) {
        nap(K.viettel, thangCuaChu(v[18]), chuanHang(v[15]), soCua(v[16]), v[17], String(v[12]).trim());
      }
    }

    function goi(o) {
      if (!o.dong) return null;
      var hg = Object.keys(o.hang).map(function (h) { return [h, Math.round(o.hang[h])]; })
        .sort(function (a, b) { return b[1] - a[1]; });
      return {
        m: o.m.map(function (x) { return [Math.round(x[0]), Math.round(x[1])]; }),
        pk: o.pk.map(function (x) { return [Math.round(x[0]), Math.round(x[1])]; }),
        hang: hg, shops: Object.keys(o.shop).length, dong: o.dong,
      };
    }
    var fpt = goi(K.fpt), vt = goi(K.viettel);
    if (!fpt && !vt) return null;
    return {
      fpt: fpt, viettel: vt,
      nhomTen: ['Dưới 5M', '5–10M', '10–20M', '20–30M', 'Trên 30M'],
      chiSoMay: true,          // sheet nay KHONG co doanh thu — app phai noi ro
    };
  }

  function build(MWG, MAIN, SHARE_KA) {
    if (!MWG) throw new Error('Chua co __exportDataMwg');
    MAIN = MAIN || {};

    // Vai bang nam o MWG, vai bang nam o MAIN - tuy phien ban DB. Tim ca 2 cho.
    function kho(ten) {
      if (MAIN && MAIN[ten]) return MAIN[ten];
      if (MWG && MWG[ten]) return MWG[ten];
      return null;
    }

    var MONTHS = (MWG.months_sorted || []).slice();
    if (!MONTHS.length) {
      var seen = {};
      (MWG.crosstab || []).forEach(function (r) { seen[r.m] = 1; });
      MONTHS = Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
    }
    var NM = MONTHS.length;
    var MIDX = {}; MONTHS.forEach(function (m, i) { MIDX[m] = i; });
    var CUR_M = MONTHS[NM - 1], PRV_M = NM > 1 ? MONTHS[NM - 2] : null;

    var tr = function (v) { return Math.round((v || 0) / 1e6); };
    var num = function (v) { var x = parseFloat(String(v == null ? 0 : v).replace(/[^0-9.-]/g, '')); return isFinite(x) ? x : 0; };
    var zeros = function (n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = 0; return a; };
    var pairs = function (n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = [0, 0]; return a; };
    var quads = function (n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = [0, 0, 0, 0]; return a; };

    // Ngay-trong-nam: 1/1 = 1. Dung lam truc chung cho tuan / thang / quy.
    var lastDoy = 0;
    function doyOf(y, m, d) {
      return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
    }
    function addDy(o, doy, u, rv) {
      if (!o._dy) { o._dy = {}; o._dr = {}; }
      o._dy[doy] = (o._dy[doy] || 0) + u;
      o._dr[doy] = (o._dr[doy] || 0) + rv;
    }

    // ---- nam + so ngay cua thang
    var dayKeys = Object.keys(MWG.overview_daily_by_date || {}).sort();
    var YEAR = dayKeys.length ? +dayKeys[0].slice(0, 4) : new Date().getFullYear();
    var dim = function (m) { return new Date(Date.UTC(YEAR, m, 0)).getUTCDate(); };
    var DIM_CUR = dim(CUR_M), DIM_PRV = PRV_M ? dim(PRV_M) : 0;

    // ---- danh muc
    var CHANS = ['MWG', 'KA', 'IND'];
    var SEGS = (MWG.segments_list || []).slice();
    var SERS = (MWG.series_list || []).filter(function (s) { return s && s !== '(Không rõ)'; });
    if (SERS.indexOf('(Không rõ)') < 0) SERS = SERS.concat(['Khác']);
    var SEGI = {}; SEGS.forEach(function (s, i) { SEGI[s] = i; });
    var SERI = {}; SERS.forEach(function (s, i) { SERI[s] = i; });
    var KHAC = SERS.indexOf('Khác');

    // ---- Thang nao co so SELL IN. Ton kho CHI duoc tinh tren cac thang nay,
    // neu khong se tru ca phan ban ra cua thang chua nhap so -> ton bi hut xuong sai.
    var SELLIN_COL = { STORE_ID: 0, RETAILER: 1, PROVINCE: 2, MONTH: 3, PRODUCT: 4, GROUP: 5, QTY: 6 };
    var sellinRows = (MAIN && MAIN.sell_in_rows) || MWG.sell_in_rows || null;
    // Sell-in khong ghep duoc vao shop nao — de rieng, khong tron vao tong
    var leSellin = { tong: 0, mdl: {}, ma: {}, theoTen: 0, theoMa: 0 };
    var SI_M = {}, SI_LIST = [];
    if (sellinRows) {
      sellinRows.forEach(function (r) {
        if (!r || r.length < 7) return;
        var m = parseInt(r[SELLIN_COL.MONTH], 10);
        if (m && MIDX[m] !== undefined) SI_M[m] = 1;
      });
      SI_LIST = Object.keys(SI_M).map(Number).sort(function (a, b) { return a - b; });
    }

    // Co bao lay duoc nguon nao - app dung de an/hien tung khoi, khong bia so.
    var src = {
      act: false, sellin: false, hc: false, segMkt: false,
      model: false, dayMkt: false, hour: false, staff: false
    };

    // =========================================================
    // 1. Khung rong cho tung shop / tung sale / toan tinh
    // =========================================================
    function blank(extra) {
      var o = {
        m: pairs(NM),                  // [may, doanh thu] theo thang
        ac: zeros(NM),                 // may DA KICH HOAT theo thang
        d: zeros(DIM_CUR),             // may theo ngay - thang hien tai
        dp: zeros(DIM_PRV),            // may theo ngay - thang truoc
        ch: {},                        // kenh -> [may, dt] theo thang
        sg: pairs(SEGS.length),        // phan khuc - luy ke ca nam
        sgM: pairs(SEGS.length),       // phan khuc - thang hien tai
        sr: pairs(SERS.length),        // dong may - luy ke
        srM: pairs(SERS.length),       // dong may - thang hien tai
        mo: {},                        // model OPPO -> [may, dt] thang hien tai
        srm: null,                     // dong may theo TUNG THANG  [series][thang] = [may, dt]
        sgm: null,                     // phan khuc theo TUNG THANG [seg][thang] = [may, dt]
        moM: {},                       // thang -> { model: [may, dt] }
        chd: null                      // chi tiet theo tung kenh (chi dat o cap tinh & sale)
      };
      for (var k in extra) o[k] = extra[k];
      return o;
    }

    var shops = {}, shopOrder = [], idToShop = {};
    (MWG.store_rows || []).forEach(function (r) {
      if (shops[r.store]) return;
      shops[r.store] = blank({
        n: r.store,
        sale: r.sale || '(Không rõ)',
        chan: r.channel || '?',
        lv: r.level && r.level !== '(Không rõ)' ? r.level : '',
        size: r.size && r.size !== '(Không rõ)' ? r.size : '',
        sid: r.store_id ? String(r.store_id).trim() : '',
        tg: tr(r.target)
      });
      shopOrder.push(r.store);
      if (r.store_id) idToShop[String(r.store_id).trim()] = r.store;
    });

    // ---- GOM CHI NHANH THEO DAI LY -------------------------------------------
    // Nhieu dai ly co vai chi nhanh: sell-in ghi ten cong ty, sell out ghi tung chi nhanh.
    // Vi vay ton kho phai tinh o cap DAI LY, khong phai tung chi nhanh.
    function khongDau(x) {
      return String(x || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    }
    function khoaDaiLy(ten) {
      var t = khongDau(ten);
      t = t.split(/\s[-–]\s|\s*\(|_|,|\s[-–]|[-–]\s/)[0];
      t = t.replace(/\b(cua hang|cong ty|cty|tnhh|mtv|dntn|doanh nghiep tu nhan)\b/g, ' ');
      t = t.replace(/[^a-z0-9]+/g, ' ').trim();
      return t;
    }
    var dlTheoKhoa = {};     // khoa -> { shops: [ten shop], sale: {} }
    shopOrder.forEach(function (st) {
      if (shops[st].chan !== 'IND') return;
      var k = khoaDaiLy(st);
      if (!k) return;
      shops[st].dlk = k;
      if (!dlTheoKhoa[k]) dlTheoKhoa[k] = { shops: [], ten: st };
      dlTheoKhoa[k].shops.push(st);
    });

    var sales = {}, all = blank({});
    function saleOf(name) {
      name = name || '(Không rõ)';
      if (!sales[name]) sales[name] = blank({ n: name });
      return sales[name];
    }
    (MWG.sales_list || []).forEach(saleOf);
    shopOrder.forEach(function (s) { saleOf(shops[s].sale); });

    function addCh(o, ch, i, u, rv) {
      if (!o.ch[ch]) o.ch[ch] = pairs(NM);
      o.ch[ch][i][0] += u; o.ch[ch][i][1] += rv;
    }
    // Khung chi tiet cho 1 kenh, dung o cap TINH va cap SALE (shop chi thuoc 1 kenh nen khong can)
    function chdOf(o, ch) {
      if (!o.chd) o.chd = {};
      if (!o.chd[ch]) o.chd[ch] = {
        m: pairs(NM), ac: zeros(NM), d: zeros(DIM_CUR), dp: zeros(DIM_PRV),
        sg: pairs(SEGS.length), sgM: pairs(SEGS.length),
        sr: pairs(SERS.length), srM: pairs(SERS.length),
        mo: {}, srm: null, sgm: null, moM: {}
      };
      return o.chd[ch];
    }

    // =========================================================
    // 2. Do so lieu OPPO theo thang tu crosstab
    //    crosstab item: {m, channel, store, model, series, segment, sales, sellout, activated, rev}
    // =========================================================
    (MWG.crosstab || []).forEach(function (r) {
      var i = MIDX[r.m]; if (i === undefined) return;
      var u = r.sellout || 0, rv = r.rev || 0, ac = r.activated || 0;
      if (!u && !rv && !ac) return;
      if (r.activated != null) src.act = true;
      var ch = r.channel || '?';
      var si = SEGI[r.segment];
      var ri = SERI[r.series]; if (ri === undefined) ri = KHAC;
      var isCur = r.m === CUR_M;
      var mdl = r.model || '';

      var targets = [all, saleOf(r.sales), shops[r.store]];
      for (var t = 0; t < targets.length; t++) {
        var o = targets[t]; if (!o) continue;
        o.m[i][0] += u; o.m[i][1] += rv;
        o.ac[i] += ac;
        addCh(o, ch, i, u, rv);
        if (si !== undefined) { o.sg[si][0] += u; o.sg[si][1] += rv;
          if (isCur) { o.sgM[si][0] += u; o.sgM[si][1] += rv; } }
        if (ri !== undefined && ri >= 0) { o.sr[ri][0] += u; o.sr[ri][1] += rv;
          if (isCur) { o.srM[ri][0] += u; o.srM[ri][1] += rv; } }
        if (isCur && mdl && u) {
          if (!o.mo[mdl]) o.mo[mdl] = [0, 0];
          o.mo[mdl][0] += u; o.mo[mdl][1] += rv;
        }
        // phan khuc theo TUNG THANG (cho bo loc PK gia)
        if (si !== undefined) {
          if (!o.sgm) { o.sgm = []; for (var z0 = 0; z0 < SEGS.length; z0++) o.sgm.push(pairs(NM)); }
          o.sgm[si][i][0] += u; o.sgm[si][i][1] += rv;
        }
        // dong may theo TUNG THANG (de bat tab Reno / Find o bieu do doanh so)
        if (ri !== undefined && ri >= 0) {
          if (!o.srm) { o.srm = []; for (var z1 = 0; z1 < SERS.length; z1++) o.srm.push(pairs(NM)); }
          o.srm[ri][i][0] += u; o.srm[ri][i][1] += rv;
        }
        // model theo TUNG THANG (de loc model ban chay theo thang)
        if (mdl && u) {
          if (!o.moM[r.m]) o.moM[r.m] = {};
          if (!o.moM[r.m][mdl]) o.moM[r.m][mdl] = [0, 0];
          o.moM[r.m][mdl][0] += u; o.moM[r.m][mdl][1] += rv;
        }
        // Ban ra LUY KE theo model — chi kenh IND, CHI cac thang co so sell-in
        if (ch === 'IND' && mdl && u && SI_M[r.m]) {
          if (!o._ban) o._ban = {};
          o._ban[mdl] = (o._ban[mdl] || 0) + u;
          if (t === 2 && o.dlk && dlTheoKhoa[o.dlk]) {   // t===2 la cap SHOP
            var gg = dlTheoKhoa[o.dlk];
            if (!gg._ban) gg._ban = {};
            gg._ban[mdl] = (gg._ban[mdl] || 0) + u;
          }
        }
        if (t < 2) {   // chi tinh chi tiet kenh o cap tinh & sale
          var cd = chdOf(o, ch);
          cd.m[i][0] += u; cd.m[i][1] += rv;
          cd.ac[i] += ac;
          if (si !== undefined) { cd.sg[si][0] += u; cd.sg[si][1] += rv;
            if (isCur) { cd.sgM[si][0] += u; cd.sgM[si][1] += rv; } }
          if (ri !== undefined && ri >= 0) { cd.sr[ri][0] += u; cd.sr[ri][1] += rv;
            if (isCur) { cd.srM[ri][0] += u; cd.srM[ri][1] += rv; } }
          if (isCur && mdl && u) {
            if (!cd.mo[mdl]) cd.mo[mdl] = [0, 0];
            cd.mo[mdl][0] += u; cd.mo[mdl][1] += rv;
          }
          if (si !== undefined) {
            if (!cd.sgm) { cd.sgm = []; for (var z3 = 0; z3 < SEGS.length; z3++) cd.sgm.push(pairs(NM)); }
            cd.sgm[si][i][0] += u; cd.sgm[si][i][1] += rv;
          }
          if (ri !== undefined && ri >= 0) {
            if (!cd.srm) { cd.srm = []; for (var z2 = 0; z2 < SERS.length; z2++) cd.srm.push(pairs(NM)); }
            cd.srm[ri][i][0] += u; cd.srm[ri][i][1] += rv;
          }
          if (mdl && u) {
            if (!cd.moM[r.m]) cd.moM[r.m] = {};
            if (!cd.moM[r.m][mdl]) cd.moM[r.m][mdl] = [0, 0];
            cd.moM[r.m][mdl][0] += u; cd.moM[r.m][mdl][1] += rv;
          }
        }
      }
    });

    // =========================================================
    // 3. So lieu theo NGAY (thang hien tai + thang truoc + truc ca nam)
    // =========================================================
    var maxDay = 0;
    Object.keys(MWG.overview_daily_by_date || {}).forEach(function (iso) {
      var p = iso.split('-'); if (p.length !== 3) return;
      var yy = +p[0], mo = +p[1], dd = +p[2];
      var doy = doyOf(yy, mo, dd);
      var key = null, lim = 0;
      if (mo === CUR_M) { key = 'd'; lim = DIM_CUR; }
      else if (PRV_M && mo === PRV_M) { key = 'dp'; lim = DIM_PRV; }
      var byCh = MWG.overview_daily_by_date[iso];
      Object.keys(byCh).forEach(function (ch) {
        var byStore = byCh[ch];
        Object.keys(byStore).forEach(function (st) {
          var v = byStore[st] || {};
          var u = v.sellout || 0, rv = v.rev || 0;
          if (!u && !rv) return;
          if (doy > lastDoy) lastDoy = doy;
          var sh = shops[st];
          var sn = v.sale || (sh ? sh.sale : null);
          var sl = sales[sn || '(Không rõ)'];
          addDy(all, doy, u, rv); addDy(chdOf(all, ch), doy, u, rv);
          if (sl) { addDy(sl, doy, u, rv); addDy(chdOf(sl, ch), doy, u, rv); }
          if (key && dd >= 1 && dd <= lim && sh) sh[key][dd - 1] += u;
          if (key === 'd' && u && dd > maxDay) maxDay = dd;
        });
      });
    });

    // =========================================================
    // 4. SELL-IN kenh IND (sheet SELL IN: mang tho, cot theo SELLIN_COL)
    //    Quy ve shop qua Store ID. Nhom hang: OPPO / PK (phu kien) / Khac.
    // =========================================================
    if (sellinRows && sellinRows.length) {
      src.sellin = true;
      sellinRows.forEach(function (r) {
        if (!r || r.length < 7) return;
        var sid = String(r[SELLIN_COL.STORE_ID] || '').trim();
        var m = parseInt(r[SELLIN_COL.MONTH], 10);
        var i = MIDX[m]; if (i === undefined || !sid) return;
        var nhom = String(r[SELLIN_COL.GROUP] || '').trim().toUpperCase();
        var qty = num(r[SELLIN_COL.QTY]);
        if (!qty) return;
        var j = nhom === 'OPPO' ? 0 : (nhom === 'PK' ? 1 : 2);
        var st = idToShop[sid];
        var sp = String(r[SELLIN_COL.PRODUCT] || '').trim();
        var coShop = !!(st && shops[st] && shops[st].chan === 'IND');
        // Ma shop khong khop -> thu ghep theo TEN dai ly (anh Thai: nhieu shop nhieu chi nhanh)
        var kDL = coShop ? shops[st].dlk : khoaDaiLy(r[SELLIN_COL.RETAILER]);
        if (!coShop && kDL && dlTheoKhoa[kDL]) {
          // ghep duoc theo ten -> quy vao chi nhanh dau tien cua dai ly do,
          // ton se duoc tinh o cap DAI LY nen khong lech
          st = dlTheoKhoa[kDL].shops[0];
          coShop = true;
          leSellin.theoTen += qty;
        }
        if (!coShop) {
          // Dong sell-in nay khong ghep duoc vao shop IND nao (ma shop la trong sheet
          // khong co trong danh sach shop). KHONG duoc cong vao tong tinh, neu khong
          // tong tinh se khac tong cong tung shop -> ra ton am gia o cap shop.
          leSellin.tong += qty;
          if (j === 0 && sp) leSellin.mdl[sp] = (leSellin.mdl[sp] || 0) + qty;
          leSellin.ma[sid] = 1;
          return;
        }
        if (idToShop[sid] === st) leSellin.theoMa += qty;
        var targets = [all, shops[st]];
        if (sales[shops[st].sale]) targets.push(sales[shops[st].sale]);
        // gom them o cap DAI LY de tinh ton dung khi co nhieu chi nhanh
        var gDL = shops[st].dlk && dlTheoKhoa[shops[st].dlk];
        if (gDL) {
          if (j === 0 && sp) { if (!gDL._nhap) gDL._nhap = {}; gDL._nhap[sp] = (gDL._nhap[sp] || 0) + qty; }
        }
        targets.forEach(function (o) {
          if (!o.si) { o.si = []; for (var k = 0; k < NM; k++) o.si[k] = [0, 0, 0]; }
          o.si[i][j] += qty;
          // Nhap LUY KE theo model (chi nhom OPPO) — de tinh ton kho
          if (j === 0 && sp) {
            if (!o._nhap) o._nhap = {};
            o._nhap[sp] = (o._nhap[sp] || 0) + qty;
          }
        });
      });
    }

    // ---- Ton kho dai ly IND = nhap luy ke - ban luy ke, theo tung model.
    // Da kiem chung 26/26 ten san pham ben SELL IN trung khop ten model ben ban hang.
    var chuanTen = function (s) { return String(s || '').toUpperCase().replace(/\s+/g, ' ').replace(/\s*\+\s*/g, '+').trim(); };
    function tonKho(o) {
      if (!o._nhap && !o._ban) return null;
      var g = {};
      Object.keys(o._nhap || {}).forEach(function (k) {
        var c = chuanTen(k);
        if (!g[c]) g[c] = { n: k, nhap: 0, ban: 0 };
        g[c].nhap += o._nhap[k];
      });
      Object.keys(o._ban || {}).forEach(function (k) {
        var c = chuanTen(k);
        if (!g[c]) g[c] = { n: k, nhap: 0, ban: 0 };
        g[c].ban += o._ban[k];
      });
      var ds = Object.keys(g).map(function (c) {
        return [g[c].n, Math.round(g[c].nhap), g[c].ban, Math.round(g[c].nhap) - g[c].ban];
      }).filter(function (x) { return x[1] || x[2]; });
      if (!ds.length) return null;
      ds.sort(function (a, b) { return b[3] - a[3]; });
      return ds;
    }
    // Shop co ban ma KHONG co bat ky dong sell-in nao -> ton khong tinh duoc
    function chuaGhepSellin(o) {
      return !!(o._ban && Object.keys(o._ban).length) && !(o._nhap && Object.keys(o._nhap).length);
    }

    // =========================================================
    // 5. HEADCOUNT theo kenh & thang: {kenh: {thang: {sales:[], pgs:[]}}}
    // =========================================================
    var HC = null;
    var hcRaw = kho('channel_month_headcount');
    if (hcRaw && Object.keys(hcRaw).length) {
      src.hc = true;
      HC = {};
      CHANS.forEach(function (c) {
        var cd = hcRaw[c] || {};
        HC[c] = MONTHS.map(function (m) {
          var cell = cd[m] || cd[String(m)] || {};
          return [(cell.sales || []).length, (cell.pgs || []).length];
        });
      });
    }

    // =========================================================
    // 6. THI PHAN - chi kenh MWG (nguon MAIN, du lieu moi hang)
    //    Ten shop 2 sheet khac nhau -> doi chieu theo ma vung + dia chi.
    // =========================================================
    var mkt = { matched: 0, unmatched: [], shops: 0 };
    var nhomPKTen = null;      // ten 4 nhom gia, chi co khi doc duoc bang phan khuc ben MAIN
    var mapMain = {};           // ten shop ben MAIN -> ten shop ben OPPO
    var norm = function (s) {
      return String(s || '').toLowerCase().normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
        .replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '');
    };
    // "TGD_TGI_CLA" -> "tgicla" (bo tien to loai shop vi 2 sheet ghi khac nhau: TGD / DMS / DMS3)
    var geo = function (c) { var p = String(c).split('_'); return p.length >= 3 ? norm(p[1] + p[2]) : norm(c); };

    var SEGA = [], SEGAI = {};   // danh muc phan khuc ben MAIN (co the khac ben OPPO)
    if (MAIN.shop_segment_crosstab) {
      var exact = {}, loose = {};
      shopOrder.forEach(function (st) {
        if (shops[st].chan !== 'MWG') return;
        var p = String(st).split(' - ');
        if (p.length < 4) return;
        var addr = norm(p.slice(3).join(' '));
        var ke = norm(p[2]) + '|' + addr, kl = geo(p[2]) + '|' + addr;
        if (!(ke in exact)) exact[ke] = st; else exact[ke] = null;   // trung -> bo, khong doan bua
        if (!(kl in loose)) loose[kl] = st; else loose[kl] = null;
      });

      var mainShops = {};
      MAIN.shop_segment_crosstab.forEach(function (r) { mainShops[r.shop] = r.sale || ''; });
      Object.keys(mainShops).forEach(function (s) {
        var p = String(s).split(' - ');
        var addr = norm(p.slice(1).join(' '));
        var hit = exact[norm(p[0]) + '|' + addr] || loose[geo(p[0]) + '|' + addr];
        if (hit) { mapMain[s] = hit; mkt.matched++; }
        else mkt.unmatched.push(s);
      });

      // danh muc phan khuc ben MAIN, giu thu tu theo segment_order neu co
      var ordRaw = kho('segment_order');
      var segSeen = {};
      MAIN.shop_segment_crosstab.forEach(function (r) { if (r.seg) segSeen[r.seg] = 1; });
      if (Array.isArray(ordRaw) && ordRaw.length) {
        ordRaw.forEach(function (s) { if (segSeen[s]) { SEGA.push(s); delete segSeen[s]; } });
      }
      Object.keys(segSeen).sort().forEach(function (s) { SEGA.push(s); });
      SEGA.forEach(function (s, i) { SEGAI[s] = i; });
      if (SEGA.length) src.segMkt = true;

      // gom: shop -> thang -> [oppoU, oppoRv, totU, totRv]; brand thang hien tai; phan khuc thi truong
      function mblank() { return quads(NM); }
      var mShop = {}, mSale = {}, mAll = mblank();
      var brShop = {}, brSale = {}, brAll = {};
      var sgShop = {}, sgSale = {}, sgAll = null;     // thang hien tai, theo SEGA
      var sgShopY = {}, sgSaleY = {}, sgAllY = null;  // luy ke ca nam
      function sgBlank() { return quads(SEGA.length); }

      // 4 nhom gia anh Thai dung de nhin nhanh. Nhan dien theo TEN khoang, doi nhan
      // ben DB TG cung khong vo. Dung cho sgmS = phan khuc x thang o cap shop.
      var NHOM_TEN = ['Dưới 5M', '5–10M', '10–20M', 'Trên 20M'];
      var NHOM_BIEN = [[0, 5], [5, 10], [10, 20], [20, Infinity]];
      // Doc nhan khoang gia ra [tu, den] trieu, khong dung bieu thuc chinh quy.
      // Khop theo TEN nhu ban cu bo sot <3M, 3-5M, >20M, >30M = 38% so may.
      function docKhoangPK(ten) {
        var t = String(ten == null ? '' : ten).toUpperCase().split(' ').join('');
        t = t.split('TRIỆU').join('M').split('TRIEU').join('M').split('M').join('');
        var so = function (x) {
          if (x.charAt(0) === '=') x = x.slice(1);
          var v = parseFloat(x.split(',').join('.'));
          return isNaN(v) ? null : v;
        };
        if (t.charAt(0) === '<') { var a = so(t.slice(1)); return a === null ? null : [0, a]; }
        if (t.charAt(0) === '>') { var b = so(t.slice(1)); return b === null ? null : [b, Infinity]; }
        var p = t.split('-');
        if (p.length === 2) {
          var c = so(p[0]), d = so(p[1]);
          if (c !== null && d !== null) return [c, d];
        }
        return null;
      }
      var SEG_NHOM = {};
      SEGA.forEach(function (ten) {
        var k = docKhoangPK(ten); if (!k) return;
        for (var gi = 0; gi < NHOM_BIEN.length; gi++) {
          if (k[0] >= NHOM_BIEN[gi][0] && k[0] < NHOM_BIEN[gi][1]) { SEG_NHOM[ten] = gi; return; }
        }
      });
      // Bonus Model cua chuong trinh Sale Loc & Khai:
      //   10-15M -> 80.000d/may  ·  tu 15M tro len -> 120.000d/may  ·  duoi 10M -> 0
      // Chi can 2 o dem may OPPO nen luu gon: bmS[thang] = [may 10-15M, may >=15M]
      var SEG_BM = {};
      SEGA.forEach(function (ten) {
        var k = docKhoangPK(ten); if (!k) return;
        if (k[0] >= 15) { SEG_BM[ten] = 1; return; }
        if (k[0] >= 10) { SEG_BM[ten] = 0; return; }
      });
      var bmShop = {};
      function bmBlank() { var a = []; for (var q = 0; q < NM; q++) a.push([0, 0]); return a; }

      var sgmShop = {};
      function sgmBlank() {
        var a = [];
        for (var q = 0; q < NM; q++) a.push([[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
        return a;
      }

      // 4 hang chinh theo TUNG THANG, luu o cap SHOP:
      // [oppoMay,oppoDT, ssMay,ssDT, xmMay,xmDT, ipMay,ipDT, tongMay,tongDT]
      var mkmShop = {};
      // phan khuc x HANG x thang o cap shop -> PK 10-20M tach duoc tung hang
      var HANG7 = { oppo: 0, samsung: 1, xiaomi: 2, apple: 3, vivo: 4, realme: 5 };
      var sgbShop = {};
      function sgbBlank() {
        var a = [], q, g, h;
        for (q = 0; q < NM; q++) {
          var t = [];
          for (g = 0; g < 4; g++) { var e = []; for (h = 0; h < 7; h++) e.push([0, 0]); t.push(e); }
          a.push(t);
        }
        return a;
      }
      var CHI4 = { oppo: 0, samsung: 2, xiaomi: 4, apple: 6 };
      MAIN.shop_segment_crosstab.forEach(function (r) {
        var i = MIDX[r.m]; if (i === undefined) return;
        var u = r.units || 0, rv = r.rev || 0; if (!u && !rv) return;
        var oppo = String(r.brand || '').toLowerCase() === 'oppo';
        var st = mapMain[r.shop];
        if (st) {
          if (!mkmShop[st]) { mkmShop[st] = []; for (var q3 = 0; q3 < NM; q3++)
            mkmShop[st].push([0,0,0,0,0,0,0,0,0,0]); }
          var j4 = CHI4[String(r.brand || '').toLowerCase()];
          if (j4 !== undefined) { mkmShop[st][i][j4] += u; mkmShop[st][i][j4 + 1] += rv; }
          mkmShop[st][i][8] += u; mkmShop[st][i][9] += rv;
        }
        var sn = st ? shops[st].sale : (r.sale || '(Không rõ)');

        var rows = [mAll];
        if (st) { mShop[st] = mShop[st] || mblank(); rows.push(mShop[st]); }
        if (sn) { mSale[sn] = mSale[sn] || mblank(); rows.push(mSale[sn]); }
        rows.forEach(function (a) {
          a[i][2] += u; a[i][3] += rv;
          if (oppo) { a[i][0] += u; a[i][1] += rv; }
        });

        // phan khuc thi truong (OPPO vs tong) - cung 1 nguon nen luon khop nhau
        var gi = SEGAI[r.seg];
        if (gi !== undefined) {
          if (!sgAllY) { sgAllY = sgBlank(); sgAll = sgBlank(); }
          var boxes = [sgAllY];
          if (r.m === CUR_M) boxes.push(sgAll);
          if (st) {
            sgShopY[st] = sgShopY[st] || sgBlank(); boxes.push(sgShopY[st]);
            if (r.m === CUR_M) { sgShop[st] = sgShop[st] || sgBlank(); boxes.push(sgShop[st]); }
          }
          if (sn) {
            sgSaleY[sn] = sgSaleY[sn] || sgBlank(); boxes.push(sgSaleY[sn]);
            if (r.m === CUR_M) { sgSale[sn] = sgSale[sn] || sgBlank(); boxes.push(sgSale[sn]); }
          }
          boxes.forEach(function (a) {
            a[gi][2] += u; a[gi][3] += rv;
            if (oppo) { a[gi][0] += u; a[gi][1] += rv; }
          });
        }

        // phan khuc x THANG o cap shop -> muc Shop xem duoc PK 10-20M tung thang
        var gn = SEG_NHOM[r.seg];
        if (st && gn !== undefined) {
          if (!sgmShop[st]) sgmShop[st] = sgmBlank();
          var o4 = sgmShop[st][i][gn];
          o4[2] += u; o4[3] += rv;
          if (oppo) { o4[0] += u; o4[1] += rv; }
        }

      // gom them theo hang cho tung nhom gia
      if (st && gn !== undefined) {
        if (!sgbShop[st]) sgbShop[st] = sgbBlank();
        var hb = HANG7[String(r.brand || '').toLowerCase()];
        if (hb === undefined) hb = 6;
        var ob = sgbShop[st][i][gn][hb];
        ob[0] += u; ob[1] += rv;
      }

        if (st && oppo) {
          var bi = SEG_BM[r.seg];
          if (bi !== undefined) {
            if (!bmShop[st]) bmShop[st] = bmBlank();
            bmShop[st][i][bi] += u;
          }
        }

        if (st && r.shopSize && !shops[st].size) shops[st].size = String(r.shopSize).trim();
        if (r.m === CUR_M) {
          var b = r.brand || '?';
          brAll[b] = brAll[b] || [0, 0]; brAll[b][0] += u; brAll[b][1] += rv;
          if (st) { brShop[st] = brShop[st] || {}; brShop[st][b] = brShop[st][b] || [0, 0];
            brShop[st][b][0] += u; brShop[st][b][1] += rv; }
          if (sn) { brSale[sn] = brSale[sn] || {}; brSale[sn][b] = brSale[sn][b] || [0, 0];
            brSale[sn][b][0] += u; brSale[sn][b][1] += rv; }
        }
      });

      var topBrands = function (obj, n) {
        return Object.keys(obj || {})
          .map(function (b) { return [b, obj[b][0], tr(obj[b][1])]; })
          .sort(function (a, b) { return b[1] - a[1]; })
          .slice(0, n || 8);
      };
      var packM = function (a) {
        return a.map(function (x) { return [x[0], tr(x[1]), x[2], tr(x[3])]; });
      };

      all.mkt = { m: packM(mAll), br: topBrands(brAll, 10) };
      if (sgAll) { all.mkt.sg = packM(sgAll); all.mkt.sgY = packM(sgAllY); }
      chdOf(all, 'MWG').mkt = all.mkt;
      Object.keys(mSale).forEach(function (sn) {
        if (!sales[sn]) return;
        sales[sn].mkt = { m: packM(mSale[sn]), br: topBrands(brSale[sn], 8) };
        if (sgSale[sn]) sales[sn].mkt.sg = packM(sgSale[sn]);
        if (sgSaleY[sn]) sales[sn].mkt.sgY = packM(sgSaleY[sn]);
        chdOf(sales[sn], 'MWG').mkt = sales[sn].mkt;
      });
      Object.keys(mkmShop).forEach(function (st) {
        if (!shops[st]) return;
        shops[st].mkm = mkmShop[st].map(function (v) {
          return [v[0], tr(v[1]), v[2], tr(v[3]), v[4], tr(v[5]), v[6], tr(v[7]), v[8], tr(v[9])];
        });
      });
      Object.keys(sgmShop).forEach(function (st) {
        if (!shops[st]) return;
        shops[st].sgmS = sgmShop[st].map(function (mo) {
          return mo.map(function (v) { return [v[0], tr(v[1]), v[2], tr(v[3])]; });
        });
      });
      Object.keys(bmShop).forEach(function (st) {
        if (shops[st]) shops[st].bmS = bmShop[st];
      });
      Object.keys(sgbShop).forEach(function (st) {
        if (!shops[st]) return;
        shops[st].sgb = sgbShop[st].map(function (mo) {
          return mo.map(function (nh) {
            return nh.map(function (v) { return [v[0], tr(v[1])]; });
          });
        });
      });
      nhomPKTen = NHOM_TEN;
      Object.keys(mShop).forEach(function (st) {
        shops[st].mkt = { m: packM(mShop[st]), br: topBrands(brShop[st], 6) };
        if (sgShop[st]) shops[st].mkt.sg = packM(sgShop[st]);
        if (sgShopY[st]) shops[st].mkt.sgY = packM(sgShopY[st]);
        mkt.shops++;
      });
    }

    // =========================================================
    // 7. TAN SHOP: model moi hang / thi phan theo ngay / khung gio / nhan vien
    //    Cac bang nay danh index theo TEN SHOP ben MAIN -> doi sang ten ben OPPO.
    // =========================================================
    function veShopOppo(tenMain) { return mapMain[tenMain] || (shops[tenMain] ? tenMain : null); }
    function thangCua(byMonth, m) { return byMonth ? (byMonth[m] || byMonth[String(m)]) : null; }

    // 7a. Top model moi hang (thang hien tai)  -> sh.md = [[ten, hang, may, dt]]
    var smd = kho('shop_model_data');
    if (smd && Object.keys(smd).length) {
      src.model = true;
      Object.keys(smd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var cell = thangCua(smd[tenMain], CUR_M); if (!cell) return;
        var ds = [];
        Object.keys(cell).forEach(function (mdl) {
          var v = cell[mdl] || {};
          var u = v.units || 0; if (!u) return;
          ds.push([mdl, v.brand || '?', u, tr(v.rev || 0)]);
        });
        ds.sort(function (a, b) { return b[2] - a[2]; });
        if (ds.length) shops[st].md = ds.slice(0, 10);
      });
    }

    // 7b. Thi phan theo NGAY tai shop -> sh.dk (thang nay) / sh.dkp (thang truoc) = [oppoMay, tongMay]
    var sdd = kho('shop_day_data');
    if (sdd && Object.keys(sdd).length) {
      src.dayMkt = true;
      Object.keys(sdd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var dayMap = sdd[tenMain] || {};
        var cur = null, prv = null;
        Object.keys(dayMap).forEach(function (k) {
          var p = String(k).split('-'); if (p.length < 2) return;
          var m = +p[0], d = +p[1];
          var c = dayMap[k] || {};
          // [oppoMay,oppoDT, ssMay,ssDT, xmMay,xmDT, ipMay,ipDT, tongMay,tongDT]
          var v = [c.oppo_units || 0, c.oppo_rev || 0,
                   c.samsung_units || 0, c.samsung_rev || 0,
                   c.xiaomi_units || 0, c.xiaomi_rev || 0,
                   c.apple_units || 0, c.apple_rev || 0,
                   c.total_units || 0, c.total_rev || 0,
                   // rieng khoang 10-20M — DB TG co san theo ngay
                   c.pk1020_oppo_units || 0, c.pk1020_oppo_rev || 0,
                   c.pk1020_total_units || 0, c.pk1020_total_rev || 0];
          if (!v[0] && !v[8]) return;
          var oNo = function (n) { var z = new Array(n); for (var q = 0; q < n; q++) z[q] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0]; return z; };
          if (m === CUR_M && d >= 1 && d <= DIM_CUR) {
            if (!cur) cur = oNo(DIM_CUR);
            for (var k1 = 0; k1 < 14; k1++) cur[d - 1][k1] += v[k1];
          } else if (PRV_M && m === PRV_M && d >= 1 && d <= DIM_PRV) {
            if (!prv) prv = oNo(DIM_PRV);
            for (var k2 = 0; k2 < 14; k2++) prv[d - 1][k2] += v[k2];
          }
        });
        // doanh thu -> trieu dong cho gon
        var lamTron = function (x) { return x.map(function (v) {
          return [v[0], tr(v[1]), v[2], tr(v[3]), v[4], tr(v[5]), v[6], tr(v[7]), v[8], tr(v[9]),
                  v[10], tr(v[11]), v[12], tr(v[13])]; }); };
        if (cur) shops[st].dk = lamTron(cur);
        if (prv) shops[st].dkp = lamTron(prv);
      });
    }

    // 7a2. Top 10 model MOI HANG theo tung thang, o cap SALE va toan bo -> o.mdB[thang][hang]
    // Gop model theo DONG MAY: bo tien to loai may, bo ten hang, bo MAU o duoi ten.
    // Luat: lay day token cuoi cung KHONG phai spec (khong co chu so, khong co ngoac);
    // neu trong day do co it nhat MOT tu mau goc thi cat ca day. Nho vay bat duoc ca
    // mau ghep kieu 'Xanh ngoc bich', 'Den Thach Anh', 'Cosmic Orange'.
    var MAU_GOC = {};
    ('den trang xanh vang bac xam hong tim do nau cam kem be black white blue green gold silver ' +
     'gray grey pink purple red orange brown beige teal lilac peach mint jade olive bronze titan ' +
     'titanium ivory coral lavender aqua khaki').split(' ').forEach(function (w) { if (w) MAU_GOC[w] = 1; });
    ['đen','trắng','xanh','vàng','bạc','xám','hồng','tím','đỏ','nâu'].forEach(function (w) { MAU_GOC[w] = 1; });
    function laSpec(t) {
      if (t.indexOf('(') >= 0 || t.indexOf(')') >= 0) return true;
      for (var z = 0; z < t.length; z++) { var c = t.charCodeAt(z); if (c >= 48 && c <= 57) return true; }
      return false;
    }
    function gonTen(s) {
      var t = String(s == null ? '' : s).trim();
      var bo = ['Điện thoại ', 'Máy tính bảng '];
      for (var i9 = 0; i9 < bo.length; i9++) if (t.indexOf(bo[i9]) === 0) t = t.slice(bo[i9].length).trim();
      var hg9 = ['OPPO ', 'Oppo ', 'SAMSUNG ', 'Samsung ', 'XIAOMI ', 'Xiaomi ', 'REALME ', 'Realme ',
                 'realme ', 'vivo ', 'Vivo ', 'HONOR ', 'Honor ', 'TECNO ', 'Tecno ', 'Nubia ', 'Masstel '];
      for (var j9 = 0; j9 < hg9.length; j9++) if (t.indexOf(hg9[j9]) === 0) { t = t.slice(hg9[j9].length).trim(); break; }
      if (t.indexOf('Galaxy ') === 0) t = t.slice(7).trim();
      var p9 = t.split(' '), k9 = p9.length;
      while (k9 > 1 && !laSpec(p9[k9 - 1])) k9--;
      var coMau = false;
      for (var q9 = k9; q9 < p9.length; q9++) if (MAU_GOC[p9[q9].toLowerCase()]) coMau = true;
      if (coMau) { var z9 = p9.slice(0, k9).join(' ').trim(); if (z9) return z9; }
      return t;
    }
    var TEN6 = { oppo: 'OPPO', op: 'OPPO', samsung: 'Samsung', ss: 'Samsung',
                 xiaomi: 'Xiaomi', xm: 'Xiaomi', realme: 'Realme', rm: 'Realme',
                 vivo: 'vivo', vv: 'vivo', apple: 'Apple', ip: 'Apple', iphone: 'Apple' };
    function hang6(x) {
      var k = String(x || '').trim().toLowerCase();
      return TEN6[k] || 'Khác';
    }
    var mdAll = {}, mdSale = {};
    if (smd && Object.keys(smd).length) {
      Object.keys(smd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var sn = shops[st].sale;
        var byM = smd[tenMain] || {};
        Object.keys(byM).forEach(function (mk) {
          var cell = byM[mk] || {};
          Object.keys(cell).forEach(function (mdl) {
            var v = cell[mdl] || {};
            var u = v.units || 0, rv = v.rev || 0;
            if (!u) return;
            var hg = hang6(v.brand);
            mdl = gonTen(mdl);
            var hop = [mdAll];
            if (sn) { if (!mdSale[sn]) mdSale[sn] = {}; hop.push(mdSale[sn]); }
            hop.forEach(function (B) {
              if (!B[mk]) B[mk] = {};
              if (!B[mk][hg]) B[mk][hg] = {};
              if (!B[mk][hg][mdl]) B[mk][hg][mdl] = [0, 0];
              B[mk][hg][mdl][0] += u; B[mk][hg][mdl][1] += rv;
            });
          });
        });
      });
    }
    function goiMdB(B) {
      var out = null;
      Object.keys(B || {}).forEach(function (mk) {
        Object.keys(B[mk]).forEach(function (hg) {
          var ds = topModel(B[mk][hg], 10);
          if (!ds.length) return;
          if (!out) out = {};
          if (!out[mk]) out[mk] = {};
          out[mk][hg] = ds;
        });
      });
      return out;
    }

    // 7b2. NGAY x HANG ca nam o cap SALE va toan bo -> o.dnB[ngayTrongNam-1] = 14 so
    // [oppoMay,oppoDT, ssMay,ssDT, xmMay,xmDT, ipMay,ipDT, tongMay,tongDT,
    //  pkOppoMay,pkOppoDT, pkTongMay,pkTongDT]   (DT don vi trieu)
    var dnAll = null, dnSale = {};
    // MWG co so toi ngay MOI HON nguon OPPO -> mang phai dai theo ngay lon nhat cua CA HAI
    var dnLen = lastDoy;
    if (sdd) {
      Object.keys(sdd).forEach(function (tn2) {
        var dm2 = sdd[tn2] || {};
        Object.keys(dm2).forEach(function (k2) {
          var p2 = String(k2).split('-'); if (p2.length < 2) return;
          var m2 = +p2[0], d2 = +p2[1]; if (!m2 || !d2) return;
          var y2 = doyOf(YEAR, m2, d2);
          if (y2 > dnLen) dnLen = y2;
        });
      });
    }
    var dnBlank = function () {
      var a = new Array(dnLen);
      for (var q = 0; q < dnLen; q++) a[q] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      return a;
    };
    if (sdd && Object.keys(sdd).length && dnLen > 0) {
      Object.keys(sdd).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var sn = shops[st].sale;
        var dayMap = sdd[tenMain] || {};
        Object.keys(dayMap).forEach(function (kk) {
          var p = String(kk).split('-'); if (p.length < 2) return;
          var m = +p[0], d = +p[1];
          if (!m || !d) return;
          var doy = doyOf(YEAR, m, d) - 1;
          if (!(doy >= 0 && doy < dnLen)) return;
          var c = dayMap[kk] || {};
          var v = [c.oppo_units || 0, c.oppo_rev || 0,
                   c.samsung_units || 0, c.samsung_rev || 0,
                   c.xiaomi_units || 0, c.xiaomi_rev || 0,
                   c.apple_units || 0, c.apple_rev || 0,
                   c.total_units || 0, c.total_rev || 0,
                   c.pk1020_oppo_units || 0, c.pk1020_oppo_rev || 0,
                   c.pk1020_total_units || 0, c.pk1020_total_rev || 0];
          if (!v[0] && !v[8]) return;
          if (!dnAll) dnAll = dnBlank();
          var hop = [dnAll];
          if (sn) { if (!dnSale[sn]) dnSale[sn] = dnBlank(); hop.push(dnSale[sn]); }
          hop.forEach(function (a) { for (var z = 0; z < 14; z++) a[doy][z] += v[z]; });
        });
      });
    }
    function goiDn(a) {
      return a.map(function (v) {
        return [v[0], tr(v[1]), v[2], tr(v[3]), v[4], tr(v[5]), v[6], tr(v[7]),
                v[8], tr(v[9]), v[10], tr(v[11]), v[12], tr(v[13])];
      });
    }
    Object.keys(mdSale).forEach(function (sn) {
      if (sales[sn]) { var z = goiMdB(mdSale[sn]); if (z) sales[sn].mdB = z; }
    });
    if (Object.keys(mdAll).length) { var zA = goiMdB(mdAll); if (zA) all.mdB = zA; }
    Object.keys(dnSale).forEach(function (sn) {
      if (sales[sn]) sales[sn].dnB = goiDn(dnSale[sn]);
    });
    if (dnAll) all.dnB = goiDn(dnAll);

    // 7d. Tu MAIN.daily.rows (du lieu THO: thang,ngay,sale,phankhuc,hang,DT,may,size,model)
    // -> model theo NGAY + cong don, va PK 10-20M theo NGAY theo HANG. Ca hai o cap SALE.
    var DL = kho('daily');
    var dmTen = null, dmSale = {}, dmAll = null, pkSale = {}, pkAll = null;
    if (DL && Array.isArray(DL.rows) && DL.rows.length) {
      src.dailyRaw = true;
      var dSale = DL.sales || [], dSeg = DL.segments || [], dBr = DL.brands || [], dMd = DL.models || [];
      var H7B = {};
      dBr.forEach(function (b, i) {
        var k = String(b || '').toLowerCase();
        H7B[i] = (k === 'oppo') ? 0 : (k === 'samsung') ? 1 : (k === 'xiaomi') ? 2 :
                 (k === 'apple') ? 3 : (k === 'vivo') ? 4 : (k === 'realme') ? 5 : 6;
      });
      var laPK = {};
      dSeg.forEach(function (s, i) { if (s === '10-15M' || s === '15-20M') laPK[i] = 1; });
      var BA = { 0: 'OPPO', 1: 'Samsung', 2: 'Xiaomi' };
      var pkBlank = function () {
        var a = {};
        return a;
      };
      var gomM = {}, gomA = {};   // gomM[sale][hang][ngay|'c'][modelIdx] = [may, dt]
      var pkM = {}, pkA = {};     // pkM[sale][ngay][hang7] = [may, dt]
      DL.rows.forEach(function (r) {
        if (r[0] !== CUR_M) return;
        var d = r[1], sn = dSale[r[2]], bi = r[4], u = r[6] || 0, rv = r[5] || 0;
        if (!d || !u) return;
        var h7 = H7B[bi]; if (h7 === undefined) h7 = 6;
        // PK 10-20M theo ngay theo hang
        if (laPK[r[3]]) {
          var hopP = [pkA];
          if (sn) { if (!pkM[sn]) pkM[sn] = {}; hopP.push(pkM[sn]); }
          hopP.forEach(function (B) {
            if (!B[d]) { B[d] = []; for (var q = 0; q < 7; q++) B[d].push([0, 0]); }
            B[d][h7][0] += u; B[d][h7][1] += rv;
          });
        }
        // model theo ngay + cong don, chi 3 hang OPPO / Samsung / Xiaomi
        var bn = BA[h7]; if (!bn) return;
        var mi = gonTen(dMd[r[8]] || '?');
        var hopM = [gomA];
        if (sn) { if (!gomM[sn]) gomM[sn] = {}; hopM.push(gomM[sn]); }
        hopM.forEach(function (B) {
          if (!B[bn]) B[bn] = {};
          var G = B[bn];
          if (!G[d]) G[d] = {};
          if (!G[d][mi]) G[d][mi] = [0, 0];
          G[d][mi][0] += u; G[d][mi][1] += rv;
          if (!G.c) G.c = {};
          if (!G.c[mi]) G.c[mi] = [0, 0];
          G.c[mi][0] += u; G.c[mi][1] += rv;
        });
      });
      // rut gon: moi ngay moi hang giu top 8 theo may cua ngay, kem so cong don
      var dungM = {};
      var goiM = function (B) {
        var out = null;
        Object.keys(B || {}).forEach(function (bn) {
          var G = B[bn], cd = G.c || {};
          Object.keys(G).forEach(function (d) {
            if (d === 'c') return;
            var ds = Object.keys(G[d]).map(function (mi) {
              var v = G[d][mi], c = cd[mi] || [0, 0];
              return [mi, v[0], tr(v[1]), c[0], tr(c[1])];
            }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
            if (!ds.length) return;
            ds.forEach(function (x) { dungM[x[0]] = 1; });
            if (!out) out = {};
            if (!out[d]) out[d] = {};
            out[d][bn] = ds;
          });
        });
        return out;
      };
      var mAll = goiM(gomA), mBySale = {};
      Object.keys(gomM).forEach(function (sn) { mBySale[sn] = goiM(gomM[sn]); });
      // bang tra ten model — chi giu ma thuc su duoc dung
      var doi = {}, ten = [];
      Object.keys(dungM).forEach(function (mi) { doi[mi] = ten.length; ten.push(mi); });
      var doiSo = function (O) {
        if (!O) return null;
        Object.keys(O).forEach(function (d) {
          Object.keys(O[d]).forEach(function (bn) {
            O[d][bn].forEach(function (x) { x[0] = doi[x[0]]; });
          });
        });
        return O;
      };
      dmTen = ten;
      dmAll = doiSo(mAll);
      Object.keys(mBySale).forEach(function (sn) { dmSale[sn] = doiSo(mBySale[sn]); });
      var goiPK = function (B) {
        var out = null;
        Object.keys(B || {}).forEach(function (d) {
          if (!out) out = {};
          out[d] = B[d].map(function (v) { return [v[0], tr(v[1])]; });
        });
        return out;
      };
      pkAll = goiPK(pkA);
      Object.keys(pkM).forEach(function (sn) { pkSale[sn] = goiPK(pkM[sn]); });
    }
    if (dmTen && dmTen.length) {
      if (dmAll) all.dmN = dmAll;
      Object.keys(dmSale).forEach(function (sn) { if (sales[sn] && dmSale[sn]) sales[sn].dmN = dmSale[sn]; });
    }
    if (pkAll) all.pkD = pkAll;
    Object.keys(pkSale).forEach(function (sn) { if (sales[sn]) sales[sn].pkD = pkSale[sn]; });

    // 7d2. Bonus Model cua chuong trinh rieng Sale Loc & Khai — tinh o cap SALE.
    //   10-15M -> 80.000d/may · 15-20M / 20-30M / >20M / >30M -> 120.000d/may · duoi 10M -> 0
    //   Rieng model bi EP GIA theo ten thi an muc 120.000d bat ke phan khuc (giong DB TG).
    //   Dung daily.rows vi day la nguon duy nhat co CA phan khuc LAN ten model tren cung mot dong.
    if (DL && Array.isArray(DL.rows) && DL.rows.length) {
      var EP_GIA = {};
      ['OPPO Reno16 F 5G 8+128GB'].forEach(function (t) { EP_GIA[gonTen(t)] = 1; });
      var BM_SEG = { '10-15M': 0, '15-20M': 1, '20-30M': 1, '>20M': 1, '>30M': 1 };
      var dS2 = DL.sales || [], dG2 = DL.segments || [], dB2 = DL.brands || [], dM2 = DL.models || [];
      var iOp = -1;
      dB2.forEach(function (b, i) { if (String(b || '').toLowerCase() === 'oppo') iOp = i; });
      var oSeg = {};
      dG2.forEach(function (x, i) { var v = BM_SEG[String(x || '').trim()]; if (v !== undefined) oSeg[i] = v; });
      var oEp = {};
      dM2.forEach(function (t, i) { if (EP_GIA[gonTen(t)]) oEp[i] = 1; });
      var bmRong = function () { var a = []; for (var q = 0; q < NM; q++) a.push([0, 0]); return a; };
      var bmSale = {}, bmTong = bmRong();
      if (iOp >= 0) {
        DL.rows.forEach(function (r) {
          if (r[4] !== iOp) return;
          var i = MIDX[r[0]]; if (i === undefined) return;
          var u = r[6] || 0; if (!u) return;
          var b = oEp[r[8]] ? 1 : oSeg[r[3]];
          if (b === undefined) return;
          var sn = dS2[r[2]];
          if (sn) { if (!bmSale[sn]) bmSale[sn] = bmRong(); bmSale[sn][i][b] += u; }
          bmTong[i][b] += u;
        });
        all.bmL = bmTong;
        Object.keys(bmSale).forEach(function (sn) { if (sales[sn]) sales[sn].bmL = bmSale[sn]; });
      }
    }

    // 7c. Khung gio ban (moi hang, thang hien tai) -> sh.hr = [[khung, may, dt]]
    var shb = kho('shop_hour_all_brand');
    if (shb && Object.keys(shb).length) {
      src.hour = true;
      Object.keys(shb).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var cell = thangCua(shb[tenMain], CUR_M); if (!cell) return;
        var ds = [];
        Object.keys(cell).forEach(function (slot) {
          var v = cell[slot] || {};
          if (!v.units) return;
          ds.push([slot, v.units, tr(v.rev || 0)]);
        });
        ds.sort(function (a, b) { return String(a[0]).localeCompare(String(b[0]), 'vi', { numeric: true }); });
        if (ds.length) shops[st].hr = ds;
      });
    }

    // 7d. Nhan vien ban gioi PK 10-20M (thang hien tai) -> sh.st = [[ten, may, dt, modelManhNhat]]
    var ssp = kho('shop_staff_pk1020');
    if (ssp && Object.keys(ssp).length) {
      src.staff = true;
      Object.keys(ssp).forEach(function (tenMain) {
        var st = veShopOppo(tenMain); if (!st || !shops[st]) return;
        var cell = thangCua(ssp[tenMain], CUR_M); if (!cell) return;
        var ds = [];
        Object.keys(cell).forEach(function (ten) {
          var v = cell[ten] || {};
          if (!v.units) return;
          var top = '', topU = 0;
          Object.keys(v.models || {}).forEach(function (mdl) {
            var mv = v.models[mdl] || {};
            if ((mv.units || 0) > topU) { topU = mv.units; top = mdl; }
          });
          ds.push([ten, v.units, tr(v.rev || 0), top]);
        });
        ds.sort(function (a, b) { return b[1] - a[1]; });
        if (ds.length) shops[st].stf = ds.slice(0, 5);
      });
    }

    // ---- Bang ton theo DAI LY (da gom chi nhanh)
    var dlTon = [];
    Object.keys(dlTheoKhoa).forEach(function (k) {
      var g = dlTheoKhoa[k];
      var tk = tonKho(g);
      if (!tk) return;
      var nhap = 0, ban = 0;
      tk.forEach(function (x) { nhap += x[1]; ban += x[2]; });
      if (!nhap) return;                       // chua ghep duoc sell-in -> khong tinh ton
      var saleSet = {}, tenCN = [];
      g.shops.forEach(function (st) { saleSet[shops[st].sale] = 1; tenCN.push(st); });
      dlTon.push({
        n: g.ten, cn: tenCN, sale: Object.keys(saleSet),
        nhap: Math.round(nhap), ban: ban, ton: Math.round(nhap) - ban,
        md: tk.slice(0, 20)
      });
    });
    dlTon.sort(function (a, b) { return b.ton - a.ton; });

    // =========================================================
    // 7e. TARGET THEO KENH — lay dung con so anh Thai giao trong DB TG (tong 50 ty)
    //     va phan bo xuong tung Sale theo DUNG cach DB TG dang lam:
    //     ty trong doanh so/doanh thu binh quan thang cua sale trong chinh kenh do.
    // =========================================================
    var CHANNEL_TARGETS = {
      MWG: { u: 3500, rv: 33000000000 },
      KA:  { u: 600,  rv: 4500000000 },
      IND: { u: 2000, rv: 12500000000 }
    };
    var tenSale = Object.keys(sales);
    CHANS.forEach(function (c) {
      var T = CHANNEL_TARGETS[c]; if (!T) return;
      var tongU = 0, tongR = 0, avg = {};
      tenSale.forEach(function (sn) {
        var mm = sales[sn].ch[c]; if (!mm) return;
        var u = 0, rv = 0;
        mm.forEach(function (x) { u += x[0]; rv += x[1]; });
        avg[sn] = { u: u / NM, rv: rv / NM };
        tongU += avg[sn].u; tongR += avg[sn].rv;
      });
      Object.keys(avg).forEach(function (sn) {
        var o = sales[sn];
        if (!o.tgc) o.tgc = {};
        o.tgc[c] = [
          Math.round(T.u * (tongU ? avg[sn].u / tongU : 0)),
          tr(T.rv * (tongR ? avg[sn].rv / tongR : 0))
        ];
      });
      if (!all.tgc) all.tgc = {};
      all.tgc[c] = [T.u, tr(T.rv)];
    });

    // =========================================================
    // 8. Dong goi
    // =========================================================
    function packCh(o) {
      var out = {};
      CHANS.forEach(function (c) { if (o.ch[c]) out[c] = o.ch[c].map(function (x) { return [x[0], tr(x[1])]; }); });
      return out;
    }
    function packPairs(a) { return a.map(function (x) { return [x[0], tr(x[1])]; }); }
    function packMoM(src2, n) {
      var out = null;
      Object.keys(src2 || {}).forEach(function (m) {
        var ds = topModel(src2[m], n);
        if (ds.length) { if (!out) out = {}; out[m] = ds; }
      });
      return out;
    }
    function topModel(mo, n) {
      return Object.keys(mo || {})
        .map(function (k) { return [k, mo[k][0], tr(mo[k][1])]; })
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, n || 12);
    }
    // Trai mang thua thanh mang dac theo ngay-trong-nam (1..lastDoy)
    function densify(o) {
      var u = new Array(lastDoy), r = new Array(lastDoy);
      for (var i = 0; i < lastDoy; i++) { u[i] = 0; r[i] = 0; }
      if (o._dy) Object.keys(o._dy).forEach(function (k) {
        var i = +k - 1; if (i >= 0 && i < lastDoy) { u[i] = o._dy[k]; r[i] = tr(o._dr[k]); }
      });
      return [u, r];
    }
    function packCore(o, withDy) {
      var r = {
        m: packPairs(o.m), ch: packCh(o),
        sg: packPairs(o.sg), sgM: packPairs(o.sgM),
        sr: packPairs(o.sr), srM: packPairs(o.srM)
      };
      if (o.ac && o.ac.some(function (x) { return x; })) r.ac = o.ac;
      var mo = topModel(o.mo, withDy ? 15 : 10);
      if (mo.length) r.mo = mo;
      if (o.srm) r.srm = o.srm.map(packPairs);
      if (o.sgm) r.sgm = o.sgm.map(packPairs);
      var mm = packMoM(o.moM, withDy ? 10 : 6);
      if (mm) r.moM = mm;
      if (withDy) { var x = densify(o); r.dy = x[0]; r.dr = x[1]; }
      else { r.d = o.d; r.dp = o.dp; }
      if (o.mkt) r.mkt = o.mkt;
      if (o.mdB) r.mdB = o.mdB;
      if (o.dnB) r.dnB = o.dnB;
      if (o.dmN) r.dmN = o.dmN;
      if (o.pkD) r.pkD = o.pkD;
      if (o.bmL) r.bmL = o.bmL;
      if (o.tgc) r.tgc = o.tgc;
      if (o.si) r.si = o.si;
      var tk = tonKho(o); if (tk) r.tk = tk;   // ton kho IND theo model
      if (chuaGhepSellin(o)) r.tkNo = 1;      // ban nhung chua ghep duoc sell-in
      if (o.chd) {
        r.chd = {};
        CHANS.forEach(function (c) {
          var cd = o.chd[c]; if (!cd) return;
          var y = {
            m: packPairs(cd.m),
            sg: packPairs(cd.sg), sgM: packPairs(cd.sgM),
            sr: packPairs(cd.sr), srM: packPairs(cd.srM)
          };
          if (cd.ac && cd.ac.some(function (x) { return x; })) y.ac = cd.ac;
          var cmo = topModel(cd.mo, 12);
          if (cmo.length) y.mo = cmo;
          var z = densify(cd); y.dy = z[0]; y.dr = z[1];
          if (cd.mkt) y.mkt = cd.mkt;
          if (cd.srm) y.srm = cd.srm.map(packPairs);
          if (cd.sgm) y.sgm = cd.sgm.map(packPairs);
          var cmm = packMoM(cd.moM, 8);
          if (cmm) y.moM = cmm;
          r.chd[c] = y;
        });
      }
      return r;
    }

    var bySale = {};
    shopOrder.forEach(function (st) { (bySale[shops[st].sale] = bySale[shops[st].sale] || []).push(st); });

    var salesOut = Object.keys(sales).sort().map(function (name) {
      var lst = (bySale[name] || []).slice().sort(function (a, b) {
        var ra = 0, rb = 0;
        shops[a].m.forEach(function (x) { ra += x[1]; });
        shops[b].m.forEach(function (x) { rb += x[1]; });
        return rb - ra;
      });
      var o = packCore(sales[name], true);
      o.n = name;
      o.shops = lst.length;
      o.tg = lst.reduce(function (t, s) { return t + shops[s].tg; }, 0);
      o.s = lst.map(function (st) {
        var sh = shops[st], c = packCore(sh);
        c.n = sh.n; c.ch2 = sh.chan; c.lv = sh.lv; c.tg = sh.tg;
        if (sh.size) c.size = sh.size;
        if (sh.sid) c.sid = sh.sid;
        if (sh.md) c.md = sh.md;
        if (sh.dk) c.dk = sh.dk;
        if (sh.mkm) c.mkm = sh.mkm;
        if (sh.sgmS) c.sgmS = sh.sgmS;
        if (sh.sgb) c.sgb = sh.sgb;
        if (sh.bmS) c.bmS = sh.bmS;
        if (sh.dkp) c.dkp = sh.dkp;
        if (sh.hr) c.hr = sh.hr;
        if (sh.stf) c.stf = sh.stf;
        return c;
      });
      return o;
    }).filter(function (o) { return o.shops || o.m.some(function (x) { return x[0]; }); });

    var allOut = packCore(all, true);
    allOut.shops = shopOrder.length;
    allOut.tg = shopOrder.reduce(function (t, s) { return t + shops[s].tg; }, 0);

    return {
      updated: new Date().toISOString(),
      v: 2,
      months: MONTHS, maxDay: maxDay, dimCur: DIM_CUR, dimPrv: DIM_PRV,
      year: YEAR, lastDoy: lastDoy,
      dmT: dmTen,
      segs: SEGS, sers: SERS, chans: CHANS,
      segsMkt: SEGA,
      nhomPK: nhomPKTen,
      shareKA: (function () {
        try { return tinhShareKA(SHARE_KA, MONTHS); } catch (e) { return null; }
      })(),
      sizes: (function(){var z={};shopOrder.forEach(function(st){if(shops[st].size)z[shops[st].size]=1});
        return ['S','A','B','C','D','Chưa xếp size'].filter(function(x){return z[x]})
          .concat(Object.keys(z).filter(function(x){return ['S','A','B','C','D','Chưa xếp size'].indexOf(x)<0}).sort())})(),
      tgK: { MWG: [3500, tr(33000000000)], KA: [600, tr(4500000000)], IND: [2000, tr(12500000000)] },
      tkMonths: SI_LIST,
      dlTon: dlTon,
      tkLe: {
        tong: Math.round(leSellin.tong),
        theoMa: Math.round(leSellin.theoMa),
        theoTen: Math.round(leSellin.theoTen),
        ma: Object.keys(leSellin.ma).length,
        mdl: Object.keys(leSellin.mdl).map(function (k) { return [k, Math.round(leSellin.mdl[k])]; })
                 .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 20)
      },
      hc: HC,
      src: src,
      mktNote: {
        matched: mkt.matched, shops: mkt.shops,
        unmatched: mkt.unmatched.slice(0, 20)
      },
      all: allOut,
      sales: salesOut
    };
  }

  return build;
})();


/* ============================================================================
 * DUNG GOI app-data (dang ma App Sale dang dung), CHAY HOAN TOAN TREN MAY CHU
 * ----------------------------------------------------------------------------
 * Truoc day chuoi nay phai di qua robot GitHub: mo tg.html bang trinh duyet an,
 * cho trang tinh xong, bom build-app-data.js vao trang, lay ket qua ra. Nay lam
 * thang trong Apps Script: doc lai hai goi da chot ky, va 3 sheet phu, doc
 * Share KA, roi goi dung bo trich xuat do.
 * ==========================================================================*/
function TG_dungAppData_() {
  var t0 = Date.now();
  var A = JSON.parse(TG_docTep_(TG_TEP.center) || 'null');
  var B = JSON.parse(TG_docTep_(TG_TEP.mwg) || 'null');
  if (!A || !A.data) throw new Error('Chua chot ky CENTER. Chay TG_chotKy() truoc.');
  if (!B || !B.data) throw new Error('Chua chot ky DATA MWG. Chay TG_chotKy() truoc.');
  var tGoi = Date.now() - t0;

  var tk = TG_ganSheetPhu_(A.data);
  var shareKa = TG_docShareKa_();
  var tPhu = Date.now() - t0 - tGoi;

  var d = TG_BUILD_APP_DATA(A.data, B.data, shareKa);
  var tXuat = Date.now() - t0 - tGoi - tPhu;

  d.updated = new Date().toISOString();
  return {
    data: d,
    thongKe: {
      giayDocGoi: Math.round(tGoi / 100) / 10,
      giayVaSheetPhu: Math.round(tPhu / 100) / 10,
      giayTrichXuat: Math.round(tXuat / 100) / 10,
      sheetPhu: tk,
      soSale: (d.sales || []).length,
      soShop: (d.all && d.all.shops) || 0,
      thang: d.months, maxDay: d.maxDay, lastDoy: d.lastDoy,
    },
  };
}

/** Chay tay / goi HTTP: dung goi app-data roi tra ve THONG KE (khong tra so lieu). */
function TG_soiAppData() {
  var kq = TG_dungAppData_();
  Logger.log(JSON.stringify(kq.thongKe));
  return kq.thongKe;
}


/* ============================================================================
 * CHANG 2 — PHAN 3: CAT PHAN CUA TUNG NGUOI
 * ----------------------------------------------------------------------------
 * NGUYEN VAN phan cat pham vi cua scripts/build-vault.mjs (ham gopAll /
 * saleTheoKenh / maSo / locGT / phamVi), chi them tien to TGV_ cho khoi dam ten
 * voi cac ham khac trong file nay. KHONG doi mot dong logic nao.
 *
 * Nguyen tac giu nguyen tu ban cu: CAT O TANG DONG GOI, khong phai tang giao
 * dien. An tren man hinh thi du lieu VAN NAM trong goi cua ho — mo F12 la doc
 * duoc. Cat o day thi du lieu KHONG CO trong goi. Khong co gi de ma lo.
 *
 *   admin  -> toan tinh, du 3 kenh
 *   leader -> CHI 1 KENH, nhung thay tat ca sale co shop trong kenh do
 *   sale   -> chi shop cua minh (du kenh nao)
 * ==========================================================================*/
function TGV_gopAll(D, ds) {
  const NM = D.months.length, N = D.lastDoy || 0;
  const cap = (n) => Array.from({ length: n }, () => [0, 0]);
  const so = (n) => Array.from({ length: n }, () => 0);
  const NSG = (D.segsMkt || []).length;
  const out = {
    m: cap(NM), ac: so(NM), dy: so(N), dr: so(N), ch: {},
    sg: cap(D.segs.length), sgM: cap(D.segs.length),
    sr: cap(D.sers.length), srM: cap(D.sers.length),
    chd: {}, shops: 0, tg: 0,
  };
  const cong = (a, b) => { if (!b) return; for (let i = 0; i < a.length; i++) { a[i][0] += b[i][0]; a[i][1] += b[i][1]; } };
  const congD = (a, b) => { if (!b) return; for (let i = 0; i < a.length; i++) a[i] += (b[i] || 0); };
  const congQ = (a, b) => { if (!b) return; for (let i = 0; i < a.length; i++) for (let k = 0; k < 4; k++) a[i][k] += (b[i] ? b[i][k] : 0); };
  const quad = (n) => Array.from({ length: n }, () => [0, 0, 0, 0]);
  const gomModel = (cu, them) => {
    const g = {};
    [...(cu || []), ...(them || [])].forEach(([n2, u, r]) => { g[n2] = g[n2] || [0, 0]; g[n2][0] += u; g[n2][1] += r; });
    return Object.keys(g).map((n2) => [n2, g[n2][0], g[n2][1]]).sort((a, b) => b[1] - a[1]).slice(0, 15);
  };
  const gomTon = (cu, them) => {
    if (!them) return cu;
    const key = (x) => String(x).toUpperCase().replace(/\s+/g, ' ').replace(/\s*\+\s*/g, '+').trim();
    const g = {};
    [...(cu || []), ...them].forEach(([n2, nhap, ban]) => {
      const k = key(n2);
      if (!g[k]) g[k] = { n: n2, nhap: 0, ban: 0 };
      g[k].nhap += nhap; g[k].ban += ban;
    });
    return Object.keys(g).map((k) => [g[k].n, g[k].nhap, g[k].ban, g[k].nhap - g[k].ban])
      .sort((a2, b2) => b2[3] - a2[3]);
  };
  const gomSellin = (a, b) => {
    if (!b) return a;
    const r = a || Array.from({ length: NM }, () => [0, 0, 0]);
    for (let i = 0; i < NM; i++) for (let k = 0; k < 3; k++) r[i][k] += (b[i] ? b[i][k] : 0);
    return r;
  };

  for (const s of ds) {
    cong(out.m, s.m); congD(out.dy, s.dy); congD(out.dr, s.dr);
    congD(out.ac, s.ac);
    cong(out.sg, s.sg); cong(out.sgM, s.sgM); cong(out.sr, s.sr); cong(out.srM, s.srM);
    if (s.mo) out.mo = gomModel(out.mo, s.mo);
    if (s.sgm) { if (!out.sgm) out.sgm = s.sgm.map((x) => x.map(() => [0, 0]));
      s.sgm.forEach((sg2, k) => sg2.forEach((v, i) => { out.sgm[k][i][0] += v[0]; out.sgm[k][i][1] += v[1]; })); }
    if (s.srm) { if (!out.srm) out.srm = s.srm.map((x) => x.map(() => [0, 0]));
      s.srm.forEach((ser, k) => ser.forEach((v, i) => { out.srm[k][i][0] += v[0]; out.srm[k][i][1] += v[1]; })); }
    if (s.moM) { out.moM = out.moM || {};
      Object.keys(s.moM).forEach((m) => { out.moM[m] = gomModel(out.moM[m], s.moM[m]).slice(0, 12); }); }
    if (s.si) out.si = gomSellin(out.si, s.si);
    // ngay x hang ca nam: cong thang tung o
    if (s.dnB) {
      if (!out.dnB) out.dnB = s.dnB.map(() => [0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
      s.dnB.forEach((v, i) => {
        if (!out.dnB[i] || !v) return;
        for (let k = 0; k < 14; k++) out.dnB[i][k] += (v[k] || 0);
      });
    }
    // top model tung hang tung thang: cong het roi moi cat top 10
    if (s.mdB) {
      out._mdB = out._mdB || {};
      Object.keys(s.mdB).forEach((m2) => {
        out._mdB[m2] = out._mdB[m2] || {};
        Object.keys(s.mdB[m2]).forEach((h2) => {
          const g2 = out._mdB[m2][h2] || (out._mdB[m2][h2] = {});
          (s.mdB[m2][h2] || []).forEach(([n3, u3, r3]) => {
            g2[n3] = g2[n3] || [0, 0]; g2[n3][0] += u3; g2[n3][1] += r3;
          });
        });
      });
    }
    if (s.tk) out.tk = gomTon(out.tk, s.tk);
    if (s.tgc) { out.tgc = out.tgc || {};
      Object.keys(s.tgc).forEach((c) => { out.tgc[c] = out.tgc[c] || [0, 0];
        out.tgc[c][0] += s.tgc[c][0]; out.tgc[c][1] += s.tgc[c][1]; }); }
    out.shops += s.shops || 0; out.tg += s.tg || 0;
    if (s.dmN) {
      out._dmN = out._dmN || {};
      Object.keys(s.dmN).forEach((d3) => {
        out._dmN[d3] = out._dmN[d3] || {};
        Object.keys(s.dmN[d3]).forEach((b3) => {
          const G3 = out._dmN[d3][b3] || (out._dmN[d3][b3] = {});
          (s.dmN[d3][b3] || []).forEach((x3) => {
            G3[x3[0]] = G3[x3[0]] || [0, 0, 0, 0];
            G3[x3[0]][0] += x3[1]; G3[x3[0]][1] += x3[2];
            G3[x3[0]][2] += x3[3]; G3[x3[0]][3] += x3[4];
          });
        });
      });
    }
    if (s.bmL) {
      if (!out.bmL) out.bmL = s.bmL.map(() => [0, 0]);
      s.bmL.forEach((v, i) => {
        if (!out.bmL[i] || !v) return;
        out.bmL[i][0] += (v[0] || 0); out.bmL[i][1] += (v[1] || 0);
      });
    }
    if (s.pkD) {
      out.pkD = out.pkD || {};
      Object.keys(s.pkD).forEach((d3) => {
        if (!out.pkD[d3]) out.pkD[d3] = Array.from({ length: 7 }, () => [0, 0]);
        (s.pkD[d3] || []).forEach((v3, k3) => {
          if (out.pkD[d3][k3]) { out.pkD[d3][k3][0] += v3[0]; out.pkD[d3][k3][1] += v3[1]; }
        });
      });
    }
    for (const c of Object.keys(s.ch || {})) {
      if (!out.ch[c]) out.ch[c] = cap(NM);
      cong(out.ch[c], s.ch[c]);
    }
    for (const c of Object.keys(s.chd || {})) {
      const src = s.chd[c];
      if (!out.chd[c]) out.chd[c] = {
        m: cap(NM), ac: so(NM), dy: so(N), dr: so(N),
        sg: cap(D.segs.length), sgM: cap(D.segs.length),
        sr: cap(D.sers.length), srM: cap(D.sers.length),
      };
      const t = out.chd[c];
      cong(t.m, src.m); congD(t.dy, src.dy); congD(t.dr, src.dr);
      congD(t.ac, src.ac);
      cong(t.sg, src.sg); cong(t.sgM, src.sgM); cong(t.sr, src.sr); cong(t.srM, src.srM);
      if (src.mo) t.mo = gomModel(t.mo, src.mo);
      if (src.mkt) {
        if (!t.mkt) t.mkt = { m: Array.from({ length: NM }, () => [0, 0, 0, 0]), br: [] };
        for (let i = 0; i < NM; i++) for (let k = 0; k < 4; k++) t.mkt.m[i][k] += src.mkt.m[i][k];
        if (src.mkt.sg && NSG) { if (!t.mkt.sg) t.mkt.sg = quad(NSG); congQ(t.mkt.sg, src.mkt.sg); }
        if (src.mkt.sgY && NSG) { if (!t.mkt.sgY) t.mkt.sgY = quad(NSG); congQ(t.mkt.sgY, src.mkt.sgY); }
        const g = {};
        [...(t.mkt.br || []), ...(src.mkt.br || [])].forEach(([b, u, r]) => {
          g[b] = g[b] || [0, 0]; g[b][0] += u; g[b][1] += r;
        });
        t.mkt.br = Object.keys(g).map((b) => [b, g[b][0], g[b][1]])
          .sort((a, b) => b[1] - a[1]).slice(0, 10);
      }
    }
  }
  if (out._dmN) {
    out.dmN = {};
    Object.keys(out._dmN).forEach((d3) => {
      out.dmN[d3] = {};
      Object.keys(out._dmN[d3]).forEach((b3) => {
        const G3 = out._dmN[d3][b3];
        out.dmN[d3][b3] = Object.keys(G3)
          .map((i3) => [+i3, G3[i3][0], G3[i3][1], G3[i3][2], G3[i3][3]])
          .sort((a3, z3) => z3[1] - a3[1]).slice(0, 8);
      });
    });
    delete out._dmN;
  }
  if (out._mdB) {
    out.mdB = {};
    Object.keys(out._mdB).forEach((m2) => {
      out.mdB[m2] = {};
      Object.keys(out._mdB[m2]).forEach((h2) => {
        const g2 = out._mdB[m2][h2];
        out.mdB[m2][h2] = Object.keys(g2).map((n3) => [n3, g2[n3][0], g2[n3][1]])
          .sort((a2, b2) => b2[1] - a2[1]).slice(0, 10);
      });
    });
    delete out._mdB;
  }
  if (out.chd.MWG && out.chd.MWG.mkt) out.mkt = out.chd.MWG.mkt;
  return out;
}

// Cat 1 sale xuong con dung 1 kenh — dung cho Leader
function TGV_saleTheoKenh(D, s, ch) {
  const cd = (s.chd || {})[ch];
  const shops = (s.s || []).filter((x) => x.ch2 === ch);
  if (!cd && !shops.length) return null;
  const cap = (n) => Array.from({ length: n }, () => [0, 0]);
  const rong = {
    m: cap(D.months.length), dy: [], dr: [],
    sg: cap(D.segs.length), sgM: cap(D.segs.length),
    sr: cap(D.sers.length), srM: cap(D.sers.length),
  };
  const c = cd || rong;
  const o = {
    n: s.n, shops: shops.length,
    tg: shops.reduce((t, x) => t + (x.tg || 0), 0),
    m: c.m, dy: c.dy || [], dr: c.dr || [],
    ch: { [ch]: c.m },
    sg: c.sg, sgM: c.sgM, sr: c.sr, srM: c.srM,
    chd: { [ch]: c },
    s: shops,
  };
  if (c.mkt) o.mkt = c.mkt;
  if (c.ac) o.ac = c.ac;
  if (c.mo) o.mo = c.mo;
  if (c.srm) o.srm = c.srm;
  if (c.sgm) o.sgm = c.sgm;
  if (c.moM) o.moM = c.moM;
  if (s.tgc && s.tgc[ch]) o.tgc = { [ch]: s.tgc[ch] };
  if (ch === 'IND' && s.si) o.si = s.si;   // sell-in chi co o kenh IND
  if (ch === 'IND' && s.tk) o.tk = s.tk;   // ton kho cung vay
  if (ch === 'MWG') { if (s.dnB) o.dnB = s.dnB; if (s.mdB) o.mdB = s.mdB; if (s.bmL) o.bmL = s.bmL;
    if (s.dmN) o.dmN = s.dmN; if (s.pkD) o.pkD = s.pkD; }
  return o;
}

// Giai trinh: chi giu dong cua shop THUOC pham vi nguoi nay — giu dung luat
// 'sale nao thay so cua sale do'. Noi theo MA SO trong ten shop.
function TGV_maSo(s) {
  var t = String(s || ''), i = 0, r = [];
  while (i < t.length) {
    var c = t.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      var j = i;
      while (j < t.length) { var d = t.charCodeAt(j); if (d < 48 || d > 57) break; j++; }
      var so = t.slice(i, j);
      if (so.length >= 2 && so.length <= 5) r.push(so);
      i = j;
    } else i++;
  }
  return r;
}
function TGV_locGT(gtAll, ds) {
  if (!Array.isArray(gtAll) || !gtAll.length) return null;
  var ten = [];
  ds.forEach(function (s) { (s.s || []).forEach(function (x) { if (x && x.n) ten.push(x.n); }); });
  if (!ten.length) return null;
  var maCua = ten.map(TGV_maSo);
  var out = [];
  gtAll.forEach(function (gt) {
    var ma = TGV_maSo(gt[0]);
    if (!ma.length) return;
    for (var i = 0; i < ten.length; i++) {
      var mb = maCua[i], khop = false;
      for (var k = 0; k < ma.length; k++) if (mb.indexOf(ma[k]) >= 0) { khop = true; break; }
      if (khop) { out.push([ten[i], gt[1], gt[2], gt[3]]); return; }
    }
  });
  return out.length ? out : null;
}
function TGV_phamVi(D, tenSales, vaiTro, hangCuaToi, kenh) {
  let ds = D.sales.filter((s) => tenSales.includes(s.n));
  if (kenh) ds = ds.map((s) => TGV_saleTheoKenh(D, s, kenh)).filter(Boolean)
                   .sort((a, b) => b.m.reduce((t, x) => t + x[1], 0) - a.m.reduce((t, x) => t + x[1], 0));
  const o = {
    updated: D.updated, months: D.months, maxDay: D.maxDay,
    dimCur: D.dimCur, dimPrv: D.dimPrv, year: D.year, lastDoy: D.lastDoy,
    segs: D.segs, sers: D.sers,
    chans: kenh ? [kenh] : D.chans,
    v: D.v, segsMkt: D.segsMkt || [], nhomPK: D.nhomPK || null,
    dmT: D.dmT || null,
    gt: TGV_locGT(D.gtAll, ds),
    shareKA: D.shareKA || null,
    src: D.src || null, tkMonths: D.tkMonths || [],
    tgK: D.tgK || null, sizes: D.sizes || [],
    tkLe: (vaiTro === 'admin' || vaiTro === 'leader') ? (D.tkLe || null) : null,
    // Ton kho chi co o kenh IND -> Leader kenh khac khong nhan gi
    dlTon: (kenh && kenh !== 'IND') ? []
      : (D.dlTon || []).filter((x) => (x.sale || []).some((sn) => tenSales.includes(sn))),
    vaiTro, kenh: kenh || null,
    all: TGV_gopAll(D, ds), sales: ds,
  };
  // Headcount la so nguoi cua ca kenh — chi dua cho quan ly vung va leader dung kenh do
  if (D.hc && vaiTro !== 'sale') {
    o.hc = {};
    (kenh ? [kenh] : D.chans).forEach((c) => { if (D.hc[c]) o.hc[c] = D.hc[c]; });
  }
  if (vaiTro === 'admin') { o.mktNote = D.mktNote; o.all.mkt = D.all.mkt; o.all.chd = D.all.chd; o.all.si = D.all.si; o.all.tk = D.all.tk; if (D.all.tgc) o.all.tgc = D.all.tgc; }
  if (hangCuaToi) o.hang = hangCuaToi;   // "4/16" — biet minh dung dau ma khong thay so nguoi khac
  return o;
}


/* ============================================================================
 * CHANG 2 — PHAN 3b: DANH TINH, CAT GOI, VA DUONG TRA GOI CHO TUNG NGUOI
 * ----------------------------------------------------------------------------
 * MA PIN KHONG NAM TRONG MA NGUON. No nam trong Thuoc tinh tap lenh (Project
 * Settings > Script Properties) ten SALE_CODES, dung dinh dang y het GitHub
 * Secret cu:
 *   { "admin":  { "pin": "...", "ten": "Duy Thái" },
 *     "leader": { "MWG": "...", "KA": "...", "IND": "..." },
 *     "sales":  { "CAO CHÍ BẢO": "...", ... } }
 *
 * MA PIN KHONG DI QUA DUONG TRUYEN. App gui BAN BAM sha256(pin + "|" + id),
 * khong gui pin. Nho vay pin khong nam trong nhat ky may chu, khong nam trong
 * lich su trinh duyet, khong nam trong URL.
 *
 * ID cua moi nguoi la ban bam cua ten+vai tro nen CO DINH qua moi lan dung goi
 * (khac ban cu: moi lan robot chay lai la sinh id ngau nhien moi).
 * ==========================================================================*/

var TG_TEP_APP_INDEX = 'TG_app_index.json';
var TG_TIEN_TO_GOI  = 'TG_app_';

function TG_bamHex_(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  var h = '';
  for (var i = 0; i < b.length; i++) {
    var x = (b[i] < 0 ? b[i] + 256 : b[i]).toString(16);
    h += (x.length === 1 ? '0' : '') + x;
  }
  return h;
}
function TG_idNguoi_(ten, vaiTro) { return TG_bamHex_('DBTG|' + vaiTro + '|' + ten).slice(0, 16); }

function TG_docMaNguoi_() {
  var raw = PropertiesService.getScriptProperties().getProperty('SALE_CODES');
  if (!raw) throw new Error('Chua dat SALE_CODES trong Thuoc tinh tap lenh.');
  var o; try { o = JSON.parse(raw); } catch (e) { throw new Error('SALE_CODES khong phai JSON hop le.'); }
  return o;
}

/* So khop ten go tay voi ten trong du lieu — giu nguyen cach cua build-vault:
   uu tien khop chinh xac, roi ha xuong khop khong dau. */
function TG_chuanTen_(x) { return String(x || '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase(); }
function TG_khongDau_(x) {
  return TG_chuanTen_(x).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/Đ/g, 'D');
}

/**
 * Dung goi cho TUNG NGUOI roi luu vao Drive. Chay tren lich rieng, KHONG chung
 * voi TG_chotKy de moi lan chay deu gon trong gioi han 6 phut cua Google.
 */
function TG_dungGoiApp() {
  var t0 = Date.now();
  var ma = TG_docMaNguoi_();
  var kq = TG_dungAppData_();
  var D = kq.data;

  var tenTatCa = (D.sales || []).map(function (s) { return s.n; });
  var mapChinhXac = {}, mapKhongDau = {};
  tenTatCa.forEach(function (n) {
    mapChinhXac[TG_chuanTen_(n)] = n;
    var k = TG_khongDau_(n);
    mapKhongDau[k] = (mapKhongDau[k] === undefined || mapKhongDau[k] === n) ? n : null;
  });
  var doiTen = function (x) {
    if (mapChinhXac[TG_chuanTen_(x)]) return mapChinhXac[TG_chuanTen_(x)];
    return mapKhongDau[TG_khongDau_(x)] || null;
  };

  var xep = (D.sales || []).slice().sort(function (a, b) {
    return b.m.reduce(function (t, x) { return t + x[1]; }, 0) -
           a.m.reduce(function (t, x) { return t + x[1]; }, 0);
  }).map(function (s) { return s.n; });
  var hangCua = function (n) { return (xep.indexOf(n) + 1) + '/' + xep.length; };

  var index = [], bao = [], boQua = [];
  function them(ten, vaiTro, pin, sales, kenh) {
    if (!pin || !/^\d{6,12}$/.test(String(pin))) { boQua.push(ten + ' (ma phai 6-12 chu so)'); return; }
    var doi = sales.map(doiTen).filter(Boolean);
    if (!doi.length) { boQua.push(ten + ' (khong khop sale nao)'); return; }
    var goi = TGV_phamVi(D, doi, vaiTro, vaiTro === 'sale' ? hangCua(doi[0]) : null, kenh);
    if (!goi.sales.length) { boQua.push(ten + ' (khong co sale trong pham vi)'); return; }
    var id = TG_idNguoi_(ten, vaiTro);
    var txt = JSON.stringify(goi);
    TG_luuTep_(TG_TIEN_TO_GOI + id + '.json', txt);
    index.push({ id: id, n: ten, r: vaiTro, bam: TG_bamHex_(String(pin) + '|' + id) });
    bao.push(vaiTro + ' ' + ten + ' — ' + goi.sales.length + ' sale, ' +
             Math.round(txt.length / 1024) + ' KB');
  }

  if (ma.admin && ma.admin.pin) them(ma.admin.ten || 'Toàn Tiền Giang', 'admin', ma.admin.pin, tenTatCa, null);
  Object.keys(ma.leader || {}).forEach(function (kenh) {
    var v = ma.leader[kenh];
    them('Leader ' + kenh, 'leader', (typeof v === 'string' ? v : v.pin), tenTatCa, kenh);
  });
  Object.keys(ma.sales || {}).forEach(function (ten) {
    var that = doiTen(ten);
    if (!that) { boQua.push(ten + ' (khong co trong du lieu)'); return; }
    them(that, 'sale', ma.sales[ten], [that]);
  });

  TG_luuTep_(TG_TEP_APP_INDEX, JSON.stringify({
    updated: D.updated, maxDay: D.maxDay, months: D.months, users: index,
  }));

  var ket = {
    soNguoi: index.length, boQua: boQua,
    giay: Math.round((Date.now() - t0) / 100) / 10,
    nguon: kq.thongKe,
  };
  Logger.log(JSON.stringify(ket));
  Logger.log(bao.join('\n'));
  return ket;
}

/** Danh sach nguoi cho man hinh dang nhap — CHI ten + vai tro, khong co ban bam. */
function TG_traIndexApp_() {
  var txt = TG_docTep_(TG_TEP_APP_INDEX);
  if (!txt) return { error: 'Chua dung goi app lan nao. Chay TG_dungGoiApp().' };
  var o = JSON.parse(txt);
  return {
    updated: o.updated, maxDay: o.maxDay, months: o.months,
    users: (o.users || []).map(function (u) { return { id: u.id, n: u.n, r: u.r }; }),
  };
}

/** Tra goi cua DUNG mot nguoi, sau khi doi chieu ban bam. */
function TG_traGoiNguoi_(id, bam) {
  if (!id || !bam) return { error: 'Thieu id hoac ma.' };
  var txt = TG_docTep_(TG_TEP_APP_INDEX);
  if (!txt) return { error: 'Chua dung goi app lan nao.' };
  var o = JSON.parse(txt);
  var u = (o.users || []).filter(function (x) { return x.id === id; })[0];
  if (!u) return { error: 'Khong co nguoi nay.' };
  if (String(bam).toLowerCase() !== String(u.bam).toLowerCase()) return { error: 'Sai ma.' };
  var goi = TG_docTep_(TG_TIEN_TO_GOI + id + '.json');
  if (!goi) return { error: 'Chua co goi cho nguoi nay.' };
  return goi; // da la chuoi JSON
}

/** Chay tay MOT LAN: dat lich tu dung goi app moi 2 gio (lech 30 phut voi chot ky). */
function TG_datLichGoiApp() {
  var cu = ScriptApp.getProjectTriggers(), daXoa = 0;
  for (var i = 0; i < cu.length; i++) {
    if (cu[i].getHandlerFunction() === 'TG_dungGoiApp') { ScriptApp.deleteTrigger(cu[i]); daXoa++; }
  }
  ScriptApp.newTrigger('TG_dungGoiApp').timeBased().everyHours(2).create();
  var bao = 'Da xoa ' + daXoa + ' lich cu, dat lich moi: TG_dungGoiApp moi 2 gio.';
  Logger.log(bao);
  return bao;
}

/* ============================================================================
 * CHANG 2 — BO KIEM RO RI PHAM VI, CHAY THANG TREN MAY CHU
 * ----------------------------------------------------------------------------
 * Chay TREN GOI THAT cua tung nguoi, KHONG can ma PIN (kiem trươc khi luu).
 *
 * Phep kiem manh nhat la QUET DAU VET: doi chuoi JSON cua goi ra chu thuong roi
 * tim ten CUA MOI SALE KHAC. An tren man hinh khong tinh la an — du lieu nam
 * trong goi la mo F12 doc duoc. Chinh phep quet nay tung bat duoc loi bang tra
 * cuu daily.sales con nguyen ten cac sale khac trong khi cac dong da loc dung
 * (xem chu thich trong pham-vi-dbtg.mjs).
 *
 * Chay: ?mode=tinh&phan=kiempv   — chi doc, khong luu gi.
 * ==========================================================================*/
function TG_kiemPhamViApp() {
  var t0 = Date.now();
  var kq = TG_dungAppData_();
  var D = kq.data;
  var tenTatCa = (D.sales || []).map(function (s) { return s.n; });

  // Ban do goc: sale nao co nhung shop nao, kenh nao co nhung shop nao.
  var shopCuaSale = {}, shopCuaKenh = {};
  (D.sales || []).forEach(function (s) {
    shopCuaSale[s.n] = {};
    (s.s || []).forEach(function (x) {
      shopCuaSale[s.n][x.n] = 1;
      var ch = x.ch2 || x.ch;
      if (ch) { shopCuaKenh[ch] = shopCuaKenh[ch] || {}; shopCuaKenh[ch][x.n] = 1; }
    });
  });

  var loi = [], chiTiet = [], soKiem = 0, soLotTen = 0, soLotShop = 0;
  var xep = tenTatCa.slice();
  var hangCua = function (n) { return (xep.indexOf(n) + 1) + '/' + xep.length; };

  tenTatCa.forEach(function (ten) {
    var G;
    try { G = TGV_phamVi(D, [ten], 'sale', hangCua(ten), null); }
    catch (e) { loi.push('sale "' + ten + '": cat goi loi — ' + e.message); return; }
    soKiem++;

    // 1. Goi chi duoc chua dung mot sale, va la chinh ho
    var dsTen = (G.sales || []).map(function (s) { return s.n; });
    if (dsTen.length !== 1 || dsTen[0] !== ten) {
      loi.push('sale "' + ten + '": goi chua ' + dsTen.length + ' sale');
      soLotTen++;
    }

    // 2. Shop trong goi phai thuoc ve chinh ho
    var duoc = shopCuaSale[ten] || {};
    var lot = [];
    (G.sales || []).forEach(function (s) {
      (s.s || []).forEach(function (x) { if (!duoc[x.n]) lot.push(x.n); });
    });
    if (lot.length) { loi.push('sale "' + ten + '": ' + lot.length + ' shop ngoai pham vi'); soLotShop++; }

    // 3. QUET DAU VET: ten sale khac khong duoc xuat hien o BAT KY dau trong goi.
    //    Bao ro TEN NAO lot vao KHOA NAO — khong bao chung chung, vi con phai
    //    phan biet ro ri that voi trung ten (vi du "(Khong ro)" la nhan mac dinh
    //    chu khong phai mot nguoi).
    var chuoi = JSON.stringify(G).toLowerCase();
    var dinh = [];
    tenTatCa.forEach(function (khac) {
      if (khac === ten) return;
      if (chuoi.indexOf(String(khac).toLowerCase()) >= 0) dinh.push(khac);
    });
    if (dinh.length) {
      var noi = {};
      dinh.forEach(function (kh) {
        var k = String(kh).toLowerCase(), o = [];
        Object.keys(G).forEach(function (khoa) {
          try {
            if (JSON.stringify(G[khoa]).toLowerCase().indexOf(k) >= 0) o.push(khoa);
          } catch (e) {}
        });
        noi[kh] = o;
      });
      chiTiet.push({ cua: ten, lot: noi });
      loi.push('sale "' + ten + '": con dau vet cua ' + dinh.length + ' sale khac');
      soLotTen++;
    }
  });

  // Leader: chi duoc thay shop cua dung kenh cua minh
  var soLeader = 0;
  Object.keys(shopCuaKenh).forEach(function (kenh) {
    var G;
    try { G = TGV_phamVi(D, tenTatCa, 'leader', null, kenh); }
    catch (e) { loi.push('leader ' + kenh + ': cat goi loi — ' + e.message); return; }
    soLeader++;
    var duoc = shopCuaKenh[kenh] || {}, lot = [];
    (G.sales || []).forEach(function (s) {
      (s.s || []).forEach(function (x) { if (!duoc[x.n]) lot.push(x.n); });
    });
    if (lot.length) { loi.push('leader ' + kenh + ': ' + lot.length + ' shop ngoai kenh'); soLotShop++; }
  });

  var ket = {
    dat: loi.length === 0,
    soSaleDaKiem: soKiem, soLeaderDaKiem: soLeader,
    goiLotTen: soLotTen, goiLotShop: soLotShop,
    loi: loi.slice(0, 20),
    chiTiet: chiTiet.slice(0, 6),
    giay: Math.round((Date.now() - t0) / 100) / 10,
  };
  Logger.log(JSON.stringify(ket));
  return ket;
}
