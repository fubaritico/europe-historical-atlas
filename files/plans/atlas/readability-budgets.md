# Readability budgets — ESLint size/complexity rules, and the decomposition they force

> Opened 2026-09-17. Trigger: the dev tried to re-read how the map works and could not.
> `src/main.ts` is 951 lines, of which **`bootstrap()` alone is 860** — one closure holding every piece
> of mutable state in the app. This is ARCH-012 (`rules/modular-architecture.md`) arriving as a wall.

## The goal, in the dev's words

> « Le code doit être lisible. Je dois pouvoir naviguer en faisant CTRL-clic. Je dois pouvoir
> comprendre. » — and: « une fonction, ça doit être petit et court et bien nommé ».

The rules below are not the goal. They are the **mechanical tripwire** that makes the goal
non-negotiable, in the same spirit as the layer boundaries already enforced by `no-restricted-imports`.

## The four budgets, and why these numbers

Measured on the real codebase before being chosen (ESLint run with `max: 0` so every function reports
its actual figure), not picked from a style guide.

| rule | value | ESLint default | rationale |
|---|---|---|---|
| `max-lines` | **400**, `skipComments` + `skipBlankLines` | 300, counting everything | see below |
| `max-lines-per-function` | **50**, same skips, source only | 50 | the default; the dev's own instinct |
| `max-depth` | **4** | 4 | the default; 6 spots to fix |
| `complexity` | **10** | 20 | half the default; 15 functions to fix |

### Why `max-lines` skips comments — and why that is not a loophole

This project mandates JSDoc everywhere and comments the *why* densely. Measured:

| file | total | code only |
|---|---|---|
| `main.ts` | 951 | **658** |
| `devParams.ts` | 847 | **558** |
| `regionRaster.ts` | 651 | 358 |
| `terrainCompose.ts` | 625 | 384 |
| `mapControls.ts` | 477 | 308 |
| the three `.test.ts` over 400 | 403–412 | ~330 |

Counting comments would make **deleting a comment** the cheapest way to pass the gate — the rule would
destroy the readability it was bought to protect. `regionRaster.ts` is 39 % comment and exceeds 400 for
*no other reason*. Counting code only lands the rule on exactly the two files the dev complained about,
and nothing else.

### Why tests are exempt from the two line budgets

Not a favour — a technical necessity. `max-lines-per-function` counts **nested functions**, so the arrow
passed to `describe()` is measured as one function: the test suites score 289 / 279 / 258. The 5-level
test policy (`rules/tests.md`) inflates suites by design. Tests stay subject to `complexity` and
`max-depth`, where they were measured at **zero violations**.

### Why `complexity` is not 5

The dev's first instinct was 5. Two reasons it was not taken:

1. **`complexity` does not measure indentation.** It is cyclomatic complexity — execution paths. Each
   `if`, `&&`, `case`, `?:` counts. A perfectly flat function with six sequential `if`s blows past it
   without ever nesting. The rule the dev was describing is `max-depth`, which is now also in.
2. **5 would flag 49 functions**, and the worst offenders are the ones that *should* be branchy: the
   16-case marching-squares switch in `coastlineSource` (25) is the clearest possible way to write that
   algorithm, and splitting it to satisfy a number makes it worse.

10 was chosen over 15: 15 functions to treat instead of 7, accepted deliberately.

### Why `max-lines-per-function` is 50 and not 100

The distribution has a cliff at 99 (584 / 246 / 164, then nothing above 99), so 100 was proposed first
and **rejected by the dev**: four functions of 100 lines is a 400-line file and nothing is gained.

50 is the ESLint default. It hits 16 functions, of which ~9 are `createX` factory closures whose length
is nested methods. That pressure is **exactly what `modular-architecture.md` already demands**:
`createNoticeBoard` (93) contains a 55-line `build` that is pure DOM construction, today unreachable
without mounting the factory; at module level it can be exercised with a literal. Tripwire #1, word for
word.

Where a factory genuinely cannot go under 50 (`createWorkerMapCompute` — message plumbing), the answer
is a **named `eslint-disable` carrying its justification**, visible and arguable, not a soft threshold
that covers everyone in silence.

## Activation mechanism

**The rule applies to all source, with no per-file exemption. Tests are the only exception.**

A dated exemption block was tried first — rules on, non-compliant files named one by one, each split
removing a line — and the dev rejected it on sight: *« la règle s'applique partout, pour tout le monde,
dans le code, sauf pour les tests »*. The block was deleted the same hour it was written.

