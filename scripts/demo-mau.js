/* demo-mau.js — BANG MAU CUA BAN DEMO (che do toi).
 *
 * Chep dung tu :root[data-theme="dark"] cua ban demo anh Thai duyet. Khong mot
 * mau nao o day la tu nghi ra.
 *
 * VI SAO PHAI DOI MAU:
 *   Ban demo dat MWG xanh la, IND xanh duong, KA ho phach. DB TG hien dat MWG
 *   vang, KA xanh duong, IND xanh la — nguoc nhau. Neu chi doi cach VE ma giu
 *   mau cu thi nhin van khong ra ban demo, vi mau la thu dap vao mat truoc nhat.
 *
 * DOI DONG BO CA CHAM MAU TREN NUT TAB, neu khong thi tab ghi cham vang "MWG"
 * ma bieu do ben trong lai ve MWG xanh la — nguoi xem doc sai ngay.
 *
 * PHAN KHUC GIA dung THANG MOT MAU tu nhat den dam (p1..p7), khong dung cau
 * vong. Phan khuc gia la thu CO THU TU (re -> dat), thang mot mau doc duoc thu
 * tu; cau vong thi khong. Ban demo lam vay va do cung la cach dung.
 */
(function () {
  'use strict';
  /* HAI BANG MAU: ban demo co ca che do Sang lan Toi, va mau KHAC NHAU —
     khong phai cung mot mau doi do sang. Vi du kenh IND: nen toi dung #68B6EF
     (xanh nhat cho noi tren nen den), nen sang dung #2E7CB8 (xanh dam cho noi
     tren nen trang). Dung nham mot bang cho ca hai thi mot ben se nhat toet.
     Thang phan khuc gia cung dao chieu: nen toi p1 dam -> p7 nhat,
     nen sang p1 nhat -> p7 dam. Deu chep dung tu :root cua ban demo. */
  var SANG = {
    MWG: '#006B33', IND: '#2E7CB8', KA: '#C98A2E', 'TỔNG': '#59636F',
    FPT: '#2E7CB8', VIETTEL: '#C98A2E',
    'ĐIỆN MÁY CHỢ LỚN': '#8A5CC4', CELLPHONES: '#00A0E9',
    OPPO: '#006B33', SAMSUNG: '#1428A0', XIAOMI: '#E85D00', APPLE: '#1A1A1A',
    VIVO: '#6C7CFF', REALME: '#D9A400', 'KHÁC': '#8A8A8A',
    'O.C': '#006B33', NORMAL: '#8FBFA6',
  };
  var THANG_SANG = ['#B5DDC8', '#8AC7A9', '#63B18C', '#3F9B70', '#1E8558', '#006B41', '#00522F'];

  var M = {
    MWG: '#2AD998', IND: '#68B6EF', KA: '#E8B45E', 'TỔNG': '#8B98A9',

    FPT: '#68B6EF', VIETTEL: '#E8B45E',
    'ĐIỆN MÁY CHỢ LỚN': '#B18BE0', CELLPHONES: '#3FC3F7',

    OPPO: '#2AD998', SAMSUNG: '#6E8CF0', XIAOMI: '#FF9147', APPLE: '#EDEFF2',
    VIVO: '#A9B6FF', REALME: '#F0C64A', 'KHÁC': '#8B98A9',

    'O.C': '#2AD998', NORMAL: '#1E6B4E',
  };
  // Thang phan khuc gia: nhat -> dam (7 buoc cua ban demo)
  var THANG = ['#0A4530', '#0F5B3E', '#15724D', '#1C8A5D', '#26A26F', '#3FBB87', '#68D3A6'];

  function chuan(x) {
    return String(x || '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
  }
  function laSang() {
    try { return document.documentElement.getAttribute('data-theme') === 'light'; }
    catch (e) { return false; }
  }
  function mau(ten) {
    var k = chuan(ten);
    var B = laSang() ? SANG : M;
    if (B[k]) return B[k];
    if (M[k]) return M[k];
    // vai bien the ten hay gap
    if (k === 'DIEN MAY CHO LON' || k === 'DMCL' || k === 'ĐMCL') return B['ĐIỆN MÁY CHỢ LỚN'];
    if (k === 'CPS' || k === 'CELLPHONE S') return B.CELLPHONES;
    if (k === 'KHAC' || k === 'OTHERS') return B['KHÁC'];
    if (k === 'OC') return B['O.C'];
    return null;
  }
  /* Nhan co phai la mot khoang GIA khong: "<3M", "5-7M", "10-15M", "> 30M"... */
  function laPhanKhuc(t) {
    return /^\s*[<>]?\s*\d+(\s*[-–]\s*\d+)?\s*M\s*$/i.test(String(t || ''));
  }

  /* Mau danh cho NEN TOI, khong phu thuoc che do dang chon.
     Can cho nhung cho VAN LA NEN TOI o ca hai che do — vi du dai dau trang cua
     DB TG luon la xanh OPPO dam. Cham MWG mau #006B33 (ban Sang) dat len dai do
     thi bien mat han. */
  function mauToi(ten) {
    var k = chuan(ten);
    if (M[k]) return M[k];
    if (k === 'DIEN MAY CHO LON' || k === 'DMCL' || k === 'ĐMCL') return M['ĐIỆN MÁY CHỢ LỚN'];
    if (k === 'CPS') return M.CELLPHONES;
    if (k === 'KHAC') return M['KHÁC'];
    if (k === 'OC') return M['O.C'];
    return null;
  }

  window.DMAU = {
    mau: mau, mauToi: mauToi, thang: THANG, thangSang: THANG_SANG, laSang: laSang, laPhanKhuc: laPhanKhuc,
    /* Ca danh sach nhan la phan khuc gia -> tra ve thang mau theo dung thu tu.
       Neu chi mot vai cai giong thi khong ap, vi rat de doan nham. */
    thangPhanKhuc: function (ten) {
      if (!ten || ten.length < 3) return null;
      if (!ten.every(laPhanKhuc)) return null;
      var n = ten.length;
      var T = laSang() ? THANG_SANG : THANG;
      return ten.map(function (_, i) {
        // rai deu tren 7 buoc du co bao nhieu phan khuc
        var j = n === 1 ? 6 : Math.round(i * (T.length - 1) / (n - 1));
        return T[j];
      });
    },
  };
})();
