/* kiem-shop-nam.mjs — soi phan TINH TOAN cua 2 khoi moi trong chi tiet shop
   ("Tong quan tu dau nam" + "Nhan xet so cung ky") o scripts/bc-chitiet.js.

   Cach lam: CAT dung doan ma that dang chay trong bc-chitiet.js (tu "var giaPK"
   den truoc "function chiTietShop") roi chay no voi goi so GIA + cac ham phu gia lap.
   Nho vay bo kiem nay khong phai ban sao logic — sua bc-chitiet.js ma sai la no bao. */
import fs from 'fs';

const src = fs.readFileSync(new URL('./bc-chitiet.js', import.meta.url), 'utf8');
const i0 = src.indexOf('var giaPK = function (u, dt)');
const i1 = src.indexOf('function chiTietShop(shop, thang) {');
if (i0 < 0 || i1 < 0 || i1 < i0) { console.error('SAI: khong cat duoc doan ma (moc da doi?)'); process.exit(1); }
const doan = src.slice(i0, i1);

/* ---- goi so gia: 1 shop, thang 8 du 30 ngay, thang 9 moi 12 ngay ---- */
const SP = 'TGD_TGI_AAA - Shop 1';
const md = (brand, units, rev) => ({ brand, units, rev });
const B = {
  shop_model_data: {
    [SP]: {
      8: {
        'OPPO Reno 12 5G 8+256GB': md('OPPO', 10, 130e6),   // 13,0M -> PK 10-20M
        'OPPO A18 4+64GB':          md('OPPO', 20, 60e6),   //  3,0M -> khong PK
        'Samsung Galaxy A16 5G':    md('Samsung', 10, 120e6),// 12,0M -> PK
        'Xiaomi Redmi Note 14':     md('Xiaomi', 5, 50e6),  // 10,0M -> PK (dung bien duoi)
        'iPhone 15':                md('Apple', 2, 60e6),   // 30,0M -> khong PK
        'vivo Y19s':                md('vivo', 3, 15e6),    //  5,0M -> khong PK
      },
      9: {
        'OPPO Reno 12 5G 8+256GB': md('OPPO', 4, 52e6),     // 13,0M -> PK
        'OPPO A18 4+64GB':          md('OPPO', 10, 30e6),
        'Samsung Galaxy A16 5G':    md('Samsung', 12, 144e6),// 12,0M -> PK
        'Xiaomi Redmi Note 14':     md('Xiaomi', 6, 60e6),  // 10,0M -> PK
      },
    },
    'SHOP_MOT_THANG': { 9: { 'OPPO A18': md('OPPO', 5, 15e6) } },
  },
  shop_day_data: { [SP]: {} },
};
for (let d = 1; d <= 30; d++) B.shop_day_data[SP]['8-' + d] = { total_units: 9 };
for (let d = 1; d <= 12; d++) B.shop_day_data[SP]['9-' + d] = { total_units: 9 };

