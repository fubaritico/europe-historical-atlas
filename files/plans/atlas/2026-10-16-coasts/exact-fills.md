# Exact fills — the atlas paints polities from their outlines, not from a grid (2026-10-16)

**Why**: on an authored year the border line is exact (`exactBordersOf`) while the fill goes through a 1.9 km
grid and a baked texture, so at close zoom the colour stops a cell short of — or spills a cell past — the line
(the dev's Lorraine screenshots, 13:44 → 14:05). Measured: the grid itself agrees with the line (p50 0 km,
p99 3.8 km); what shows is a cell of grid plus a texel of texture plus bilinear blur. No resolution fixes it.

**Decision (dev, 14:15)**: paint the fills as geometry cut from the same outlines as the lines.

## Steps — each tested and committed alone

1. **`core/pipeline/fillTriangles`** — pure, no dependency. Whole interior cells are the relief's own two
   triangles; a cell a ring edge crosses is cut plane by plane along every edge through it, pieces kept by
   the even-odd rule — exact even on rings that cross themselves (`earcut` was tried first and was wrong
   there, then removed). Grid split = three's `PlaneGeometry`: quad `(ix, iy)` → `(a, b, d)` and
   `(b, c, d)`, diagonal `s + t = 1` in cell coordinates. Measure: triangle count and time on `years/1100`.
2. **atlas** — heights per triangle plane (not bilinear: the fill must lie *on* the terrain's triangles),
   one mesh per polity colour group, `polygonOffset` against z-fighting, colour composited `overlay` on the
   bare baked terrain like the Cartographer; the bake drops the political tint for an authored year.
3. **coast** — the fill is clipped where the mask says sea (the baked texture's alpha carries coverage).
4. **dev** — compare with the Cartographer; tune the blend strength.

Payload years (GPL, per century) keep the grid path; the exact path is for authored years only.

## Costs measured before starting (years/1100)

137 polities, 28 225 ring vertices. On the 1280 grid: 139 535 inside cells + 20 786 edge cells →
**~0.45 M triangles, ~16 MB** of positions, against the relief's ~3 M triangles.

## Step 1 — measured (2026-10-16, years/1100, 1280 grid)

- **0.44 M triangles in ~170 ms**; the area matches a fine even-odd sampling of every polity.
  (First version with `earcut`: 1.15 M triangles, then 0.60 M, and wrong on self-crossing rings.)
- **19 polities have a ring that crosses itself** — a drawing slip, to fix in the Cartographer. Near the
  crossing the fill follows the even-odd rule exactly, as the editor does — so these show there as they
  show in the Cartographer, holes where the ring folds over itself:
  Roman Empire (15.46E), Deheubarth (−3.59E), Hungary (22.20E), Croatia (15.39E, 14.96E), León and
  Castile (−8.63E), Gabès (10.09E), Amalfi (14.55E), Empire of the Romans (26.29E, 23.91E), Ani (44.94E),
  Tashir-Dzoraget (45.00E), Connacht (−9.89E, −8.20E), Moray (−4.13E, −3.91E), Strathclyde (−3.12E),
  Sweden (17.77E), Norway (11.77E), Galloway (−4.96E), Mann and the Isles (−4.65E…, 8 crossings),
  Livonians (26.60E, 25.80E), Abbasid Caliphate (43.93E).
  The Cartographer could flag a self-crossing ring on closing it — that is `H-46` (validation of a laid
  outline), already open in `s99`.

## For step 2 — from the review of step 1

- **Prove the split in the atlas** (ARCH-003): a test that builds a real `PlaneGeometry(segX, segY)` and
  checks that a whole cell's two fill triangles are the geometry's own two (index buffer `a, b, d` /
  `b, c, d`, uv `v = row / segY` north→south). `core` cannot import three, so the check lives there.
- **Worker** (ARCH-004): key the results by polity id, transfer the buffers.
- Heights on the triangle's **plane**, not bilinear (`meshSurfaceY` is bilinear).
- **Share the even-odd step** (re-review ARCH-013): `crossesRay` here and `crosses` in the Cartographer's
  `geometry/fillHit.ts` are two copies of one rule, in different float orders. Once the fill draws, put one
  in `core/geo` and have both use it, with a test that both agree on a shared fixture.
- **Hostile year files** (re-review SEC-009/010): a cell crossed by thousands of edges, or a ring of
  millions of zigzagging vertices, would freeze the compute. Today the files are the dev's own; the
  day years come from elsewhere, validate ranges and counts at the reader — refuse or degrade is the dev's
  call (`rules/error-handling.md`).

## Step 2 — built (2026-10-16), awaiting the dev's eye

- `atlas/scene/fillLayer.ts`: heights on the relief's triangle planes (raycast-tested against the real
  `PlaneGeometry`), one mesh, `FILL_RENDER_ORDER` 1, `FILL_POLYGON_OFFSET` −1/−4, the tint blended in a
  shader over the baked terrain with the bake's four formulas in sRGB (`MODE_INDEX` ties the numbering).
- The bake drops the tint (`politicalStrength 0`) whenever `paintsExactFills`; `exactFills` in the panel
  switches back to the grid path for comparison.
- `rebuildSurface` rebuilds the relief and everything laid on it; the cut is cached per year and grid.
- **Open, by decision**: the blend now sits *over* the hillshade (the bake put it under). That is what the
  Cartographer does, so the two agree; `normal` therefore paints the shading out. To judge on screen.
- **Open**: lines are draped bilinearly (`meshSurfaceY`) while fills sit on the triangle planes; the depth
  bias and the polygon offset absorb the difference. One shared height function later (review ARCH-104).
- **Open**: the cut runs on the main thread (~170 ms per year or grid change); the worker later.

## Step 2b — the lines follow the relief (2026-10-16, 16:40)

The dev, with exact fills on: *« beaucoup plus propre »*, but the borders still miss the colours, *« à cause
du relief »*. Cause: a border segment was one chord between two anchors; on 1100, 15 % are longer than a
relief cell (p50 3.2 km, p90 12.4 km, p99 52 km), floating over valleys and sinking under hills.
`core/pipeline/gridDrape.splitAtGrid` cuts every segment at the cell edges and diagonals; `meshSurfaceY` is
planar (`planeHeight`, moved to core) — ARCH-104 closed. Rivers and borders take `projection.split`; the
coastline does not (its segments come from the mask grid, short) — pass it if a coast chord ever floats.
Verdict: *« là, on est avec les grands »*.
