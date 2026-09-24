# terrain-bitmap — bake the painted terrain to a PNG, outside the browser

## What it probes

Can the atlas's **painted** texture — parchment, hypsometric tint, hillshade, vellum grain — be produced
in Node, so the Cartographer's interface can be designed **over the real backdrop** rather than over grey?

Not to be confused with [`dem-to-bitmap`](../dem-to-bitmap/), which writes the greyscale DEM as an
inspection artefact. This one writes the map as the reader sees it.

## Run it

```bash
node files/spikes/terrain-bitmap/terrain-bitmap.mjs
# → files/spikes/terrain-bitmap/out/europe-terrain.png   2560×2328, ~1.8 s, 479 rivers

node files/spikes/terrain-bitmap/terrain-bitmap.mjs --supersample 3 --max-rank 2 --out /tmp/big.png
node files/spikes/terrain-bitmap/terrain-bitmap.mjs --rivers off
```

| flag | default | effect |
|---|---|---|
| `--supersample` | `DEFAULT_TERRAIN_OPTIONS.supersample` (2) | resolution only, never colour |
| `--rivers off` | rivers on | drop the river network |
| `--max-rank` | 9 (all) | keep only rivers at or above a Natural Earth `scalerank` |
| `--reference-width` | 1440 | the display width the stroke widths are meant for |
| `--out` | `out/europe-terrain.png` | output path |

With no flag the terrain uses `DEFAULT_TERRAIN_OPTIONS` and the rivers use `DEFAULT_RIVER_PARAMS` — the
dev-tuned defaults baked into the source, read rather than copied, so this cannot drift from the app.

## The rivers

They are **not** in the texture: the atlas draws them as 3D lines over it, so they are rasterised here.
Three things make that faithful rather than approximate:

- rivers are stored in the same normalized `(u, v)` space the compositor works in, so **there is no
  projection step** and nothing to get wrong;
- `extendRiversToSea` is applied exactly as the app applies it — Natural Earth stops at the estuary head,
  and without this the Loire, the Seine and the Garonne end short of the coast;
- widths are interpolated between `widthMajor` and `widthMinor` across ranks 1…9, as the app does.

**Stroke widths are declared in CSS pixels on screen**, which only means something against a display
width — hence `--reference-width`. At the default 1440, a 2560 px image scales strokes by 1.78, so the
lines read as they do in the app rather than as hairlines.

**Coverage is accumulated, then blended once** (`rasterise-lines.mjs`). Blending each segment in turn
darkens every joint into a string of beads, because consecutive segments overlap. One maximum-then-blend
pass also draws confluences and crossings at even weight.

### The one honest difference from the screen

The app reveals rivers **by zoom**: with `revealStart 0` and `revealEnd 0.8`, a continent-wide view shows
only the major ranks, and the tributaries appear on approach. This PNG draws every rank at once, which is
what a design backdrop wants. For a frame that matches a zoomed-out screen, pass `--max-rank 1` or `2`.

## What we concluded

- **It works with no build step and no new dependency.** `pipeline/composeTerrainRgba` is pure — no DOM,
  no three.js, enforced by that layer's ESLint boundary — so Vite's Node API loads the project's own
  TypeScript and the spike exercises the *real* compositor rather than a copy that could drift. `pngjs`
  was already a dev dependency.
- **The PNG is what the screen shows.** `wrapTerrainTexture` sets `SRGBColorSpace` on the `DataTexture`
  (`src/scene/terrainTexture.ts:29`), so three decodes and re-encodes and the round trip is neutral.
  Verified rather than assumed — the recorded `vertexColors` colour-space bug affects `graticuleFrame` and
  `mapEdge`, which have no such conversion, and not this path.
- **No political tint**, on purpose: the Cartographer's default backdrop is the terrain with no polity
  colours. `composeTerrainRgba` is called without an `areaTint`.
- **Two `×4` exist in this project and are unrelated**: `rasterScale` 4 is the *political* grid (1.9 km
  cells); `supersample` 2 is the *texture*. Changing one does not touch the other.
- Measured: supersample 1 → 1280×1164 (7.6 km/px), 2 → 2560×2328, 3 → 3840×3492. WebGL2 only guarantees a
  2048 px texture, which is why the app does not default higher — but a PNG on disk has no such limit.

## Gotcha

Vite crawls the whole `root` for dependency discovery, and this repo vendors three.js under `opensrc/`
with hundreds of examples importing packages we do not have. Without
`optimizeDeps: { noDiscovery: true }` the run still succeeds but prints a wall of *"are they
installed?"*.
