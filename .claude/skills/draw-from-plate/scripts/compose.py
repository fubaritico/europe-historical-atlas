"""Compose a polity as a SURFACE, then turn it into a drawing plan: the districts and communes that carry its old limits
added and removed, a band along a river to meet a neighbour, the whole cut by its suzerain's own domain (the suzerain
minus the vassals already drawn) — so every limit with a neighbour already drawn is that neighbour's own line, anchor
for anchor. Written 2026-11-27 for the Empire of 1200 (the dev: "precision, and speed").

usage (run with /Volumes/Acer/atlas-historien/outils/py):  compose.py <spec.json> [--emit]
→ prints the checks; writes beside the spec: plan-ring.json, cities.json, plan.png, and with --emit ops.json.

The spec:
{
  "polity": {"id", "name", "rank", "status", "suzerain", "existsFrom", "existsTo", "colour", "wikidata", "territory"},
  "map": "<years/1200 folder>",
  "box": [w, s, e, n],                                   the picture's and the witnesses' box
  "add":    [ {"nuts": "DE939"}, {"vg": "VWG"|"GEM"|"KRS", "ars": ["0335…", …]}, {"band": "<line.json>", "km": 3},
              {"rings": "<file.json>"},
              {"vote": ["DE929", …]} ],                 the communes of these districts the polity wins by its sheets
                                                         (a majority of a commune's sheets; a commune with none
                                                         follows its neighbours) — Germany only (VG250)
  "remove": [ … the same kinds … ],
  "within": "holy-roman-empire",                         the suzerain whose own domain cuts the surface
  "after": ["<folder>", …],                              plans of the same band, composed before, taken out too
  "sea_km": 40,                                          the suzerain's sea taken next to the coast (0: none)
  "holder": "principauté de Brême",                      the CMS title words that put a 1200 sheet INSIDE
  "neutral": ["royaume de Germanie"],                    holders that say nothing either way (shown grey)
  "tol_km": 0.1, "min_km2": 1,
  "accept": {"<sheet name>": "<why it may stay inside with no prince read>"}
}
A sheet held by a neutral holder (no prince) that falls inside stops --emit until it is researched or accepted.
A sheet whose holder has `holder` in its label must fall inside; a sheet of any other holder (not neutral) outside.
"""
import json
import math
import os
import sys

import shapefile
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, shape
from shapely.ops import transform, unary_union

GEO = '/Volumes/Acer/atlas-historien/outils/geodata/'
CMS = '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cms/cms.db'
HERE = os.path.dirname(os.path.abspath(__file__))


def km_to_deg(km, lat):
    """A distance in km as degrees of longitude at a latitude (the larger of the two degrees, so a band is never thin)."""
    return km / (111.32 * max(math.cos(math.radians(lat)), 0.2))


CACHE = GEO + 'cache/'
_memo = {}


def cached(name, build):
    """A dataset read once: from memory in this process, else from its pickle on the archive disk, else built and
    pickled (2026-11-27: the NUTS file was parsed once per district and the communes reprojected for every polity —
    75 s a polity, now a few seconds). Delete the pickle to rebuild it from the source files."""
    import pickle
    if name in _memo:
        return _memo[name]
    path = CACHE + name + '.pkl'
    if os.path.exists(path):
        with open(path, 'rb') as f:
            _memo[name] = pickle.load(f)
    else:
        os.makedirs(CACHE, exist_ok=True)
        _memo[name] = build()
        with open(path, 'wb') as f:
            pickle.dump(_memo[name], f)
    return _memo[name]


def all_nuts():
    """Every NUTS 3 district: {id: geometry}, WGS 84."""
    return cached('nuts3', lambda: {f['properties']['NUTS_ID']: shape(f['geometry']) for f in
                                    json.load(open(GEO + 'gisco/NUTS_RG_01M_2021_4326_LEVL_3.geojson'))['features']})


