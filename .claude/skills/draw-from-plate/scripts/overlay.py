"""Draw the saved year's rings over a plate, enlarged, to check a polity against its source.
usage: overlay.py <plate> <x0,y0,x1,y1> <out.png> [polity-id,polity-id,...]"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from plates import plate, year
from PIL import Image, ImageDraw
key, box, out = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], sys.argv[3]
only = sys.argv[4].split(',') if len(sys.argv) > 4 else None
fn, lon, lat, P = plate(key)
doc = year(); A = doc['anchors']
im = Image.open(fn).convert('RGB'); d = ImageDraw.Draw(im)
cols = [(0, 0, 0), (0, 0, 255), (200, 0, 0), (0, 140, 0), (160, 0, 160), (0, 150, 150)]
k = 0
for c in doc['claims']:
    if only and c['polity'] not in only: continue
    col = cols[k % len(cols)]; k += 1
    for r in c['rings']:
        pts = [P(*A[i]) for i in r]
        d.line(pts + [pts[0]], fill=col, width=2)
        for q in pts: d.ellipse([q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2], fill=col)
c = im.crop(box); c.resize((c.width * 2, c.height * 2)).save(out)
