# Spike — fetch-dem

## Question

Can we source a **georeferenced heightmap** of Europe **programmatically** (no API key), in a **known
projection**, so historical GeoJSON can later overlay it — and does it look as good as (or better than)
the hand-collected `files/resources/blender/europeelevation.png` (whose CRS is unknown)?

## Approach

Download **Terrarium terrain tiles** (AWS Open Data, `elevation-tiles-prod`), decode the RGB-encoded
elevation (`(R*256 + G + B/256) - 32768` metres), stitch the tiles into one grayscale heightmap PNG, and
report the exact geographic bounds. Native CRS = **Web Mercator** (standard XYZ tiles) → known + exact bbox.

## Run (from repo root)

```bash
node files/spikes/fetch-dem/fetch-dem.mjs               # defaults: zoom 5, Europe bbox
node files/spikes/fetch-dem/fetch-dem.mjs --zoom 6      # more detail (~4× tiles)
node files/spikes/fetch-dem/fetch-dem.mjs --west -25 --south 34 --east 45 --north 72 --zoom 5
```

- Dependency: `pngjs` (already a devDependency at repo root).
- Output: `files/spikes/fetch-dem/out/europe-dem-z<zoom>.png` + printed stats (elevation min/max, land
  max, covered lon/lat bounds).

## Normalization

Sea (elevation ≤ 0) → black; land linear `0..maxLand → 1..255`. Simple first pass — a gamma/curve to lift
lowlands and a coastline/water treatment come later, in the app.

## Findings (2026-09-12, zoom 5)

- ✅ **Works, no API key.** 56 tiles → 2048×1792 PNG. Geographically correct (Iceland, Scandinavia, Alps,
  Anatolia, Caucasus). Covered bounds (Web Mercator, tile-aligned): **W −33.75 / S 31.95 / E 56.25 / N 74.02**.
- Elevation range **−6246 m … 4441 m** (Terrarium includes bathymetry; sea clamped to black here).
- **Linear normalization = far too dark** (Europe is mostly lowland → crushed to near-black). **Fix = a
  gamma tone curve**: `g = (elev/maxLand)^gamma`. `gamma 0.45` makes the plains fully readable — quality
  on par with / better than `europeelevation.png`, **and it is georeferenced** (the decisive advantage:
  historical GeoJSON can overlay it). Compare `out/europe-dem-z5.png` (linear) vs `out/europe-dem-z5-g0.45.png`.
- **Web Mercator distortion** (Scandinavia stretched vertically) is visible but acceptable for now;
  reprojecting to equirectangular is a later option for trivial lon/lat overlay.

## Conclusion / recommendation

**Adopt the Terrarium-sourced DEM as the foundation** (georeferenced, known bbox, tunable curve). Tune
`gamma` (~0.45–0.5) + vertical exaggeration in the app. Bathymetry is available if we ever want undersea
relief. Consider a higher zoom (6) once wired, for more detail. This validates the "source a georeferenced
DEM now" decision.

## Status

**done** → next: graduate into the app relief pipeline (Phase 0.1 / Milestone 1.1), reading the elevation
directly (not the tone-mapped PNG) so gamma/exaggeration stay live-tunable.
