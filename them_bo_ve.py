# -*- coding: utf-8 -*-
# GAN BO VE CUA BAN DEMO VAO tg.html.
#
# Chi them HAI the <script src> o cuoi trang. Khong sua mot dong nao cua
# tg.html — nen neu co gi khong on, go hai dong nay ra la ve nguyen trang thai cu.
import io, sys

P  = sys.argv[1] if len(sys.argv) > 1 else 'tg.html'
RA = sys.argv[2] if len(sys.argv) > 2 else 'tg-demo.html'
s = io.open(P, encoding='utf-8').read()
assert 'demo-ve.js' not in s, 'da gan roi'

CHEN = ('\n<script src="scripts/demo-mau.js"></script>'
        '\n<script src="scripts/demo-ve.js"></script>'
        '\n<script src="scripts/demo-chart-shim.js"></script>'
        '\n<script src="scripts/demo-bang.js"></script>'
        '\n<script src="scripts/demo-sang.js"></script>\n')
k = s.rfind('</body>')
if k < 0:
    k = s.rfind('</html>')
assert k > 0
s = s[:k] + CHEN + s[k:]
io.open(RA, 'w', encoding='utf-8').write(s)
print('OK -> %s (%d byte, them %d)' % (RA, len(s), len(CHEN)))
