"""One picture of a zone before any click: the year's polities as they are, the rivers (HydroRIVERS), the district
limits (GISCO NUTS 3), the lines of a plan, and the witness cities — so the plan is judged on the screen, by me and by
the dev, before the Cartographer is touched (the dev, 2026-11-27: "I need to see what you do").

usage (run with /Volumes/Acer/atlas-historien/outils/py):
  preview.py <w,s,e,n> <out.png> [--map <year folder>] [--lines a.json,b.json…] [--cities cities.json]
             [--px 1600] [--min-up 50] [--dlm]
  --dlm     the BKG DLM250's waters (Germany), named — the precise layer; --min-up 1e9 hides HydroRIVERS
  --lines   JSON files, each {"points": [[lon, lat], …]} (geodata.py's output) or {"rings": [[[lon, lat], …]]}
  --cities  [{"name", "lon", "lat", "colour"?}] — a city with "colour" is drawn in it (e.g. green inside, red outside)
The picture is equirectangular, scaled by the cosine of the box's middle latitude, a graticule every 0.1° labelled.
"""
import json
import math
import sys

import shapefile
from PIL import Image, ImageDraw, ImageFont
from shapely.geometry import box, shape

GEO = '/Volumes/Acer/atlas-historien/outils/geodata/'


def main(argv):
    """Draw the picture."""
    bbox = [float(v) for v in argv[1].split(',')]
    out = argv[2]
    opt, i = {}, 3
    while i < len(argv):
        if argv[i] in ('--label-rivers', '--dlm'):
            opt[argv[i][2:]] = True
            i += 1
        else:
            opt[argv[i][2:]] = argv[i + 1]
            i += 2
    w, s, e, n = bbox
    cos = math.cos(math.radians((s + n) / 2))
    W = int(opt.get('px', 1600))
    H = int(W * (n - s) / ((e - w) * cos))
    X = lambda lo: (lo - w) / (e - w) * W
    Y = lambda la: (n - la) / (n - s) * H
    im = Image.new('RGB', (W, H), (246, 241, 228))
    dr = ImageDraw.Draw(im, 'RGBA')
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 13)
    except OSError:
        font = ImageFont.load_default()

    # the year's polities, filled lightly in their colour, outlined
    if 'map' in opt:
        folder = opt['map'].rstrip('/') + '/'
        doc = json.load(open(folder + 'polities.json'))
        reg = {p['id']: p for p in json.load(open(folder + 'registry.json'))['polities']}
        A = doc['anchors']
        for c in doc['claims']:
            col = reg.get(c['polity'], {}).get('colour') or '#999999'
            rgb = tuple(int(col[k:k + 2], 16) for k in (1, 3, 5))
            for r in c['rings']:
                pts = [(X(A[j][0]), Y(A[j][1])) for j in r]
                if len(pts) > 2:
                    dr.polygon(pts, fill=rgb + (70,), outline=rgb + (255,))
                    for p in pts:
                        dr.ellipse([p[0] - 1.5, p[1] - 1.5, p[0] + 1.5, p[1] + 1.5], fill=rgb + (255,))

    # the districts' limits, thin grey
    b = box(w, s, e, n)
    for f in json.load(open(GEO + 'gisco/NUTS_RG_01M_2021_4326_LEVL_3.geojson'))['features']:
        g = shape(f['geometry'])
        if not g.intersects(b):
            continue
        for poly in getattr(g, 'geoms', [g]):
            dr.line([(X(x), Y(y)) for x, y in poly.exterior.coords], fill=(120, 120, 120, 200), width=1)
        c = g.intersection(b).representative_point()
        dr.text((X(c.x), Y(c.y)), f['properties']['NUTS_ID'], fill=(110, 110, 110), font=font)

    # the DLM250's waters (Germany): areas light blue, lines blue, every named line labelled once
    if 'dlm' in opt:
        from pyproj import Transformer
        to_wgs = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True).transform
        to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True).transform
        x0, y0 = to_utm(w, s)
        x1, y1 = to_utm(e, n)
        ub = [min(x0, x1) - 20000, min(y0, y1) - 20000, max(x0, x1) + 20000, max(y0, y1) + 20000]
        dlm = GEO + 'bkg/dlm250_ebenen/'
        for sr in shapefile.Reader(dlm + 'gew01_f.shp').iterShapeRecords(bbox=ub, fields=['NAM']):
            pts = sr.shape.points
            parts = list(sr.shape.parts) + [len(pts)]
            for k in range(len(parts) - 1):
                ring = [to_wgs(*c) for c in pts[parts[k]:parts[k + 1]]]
                if len(ring) > 2:
                    dr.polygon([(X(x), Y(y)) for x, y in ring], fill=(150, 190, 235, 255))
        seen = set()
        for sr in shapefile.Reader(dlm + 'gew01_l.shp').iterShapeRecords(bbox=ub, fields=['NAM']):
            pts = [to_wgs(*c) for c in sr.shape.points]
            dr.line([(X(x), Y(y)) for x, y in pts], fill=(20, 80, 200, 255), width=2)
            nm = sr.record['NAM']
            if nm and nm not in seen and len(pts) > 1:
                seen.add(nm)
                mx, my = pts[len(pts) // 2]
                dr.text((X(mx) + 3, Y(my)), nm, fill=(20, 60, 160), font=font)

    # the rivers, wider as they grow
    min_up = float(opt.get('min-up', 50))
    for sr in shapefile.Reader(GEO + 'hydrorivers/HydroRIVERS_v10_eu_shp/HydroRIVERS_v10_eu.shp').iterShapeRecords(
            bbox=bbox):
        up = sr.record['UPLAND_SKM']
        if up < min_up:
            continue
        width = 1 if up < 500 else 2 if up < 5000 else 3
        dr.line([(X(x), Y(y)) for x, y in sr.shape.points], fill=(40, 110, 200, 230), width=width)

    # the plan's lines, thick, numbered at their start
    palette = [(200, 30, 30), (20, 140, 40), (150, 40, 170), (230, 120, 0), (0, 140, 150), (90, 60, 20)]
    for k, path in enumerate([p for p in opt.get('lines', '').split(',') if p]):
        d = json.load(open(path))
        col = palette[k % len(palette)]
        for line in d.get('rings') or [d['points']]:
            pts = [(X(x), Y(y)) for x, y in line]
            dr.line(pts + ([pts[0]] if 'rings' in d else []), fill=col + (255,), width=3)
            for p in pts:
                dr.ellipse([p[0] - 2.5, p[1] - 2.5, p[0] + 2.5, p[1] + 2.5], outline=col + (255,))
            dr.text((pts[0][0] + 4, pts[0][1] - 14), str(k + 1), fill=col, font=font)

    # the witness cities
    if 'cities' in opt:
        for c in json.load(open(opt['cities'])):
            x, y = X(c['lon']), Y(c['lat'])
            col = c.get('colour', '#000000')
            rgb = tuple(int(col[k:k + 2], 16) for k in (1, 3, 5))
            dr.ellipse([x - 4, y - 4, x + 4, y + 4], fill=rgb + (255,), outline=(0, 0, 0, 255))
            dr.text((x + 6, y - 7), c['name'], fill=(0, 0, 0), font=font)

    # graticule every 0.1°, labelled every 0.5°
    lo = math.ceil(w * 10) / 10
    while lo < e:
        major = abs(lo * 2 - round(lo * 2)) < 1e-6
        dr.line([(X(lo), 0), (X(lo), H)], fill=(0, 0, 0, 60 if major else 18), width=1)
        if major:
            dr.text((X(lo) + 2, 2), f'{lo:.1f}°E', fill=(0, 0, 0), font=font)
        lo = round(lo + 0.1, 6)
    la = math.ceil(s * 10) / 10
    while la < n:
        major = abs(la * 2 - round(la * 2)) < 1e-6
        dr.line([(0, Y(la)), (W, Y(la))], fill=(0, 0, 0, 60 if major else 18), width=1)
        if major:
            dr.text((2, Y(la) + 2), f'{la:.1f}°N', fill=(0, 0, 0), font=font)
        la = round(la + 0.1, 6)
    im.save(out)
    print(out, W, H)


if __name__ == '__main__':
    main(sys.argv)
