# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Full plan: `files/plans/roadmap.md` (chapters).
> This repo is **europe-map** (3D historical atlas, TS + three.js + Vite) — NOT the old fubaritico-ds DS.

## Where we are

Phase 0, M1.1 (relief), M1.2 (parchment terrain), M1.3 (camera), portolan decor — all done. This session
added **rivers**, the **land mask**, **fat lines**, the **declarative tunables**, and a **work-in-progress
political overlay**. `master` at `beb24fc`, **245 tests**, full gate green. See `completed.md`
(2026-09-16 entry).

The map now carries: relief + parchment/hypsometric/snow terrain, a land mask that knows a polder from a
lake, a vector coastline traced through that mask, Natural Earth rivers with zoom LOD, the portolan
decor, and filled historical polities with borders for any century from 100 to 2000.

## ▶ NEXT — finish the political overlay (dev's list, in his order)

It works end to end and looks the part, but the edges are rough. **Four open items**, and the first has a
diagnosis already:

1. **Borders are interrupted.** The dev noticed the gaps cluster in mountains and are almost absent
   across Poland and Russia, and read it as relief cutting the lines. It is not the relief — it is
   **polity size**. `separatesRegions` probes the region raster two DEM cells either side of a segment;
   where states are small and interlocking (the Alps in 1500) the probe lands in a *third* polity or in
   nothing, and the segment is dropped. Plains carry huge blocks, so the probe is reliable there.
   **Fix to try**: derive the borders from the raster itself — emit a segment between any two adjacent
   cells holding different indices — instead of from the polygon rings. Gapless by construction, and it
   follows the fills exactly. Cost: cell-aligned stair-stepping (~7 km) unless smoothed, so compare
   against the current smooth-but-gappy lines before committing to it.
2. **A complete colour set.** `data/regionPalette.ts` is a flat table, one line per power
   (`pattern → color`). Eight powers pinned so far. The dev will bring a real colour code taken from
   historical atlases and strategy games, where the conventions are stable (France blue, England red,
   Spain gold, Austria white, Ottomans green, Russia dark green). Purely a data edit.
3. **Islands are left uncoloured** — the Balearics, the Aegean. `expandRegionsOverLand` is a
   breadth-first walk **over land**, so an island no polygon claims is never reached: BFS cannot cross
   the sea. Needs either a nearest-claim pass that may jump water within a bounded radius, or an
   explicit island-adoption step.
4. **The GPL-3.0 licence decision**, before any of this can ship. See Known Issues.

## Then

- **Vector coastline** (`ne_10m_coastline` through the rivers pipeline) — the last open render complaint;
  a vector line is crisp at *any* zoom, where the current one still inherits a grid.
- **M1.4 picking** — `PickingService` → `{point, faceIndex}`, fly-to arc, Escape to return. The milestone
  that turns the scenery into an atlas. `camera/cameraState` is reserved for it.
- Then labels/typography (a subsystem of its own: SDF fonts, sprite atlas or HTML overlay).

## Key facts to reload

- **A DEM answers "how high", not "wet or dry"** (the session's hard-won lesson). `data/landMask` is the
  port; `createElevationLandMask` is a *documented degraded mode*, not an equivalent. Measured:
  connectivity flood-fill leaves the Netherlands 52% drowned (dikes are narrower than a cell) **and**
  turns the Caspian and Dead Sea into plains.
- **`ne_10m_land` carves no inland lakes** — the mask is land *minus* `ne_10m_lakes`, or the Caspian
  reads as a plain.
- **Anything draped must track `relief.scale.y`** every frame, and must sample the **mesh's** vertex grid
  (`RELIEF_SEGMENTS`, 512) rather than the raw DEM (1280). Miss the scale and it floats by the
  exaggeration ratio; sample the DEM and it sinks below the drawn valley floor.
- **`LineBasicMaterial.linewidth` is 1 px, always** (WebGL). Any controlled width goes through
  `LineSegments2` + `LineMaterial`, whose `resolution` must be updated on every resize.
- **Tunables are declared, not restated**: `TERRAIN_CONTROLS` / `devParams.ts` hold range + step + label
  beside each default, mapped over `keyof T`. Adding an option without describing it **fails
  type-check**. Never hand-write a slider range in `devPanel`.
- **`sea level (m)` no longer moves the coastline** — the mask does. It only sets the hypsometric ramp's
  origin now. Rename or retire it.
- **Assets**: `public/heightmaps/europe-dem-z5.{bin,json}` (committed), `public/masks/europe-land.{bin,json}`
  (committed), `public/rivers/europe-rivers.json` (committed), `public/borders/*.json`
  (**git-ignored, GPL-3.0**). Spikes in gitignored `files/spikes/`.
- **`let`-const-ify gotcha**: the eslint `--fix` hook runs after each edit; add a `let` and its first
  reassignment together.

## Conventions (this project)

Docs/config in **English**, chat in **French**. Plans split into chapters (`files/plans/roadmap/`). Spikes
cataloged in `files/spikes/`. Commit subjects lowercase (commitlint). **Announce every command**
(cause / reason / action). **`rm -rf` needs explicit permission every time** (refused once this session,
rightly).
