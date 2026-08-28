# -*- coding: utf-8 -*-
# GHEP BAN VA SANG/TOI CUA KHUNG GIAO DIEN VAO tg.html HIEN TAI.
#
# VI SAO PHAI GHEP CHU KHONG CHEP DE:
#   tg-thu.html forked tu tg.html luc 27/08 16:18 (sha 68724d1). Tu do toi gio
#   tg.html da di them 4 doi: goi ma hoa (chang A), cat pham vi (chang B),
#   nut Dang xuat, thu hep kenh + sua target. Chep tg-thu.html de len tg.html la
#   XOA SACH ca 4 — sale/leader se thay lai TOAN VUNG.
#
#   Do thuc te tren tg-thu.html: __goiDBTG 0 · moKhoiMaHoa 0 · __chonNguoiDBTG 0 ·
#   __donManHinh 0 · dbtg-the-ai 0 · thuHepTheoPhamVi 0 · __BO_QUA_GOI 0.
#
# MAY LA ban va cua ho THUC SU chi them: diff voi ban goc cho 501 dong THEM,
# 0 dong XOA, gom dung HAI cho:
#     - dong 4  : snippet <head> doc localStorage -> gan data-theme
#     - cuoi body: <style id=dbtg-light-css> + <script id=dbtg-theme-core>
#                  + <script id=dbtg-theme-engine>
# Nen ghep lai vao ban moi la viec co the lam bang may, khong phai chep tay.
import io, sys, re

NGUON = 'tg-thu.html'      # ban cua khung giao dien (nen cu + ban va)
DICH  = sys.argv[1] if len(sys.argv) > 1 else 'tg.html'
RA    = sys.argv[2] if len(sys.argv) > 2 else 'tg-ghep.html'

nguon = io.open(NGUON, encoding='utf-8').read()
dich  = io.open(DICH,  encoding='utf-8').read()

# ---- 1. Lay snippet <head>
m = re.search(r'<script>try\{document\.documentElement\.setAttribute\("data-theme".*?</script>', nguon, re.S)
assert m, 'khong thay snippet <head> dat data-theme'
snippet = m.group(0)
assert len(snippet) < 400, 'snippet <head> dai bat thuong: %d byte' % len(snippet)

# ---- 2. Lay ba khoi cuoi body
i = nguon.find('<style id="dbtg-light-css">')
assert i > 0, 'khong thay #dbtg-light-css'
j = nguon.rfind('</script>')
assert j > i, 'khong thay diem ket thuc khoi giao dien'
khoi = nguon[i:j + len('</script>')]
for can in ['id="dbtg-light-css"', 'id="dbtg-theme-core"', 'id="dbtg-theme-engine"']:
    assert can in khoi, 'thieu ' + can

# ---- 3. Ban va KHONG duoc dung toi bat cu thu gi cua khung bao mat
CAM = ['__layKhoaAS', '__AS_KEY', 'dbtg_as_key', 'window.fetch', 'fetch(',
       '__goiDBTG', 'moKhoiMaHoa', '__donManHinh', '__khoiDongDBTG',
       'dbtg_ma', 'dbtg_ai', 'script.google', 'eval(', 'new Function',
       'XMLHttpRequest', 'sendBeacon', 'document.cookie']
pham = [c for c in CAM if c in khoi or c in snippet]
assert not pham, 'BAN VA DUNG TOI THU CAM: ' + ', '.join(pham)

# ---- 4. Ghep vao ban dich
assert 'id="dbtg-light-css"' not in dich, 'ban dich da co san ban va roi'
k = dich.find('</head>')
assert k > 0, 'khong thay </head>'
dich = dich[:k] + snippet + '\n' + dich[k:]

# File nay KHONG co the </body> (tg.html von vay) -> chen truoc </html>
k2 = dich.rfind('</body>')
if k2 < 0: k2 = dich.rfind('</html>')
assert k2 > 0, 'khong thay </body> lan </html>'
dich = dich[:k2] + khoi + '\n' + dich[k2:]

io.open(RA, 'w', encoding='utf-8').write(dich)
print('OK -> %s  (snippet %d byte, khoi %d byte)' % (RA, len(snippet), len(khoi)))
