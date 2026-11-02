# A year in two seconds — the load and the change of year, measured — ATLAS-333

> The dev, 2026-11-02: *"my obsession is that we have something ultra-performant by the end of this day."* The ticket's
> criteria: the published atlas shows its map in under two seconds; a change of year shows the new map in under two
> seconds.

## Measured, 2026-11-02 afternoon

**Method**: a temporary Vitest file (jsdom, never committed) running the application's own steps on the real files —
the z6 DEM, the land mask, `years/1100/` (the dev's, 8,418 anchors, re-exported from Cliopatria without Natural Earth's
coasts) and `years/1200/` (5,568) — through the inline compute, each step timed with `performance.now`. **Node, not the
browser**: the absolute numbers will differ in Chrome; the ranking is what this table is for.

| step | 1100 | 1200 | when | thread in the browser |
| --- | --- | --- | --- | --- |
| relief and mask, read | 12 ms | 12 ms | startup | main |
| **bake #1**, the bare terrain | **4,161 ms** | 4,007 ms | startup | worker |
| the year, read and projected | 31 ms | 23 ms | each year | main |
| **`computePolitical`** — the 4× grid rasterised, grown, traced | **1,616 ms** | 1,616 ms | each year | worker |
| `settleYearBorders` — exact lines from the anchors | 46 ms | 35 ms | each year | main |
| **bake #2**, *with `politicalStrength: 0`* | **4,162 ms** | 4,213 ms | each year | worker |
| the relief mesh | 1,324 ms | 1,301 ms | startup | main |
| the fills cut on the relief | 330 ms | 304 ms | each year | main |
| the border lines | 86 ms | 94 ms | each year | main |
| the names (three levels) | ~2.5 s, measured 29/10 | | each year, after the map | names' worker |

## What the numbers say

1. **On an authored year, a change of year bakes the very texture the startup already baked.** `rebuildTexture` sets
   `politicalStrength: 0` whenever the fills carry the colour (`paintsExactFills`), so bake #2 is pixel for pixel bake #1
   — about two thirds of a change of year, for nothing.
2. **On an authored year, `computePolitical` computes nothing the map uses.** Its tints are the colours the request gave
   (`givenColours`), its traced lines are replaced by the exact ones (`settleYearBorders`), and the grid it installs only
   tints a bake run at strength 0. Its one consumer is `stages/political.ts:61`; `deriveBorders` is refused on an
   authored year already (`mapPipeline.retraceBorders`). The grid path stays for the dev panel's *exact fills* off.
3. What is left on a change of year is ~0.5 s of main thread (read, lines, fills, borders), then the names.

## The order of work

| # | what | expected | ticket |
| --- | --- | --- | --- |
| 1 | **an authored year skips `computePolitical` and bake #2**: the colours from `authoredRegionColours`, the startup's texture kept; the installed grid cleared, so a later bake with *exact fills* off never paints a stale year | a change of year ~6 s → ~0.5 s + names | ATLAS-333 |
| 2 | **the names kept per year**: a year seen once comes back without its 2.5 s; then whether to place them at build time | going back to a year: instant | ATLAS-333 |
| 3 | **measure in the browser**, production build, the dev's machine — the startup's real split (bake #1, mesh, shaders) | the startup's ranking, true | ATLAS-333 |
| 4 | the startup: **the bare terrain baked at build time** (an image shipped) instead of 4 s at each visit; the relief mesh off the main thread | the relief in well under 2 s | ATLAS-333, ATLAS-166 (the sheet, same move) |
| 5 | the fills and the lines cut in the worker — the 0.4 s freeze left on a change of year | no freeze | ATLAS-146 |
| 6 | the neighbouring year read ahead, while the reader looks at this one | a change of year with no wait for the files | ATLAS-333 |

Steps 1 and 2 need no decision of the dev's beyond this order: nothing visible changes, only what is computed twice.
Step 4 ships a baked image: what it weighs on the wire against 4 s of CPU is measured at step 3 before it is chosen.

Related, not speed of a year: ATLAS-304 (frames per second), ATLAS-305 (quality levels), ATLAS-319 (the names' font,
23 → 12 kB).
