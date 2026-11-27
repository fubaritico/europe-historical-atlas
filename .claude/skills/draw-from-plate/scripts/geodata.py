"""Precise lines for a border, from two open datasets kept on the archive disk — a river followed between two points,
and the edge two administrative districts share. A border that follows a river, or a district limit that has lasted
since the Middle Ages, is drawn from these lines instead of being read on a small-scale plate (the dev, 2026-11-27:
"extreme precision — no potatoes, no triangles").

The datasets (downloaded 2026-11-27 into /Volumes/Acer/atlas-historien/outils/geodata/, each with its licence):
  HydroRIVERS v1.0, Europe (Lehner & Grill 2013; free for scientific, educational and commercial use, attribution)
  GISCO NUTS 2021, level 3, 1:1 M (© EuroGeographics for the administrative boundaries; non-commercial use, attribution)
  BKG DLM250 and VG250, Germany (© GeoBasis-DE / BKG 2025; Datenlizenz Deutschland – Namensnennung 2.0)

A modern district limit is a historical border only where a source or a plate says the limit lasted: every use is
declared in the map's journal as « limite moderne reprise pour son ancienneté ».

usage (run with /Volumes/Acer/atlas-historien/outils/py):
  geodata.py nuts <w,s,e,n> [--country DE]                 the NUTS 3 districts touching the box
  geodata.py edge <NUTS_A> <NUTS_B> [--tol-km 0.1] [--longest]
                                                           the limit A and B share, as one line, west or north first
  geodata.py named <Name> <lon,lat> <lon,lat> [--tol-km 0.1] [--gap-km 3]
                                                           a named water line of the DLM250 (Germany) between two
                                                           points, in that order — the precise one, preferred
  geodata.py river <lon,lat> <lon,lat> [--tol-km 0.1] [--min-up 10]
                                                           the HydroRIVERS course between two points — derived from
                                                           a 500 m relief, so in steps: outside Germany only
Every command prints JSON: {"points": [[lon, lat], …], "km": length, …}.
"""
import heapq
import json
import math
import sys

import shapefile
from shapely.geometry import LineString, MultiLineString, Point, shape
from shapely.ops import linemerge, unary_union

GEO = '/Volumes/Acer/atlas-historien/outils/geodata/'
NUTS = GEO + 'gisco/NUTS_RG_01M_2021_4326_LEVL_3.geojson'
RIVERS = GEO + 'hydrorivers/HydroRIVERS_v10_eu_shp/HydroRIVERS_v10_eu.shp'
DLM = GEO + 'bkg/dlm250_ebenen/'


def km(a, b):
    """Distance in km between two [lon, lat] points (equirectangular, enough under 100 km)."""
    c = math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((a[0] - b[0]) * 111.32 * c, (a[1] - b[1]) * 110.57)