def communes():
    """Every German commune of the VG250 (GF 4, the unit as administered): [(name, ARS, geometry)], WGS 84."""
    def build():
        from pyproj import Transformer
        to_wgs = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True).transform
        return [(sr.record['GEN'], sr.record['ARS'], transform(to_wgs, shape(sr.shape.__geo_interface__)))
                for sr in shapefile.Reader(GEO + 'bkg/vg250_ebenen_0101/VG250_GEM.shp').iterShapeRecords(
                    fields=['GEN', 'ARS', 'GF']) if sr.record['GF'] == 4]
    return cached('vg250_gem', build)


def nuts(code):
    """A NUTS 3 district, WGS 84."""
    g = all_nuts().get(code)
    if g is None:
        raise SystemExit(f'no NUTS district {code}')
    return g


def vg(layer, ars):
    """The union of VG250 units (Germany) whose ARS key starts with one of `ars`, WGS 84."""
    from pyproj import Transformer
    to_wgs = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True).transform
    polys = []
    for sr in shapefile.Reader(GEO + f'bkg/vg250_ebenen_0101/VG250_{layer}.shp').iterShapeRecords(fields=['ARS', 'GF']):
        if sr.record['GF'] != 4 or not any(sr.record['ARS'].startswith(a) for a in ars):
            continue  # GF 4: the land area with its waters, the unit as it is administered
        polys.append(shape(sr.shape.__geo_interface__))
    if not polys:
        raise SystemExit(f'no VG250 {layer} unit for {ars}')
    return transform(to_wgs, unary_union(polys))


def vote(districts, want, neutral, box):
    """The communes (VG250, Germany) of some NUTS districts that the polity WINS, by the CMS's 1200 sheets: a commune
    goes to the holder most of its sheets name (its own sheets only — a sheet with no prince does not vote); a commune
    with no sheet follows the majority of its neighbours already decided, round after round, until nothing moves; a
    commune still undecided stays out. Prints the count of each kind. Returns the union, WGS 84."""
    from shapely.prepared import prep
    from shapely.strtree import STRtree
    area = prep(unary_union([nuts(d) for d in districts]))
    comm = [[name, g, None] for name, _, g in communes() if area.contains(g.representative_point())]
    tree = STRtree([c[1] for c in comm])
    unknown = set()
    for name, lo, la, holder in sheets(box):
        no_prince = not holder or any(n in holder for n in neutral)
        for k in tree.query(Point(lo, la)):
            if comm[k][1].contains(Point(lo, la)):
                if no_prince:
                    unknown.add(k)
                else:
                    comm[k].append(1 if want in holder else -1)
    for k, c in enumerate(comm):
        votes = c[3:]
        if votes and sum(votes) != 0:
            c[2] = sum(votes) > 0
        elif k in unknown:
            c[2] = False  # only sheets with no prince: a place the research has not settled is never filled in
        else:
            c[2] = None
    voted = sum(1 for c in comm if c[2] is not None)
    neighbours = [[j for j in tree.query(c[1].buffer(1e-4)) if j != i] for i, c in enumerate(comm)]
    moved = True
    while moved:
        moved = False
        for i, c in enumerate(comm):
            if c[2] is not None:
                continue
            ds = [comm[j][2] for j in neighbours[i] if comm[j][2] is not None]
            if ds and sum(ds) * 2 != len(ds):
                c[2] = sum(ds) * 2 > len(ds)
                moved = True
    won = [c for c in comm if c[2]]
    print(f'  vote: {len(comm)} communes, {voted} decided by their sheets, {len(won)} won, '
          f'{sum(1 for c in comm if c[2] is None)} undecided')
    return unary_union([c[1] for c in won])


def piece(item, folder, spec=None):
    """One added or removed surface of the spec."""
    if 'vote' in item:
        return vote(item['vote'], spec['holder'], spec.get('neutral', []), spec['box'])
    if 'nuts' in item:
        return nuts(item['nuts'])
    if 'vg' in item:
        return vg(item['vg'], item['ars'])
    if 'band' in item:
        line = LineString(json.load(open(os.path.join(folder, item['band'])))['points'])
        return line.buffer(km_to_deg(item['km'], line.centroid.y))
    if 'rings' in item:
        return unary_union([Polygon(r) for r in json.load(open(os.path.join(folder, item['rings'])))['rings']])
    raise SystemExit(f'unknown piece {item}')


