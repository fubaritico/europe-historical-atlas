"""After drawing a polity: anchors it shares with each other polity, and the area they overlap (km²).
A border drawn beside a neighbour instead of on its anchors shows as shared=0 with an overlap or a gap.
usage: check.py <polity-id>"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from plates import year
from shapely.geometry import Polygon
from shapely.validation import make_valid
p = year(); A = p['anchors']
def poly(r):
    return make_valid(Polygon([(a[0] * 111.2 * math.cos(math.radians(46)), a[1] * 111.2) for a in (A[i] for i in r)]))
rings = {c['polity']: c['rings'] for c in p['claims']}
me = sys.argv[1]; mine = rings[me]
for k, v in rings.items():
    if k == me: continue
    shared = len(set(i for r in mine for i in r) & set(i for r in v for i in r))
    ov = sum(poly(a).intersection(poly(b)).area for a in mine for b in v)
    if shared or ov > 1: print(f'{k:35s} shared={shared:4d} overlap={ov:8.0f} km2')