What that costs, stated plainly so nobody rediscovers it mid-chantier:

- **`pnpm lint` over the whole repo is RED** until the last violation is gone. That is the point: the
  debt lives in the lint output, where it cannot be forgotten, rather than in a config comment.
- **Commits still work file by file.** `lint-staged` runs ESLint on *staged* files only, so a commit that
  makes one file compliant passes its own hook regardless of the rest.
- **`main.ts` is the exception to that.** No intermediate commit can leave it under 400 lines, so its
  decomposition has to land as a single commit rather than in five steps.

## The debt, measured 2026-09-17

### `max-lines` > 400 code lines — 2 files

- `src/main.ts` — 658
- `src/devParams.ts` — 558

### `max-lines-per-function` > 50 code lines — 16 functions

| lines | where | what |
|---|---|---|
| 584 | `main.ts:81` | `bootstrap()` |
| 246 | `controls/mapControls.ts:194` | `createMapControls` |
| 164 | `devPanel.ts:187` | `createDevPanel` |
| 99 | `scene/lineLayer.ts:140` | `createLineLayer` |
| 98 | `pipeline/inlineCompute.ts:82` | `createInlineMapCompute` |
| 93 | `ui/notice.ts:66` | `createNoticeBoard` |
| 87 | `pipeline/workerCompute.ts:79` | `createWorkerMapCompute` |
| 81 | `ui/splash.ts:79` | `createSplash` |
| 77 | `ui/progressOverlay.ts:55` | `createProgressOverlay` |
| 73 | `pipeline/terrainCompose.ts:535` | `composeTerrainRgba` |
| 65 | `data/coastlineSource.ts:97` | `createFieldCoastlineSource` |
| 60 | `data/coastlineSource.ts:101` | its `load()` |
| 60 | `scene/composedLineLayer.ts:256` | `buildBorderStrokes` |
| 59 | `data/regionRaster.ts:448` | `sharedEdges` |
| 55 | `ui/notice.ts:89` | `build` |
| 52 | `data/riverSource.ts:169` | `extendRiversToSea` |

### `complexity` > 10 — 15 functions

| score | where |
|---|---|
| 25 | `data/coastlineSource.ts:101` `load()` |
| 25 | `data/regionRaster.ts:65` `rasteriseRegions` |
| 23 | `data/regionRaster.ts:218` `assignRegionColors` |
| 22 | `scene/composedLineLayer.ts:73` `offsetPolyline` |
| 21 | `pipeline/terrainCompose.ts:535` `composeTerrainRgba` |
| 18 | `controls/mapControls.ts:421` `update()` |
| 16 | `data/regionRaster.ts:158` `expandRegionsOverLand` |
| 14 | `data/heightmap.ts:151` `smoothHeightmap` |
| 14 | `devPanel.ts:187` `createDevPanel` |
| 14 | `scene/lineLayer.ts:140` `createLineLayer` |
| 13 | `scene/compassRoseSvg.ts:108` `buildCompassRoseSvg` |
| 12 | `data/riverSource.ts:205` `extend` |
| 12 | `scene/composedLineLayer.ts:256` `buildBorderStrokes` |
| 11 | `data/regionRaster.ts:620` `trace` |
| 11 | `scene/rhumbNetwork.ts:57` `generateRhumbSegments` |

### `max-depth` > 4 — 6 spots, 2 files

`data/regionRaster.ts` (87 at depth 6; 82, 85, 102, 111 at depth 5) — the scanline fill and the BFS.
`controls/mapControls.ts:447` (depth 5) — edge-scroll.

## Order of work

Each step is its own commit, under the full gate (`type-check && lint && test`) plus `/review`.
**`main.ts` has no tests** — it is the composition root. Its safety net is the type-checker, the
production build, and the dev confirming on screen with `pnpm dev`. Say so before each of its steps.

1. **Rules + exemption block.** No source change. Gate green by construction.
2. **`devParams.ts` → `src/devParams/`**, one file per group (relief, texture, coast, rhumb, river,
   political, rose, extent, camera) behind an index that re-exports. Mechanical, lowest risk, and it
   proves the pipeline before the hard part.
