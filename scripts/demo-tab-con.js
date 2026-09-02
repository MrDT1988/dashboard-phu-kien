/* demo-tab-con.js — TAB CON trong từng tab của DB TG (anh Thái 03/09/2026:
   "DB TG còn rối quá, sử dụng nhiều tab chuyển đổi hơn để nhìn trực quan hơn").
   Mỗi tab chính (Tổng quan / MWG / KA / IND) đang xếp 7–19 mục dọc, cuộn 2.400–6.400px.
   File này gom các mục SẴN CÓ theo câu hỏi thành tab con, mỗi tab con ≤ 4 mục.
   KHÔNG sửa logic tg.html, KHÔNG di chuyển DOM — chỉ ẩn/hiện khối theo tab con
   đang chọn. Gỡ file này là về y như cũ. Robot đóng gói đi qua (__BO_QUA_GOI). */
(function () {
  if (window.__BO_QUA_GOI) return;
  var KHO = 'dbtg-tab-con-v1';

  /* Nhóm theo TIÊU ĐỀ mục (h2/h3). Mục nào không khớp nhóm nào thì đi theo mục
     ngay trước nó. KPI / bộ lọc đầu tab luôn hiện ở mọi tab con. */
  var CAU_HINH = {
    'panel-overview': [
      { ten: 'Tuần & Tháng', khop: [/theo tuần/i, /hiệu suất giữa các kênh/i, /theo kênh theo tháng/i, /Sellout & Doanh thu theo kênh/i] },
      { ten: 'Reno & Phân khúc', khop: [/Reno/i, /phân khúc/i, /Tỉ trọng/i] },
      { ten: 'Target', khop: [/Target/i, /Chi tiết theo Shop/i] },
      { ten: 'Chiến lược & Chính sách', khop: [/Chiến lược/i, /Chính sách/i, /Chương trình Bán hàng/i] }
    ],
    'panel-mwg': [
      { ten: 'Hãng theo tháng', khop: [/theo hãng theo tháng/i, /Size Shop/i] },
      { ten: 'Phân khúc & Top model', khop: [/phân khúc/i, /TOP 10/i] },
      { ten: 'Sale & Shop', khop: [/Sale \/ ASM/i, /Chi tiết .*shop/i] },
      { ten: 'Theo ngày', khop: [/cùng kỳ/i, /theo ngày/i] },
      { ten: 'Thi đua', khop: [/thi đua/i] }
    ],
    'panel-ka': [
      { ten: 'Sell out', khop: [/theo tuần/i, /Sell Out/i] },
      { ten: 'Thị phần FPT & Viettel', khop: [/Thị phần/i] },
      { ten: 'Shop & Chương trình', khop: [/theo Shop/i, /Chương trình/i] }
    ],
    'panel-ind': [
      { ten: 'Sell out / Sell in', khop: [/theo tuần/i, /Sell Out/i, /Sell In/i, /O\.C \/ Normal/i, /Bộ lọc biểu đồ/i] },
      { ten: 'Sale', khop: [/theo Sale/i, /Bảng nhiệt/i] },
      { ten: 'Target & Thưởng', khop: [/Mục tiêu/i, /Target/i, /Thưởng/i] },
      { ten: 'Tồn kho', khop: [/Tồn/i] }
    ]
  };

  var css = document.createElement('style');
  css.id = 'dbtg-tab-con-css';
  css.textContent =
    '.tc-bar{position:sticky;top:0;z-index:6;display:flex;gap:6px;overflow-x:auto;padding:8px 0 10px;margin:4px 0 14px;' +
    'background:var(--bg-primary,#fff);border-bottom:1px solid var(--border-color,rgba(16,24,40,.1));-webkit-overflow-scrolling:touch;scrollbar-width:none}' +
    '.tc-bar::-webkit-scrollbar{display:none}' +
    '.tc-bar button{appearance:none;flex:0 0 auto;font-family:inherit;font-size:12.5px;font-weight:600;padding:8px 14px;border-radius:999px;' +
    'border:1px solid var(--border-color,rgba(16,24,40,.14));background:transparent;color:var(--text-secondary,#5b6470);cursor:pointer;white-space:nowrap;line-height:1.2}' +
    '.tc-bar button:hover{color:var(--text-primary,#111);border-color:var(--oppo-green,#0E7A54)}' +
    '.tc-bar button.on{background:var(--oppo-green,#0E7A54);border-color:var(--oppo-green,#0E7A54);color:#fff}' +
    '.tc-bar button b{font-weight:500;opacity:.7;margin-left:5px;font-size:11px}' +
    '.tc-an{display:none !important}' +
    '@media (max-width:640px){.tc-bar button{padding:9px 12px;font-size:12px}}';
  document.head.appendChild(css);

  function tieuDe(el) {
    return Array.prototype.map.call(el.querySelectorAll('h2,h3'), function (h) { return h.textContent.replace(/\s+/g, ' ').trim(); });
  }
  function nhomCua(ds, nhom) {
    var kq = {};
    ds.forEach(function (t) {
      for (var i = 0; i < nhom.length; i++) {
        if (nhom[i].khop.some(function (re) { return re.test(t); })) { kq[i] = 1; break; }
      }
    });
    return Object.keys(kq).map(Number);
  }
  function luonHien(el) {
    var c = el.classList;
    return el.tagName === 'H2' && !c.contains('part-title') || c.contains('kpi-row') || c.contains('dm-hang-doc') ||
      c.contains('filter-bar') || c.contains('chart-sub') || /loading|error|last-updated/.test(el.id || '') || el.tagName === 'P';
  }
  function anHan(el) {   // mục thừa khi đã có tab con: nhãn "Phần 1/2", quick-nav
    return el.classList.contains('part-title') || el.classList.contains('quick-nav');
  }

  /* Gán từng KHỐI vào nhóm. Khối chứa tiêu đề của >1 nhóm thì đi sâu vào con. */
  function gan(el, nhom, ds, trangThai, sau) {
    Array.prototype.forEach.call(el.children, function (c) {
      if (c.classList.contains('tc-bar')) return;
      if (anHan(c)) { c.classList.add('tc-an'); return; }
      if (luonHien(c) && !trangThai.daCoNhom) return;       // đầu tab: KPI, bộ lọc, ghi chú -> luôn hiện
      var hs = tieuDe(c), g = nhomCua(hs, nhom);
      if (g.length > 1 && sau < 3 && c.children.length > 1) { gan(c, nhom, ds, trangThai, sau + 1); return; }
      var k = g.length === 1 ? g[0] : trangThai.hienTai;
      if (k == null) k = 0;
      trangThai.hienTai = k; trangThai.daCoNhom = true;
      ds.push({ el: c, g: k });
    });
  }

  function danhThuc(panel) {
    window.dispatchEvent(new Event('resize'));
    [0, 60, 260].forEach(function (ms) {
      setTimeout(function () {
        panel.querySelectorAll('canvas').forEach(function (c) {
          if (c.closest('.tc-an')) return;
          try {
            var ch = window.Chart && window.Chart.getChart && window.Chart.getChart(c);
            if (!ch) return;
            if (!c.offsetWidth) { c.style.width = ''; c.style.height = ''; }
            ch.resize();
          } catch (e) { /* không để lỗi vẽ chặn việc đổi tab */ }
        });
        window.dispatchEvent(new Event('resize'));
      }, ms);
    });
  }

  function dung(pid) {
    var panel = document.getElementById(pid), nhom = CAU_HINH[pid];
    if (!panel || !nhom || panel.querySelector('.tc-bar')) return;
    var ds = [], tt = { hienTai: null, daCoNhom: false };
    gan(panel, nhom, ds, tt, 0);
    if (!ds.length) return;
    var dem = nhom.map(function () { return 0; });
    ds.forEach(function (x) { dem[x.g]++; });
    var bar = document.createElement('div');
    bar.className = 'tc-bar'; bar.setAttribute('role', 'tablist');
    nhom.forEach(function (n, i) {
      if (!dem[i]) return;
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.tc = i; b.setAttribute('role', 'tab');
      b.innerHTML = n.ten + '<b>' + dem[i] + '</b>';
      bar.appendChild(b);
    });
    // thanh tab con đặt ngay trước khối đầu tiên có nhóm (sau KPI / bộ lọc)
    ds[0].el.parentNode.insertBefore(bar, ds[0].el);
    var chon = 0;
    try { var l = JSON.parse(localStorage.getItem(KHO) || '{}'); if (l[pid] != null && dem[l[pid]]) chon = l[pid]; } catch (e) {}
    function mo(i, nho) {
      ds.forEach(function (x) { x.el.classList.toggle('tc-an', x.g !== i); });
      bar.querySelectorAll('button').forEach(function (b) {
        var on = +b.dataset.tc === i; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (nho) { try { var l2 = JSON.parse(localStorage.getItem(KHO) || '{}'); l2[pid] = i; localStorage.setItem(KHO, JSON.stringify(l2)); } catch (e) {} }
      danhThuc(panel);
    }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tc]'); if (!b) return;
      mo(+b.dataset.tc, true);
    });
    mo(chon, false);
    panel.__tabCon = { mo: mo, ds: ds, nhom: nhom };
  }

  function chay() { Object.keys(CAU_HINH).forEach(dung); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', chay); else chay();
  // Đổi tab chính -> đánh thức biểu đồ của tab con đang mở (tab chính vừa hiện từ hidden).
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-panel],.db-tg-tab,.tab-btn'); if (!t) return;
    setTimeout(function () {
      Object.keys(CAU_HINH).forEach(function (pid) { var p = document.getElementById(pid); if (p && !p.hidden) danhThuc(p); });
    }, 80);
  });
  window.__tabCon = { CAU_HINH: CAU_HINH, dung: dung };
})();
