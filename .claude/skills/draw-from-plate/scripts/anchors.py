"""Neighbour anchors to aim at: a polity's ring between two points, or the anchors nearest a point.
usage: anchors.py <polity-id> lon,lat [lon,lat]   — one point: the 3 nearest; two: the ring between them"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from plates import year
p = year(); A = p['anchors']
ring = [A[i] for c in p['claims'] if c['polity'] == sys.argv[1] for i in c['rings'][0]]
q = [tuple(map(float, s.split(','))) for s in sys.argv[2:]]
d = lambda a, b: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
if len(q) == 1:
    for a in sorted(ring, key=lambda a: d(a, q[0]))[:3]: print(a)
else:
    i0 = min(range(len(ring)), key=lambda k: d(ring[k], q[0])); i1 = min(range(len(ring)), key=lambda k: d(ring[k], q[1]))
    for k in range(min(i0, i1), max(i0, i1) + 1): print(k, ring[k])
