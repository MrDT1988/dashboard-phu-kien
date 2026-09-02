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
  var ten = TG_TEP[phan];
  if (!ten) return { error: 'phan phai la center hoac mwg' };
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
