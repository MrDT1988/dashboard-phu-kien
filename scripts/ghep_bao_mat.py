# -*- coding: utf-8 -*-
# GHEP LOP BAO MAT VAO FILE CUA KHUNG GIAO DIEN.
#
# KE HOACH ANH THAI CHOT 28/08:
#   "A cho ben kia update tung phan roi e dua bao mat va cac phan e lam vao
#    de dang nhap mat bang TK app"
#   -> Khung giao dien lam chu tg.html. Xong tung phan thi khung bao mat ghep
#      lop dang nhap / cat pham vi VAO KET QUA CUA HO. Nguoc chieu voi
#      ghep_giao_dien.py (cai do ghep mau vao file bao mat).
#
# VI SAO DUNG HOP NHAP BA CHIEU (git merge-file) chu khong phai thay chuoi:
#   Khung giao dien SE sua ham ve bieu do va dung bang — dung ngay cho lop bao
#   mat dang bam vao. Thay chuoi thi ho doi mot dau cach la hong. Hop nhat ba
#   chieu biet phan biet "ho sua" voi "minh sua", va BAO XUNG DOT o dung dong
#   thay vi im lang lam sai.
#
#   GOC   = tg.html luc 27/08 16:18 (sha 68724d1) — diem ca hai ben con giong nhau
#   CUA-EM = tg.html hien tai tren main (goc + lop bao mat)
#   CUA-HO = file khung giao dien dua sang (goc + viec giao dien cua ho)
#
# CACH CHAY:
#   python3 scripts/ghep_bao_mat.py <cua-ho.html> <ra.html> [goc.html] [cua-em.html]
#
# XUNG DOT thi script DUNG va in ra so dong. KHONG duoc doan — mo dung cho do,
# doc ca hai ben, roi quyet. Xung dot gan nhu chac chan la ho vua sua dung
# chuc nang bao mat dang dua vao (vd bang tuan, diem khoi dong).
import io, os, sys, subprocess, tempfile, hashlib

HO   = sys.argv[1] if len(sys.argv) > 1 else 'tg-thu.html'
RA   = sys.argv[2] if len(sys.argv) > 2 else 'tg-ghep-baomat.html'
GOC  = sys.argv[3] if len(sys.argv) > 3 else 'scripts/GOC-HOP-NHAT-tg-68724d1.html.txt'
EM   = sys.argv[4] if len(sys.argv) > 4 else 'tg.html'

# GOC dung la  scripts/GOC-HOP-NHAT-tg-68724d1.html.txt  (md5 6fa8042c…, 841.921 byte).
# Day la tg.html luc 27/08 16:18 — DIEM CUOI CUNG hai khung con giong nhau.
# Giu trong repo de khong phai di dao lai lich su moi lan hop nhat.
#
# VI SAO DUOI .txt: repo nay len GitHub Pages. De duoi .html thi no thanh MOT
# TRANG DASHBOARD CU CHAY DUOC, ai co link cung mo. Doi .txt de Pages tra ve
# van ban thuan, khong chay.

def doc(p):
    with io.open(p, encoding='utf-8') as f: return f.read()

for p in (HO, GOC, EM):
    if not os.path.exists(p):
        sys.exit('THIEU FILE: ' + p)

ho, goc, em = doc(HO), doc(GOC), doc(EM)
print('goc    : %8d byte  %s' % (len(goc.encode()), hashlib.md5(goc.encode()).hexdigest()[:8]))
print('cua-em : %8d byte  %s' % (len(em.encode()),  hashlib.md5(em.encode()).hexdigest()[:8]))
print('cua-ho : %8d byte  %s' % (len(ho.encode()),  hashlib.md5(ho.encode()).hexdigest()[:8]))

# --- Goc phai DUNG la to tien cua ca hai ben, neu khong hop nhat se loan
if 'thuHepTheoPhamVi' in goc or '__goiDBTG' in goc:
    sys.exit('GOC SAI: file goc khong duoc chua lop bao mat.')
if '__goiDBTG' not in em:
    sys.exit('CUA-EM SAI: khong thay lop bao mat trong ' + EM)

d = tempfile.mkdtemp()
fHo, fGoc, fEm = (os.path.join(d, x) for x in ('ho', 'goc', 'em'))
for p, s in ((fHo, ho), (fGoc, goc), (fEm, em)):
    io.open(p, 'w', encoding='utf-8').write(s)

# git merge-file GHI DE file thu nhat = ban cua HO (giu viec giao dien lam chuan),
# roi dap phan bao mat cua minh len.
r = subprocess.run(['git', 'merge-file', '-L', 'giao-dien', '-L', 'goc', '-L', 'bao-mat',
                    fHo, fGoc, fEm], capture_output=True, text=True)
kq = doc(fHo)

if r.returncode != 0:
    n = kq.count('<<<<<<<')
    print('\n!!! XUNG DOT: %d cho. KHONG tu quyet — mo ra doc.' % n)
    dong = [i + 1 for i, l in enumerate(kq.split('\n')) if l.startswith('<<<<<<<')]
    print('    dong:', dong)
    io.open(RA + '.xungdot', 'w', encoding='utf-8').write(kq)
    print('    da ghi:', RA + '.xungdot')
    sys.exit(1)

# --- Sau khi hop nhat, LOP BAO MAT PHAI CON DU. Thieu mot cai la sale thay ca vung.
CAN = ['__goiDBTG', 'moKhoiMaHoa', '__chonNguoiDBTG', '__hoiMaDBTG',
       '__donManHinh', '__khoiDongDBTG', '__BO_QUA_GOI', 'thuHepTheoPhamVi',
       'dbtg-the-ai', '__thoatDBTG', 'duocPhepLui', 'target_share']
thieu = [c for c in CAN if c not in kq]
if thieu:
    sys.exit('HOP NHAT XONG NHUNG MAT: ' + ', '.join(thieu))

# Hai diem khoi dong phai con nguyen — mat la DB TG quay ve goi Apps Script
if kq.count('window.__khoiDongDBTG(initDashboard') != 2:
    sys.exit('SAI SO DIEM KHOI DONG: %d (phai la 2)' % kq.count('window.__khoiDongDBTG(initDashboard'))

io.open(RA, 'w', encoding='utf-8').write(kq)
print('\nOK -> %s  (%d byte)' % (RA, len(kq.encode())))
print('CON PHAI CHAY, dung tin ket qua hop nhat:')
print('   TG_FILE=%s node scripts/kiem-tg.mjs' % RA)
print('   TG_FILE=%s node scripts/kiem-ghep-giao-dien.mjs   # neu ban do co ban va mau' % RA)