def length(pts):
    """Length in km of a polyline."""
    return sum(km(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def simplify(pts, tol_km):
    """Douglas-Peucker in degrees scaled to km at the line's latitude; keeps the two ends."""
    if tol_km <= 0 or len(pts) < 3:
        return pts
    lat = sum(p[1] for p in pts) / len(pts)
    tol = tol_km / 111.0 / max(math.cos(math.radians(lat)), 0.3)
    return [list(p) for p in LineString(pts).simplify(tol, preserve_topology=False).coords]


def districts(bbox, country=None):
    """[(id, name, geometry)] of the NUTS 3 districts touching a (w, s, e, n) box."""
    from shapely.geometry import box
    b = box(*bbox)
    out = []
    for f in json.load(open(NUTS))['features']:
        p = f['properties']
        if country and p['CNTR_CODE'] != country:
            continue
        g = shape(f['geometry'])
        if g.intersects(b):
            out.append((p['NUTS_ID'], p['NUTS_NAME'], g))
    return out


def district(nuts_id):
    """The geometry of one NUTS 3 district."""
    for f in json.load(open(NUTS))['features']:
        if f['properties']['NUTS_ID'] == nuts_id:
            return shape(f['geometry'])
    raise SystemExit(f'no district {nuts_id}')


def edge(a, b, longest=False):
    """The limit districts a and b share, merged into one line, ordered west (or north) first. A shared limit in
    several pieces is refused unless `longest` asks for the longest piece (the others are printed, never dropped
    silently)."""
    shared = district(a).boundary.intersection(district(b).boundary)
    lines = [g for g in getattr(shared, 'geoms', [shared]) if isinstance(g, (LineString, MultiLineString))]
    if not lines:
        raise SystemExit(f'{a} and {b} share no limit')
    merged = linemerge(unary_union(lines))
    parts = list(getattr(merged, 'geoms', [merged]))
    if len(parts) > 1:
        sizes = ', '.join(f'{length(list(p.coords)):.1f} km' for p in parts)
        if not longest:
            raise SystemExit(f'{a} | {b}: the shared limit is in {len(parts)} pieces ({sizes}); --longest takes one')
        print(f'{a} | {b}: {len(parts)} pieces ({sizes}), the longest kept', file=sys.stderr)
        parts = [max(parts, key=lambda p: length(list(p.coords)))]
    pts = [list(p) for p in parts[0].coords]
    if (pts[0][0], -pts[0][1]) > (pts[-1][0], -pts[-1][1]):
        pts.reverse()
    return pts


def river(p, q, min_up=10.0, pad=0.4):
    """The course of the river network between the vertices nearest p and q: HydroRIVERS segments whose upstream area
    is at least min_up km², walked as an undirected graph (shortest path), so p may be up- or downstream of q."""
    w, s = min(p[0], q[0]) - pad, min(p[1], q[1]) - pad
    e, n = max(p[0], q[0]) + pad, max(p[1], q[1]) + pad
    graph, pos = {}, {}

    def node(c):
        k = (round(c[0], 6), round(c[1], 6))
        pos[k] = c
        return k

    for sr in shapefile.Reader(RIVERS).iterShapeRecords(bbox=[w, s, e, n]):
        if sr.record['UPLAND_SKM'] < min_up:
            continue
        cs = sr.shape.points
        for i in range(len(cs) - 1):
            u, v = node(cs[i]), node(cs[i + 1])
            d = km(cs[i], cs[i + 1])
            graph.setdefault(u, []).append((v, d))
            graph.setdefault(v, []).append((u, d))
    if not graph:
        raise SystemExit('no river in the box')

    def nearest(c):
        k = min(graph, key=lambda k: km(pos[k], c))
        return k, km(pos[k], c)

    (a, da), (b, db) = nearest(p), nearest(q)
    best, prev, heap = {a: 0.0}, {}, [(0.0, a)]
    while heap:
        d, u = heapq.heappop(heap)
        if u == b:
            break
        if d > best.get(u, math.inf):
            continue
        for v, w_ in graph[u]:
            nd = d + w_
            if nd < best.get(v, math.inf):
                best[v], prev[v] = nd, u
                heapq.heappush(heap, (nd, v))
    if b not in best:
        raise SystemExit('the two points are not on one river network (raise --min-up or move a point)')
    path, k = [b], b
    while k != a:
        k = prev[k]
        path.append(k)
    path.reverse()
    return [list(pos[k]) for k in path], da, db


def chain(parts, P, Q, gap, name):
    """One line from the pieces of a river that the data cuts (a lake, a canal, a weir): from the piece nearest P,
    each next piece is the one whose end is nearest the current end, until the piece nearest Q — every gap bridged
    by a straight segment and said on stderr; a gap over `gap` metres is refused."""
    if len(parts) == 1:
        return parts[0]
    start = min(parts, key=lambda g: g.distance(P))
    goal = min(parts, key=lambda g: g.distance(Q))
    line = list(start.coords)
    if Point(line[0]).distance(Q) < Point(line[-1]).distance(Q):
        line.reverse()
    left = [g for g in parts if g is not start]
    current = start
    while current is not goal:
        end = Point(line[-1])
        nxt = min(left, key=lambda g: min(end.distance(Point(g.coords[0])), end.distance(Point(g.coords[-1]))))
        cs = list(nxt.coords)
        if end.distance(Point(cs[-1])) < end.distance(Point(cs[0])):
            cs.reverse()
        d = end.distance(Point(cs[0]))
        if d > gap:
            raise SystemExit(f'{name}: a gap of {d / 1000:.1f} km in the data (over --gap-km); split the run there')
        print(f'{name}: a gap of {d / 1000:.2f} km bridged', file=sys.stderr)
        line += cs
        left.remove(nxt)
        current = nxt
    return LineString(line)


def axis(poly, samples=200):
    """The axis of an elongated water area (a wide river drawn as a surface): its outline is cut at its two points
    farthest apart, each bank resampled at the same fractions of its length, and the two averaged."""
    ring = list(poly.exterior.coords)[:-1]
    pts = [Point(c) for c in ring]
    # the two ends: the farthest pair, found from the point farthest from the first
    i = max(range(len(pts)), key=lambda k: pts[0].distance(pts[k]))
    j = max(range(len(pts)), key=lambda k: pts[i].distance(pts[k]))
    i, j = min(i, j), max(i, j)
    bank1 = LineString(ring[i:j + 1])
    bank2 = LineString((ring[j:] + ring[:i + 1])[::-1])
    out = []
    for k in range(samples + 1):
        f = k / samples
        a, b = bank1.interpolate(f, normalized=True), bank2.interpolate(f, normalized=True)
        out.append(((a.x + b.x) / 2, (a.y + b.y) / 2))
    return LineString(out)


def named(name, p, q, pad=0.3, gap_km=3.0):
    """The course of a named water line of the BKG's DLM250 (Germany, 1:250 000) between the points of it nearest p
    and q, in the order p → q. The pieces of that name in the box are chained (`chain`): a gap is bridged in a
    straight line and said, one over gap_km is refused."""
    from pyproj import Transformer
    from shapely.ops import substring, transform
    to_wgs = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True).transform
    to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True).transform
    w, s = to_utm(min(p[0], q[0]) - pad, min(p[1], q[1]) - pad)
    e, n = to_utm(max(p[0], q[0]) + pad, max(p[1], q[1]) + pad)
    lines = [LineString(sr.shape.points) for sr in shapefile.Reader(DLM + 'gew01_l.shp').iterShapeRecords(
        bbox=[w, s, e, n], fields=['NAM']) if sr.record['NAM'] == name and len(sr.shape.points) > 1]
    # a wide stretch is a surface, not a line: its axis stands in for it
    from shapely.geometry import Polygon
    for sr in shapefile.Reader(DLM + 'gew01_f.shp').iterShapeRecords(bbox=[w, s, e, n], fields=['NAM']):
        if sr.record['NAM'] != name:
            continue
        cs, parts = sr.shape.points, list(sr.shape.parts) + [len(sr.shape.points)]
        poly = Polygon(cs[parts[0]:parts[1]])
        if poly.is_valid and poly.area > 0:
            lines.append(axis(poly))
            print(f'{name}: a surface of {poly.area / 1e6:.1f} km² read as its axis', file=sys.stderr)
    if not lines:
        raise SystemExit(f'no water line named {name} near the two points')
    merged = linemerge(unary_union(lines))
    parts = list(getattr(merged, 'geoms', [merged]))
    P, Q = Point(to_utm(*p)), Point(to_utm(*q))
    part = chain(parts, P, Q, gap_km * 1000, name)
    if part.distance(P) > 2000 or part.distance(Q) > 2000:
        raise SystemExit(f'{name}: the course ends {part.distance(P) / 1000:.1f} / {part.distance(Q) / 1000:.1f} km '
                         'from the two points')
    a, b = part.project(P), part.project(Q)
    cut = substring(part, min(a, b), max(a, b))
    pts = [list(c) for c in transform(to_wgs, cut).coords]
    if a > b:
        pts.reverse()
    return pts, part.distance(P) / 1000, part.distance(Q) / 1000