3. **`main.ts`, in extraction steps** — each one an object that *owns its state*, not a slice of the
   closure. Root-level files, following the existing `devPanel.ts` precedent (the composition root may
   import across layers; a new `src/` layer would need its own boundary rule and does not earn one):
   1. `scene/drapeProjection.ts` — `projectToWorld` / `projectDraped`. Pure bilinear maths over the
      mesh's vertex grid, today unreachable without a WebGL context. The textbook ARCH-012 case.
   2. `scene/zoomResponse.ts` — everything the frame loop derives from `controls.zoom` (exaggeration,
      border width scale, inlay and opacity ramps, coastline and rhumb fades). Data in, data out.
   3. `src/mapLayers.ts` — the overlay handles (relief, coastline, rhumb, rivers, borders, rose,
      texture) behind one object with `rebuild*`, `setZoom`, `setResolution`, `dispose`. This is
      tripwire #3: a handle disposed here, resized there and scaled every frame wants to be one object
      with three methods.
   4. `src/mapPipeline.ts` — the compute wiring: worker spawn, `failoverToInline`, `pushSources`, the
      two `latestOnly` gates, `rebuildTexture`, `rebuildPolitical`, `startup` sequencing.
   5. `src/devPanelCallbacks.ts` — the callbacks object and the `logAll` snapshot.
4. **The remaining budgets**, file by file, exemption line by exemption line: `controls/mapControls.ts`,
   `devPanel.ts`, `ui/*`, `pipeline/*`, `data/*`, `scene/*`.

## Done — 2026-09-17

`eslint.config.js` holds **no exemption block at all**, and `pnpm lint` is green across the whole source
with `max-lines` 400, `max-lines-per-function` 50, `max-depth` 4 and `complexity` 10 applied everywhere.
Tests keep their exemption from the two line budgets only, for the `describe()`-callback reason.

Where it landed, measured the same way as the debt above:

| | before | after |
|---|---|---|
| `main.ts` | 642 code lines | **56** |
| `bootstrap()` | 567 | **40** |
| `createMapControls` | 246 | 25 |
| `createDevPanel` | 164 | 15 |
| `composeTerrainRgba` | 73, complexity 21 | a row compositor over four named parts |
| worst complexity | 25 (`coastlineSource.load`) | ≤ 10, and that one is now a 16-row table |
| deepest nesting | 6 (`rasteriseRegions`) | ≤ 4 |
| longest source function | 584 | **50** |
| tests | 482 | **757** |
| source files | 45 | 64 |

### Defects found by the work, not introduced by it

- `createShadeSampler` clamped the indices it read but not the interpolation weight, so a position
  outside the field extrapolated rather than stopping at its edge. A guard that was not one.
- `MapControls.zoom` is an accessor, and object spread *evaluates* accessors — coming through
  `{ ...controlsView(state) }` it flattened into a frozen property and the camera stopped zooming.
  Caught by the existing suite before it could ship.
- `boxBlurAxis`, written during this work, first inferred its axis from the tap spacing, which is wrong
  on a one-column grid where both axes step by one. Caught by its own test.
- `reliefWorldY` reads a NaN elevation as sea level, silently. Recorded rather than changed: this
  refactor was behaviour-preserving and that curve also feeds the mesh.
- Two accessibility defects on the notice board's dismiss button (A11Y-201, A11Y-202).

### Tests, added the same day

All five gaps closed — 757 → 837. Two modules had to be made testable first, and that was the real work:

- `mapPipeline` built its four asset ports by direct import; they are injected now behind
  `MapAssetSources`, each with a working default.
- `viewport` constructed a `WebGLRenderer` unconditionally, which no test environment can provide.
  `RendererHandle` declares the five members it actually uses.
- `devPanel` was recorded as untestable because it imports lil-gui. **That was never checked and was
  false**: lil-gui runs under jsdom once `window.matchMedia` is stubbed. Two sets of sliders were lost to
  a file that was testable all along.

The guard that matters: **every one of the 117 dev-panel controls is moved and must trigger at least one
callback**, against an allow-list of those deliberately inert because the loop reads them every frame.
Verified by breaking a wiring on purpose — it named `revealStart`, the exact shape of both past failures.

### What is still open

- Consider tightening `complexity` below 10 and `max-lines` toward the ESLint default of 300.
- `main.ts` itself has no tests, and at 40 lines of pure wiring that is now a deliberate choice rather
  than an excuse: everything it assembles is covered, and what is left is `new`, `addEventListener` and
  the teardown that undoes them.
