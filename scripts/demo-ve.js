/* demo-ve.js — BO VE BIEU DO CUA BAN DEMO, tach ra dung lai duoc.
 *
 * VI SAO CO FILE NAY (29/08):
 *   Ban demo anh Thai duyet co 40 muc thi 20 muc chi la the ghi "giu nguyen" —
 *   no la BAN THIET KE CACH TRINH BAY, khong phai bang thay the. 20 muc co noi
 *   dung that cua no chinh la 20 BIEU DO cua DB TG (doi chieu 1:1, khop het).
 *   Nen viec dung khong phai bê ban demo len lam DB TG (se mat 20 bang dang
 *   chay), ma la BE BO VE cua demo sang DB TG.
 *
 * Toan bo ham duoi day CHEP NGUYEN VAN tu ban demo. Chi sua ba cho, co ghi ro:
 *   1. cv()  — nhan them mau viet thang (#RRGGBB / rgba), va doi ten bien mau
 *              cua demo sang ten bien cua tg.html.
 *   2. veVong — nhan bang mau truyen vao thay vi doc bien toan cuc MK.
 *   3. Tu tao o chu thich (tip) va CSS .bar, vi tg.html khong co san.
 *
 * KHONG dung so lieu nao trong file nay — chi la ham ve. An toan cho repo public.
 */