def main(argv):
    """Parse the command line and print the JSON answer."""
    if len(argv) < 2:
        raise SystemExit(__doc__)
    cmd, args = argv[1], argv[2:]
    opt = {}
    pos_args = []
    i = 0
    while i < len(args):
        if args[i] == '--longest':
            opt['longest'] = True
            i += 1
        elif args[i].startswith('--'):
            opt[args[i][2:]] = args[i + 1]
            i += 2
        else:
            pos_args.append(args[i])
            i += 1
    tol = float(opt.get('tol-km', 0.1))
    if cmd == 'nuts':
        bbox = [float(v) for v in pos_args[0].split(',')]
        rows = [{'id': i_, 'name': n_, 'km2': round(g.area * 111.32 * 110.57 * math.cos(math.radians(g.centroid.y)))}
                for i_, n_, g in districts(bbox, opt.get('country'))]
        print(json.dumps(rows, ensure_ascii=False, indent=1))
    elif cmd == 'edge':
        pts = simplify(edge(pos_args[0], pos_args[1], 'longest' in opt), tol)
        print(json.dumps({'points': [[round(x, 5), round(y, 5)] for x, y in pts], 'km': round(length(pts), 1)}))
    elif cmd == 'river':
        p = [float(v) for v in pos_args[0].split(',')]
        q = [float(v) for v in pos_args[1].split(',')]
        pts, da, db = river(p, q, float(opt.get('min-up', 10)))
        pts = simplify(pts, tol)
        print(json.dumps({'points': [[round(x, 5), round(y, 5)] for x, y in pts], 'km': round(length(pts), 1),
                          'snap_km': [round(da, 2), round(db, 2)]}))
    elif cmd == 'named':
        p = [float(v) for v in pos_args[1].split(',')]
        q = [float(v) for v in pos_args[2].split(',')]
        pts, da, db = named(pos_args[0], p, q, gap_km=float(opt.get('gap-km', 3)))
        pts = simplify(pts, tol)
        print(json.dumps({'name': pos_args[0], 'points': [[round(x, 5), round(y, 5)] for x, y in pts],
                          'km': round(length(pts), 1), 'snap_km': [round(da, 2), round(db, 2)]}, ensure_ascii=False))
    else:
        raise SystemExit(__doc__)


if __name__ == '__main__':
    main(sys.argv)
