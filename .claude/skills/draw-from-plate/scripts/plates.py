"""Shared setup for the draw-from-plate scripts: where the plates and the year are, and how a plate is calibrated.

Configuration, all optional:
  PLATES — path to the plates file (default: files/resources/euratlas/plates/plates.json under the repository root)
  YEAR   — path to the year's polities.json (default: packages/atlas/public/years/1100/polities.json)

A plate is calibrated by its graticule, read with grid.py: the x of each meridian (one every 5 degrees, from
`lon0`), and two or more parallels as [y, latitude]. Latitude goes through Mercator, as Euratlas's plates do.
"""
import json, math, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
PLATES = os.environ.get('PLATES', os.path.join(ROOT, 'files/resources/euratlas/plates/plates.json'))
YEAR = os.environ.get('YEAR', os.path.join(ROOT, 'packages/atlas/public/years/1100/polities.json'))


def M(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def load_plates():
    with open(PLATES) as f:
        return json.load(f)


def plate(key):
    """(image path, lon(x), lat(y), to_px(lon, lat)) for a plate key."""
    p = load_plates()[key]
    V, lon0, H = p['meridians'], p['lon0'], p['parallels']
    step = p.get('step', 5)
    ax = (V[-1] - V[0]) / (step * (len(V) - 1))
    n = len(H)
    sx = sum(M(l) for _, l in H); sy = sum(y for y, _ in H)
    sxx = sum(M(l) ** 2 for _, l in H); sxy = sum(M(l) * y for y, l in H)
    a = (n * sxy - sx * sy) / (n * sxx - sx * sx); b = (sy - a * sx) / n
    lon = lambda x: lon0 + (x - V[0]) / ax
    lat = lambda y: math.degrees(2 * math.atan(math.exp((y - b) / a)) - math.pi / 2)
    to_px = lambda lo, la: (V[0] + (lo - lon0) * ax, a * M(la) + b)
    return os.path.expanduser(p['image']), lon, lat, to_px


def year():
    with open(YEAR) as f:
        return json.load(f)


def km(a, b):
    c = math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((a[0] - b[0]) * 111.2 * c, (a[1] - b[1]) * 111.2)