(function () {
  'use strict';
  if (window.DMV) return;

  /* ---- doi ten bien mau: ten cua ban demo -> ten cua tg.html ------------- */
  var DOI = {
    '--line':  '--border-color',
    '--line2': '--dm-line2',           // tg.html khong co; che do Sang dat bien nay
    '--ink':   '--text-primary',
    '--mut':   '--text-secondary',
    '--sub':   '--text-secondary',
    '--card':  '--bg-card',
    '--bg':    '--bg-primary',
    '--neg':   '--negative',
    '--pos':   '--positive',
    '--brand': '--oppo-green',
  };
  /* Mau du phong = dung mau NEN TOI cua ban demo. tg.html chi co nen toi, va
     bang mau toi cua demo trung khop voi tg.html (#10151d / #1a222c / #e8edf2 /
     #8b98a9 / #2ad998) — nen hai ben nhin nhu mot. */
  var DP = {
    '--line': 'rgba(255,255,255,.10)', '--line2': 'rgba(255,255,255,.06)',
    '--ink': '#e8edf2', '--mut': '#8b98a9', '--sub': '#8b98a9',
    '--card': '#1a222c', '--bg': '#10151d',
    '--neg': '#ff5c72', '--pos': '#2ee673', '--brand': '#2ad998',
    '--font': "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    '--khac': '#8b98a9',
  };
  var goc = document.documentElement;
  function cv(n) {
    if (!n) return DP['--khac'];
    if (n.charAt(0) !== '-') return n;            // da la mau viet thang
    var ten = Object.prototype.hasOwnProperty.call(DOI, n) ? DOI[n] : n;
    if (ten) {
      var v = getComputedStyle(goc).getPropertyValue(ten).trim();
      if (v) return v;
    }
    var v2 = getComputedStyle(goc).getPropertyValue(n).trim();
    return v2 || DP[n] || DP['--khac'];
  }
  function f(n, d) {
    return Number(n).toLocaleString('vi-VN',
      { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function p1(n) { return Number(n).toFixed(1).replace('.', ','); }

  /* Chu tren nen mau: TU CHON den hay trang theo do sang cua nen.
     Ban demo luon ghi chu trang trong mang mau. Dung voi mau dam, nhung hang
     Apple mau #EDEFF2 gan trang — chu trang tren do KHONG DOC DUOC (do tuong
     phan 1,06:1, chuan can >= 4,5:1). Do 29/08 tren bieu do "Ti trong tung hang
     theo phan khuc gia": o Apple hien ra trang tron. */
  function soMau(c) {
    c = String(c || '').trim();
    var m = c.match(/^#([0-9a-f]{3})$/i);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = c.match(/rgba?\(([^)]+)\)/i);
    if (m) { var t = m[1].split(','); return [+t[0], +t[1], +t[2]]; }
    return null;
  }
  function chuTren(nen) {
    var r = soMau(nen);
    if (!r) return '#fff';
    var q = r.map(function (v) {
      v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var L2 = 0.2126 * q[0] + 0.7152 * q[1] + 0.0722 * q[2];
    var voiTrang = 1.05 / (L2 + 0.05), voiDen = (L2 + 0.05) / 0.05;
    return voiDen > voiTrang ? '#14171B' : '#fff';
  }

  /* ---- o chu thich + kieu cho thanh ------------------------------------- */
  var tip = null;
  function dungTip() {
    if (tip) return;
    var st = document.createElement('style');
    st.textContent =
      '#dmv-tip{position:fixed;z-index:99990;pointer-events:none;opacity:0;'
      + 'transition:opacity .12s;background:' + cv('--card') + ';color:' + cv('--ink') + ';'
      + 'border:1px solid ' + cv('--line') + ';border-radius:9px;padding:8px 10px;'
      + 'font:600 12px ' + DP['--font'] + ';box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:280px}'
      + '#dmv-tip .r{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:3px}'
      + '#dmv-tip .r i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}'
      + '#dmv-tip b{font-variant-numeric:tabular-nums}'
      + '.dmv rect.bar,.dmv path.bar{transition:opacity .12s;cursor:default}'
      + '.dmv:hover rect.bar,.dmv:hover path.bar{opacity:.82}'
      + '.dmv rect.bar:hover,.dmv path.bar:hover{opacity:1}'
      + '.dmv svg{width:100%;height:auto;display:block;overflow:visible}'
      + '.dmv-lg{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:center;'
      + 'margin-top:10px;font:600 12px ' + DP['--font'] + ';color:' + cv('--mut') + '}'
      + '.dmv-lg span{display:inline-flex;align-items:center;gap:7px}'
      + '.dmv-lg .chip{width:9px;height:9px;border-radius:3px;display:inline-block}';
    document.head.appendChild(st);
    tip = document.createElement('div');
    tip.id = 'dmv-tip';
    document.body.appendChild(tip);
  }
  function ST(e, h) {
    dungTip();
    tip.innerHTML = h; tip.style.opacity = '1';
    var x = e.clientX + 14, y = e.clientY - 8;
    if (x + tip.offsetWidth > innerWidth - 10) x = e.clientX - tip.offsetWidth - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function HT() { if (tip) tip.style.opacity = '0'; }
  function bind(box) {
    box.classList.add('dmv');
    box.querySelectorAll('[data-tip]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) { ST(e, el.getAttribute('data-tip')); });
      el.addEventListener('mouseleave', HT);
    });
  }
  function o(id) { return (typeof id === 'string') ? document.getElementById(id) : id; }

  /* ====================================================================== */
  /*  Duoi day CHEP NGUYEN VAN tu ban demo — khong doi mot con so nao.        */
  /* ====================================================================== */

  function legend(id, keys, mk) {
    var el = o(id); if (!el) return;
    dungTip();
    el.className = 'dmv-lg';
    el.innerHTML = keys.map(function (k, i) {
      var c = mk ? (typeof mk === 'function' ? mk(k, i) : (mk[k] || mk[i])) : null;
      return '<span><i class="chip" style="background:' + cv(c || '--khac') + '"></i>' + k + '</span>';
    }).join('');
  }

  function veChong(id, nhan, series, opt) {
    opt = opt || {}; var box = o(id); if (!box) return;
    var W = opt.W || 660, H = opt.H || 240, PL = 6, PR = 6, PT = opt.pt || 24, PB = 24;
    var iw = W - PL - PR, ih = H - PT - PB;
    var tong = nhan.map(function (_, i) {
      return series.reduce(function (a, s) { return a + (s.v[i] || 0); }, 0);
    });
    var mx = Math.max.apply(null, tong) || 1, top = mx * 1.14;
    var bw = Math.min(opt.bw || 999, iw / nhan.length * (opt.ke || 0.94));
    var dai = nhan.length > 20;
    var cs = opt.cs || (dai ? 9.5 : 13);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    for (var g = 1; g <= 4; g++) {
      var y0 = PT + ih - ih * g / 4;
      s += '<line x1="' + PL + '" y1="' + y0 + '" x2="' + (W - PR) + '" y2="' + y0 + '" stroke="' + cv('--line2') + '"/>';
    }
    s += '<line x1="' + PL + '" y1="' + (PT + ih) + '" x2="' + (W - PR) + '" y2="' + (PT + ih) + '" stroke="' + cv('--line') + '"/>';
    nhan.forEach(function (t, i) {
      var cx = PL + iw * (i + 0.5) / nhan.length, x = cx - bw / 2, acc = 0;
      series.forEach(function (sr) {
        var v = sr.v[i] || 0, hg = v / top * ih; if (hg < 0.4) return;
        var y = PT + ih - acc - hg; acc += hg;
        s += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1)
          + '" height="' + Math.max(hg - 1.5, 1).toFixed(1) + '" rx="2.5" fill="' + cv(sr.c) + '"'
          + ' data-tip="' + ('<div style=&quot;margin-bottom:4px&quot;>' + t
            + '</div><div class=&quot;r&quot;><span><i style=&quot;background:' + cv(sr.c) + '&quot;></i>'
            + sr.t + '</span><b>' + f(v, opt.dec || 0) + (opt.dv || '')
            + '</b></div><div class=&quot;r&quot; style=&quot;opacity:.7&quot;><span>Tổng</span><b>'
            + f(tong[i], opt.dec || 0) + (opt.dv || '') + '</b></div>') + '"/>';
        if (!dai && hg > 17 && series.length > 1) {
          s += '<text x="' + cx + '" y="' + (y + hg / 2 + 3.8) + '" text-anchor="middle" style="font:700 11px '
            + DP['--font'] + ';fill:' + chuTren(cv(sr.c)) + ';pointer-events:none">' + f(v, opt.dec || 0) + '</text>';
        }
      });
      if (tong[i] > 0 && opt.tong !== false) {
        var yt = PT + ih - acc - 6;
        if (dai) {
          s += '<text transform="translate(' + cx.toFixed(1) + ',' + yt.toFixed(1)
            + ') rotate(-90)" text-anchor="start" style="font:700 ' + cs + 'px ' + DP['--font']
            + ';fill:' + cv('--ink') + '">' + f(tong[i], opt.dec || 0) + '</text>';
        } else {
          s += '<text x="' + cx + '" y="' + yt.toFixed(1) + '" text-anchor="middle" style="font:700 ' + cs
            + 'px ' + DP['--font'] + ';fill:' + cv('--ink') + '">' + f(tong[i], opt.dec || 0) + '</text>';
        }
      }
      s += '<text x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle" style="font:600 '
        + (opt.fx || 11) + 'px ' + DP['--font'] + ';fill:' + cv('--mut') + '">' + t + '</text>';
    });
    /* DUONG TRUNG BINH TRUOT (opt.duong).
       Ban demo dan cho hai bieu do theo ngay: "Them duong trung binh 7 ngay de
       thay xu huong qua nhieu cuoi tuan". Doanh so theo ngay len xuong rat manh
       (thu 7 - chu nhat vot han len), nhin cot khong ra xu huong.
       Ve DE LEN cot, dung cung thang do voi cot nen doc duoc truc tiep. */
    if (opt.duong && opt.duong.length) {
      var mauD = cv(opt.mauDuong || '--ink');
      var d2 = '';
      opt.duong.forEach(function (v, i) {
        if (v == null) return;
        var cx2 = PL + iw * (i + 0.5) / nhan.length;
        var y2 = PT + ih - (v / top) * ih;
        d2 += (d2 ? 'L' : 'M') + cx2.toFixed(1) + ' ' + y2.toFixed(1);
      });
      if (d2) {
        s += '<path d="' + d2 + '" fill="none" stroke="' + cv('--card') + '" stroke-width="4.2"'
          + ' stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>';
        s += '<path d="' + d2 + '" fill="none" stroke="' + mauD + '" stroke-width="2"'
          + ' stroke-linejoin="round" stroke-linecap="round" opacity=".8"/>';
      }
    }
    s += '</svg>'; box.innerHTML = s; bind(box);
  }

  function ve100(id, nhan, bo, mau, opt) {
    opt = opt || {}; var box = o(id); if (!box) return;
    var W = opt.W || 560, rowH = opt.rowH || 30, PL = opt.PL || 78, PR = opt.PR || 14, PT = 6;
    var H = PT + nhan.length * rowH + 8, iw = W - PL - PR;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    nhan.forEach(function (n, i) {
      var y = PT + i * rowH, acc = 0;
      s += '<text x="' + (PL - 9) + '" y="' + (y + rowH / 2 + 3.5) + '" text-anchor="end" style="font:600 '
        + (opt.fn || 11) + 'px ' + DP['--font'] + ';fill:' + cv('--ink') + '">' + n + '</text>';
      bo.forEach(function (b, j) {
        var v = b[1][i] || 0, w = v / 100 * iw; if (w < 0.4) return;
        var x = PL + acc; acc += w;
        s += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + (y + 5) + '" width="'
          + Math.max(w - 1.5, 0.8).toFixed(1) + '" height="' + (rowH - 12) + '" rx="2.5" fill="'
          + cv(mau[j]) + '" data-tip="' + ('<div style=&quot;margin-bottom:4px&quot;>' + n
            + '</div><div class=&quot;r&quot;><span><i style=&quot;background:' + cv(mau[j]) + '&quot;></i>'
            + b[0] + '</span><b>' + p1(v) + '%</b></div>') + '"/>';
        if (w > 30) {
          s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (y + rowH / 2 + 3)
            + '" text-anchor="middle" style="font:700 ' + (opt.fs || 10) + 'px ' + DP['--font']
            + ';fill:' + chuTren(cv(mau[j])) + ';pointer-events:none">' + Math.round(v) + '%</text>';
        }
      });
    });
    s += '</svg>'; box.innerHTML = s; bind(box);
  }

  function veDuong(id, nhan, series, opt) {
    opt = opt || {}; var box = o(id); if (!box) return;
    var W = opt.W || 900, H = opt.H || 250, PL = 8, PR = opt.PR || 58, PT = 20, PB = 24;
    var iw = W - PL - PR, ih = H - PT - PB;
    var all = series.reduce(function (a, s2) {
      return a.concat(s2.v.filter(function (v, i) { return i < (opt.co || s2.v.length); }));
    }, []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (!all.length) { box.innerHTML = ''; return; }
    var mn = opt.mn != null ? opt.mn : Math.floor(Math.min.apply(null, all) / 5) * 5;
    var mx = opt.mx != null ? opt.mx : Math.ceil(Math.max.apply(null, all) / 5) * 5;
    if (mx === mn) mx = mn + 5;
    var y = function (v) { return PT + ih - (v - mn) / (mx - mn) * ih; };
    var x = function (i) { return PL + iw * i / Math.max(nhan.length - 1, 1); };
    var co = opt.co || nhan.length;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    for (var g = 0; g <= 4; g++) {
      var yy = PT + ih - ih * g / 4;
      s += '<line x1="' + PL + '" y1="' + yy + '" x2="' + (W - PR) + '" y2="' + yy + '" stroke="' + cv('--line2') + '"/>';
    }
    s += '<line x1="' + PL + '" y1="' + (PT + ih) + '" x2="' + (W - PR) + '" y2="' + (PT + ih) + '" stroke="' + cv('--line') + '"/>';
    if (opt.moc != null && opt.moc >= mn && opt.moc <= mx) {
      s += '<line x1="' + PL + '" y1="' + y(opt.moc) + '" x2="' + (W - PR) + '" y2="' + y(opt.moc)
        + '" stroke="' + cv('--neg') + '" stroke-width="1.4" stroke-dasharray="5 4" opacity=".75"/>';
      s += '<text x="' + (W - PR + 7) + '" y="' + (y(opt.moc) + 3.5) + '" style="font:700 10px '
        + DP['--font'] + ';fill:' + cv('--neg') + '">' + opt.moc + '%</text>';
    }
    series.forEach(function (sr) {
      var c = cv(sr.c), noi = sr.noi, vv = sr.v.slice(0, co);
      var d = vv.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
      s += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (noi ? 3 : 1.8)
        + '" opacity="' + (noi === false ? 0.4 : 1) + '" stroke-linejoin="round" stroke-linecap="round"/>';
      vv.forEach(function (v, i) {
        s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (noi === false ? 3 : 4.2)
          + '" fill="' + cv('--card') + '" stroke="' + c + '" stroke-width="2" opacity="' + (noi === false ? 0.55 : 1) + '"'
          + ' data-tip="' + ('<div style=&quot;margin-bottom:4px&quot;>' + nhan[i]
            + '</div><div class=&quot;r&quot;><span><i style=&quot;background:' + c + '&quot;></i>'
            + sr.t + '</span><b>' + p1(v) + (opt.hau || '') + '</b></div>') + '"/>';
        if (opt.soTrenDiem !== false) {
          s += '<text x="' + x(i).toFixed(1) + '" y="' + (y(v) - 8).toFixed(1)
            + '" text-anchor="middle" style="font:700 ' + (noi === false ? 8.5 : 9.5) + 'px ' + DP['--font']
            + ';fill:' + c + ';opacity:' + (noi === false ? 0.62 : 1) + ';pointer-events:none">' + p1(v) + '</text>';
        }
      });
      if (opt.tenCuoi !== false) {
        s += '<text x="' + (W - PR + 7) + '" y="' + (y(vv[vv.length - 1]) + 3.5) + '" style="font:'
          + (noi === false ? 600 : 700) + ' 11px ' + DP['--font'] + ';fill:' + c + ';opacity:'
          + (noi === false ? 0.72 : 1) + '">' + sr.t + '</text>';
      }
    });
    nhan.forEach(function (t, i) {
      if (i < co) {
        s += '<text x="' + x(i) + '" y="' + (H - 7) + '" text-anchor="middle" style="font:500 10px '
          + DP['--font'] + ';fill:' + cv('--mut') + '">' + t + '</text>';
      }
    });
    s += '</svg>'; box.innerHTML = s; bind(box);
  }

  /* veVong: demo doc bang mau toan cuc MK. O day nhan qua opt.mau (mang mau
     cung thu tu voi data) — vi tg.html khong co MK. */
  function veVong(id, data, opt) {
    opt = opt || {}; var box = o(id); if (!box) return;
    var W = 190, H = 175, cx = 95, cy = 84, R = 62, r = 39;
    var tong = data.reduce(function (a, b) { return a + b[1]; }, 0), ang = -Math.PI / 2;
    if (!tong) { box.innerHTML = ''; return; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    data.forEach(function (d, i) {
      var mau = cv((opt.mau && opt.mau[i]) || '--khac');
      var a2 = ang + d[1] / tong * Math.PI * 2, big = (a2 - ang) > Math.PI ? 1 : 0;
      var p = [cx + R * Math.cos(ang), cy + R * Math.sin(ang), cx + R * Math.cos(a2), cy + R * Math.sin(a2),
               cx + r * Math.cos(a2), cy + r * Math.sin(a2), cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
      var pc = d[1] / tong * 100;
      s += '<path class="bar" d="M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 ' + big
        + ' 1 ' + p[2].toFixed(1) + ' ' + p[3].toFixed(1) + ' L' + p[4].toFixed(1) + ' ' + p[5].toFixed(1)
        + ' A' + r + ' ' + r + ' 0 ' + big + ' 0 ' + p[6].toFixed(1) + ' ' + p[7].toFixed(1) + ' Z" fill="'
        + mau + '" stroke="' + cv('--card') + '" stroke-width="2" data-tip="'
        + ('<div class=&quot;r&quot;><span><i style=&quot;background:' + mau + '&quot;></i>' + d[0]
          + '</span><b>' + f(d[1], opt.dec || 0) + (opt.dv || '') + ' · ' + p1(pc) + '%</b></div>'
          + (opt.phu && opt.phu[d[0]] != null
            ? '<div class=&quot;r&quot; style=&quot;opacity:.75&quot;><span>Reno trong kênh</span><b>'
              + p1(opt.phu[d[0]]) + '%</b></div>' : '')) + '"/>';
      if (pc >= 7) {
        var mid = (ang + a2) / 2, rr = (R + r) / 2;
        s += '<text x="' + (cx + rr * Math.cos(mid)).toFixed(1) + '" y="' + (cy + rr * Math.sin(mid) + 3.5).toFixed(1)
          + '" text-anchor="middle" style="font:700 10.5px ' + DP['--font'] + ';fill:' + chuTren(mau) + ';pointer-events:none">'
          + Math.round(pc) + '%</text>';
      }
      ang = a2;
    });
    s += '<text x="' + cx + '" y="' + (cy - 1) + '" text-anchor="middle" style="font:700 15px ' + DP['--font']
      + ';fill:' + cv('--ink') + '">' + f(tong, opt.dec || 0) + '</text>';
    s += '<text x="' + cx + '" y="' + (cy + 13) + '" text-anchor="middle" style="font:600 10px ' + DP['--font']
      + ';fill:' + cv('--mut') + '">' + (opt.dvTong || '') + '</text>';
    s += '<text x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle" style="font:700 11px ' + DP['--font']
      + ';fill:' + cv('--ink') + '">' + (opt.ten || '') + '</text>';
    s += '</svg>'; box.innerHTML = s; bind(box);
  }

  function veNgang(id, nhan, giatri, mau, opt) {
    opt = opt || {}; var box = o(id); if (!box) return;
    var W = opt.W || 420, rowH = opt.rowH || 34, PL = opt.PL || 64, PR = opt.PR || 42;
    var H = nhan.length * rowH + 8, iw = W - PL - PR;
    var lon = Math.max.apply(null, giatri.concat([opt.mx || 0])) || 100;
    var thang = opt.phanTram === false ? lon : 100;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    nhan.forEach(function (n, i) {
      var y = i * rowH + 4, w = giatri[i] / thang * iw;
      s += '<text x="' + (PL - 9) + '" y="' + (y + rowH / 2 + 3) + '" text-anchor="end" style="font:600 '
        + (opt.fn || 11) + 'px ' + DP['--font'] + ';fill:' + cv('--ink') + '">' + n + '</text>';
      s += '<rect x="' + PL + '" y="' + (y + 7) + '" width="' + iw + '" height="' + (rowH - 16)
        + '" rx="4" fill="' + cv('--line2') + '"/>';
      s += '<rect class="bar" x="' + PL + '" y="' + (y + 7) + '" width="' + Math.max(w, 0).toFixed(1)
        + '" height="' + (rowH - 16) + '" rx="4" fill="' + cv(mau[i]) + '" data-tip="'
        + ('<div class=&quot;r&quot;><span>' + n + '</span><b>' + p1(giatri[i]) + (opt.hau || '%') + '</b></div>') + '"/>';
      s += '<text x="' + (W - PR + 7) + '" y="' + (y + rowH / 2 + 3.5) + '" style="font:700 11px '
        + DP['--font'] + ';fill:' + cv('--ink') + '">' + p1(giatri[i]) + (opt.hau || '%') + '</text>';
    });
    s += '</svg>'; box.innerHTML = s; bind(box);
  }

  window.DMV = {
    cv: cv, f: f, p1: p1, legend: legend,
    veChong: veChong, ve100: ve100, veDuong: veDuong, veVong: veVong, veNgang: veNgang,
  };
})();