def fills(doc, reg):
    """polity id → its surface (even-odd of its rings)."""
    A = doc['anchors']
    out = {}
    for c in doc['claims']:
        g = None
        for r in c['rings']:
            if len(r) < 3:
                continue
            p = Polygon([A[j] for j in r]).buffer(0)
            g = p if g is None else g.symmetric_difference(p)
        if g is not None:
            out[c['polity']] = g
    return out


def sheets(box):
    """The CMS's 1200 sheets in a box: [(name, lon, lat, holder label)]."""
    import sqlite3
    db = sqlite3.connect(f'file:{CMS}?mode=ro', uri=True)
    rows = db.execute(
        "select p.name, json_extract(p.location,'$.coordinates[0]'), json_extract(p.location,'$.coordinates[1]'), "
        "coalesce(t.label, pp.holder_name, '') from place_periods pp join places p on p.id = pp.place_id "
        "left join titles t on t.id = pp.holder_title_id where pp.deleted_at is null and pp.date_start_year <= 1200 "
        "and coalesce(pp.date_end_year, pp.date_start_year) >= 1200").fetchall()
    w, s, e, n = box
    return [r for r in rows if r[1] is not None and w <= r[1] <= e and s <= r[2] <= n]


def main(argv):
    """Compose, check, picture, emit."""
    spec_path = argv[1]
    folder = os.path.dirname(os.path.abspath(spec_path))
    spec = json.load(open(spec_path))
    mp = spec['map'].rstrip('/') + '/'
    doc = json.load(open(mp + 'polities.json'))
    reg = {p['id']: p for p in json.load(open(mp + 'registry.json'))['polities']}
    F = fills(doc, reg)

    surface = unary_union([piece(i, folder, spec) for i in spec['add']])
    for i in spec.get('remove', []):
        surface = surface.difference(piece(i, folder, spec))
    lord = spec['within']
    domain = F[lord]
    own = spec['polity']['id']
    if own in F:  # a polity composed again: its present surface was carved out of the lord, it is its own to redraw
        domain = unary_union([domain, F[own]]).buffer(0)
    for pid, p in reg.items():
        if p.get('suzerain') == lord and pid in F and pid != spec['polity']['id']:
            domain = domain.difference(F[pid])
    # and the neighbours that are not the lord's: an overlap the map already has (the Danish × Empire one at the
    # Eider's mouth) is never handed to the new polity
    for pid, g in F.items():
        if pid not in (lord, own) and reg.get(pid, {}).get('suzerain') != lord and g.intersects(domain):
            domain = domain.difference(g)
    # a band composed in one go: the outlines planned before this one (not drawn yet) are taken out as well
    for prev in spec.get('after', []):
        plan = os.path.join(os.path.dirname(folder), prev, 'plan-ring.json')
        domain = domain.difference(unary_union([Polygon(r).buffer(0) for r in json.load(open(plan))['rings']]))
    # the sea: a coastal polity takes the suzerain's sea next to its coast, as the suzerain's own outline runs offshore
    # (the dev, 2026-11-27: "make the fill bite on the sea like the outlines already there") — the land mask cuts the
    # coast at the render; an outline stopped at the shore would leave a strip of the suzerain at sea
    sea_km = spec.get('sea_km', 40)
    if sea_km:
        from shapely.geometry import box as bbox_
        w_, s_, e_, n_ = surface.bounds
        pad = km_to_deg(sea_km * 1.5, (s_ + n_) / 2)
        frame = bbox_(w_ - pad, s_ - pad, e_ + pad, n_ + pad)
        land = unary_union([g for g in all_nuts().values() if g.intersects(frame)]).buffer(0)
        sea = domain.intersection(frame).difference(land)
        # each stretch of sea to the nearest coast: cells of a Voronoi diagram of points along the coasts, this
        # polity's land against all other land in the frame
        from shapely import voronoi_polygons
        from shapely.geometry import MultiPoint
        step = km_to_deg(2, (s_ + n_) / 2)

        def samples(geom):
            pts = []
            for g in getattr(geom, 'geoms', [geom]):
                if isinstance(g, Polygon):
                    line = g.exterior
                    n = max(int(line.length / step), 4)
                    pts += [line.interpolate(k / n, normalized=True) for k in range(n)]
            return pts
        # the polity's land opened first: the thin strips two datasets leave along a coast (GISCO's coast against
        # VG250's communes) would each draw a lobe of sea
        d0 = km_to_deg(0.75, (s_ + n_) / 2)
        mine = samples(surface.intersection(land).buffer(-d0).buffer(d0))
        other = samples(land.difference(surface).intersection(frame).buffer(0))
        cells = list(voronoi_polygons(MultiPoint(mine + other), extend_to=frame).geoms)
        from shapely.strtree import STRtree as Tree
        ptree = Tree(mine + other)
        zone = unary_union([c for c in cells
                            if any(k < len(mine) and c.contains((mine + other)[k]) for k in ptree.query(c))])
        bite = sea.intersection(zone).intersection(surface.buffer(km_to_deg(sea_km, (s_ + n_) / 2)))
        # an opening: the teeth the point-by-point sharing leaves where two coasts face each other (Hadeln, 27/11)
        # are cut — no stretch of sea thinner than ~1.5 km is kept
        d = km_to_deg(0.75, (s_ + n_) / 2)
        bite = bite.buffer(-d).buffer(d).intersection(sea)
        if not bite.is_empty:
            surface = unary_union([surface, bite]).buffer(0)
            print(f'  sea taken offshore: {round(bite.area * 111.32 * 111.32 * math.cos(math.radians((s_ + n_) / 2)))} km²')
    surface = surface.intersection(domain)
    parts = [g for g in getattr(surface, 'geoms', [surface]) if isinstance(g, Polygon)]
    lat = surface.centroid.y
    tol = km_to_deg(spec.get('tol_km', 0.1), lat)
    min_area = spec.get('min_km2', 1) / (111.32 * 111.32 * math.cos(math.radians(lat)))
    rings, dropped = [], []
    for g in sorted(parts, key=lambda g: -g.area):
        if g.area < min_area:
            dropped.append(round(g.area * 111.32 * 111.32 * math.cos(math.radians(lat)), 2))
            continue
        ring = [tuple(c) for c in g.exterior.simplify(tol, preserve_topology=True).coords][:-1]
        rings.append(ring)
        big = [h for h in g.interiors if Polygon(h).area >= min_area]
        if big:
            print(f'  HOLES over {spec.get("min_km2", 1)} km² inside, filled by the outline: {len(big)} at '
                  f'{[tuple(round(v, 2) for v in Polygon(h).representative_point().coords[0]) for h in big]}')
    print(f"{spec['polity']['id']}: {len(rings)} ring(s) of {[len(r) for r in rings]} points; pieces dropped under "
          f"{spec.get('min_km2', 1)} km²: {dropped}")

    # placeRing (CARTO-584) takes an anchor within 1 m as that anchor, and refuses two positions on one anchor: a point
    # within 1.5 m of a map anchor another point of the ring already takes, or of the point kept before it, is dropped
    from shapely.strtree import STRtree
    anchors = [Point(x, y) for x, y in doc['anchors'] if x is not None]
    atree = STRtree(anchors)
    one_m = 1.5 / 111320 / math.cos(math.radians(lat))
    cleaned, dropped_pts = [], 0
    for ring in rings:
        taken, out = set(), []
        for p in ring:
            near = [k for k in atree.query(Point(p).buffer(one_m)) if anchors[k].distance(Point(p)) <= one_m]
            if (near and near[0] in taken) or (out and math.dist(out[-1], p) <= one_m):
                dropped_pts += 1
                continue
            taken.update(near)
            out.append(p)
        if out and math.dist(out[0], out[-1]) <= one_m:
            out.pop()
            dropped_pts += 1
        cleaned.append(out)
    rings = cleaned
    if dropped_pts:
        print(f'  points dropped as doubles of an anchor (under 1.5 m): {dropped_pts}')
    # the shared stretches: how many of the planned points are an anchor of the map already (the Pen reuses them)
    A = {(round(x, 9), round(y, 9)) for x, y in doc['anchors'] if x is not None}
    shared = sum(1 for r in rings for p in r if (round(p[0], 9), round(p[1], 9)) in A)
    print(f'  points on an existing anchor (shared borders): {shared}')

    # the witnesses
    whole = unary_union([Polygon(r) for r in rings]) if rings else Polygon()
    want, neutral = spec['holder'], spec.get('neutral', [])
    cities, wrong, grey_in = [], [], []
    for name, lo, la, holder in sheets(spec['box']):
        inside = whole.contains(Point(lo, la))
        if want in holder:
            ok, col = inside, '#1a9a3a'
        elif any(n in holder for n in neutral) or not holder:
            if inside:
                grey_in.append(name)
            cities.append({'name': name, 'lon': lo, 'lat': la, 'colour': '#8a8a8a'})
            continue
        else:
            ok, col = not inside, '#d0202a'
        if not ok:
            wrong.append(f'{name} ({holder.split(" — ")[-1][:40]})')
            col = '#ff00ff'
        cities.append({'name': name, 'lon': lo, 'lat': la, 'colour': col})
    print(f'  witnesses wrong: {wrong or "none"}')
    print(f'  sheets held by the king alone, now inside: {len(grey_in)} {grey_in[:12]}')
    # A sheet that names no prince, inside the outline, is a question for the research, not a point to draw over
    # (the dev, 2026-11-27, CARTO-585: Wistedt, Aschwarden, Wiemsdorf drawn into Bremen on a witness line) — the plan
    # is not emitted until each is settled or the spec lists it in "accept", with why.
    accepted = set(spec.get('accept', {}))
    # a sheet a running backfill is researching (its list of sheets) is accepted, said, and measured again at its end
    for lst in spec.get('accept_in', []):
        pending = {x['name'] for x in json.load(open(lst))}
        named = [n for n in grey_in if n in pending]
        if named:
            print(f'  accepted while {os.path.basename(os.path.dirname(os.path.dirname(lst)))} researches them: {len(named)}')
        accepted |= set(named)
    blocking = [n for n in grey_in if n not in accepted]
    if blocking and '--emit' in argv:
        print(f'  REFUSED: {len(blocking)} sheet(s) with no prince inside the outline — research them, or list each '
              'in the spec\'s "accept": {"<name>": "<why>"}')
        argv = [a for a in argv if a != '--emit']

    json.dump({'rings': [list(map(list, r)) for r in rings]}, open(os.path.join(folder, 'plan-ring.json'), 'w'))
    json.dump(cities, open(os.path.join(folder, 'cities.json'), 'w'), ensure_ascii=False)
    os.system(f"/Volumes/Acer/atlas-historien/outils/py {HERE}/preview.py {','.join(map(str, spec['box']))} "
              f"{folder}/plan.png --map {mp} --min-up 1e12 --lines {folder}/plan-ring.json "
              f"--cities {folder}/cities.json --px 1800 > /dev/null")
    print(f'  picture: {folder}/plan.png')
    if '--emit' in argv:
        ops = [['create', spec['polity']]] + [['ring', spec['polity']['id'], list(map(list, r))] for r in rings]
        json.dump(ops, open(os.path.join(folder, 'ops.json'), 'w'))
        print(f'  ops.json: {len(ops)} operations')


if __name__ == '__main__':
    main(sys.argv)
