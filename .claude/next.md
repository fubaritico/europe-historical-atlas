# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Full plan: `files/plans/roadmap.md` (chapters).
> This repo is **europe-map** (3D historical atlas, TS + three.js + Vite) — NOT the old fubaritico-ds DS.

## Where we are

`master` at `b8eeaa8` (plus the sense-of-time tooling commit), **351 tests**, full gate green, tree clean.
See `completed.md`, entry **2026-09-16 (midi + soirée)**.

The political borders are finished as a rendering problem: derived from the raster so they cannot
disagree with the colours, gapless by construction, grouped by polity pair, with three drawing patterns
and a different appearance close up than at continent scale. The dev signed it off on screen.

## ▶ NEXT — move the political pipeline into a worker

**Asked for explicitly at the end of the session**, and the seam is already built: the progress overlay
(`src/ui/progressOverlay.ts`) knows nothing of what is being computed, and `rebuildPolitical` is already
sequenced into five announced phases.

**The reason it matters**: the texture bake is a single indivisible synchronous block, so **the bar stalls
at 70 %** and the tab freezes there. Everything before it already yields. A worker is what unfreezes the
one phase that cannot be split on the main thread.

**What makes it tractable** — checked during the session: `createPackedLandMask(meta, bits)` and
`createHeightmap(meta, data)` both rebuild from *plain metadata + a typed array*, which is exactly what a
worker receives as a transferable. No port has to be reshaped.

**How to do it, in order:**

1. Define the port first — `PoliticalCompute { compute(input, onProgress): Promise<Output> }` — with an
   **inline implementation** (today's code) alongside the worker one. The inline one stays the test
   double and the fallback; the worker must be unpluggable.
2. Move rasterise → expand → colours → **texture bake** → border geometry into it. The bake is the point;
   stopping before it leaves the freeze in place.
3. Transfer, do not copy: the mask is 3 MB, the raster 12 MB at 2×, the baked RGBA larger still.
4. `DataTexture` is owned by the renderer — the worker returns the pixels, the main thread wraps them.
5. Then reconsider **4×** (825 ms, 1.9 km cells): it was ruled out only because it blocked.

## Then

- **The brown/cream stroke on two screenshots** — never explained. Two hypotheses left: the panel values
  were not what the code defaults to, or the wide stroke is amplifying the staircase into blocks. Ask for
  `⤓ log ALL settings` next time it shows.
- **The coastal band** (Iceland, Scandinavia, the Caspian) — a one-click test settles it: drop the
  `coastline` layer opacity to 0 and see whether the band goes with it.
- **`double` borders are implemented, tested, and produced by no rule.** All four entries in
  `data/borderStyles` ask for `dashed`. One line of data whenever a pair deserves it.
- **Vector coastline** (`ne_10m_coastline` through the rivers pipeline) — the last open render complaint.
- **M1.4 picking** — and note the design constraint found this session: a click must return a **list**
  from a spatial query, not a single polygon hit, because several events of different types share a place.

## Key facts to reload

- **A border is not an object, it is a relation** — the place where two territories touch. Derive it from
  the fills; never author it separately. Two geometries for one object is what produced the gaps, and
  simplifying the line alone reproduced the same failure in a subtler form (rejected on sight).
- **The staircase is a *resolution* problem.** Smoothing shrinks its wiggle, never its amplitude. Only a
  finer raster fixes fill and line together. Measured table in `known-issues.md`.
- **Anything measured in cells must scale with the raster** — `snapToCoast` above all, or its reach in
  kilometres halves silently and the colours stop short of the coastline again.
- **`bootstrap()` is this codebase's modularity sink** (ARCH-012). Layer boundaries police *imports*, not
  *where logic lives*. Pure logic landing in a `bootstrap()` closure is a module that was not written.
- **A flag raised before a synchronous block is a flag nobody sees.** Yield a frame between phases.
- **Across an `await`, control-flow analysis still believes a narrowed flag cannot have changed** — read
  teardown guards through a call, or the linter proves them dead and a refactor removes them.
- **`LineMaterial.linewidth` is a live uniform**, so a width can follow the camera with no rebuild.
  Dash distances are in **world units** and accumulate across the whole buffer without checking that
  consecutive segments touch — so emit segments run by run.
- **OpenHistoricalMap is CC0** (not ODbL), and usable from ~1700: 93.8 % of Europe covered then, 61.8 % at
  1500. Measure coverage by **surface**, never by counting polities.
- **Assets**: `public/heightmaps/`, `public/masks/`, `public/rivers/` committed; `public/borders/*.json`
  git-ignored. **1700 currently holds the OHM payload**, with the `historical-basemaps` original backed up
  at `files/spikes/fetch-ohm/out/europe-1700.hb-backup.json`.
- **`let`-const-ify gotcha**: the eslint `--fix` hook runs after each edit; add a `let` and its first
  reassignment together.

## Conventions (this project)

Docs/config in **English**, chat in **French**. Plans split into chapters (`files/plans/roadmap/`). Spikes
cataloged in `files/spikes/`. Commit subjects lowercase (commitlint). **Announce every command**
(cause / reason / action). **`rm -rf` needs explicit permission every time.**
