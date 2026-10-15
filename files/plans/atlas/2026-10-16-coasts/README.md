# The atlas draws an authored year's coasts dirty — the dev, 2026-10-16 00:30

> *« C'est vraiment pas propre du tout […] de gros problèmes au niveau du rendu des côtes. C'est très sale. »*

Five screenshots, taken after the evening's commits (`fddfe5a`):

- four from the atlas at year 1100 (`00.31.55`, `00.32.03`, `00.32.19`, `00.32.35`);
- one from the Cartographer, showing the same year as it was drawn (`00.33.37`).

**The PNGs are not committed** (12 MB, local only). Only this note is.

## What the screenshots show (first reading, nothing measured yet)

1. **The fills do not stop at the coastline.** Corsica, Sardinia, Sicily, Greece and Anatolia show a ragged, blotchy
   coloured edge that spills into the sea. The brown coastline line runs beside it, not along it. In the Cartographer
   the same islands are clean (`00.33.37`).
2. **Coloured land looks puffed up at the shore.** Small coloured islands (the Balearics, Sicily, Corsica) look like
   swollen blobs: the relief seems lifted under the tint up to the colour's edge, rather than up to the land mask's edge.
3. **Stair-steps along the borders and coasts.** The tint is a raster: `rasterScale` cells, baked into the texture.
   The exact lines drawn on top (`atlasBorders`) do not hide the steps of the colour underneath.
4. **The dev panel reads `snap to coast (cells) 12`**, even though `politicalRequest` sends `0` for an authored year.
   Check that the slider shows a value the compute ignores, and does not apply it.
5. **The tribes are still filled** (the Baltic, the steppe) — expected, the step after this one (`known-issues`).

## Where to look first

- `packages/atlas/src/mapPipeline.ts`, `politicalRequest`: `rasterScale`, `snapToCoast: 0`, `borderSmoothing`.
- `packages/core/src/pipeline/inlineCompute.ts`: rasterise → expand → colours → bake. How a cell is coloured where a
  ring crosses the sea, and whether the land mask clips the tint.
- `packages/core/src/data/regionRaster.ts`: the rasterisation of the authored rings, at what resolution.
- The bake (`terrainCompose`): whether the tint is masked by the land mask, the way the Cartographer's `overlay`
  fill is clipped by its backdrop.

**Remedy, to be measured before being chosen**: clip the tint by the land mask at bake time; raise the raster
resolution for an authored year, or draw the fills as vectors the way the borders are already drawn
(`exactBordersOf`). Compare screenshot for screenshot against the Cartographer's.
