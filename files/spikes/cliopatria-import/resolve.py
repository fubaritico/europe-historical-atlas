"""Resolve Cliopatria's stacked drawings of one year: where two drawings valid that year overlap, the one whose period
starts later wins, and the older loses the part it covers.

Why (the dev, 2026-11-02, comparing with YearMaps): each Cliopatria row is one drawing valid for a period — 49 of the
139 valid in 1100 are valid for more than a century (Kievan Rus' drawn once for 1040-1235) — so a year picks up
drawings of several epochs, stacked. The rule uses nothing but the rows' dates.

Before cutting, a newer drawing lying mostly (>= 80 %) inside an older one names that older polity its suzerain
(`SuzerainHint`): Kievan Rus' over its principalities becomes their suzerain, not a layer under them.

Run (needs shapely: python3 -m venv <venv> && <venv>/bin/pip install shapely):
  <venv>/bin/python files/spikes/cliopatria-import/resolve.py <cliopatria.geojson> <out.geojson> [year] [land] [lakes]
with land / lakes = files/spikes/fetch-land/out/ne_10m_land.geojson / ne_10m_lakes.geojson to take the coasts from them.
then convert.ts on <out.geojson>.
"""

import json
import sys

from shapely.geometry import mapping, shape
from shapely.validation import make_valid

source, out = sys.argv[1], sys.argv[2]
year = int(sys.argv[3]) if len(sys.argv) > 3 else 1100

features = json.load(open(source))["features"]
rows = []
for feature in features:
    p = feature["properties"]
    if feature["geometry"] is None or not (p["FromYear"] <= year <= p["ToYear"]):
        continue
    if p["Type"] != "POLITY" or p["Name"].startswith("("):
        continue
    geometry = make_valid(shape(feature["geometry"]))
    rows.append({"feature": feature, "geometry": geometry, "start": p["FromYear"]})

# Newest drawings first: each one is cut out of every older drawing it overlaps.
rows.sort(key=lambda row: -row["start"])
hints = {}
cut = 0
for i, newer in enumerate(rows):
    for older in rows[i + 1:]:
        if older["start"] >= newer["start"] or older["geometry"].is_empty:
            continue
        if not newer["geometry"].intersects(older["geometry"]):
            continue
        overlap = newer["geometry"].intersection(older["geometry"]).area
        if newer["geometry"].area > 0 and overlap / newer["geometry"].area >= 0.8:
            hints.setdefault(newer["feature"]["properties"]["Name"], older["feature"]["properties"]["Name"])
        older["geometry"] = make_valid(older["geometry"].difference(newer["geometry"]))
        cut += 1

# The coasts: each polity cut by Natural Earth's land minus its lakes (public domain, the source the land mask comes from),
# so the coasts and the islands are Natural Earth's, not Cliopatria's coarse ones. An island no polity covers goes to the
# nearest polity within 30 km; farther, it is left unclaimed and listed — the dev decides when cleaning the coasts.
if len(sys.argv) > 5:
    from shapely.geometry import box as make_box
    from shapely.ops import unary_union
    from shapely.strtree import STRtree

    frame = make_box(-45, 11, 78.75, 77)
    land_parts = [make_valid(shape(f["geometry"])).intersection(frame) for f in json.load(open(sys.argv[4]))["features"]]
    lakes = unary_union([make_valid(shape(f["geometry"])) for f in json.load(open(sys.argv[5]))["features"]]).intersection(frame)
    land = make_valid(unary_union([p for p in land_parts if not p.is_empty]).difference(lakes))
    for row in rows:
        if not row["geometry"].is_empty:
            row["geometry"] = make_valid(row["geometry"].intersection(land))
    claimed = unary_union([row["geometry"] for row in rows if not row["geometry"].is_empty])
    islands = [g for g in getattr(land, "geoms", [land]) if g.geom_type == "Polygon" and not g.intersects(claimed)]
    owners = [row for row in rows if not row["geometry"].is_empty]
    tree = STRtree([row["geometry"] for row in owners])
    given, left = 0, []
    for island in islands:
        nearest = owners[tree.nearest(island)]
        degrees = island.distance(nearest["geometry"])
        if degrees * 111 <= 30:
            nearest["geometry"] = make_valid(nearest["geometry"].union(island))
            given += 1
        else:
            c = island.representative_point()
            left.append(f"{c.x:.2f},{c.y:.2f} ({island.area * 111 * 111:.0f} km², {degrees * 111:.0f} km from {nearest['feature']['properties']['Name']})")
    print(f"coasts from Natural Earth; islands no polity covered: {len(islands)}, given to the nearest within 30 km: {given}", file=sys.stderr)
    print(f"left unclaimed ({len(left)}): " + "; ".join(sorted(left)[:40]), file=sys.stderr)

kept = []
vanished = []
for row in rows:
    geometry = row["geometry"]
    polygons = [g for g in getattr(geometry, "geoms", [geometry]) if g.geom_type == "Polygon" and g.area > 1e-6]
    if not polygons:
        vanished.append(row["feature"]["properties"]["Name"])
        continue
    from shapely.geometry import MultiPolygon

    properties = dict(row["feature"]["properties"])
    if properties["Name"] in hints:
        properties["SuzerainHint"] = hints[properties["Name"]]
    kept.append({"type": "Feature", "properties": properties, "geometry": mapping(MultiPolygon(polygons))})

json.dump({"type": "FeatureCollection", "features": kept}, open(out, "w"))
print(f"drawings valid in {year}: {len(rows)}; cuts made: {cut}; kept: {len(kept)}", file=sys.stderr)
print(f"vanished, wholly covered by newer drawings: {', '.join(vanished) or 'none'}", file=sys.stderr)
print(f"suzerains from the stacking: {len(hints)}", file=sys.stderr)
for vassal, lord in sorted(hints.items()):
    print(f"  {vassal} -> {lord}", file=sys.stderr)