/* ham phu gia lap — dung dung ten ma bc-chitiet.js goi */
const phu = {
  B,
  tenHoa: (s) => String(s == null ? '' : s).replace(/oppo/gi, 'OPPO'),
  mauHang: () => '#000000',
  esc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  fInt: (v) => Math.round(v || 0).toLocaleString('vi-VN'),
  fTr: (v) => (v ? (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'M' : '-'),
};
const nap = new Function(...Object.keys(phu), doan + '\n return { giaPK, gomMD, dsHangNam, khoiNam, khoiCungKy, ngayCoSo };');
const F = nap(...Object.values(phu));

const ok = [], xau = [];
const kt = (t, c) => (c ? ok : xau).push(t);
const so = (a, b, e = 0.05) => Math.abs(a - b) <= e;
const chuSo = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* --- 1. bien phan khuc 10-20M --- */
kt('Gia 10,0M tinh la PK 10-20M (bien duoi lay vao)', F.giaPK(1, 10e6) === true);
kt('Gia 19,9M van la PK 10-20M', F.giaPK(2, 39.8e6) === true);
kt('Gia 20,0M KHONG con la PK 10-20M (bien tren loai ra)', F.giaPK(1, 20e6) === false);
kt('Gia 9,9M khong phai PK', F.giaPK(1, 9.9e6) === false);
kt('0 may thi khong tinh PK (khong chia cho 0)', F.giaPK(0, 50e6) === false);

/* --- 2. gom ca nam --- */
const N = F.gomMD(SP, null);
kt('Ca nam: tong may = 82 (thang 8: 50, thang 9: 32) -> ' + N.tU, N.tU === 82);
kt('Ca nam: co du 5 hang ke ca vivo -> ' + Object.keys(N.hang).sort().join(','),
  ['OPPO', 'Samsung', 'Xiaomi', 'Apple', 'vivo'].every((b) => N.hang[b]));
kt('Ca nam: OPPO 44 may (10+20+4+10) -> ' + N.hang.OPPO.u, N.hang.OPPO.u === 44);
kt('Ca nam: PK 10-20M ca cho 47 may (25+22) -> ' + N.pU, N.pU === 47);
kt('Ca nam: PK 10-20M cua OPPO 14 may (10+4) -> ' + N.hang.OPPO.pu, N.hang.OPPO.pu === 14);
kt('Ca nam: Apple/vivo khong lot vao PK 10-20M', N.hang.Apple.pu === 0 && N.hang.vivo.pu === 0);
kt('Ca nam: liet ke dung 2 thang co so -> ' + N.thang.join(','), N.thang.join(',') === '8,9');

const ds = F.dsHangNam(N);
kt('Xep theo so may giam dan, OPPO dung dau -> ' + ds.map((x) => x.ten).join(','), ds[0].ten === 'OPPO');
kt('Share D.S cua OPPO = 44/82 = 53,7% -> ' + ds[0].sDs.toFixed(1), so(ds[0].sDs, 53.66));
kt('Share PK cua OPPO = 14/47 = 29,8% -> ' + ds[0].sPk.toFixed(1), so(ds[0].sPk, 29.79));
kt('Tong share D.S cua moi hang = 100%', so(ds.reduce((s, x) => s + x.sDs, 0), 100));

/* --- 3. so ngay co so --- */
kt('Thang 8 co 30 ngay co so -> ' + F.ngayCoSo(SP, 8), F.ngayCoSo(SP, 8) === 30);
kt('Thang 9 moi 12 ngay co so -> ' + F.ngayCoSo(SP, 9), F.ngayCoSo(SP, 9) === 12);

/* --- 4. khoi "Tu dau nam" --- */
const hN = F.khoiNam(SP);
const tN = chuSo(hN);
kt('Khoi nam: co du ten 5 hang', ['OPPO', 'Samsung', 'Xiaomi', 'Apple', 'vivo'].every((b) => tN.includes(b)));
kt('Khoi nam: khong lot NaN / undefined', !/NaN|undefined/.test(hN));
kt('Khoi nam: ghi ro khoang thang T8–T9', /T8[–-]T9/.test(tN));
kt('Khoi nam: dong OPPO duoc danh dau rieng', hN.includes('bc-sct-tp-oppo'));
kt('Khoi nam: shop khong co so thi bao ro, khong vo', /chưa có số theo model/i.test(chuSo(F.khoiNam('SHOP_LA'))));

/* --- 5. khoi "So cung ky" --- */
const hK = F.khoiCungKy(SP, 9);
const tK = chuSo(hK);
kt('Cung ky: so thang 9 voi thang 8', /tháng 9 so tháng 8/.test(tK));
kt('Cung ky: khong lot NaN / undefined', !/NaN|undefined/.test(hK));
/* PK 10-20M: T8 OPPO 10/25 = 40,0% ; T9 OPPO 4/22 = 18,2% -> mat 21,8 diem.
   Phan mat roi vao Samsung (40,0 -> 54,5 = +14,5) va Xiaomi (20,0 -> 27,3 = +7,3). */
kt('Cung ky: bat dung OPPO 40,0% -> 18,2% o PK 10-20M', /40,0% ?→ ?18,2%|40\.0% → 18\.2%/.test(tK.replace(/\./g, ',')));
kt('Cung ky: ket luan OPPO MAT thi phan PK', /OPPO mất 21,8 điểm PK 10-20M/.test(tK.replace(/\./g, ',')));
kt('Cung ky: chi dich danh Samsung va Xiaomi la ben lay duoc', /rơi vào tay/.test(tK) && /Samsung \+14,5 điểm/.test(tK.replace(/\./g, ',')) && /Xiaomi/.test(tK));
/* toan shop: OPPO T8 30 may / 30 ngay = 1,0 ; T9 14 may / 12 ngay = 1,17 -> +17% */
kt('Cung ky: quy ve may/ngay (1,0 -> 1,2), khong so thang chay do voi thang du', /1,0 ?→ ?1,2 máy\/ngày/.test(tK.replace(/\./g, ',')));
kt('Cung ky: noi ro thang 9 moi co 12 ngay, thang 8 co 30 ngay', /12/.test(tK) && /30/.test(tK) && /máy\/ngày/.test(tK));
kt('Cung ky: co ca bang PK lan bang toan shop', /ai lấy thị phần của ai/i.test(tK) && /Toàn shop/i.test(tK));
kt('Cung ky: ghi ro khong so duoc cung ky NAM TRUOC', /không so được cùng kỳ năm trước/i.test(tK));
kt('Cung ky: shop moi co 1 thang thi bao ro, khong vo',
  /tháng đầu tiên có số/i.test(chuSo(F.khoiCungKy('SHOP_MOT_THANG', 9))));
kt('Cung ky: shop la hoan toan thi bao ro, khong vo', !!chuSo(F.khoiCungKy('SHOP_LA', 9)).trim());

/* --- 6. mau theo goc nhin OPPO: doi thu tang phai la DO --- */
{
  const dongSS = hK.split('<tr').filter((x) => /Samsung/.test(x))[0] || '';
  kt('Samsung tang thi to DO (xau cho minh)', /bc-giam-chu/.test(dongSS));
  const dongO = hK.split('<tr').filter((x) => /bc-sct-tp-oppo/.test(x) && /▼/.test(x))[0] || '';
  kt('OPPO giam thi to DO', /bc-giam-chu/.test(dongO));
}

console.log('\n--- KIEM CHI TIET SHOP: TU DAU NAM + SO CUNG KY ---');
ok.forEach((x) => console.log('  OK  ' + x));
xau.forEach((x) => console.log('  SAI ' + x));
console.log('\nTong: ' + ok.length + ' OK, ' + xau.length + ' SAI');
process.exit(xau.length ? 1 : 0);
