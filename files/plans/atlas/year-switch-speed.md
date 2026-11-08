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

## Measured again, 2026-11-08 — the Cliopatria 1100, 44,150 anchors, 107 polities

The dev's target, the same night: **under a second, and lower still**. Node, the real files, the relief at its 1280
segments:

| step of a change of year | time |
| --- | --- |
| exact borders (`settleYearBorders`) | 0.19 s |
| border lines | 0.25 s |
| the fills' cut (`fillTriangles`) | 0.36 s warm, ~1 s cold (the first year) |
| the fills' buffers and the tribes | 0.30 s |
| **the names** | **~2.5 s** (29/10) |

**Baking the fills at the build does not pay**: the cut's output is 870,000 triangles, 21 MB raw, 3.3 MB gzipped — as
long to download as to compute. **Baking the names does**: 2.5 s of placement for a 216 kB file (82 kB gzipped).

**Done the same night** — the names baked at the build: `bake/namesBake.ts` (a Vite plugin, `vite build` only) places
every year of the manifest and writes `years/<year>/names.json` into the site; the page lays them when their key is its
own (`namesKey`), places them live otherwise, said in the console. The letters measured from the `.woff2` by `fontkit`,
checked against Chrome's `measureText` on the 57 characters of 1100: advances and ascents identical, the descent of « K »,
« A », « h » off by ≤ 0.028 em — 3 names of 197 (Antioch twice, Arles) 2 % larger, at the same place.

## The order of work

| # | what | expected | ticket |
| --- | --- | --- | --- |
| 1 | **an authored year skips `computePolitical` and bake #2**: the colours from `authoredRegionColours`, the startup's texture kept; the installed grid cleared, so a later bake with *exact fills* off never paints a stale year | a change of year ~6 s → ~0.5 s + names | ATLAS-333 |
| 2 | **the names kept per year**: a year seen once comes back without its 2.5 s; then whether to place them at build time | going back to a year: instant | ATLAS-333 |
| 3 | **measure in the browser**, production build, the dev's machine — the startup's real split (bake #1, mesh, shaders) | the startup's ranking, true | ATLAS-333 |
| 4 | the startup: **the bare terrain baked at build time** (an image shipped) instead of 4 s at each visit; the relief mesh off the main thread | the relief in well under 2 s | ATLAS-333, ATLAS-166 (the sheet, same move) |
| 5 | the fills and the lines cut in the worker — the 0.4 s freeze left on a change of year | no freeze | ATLAS-146 |
| 6 | the neighbouring year read ahead, while the reader looks at this one | a change of year with no wait for the files | ATLAS-333 |
| 7 | **the names baked at the build** (2026-11-08) — done; step 4's bake of the terrain is the same move | the names with the map, not 2.5 s after | ATLAS-333 |

**After 2026-11-08's measures, the order is 7 (done), then 5 with a faster cut** (typed arrays instead of growing lists;
the fills and lines off the main thread, ~0.5 s and no freeze), **then 6** (the neighbouring year prepared ahead: a change
under 0.2 s when it is ready).

## The slider — a map ready before the reader reaches it (the dev, 2026-11-08)

> The dev, the same night: *« il va y avoir la frise synchronoptique, et quand on va déplacer la réglette, il faut qu'on
> ait un rafraîchissement de la carte qui soit acceptable »* — and *« faut penser à long terme »*: not only centuries,
> **emblematic years too**, so many maps, never a handful.

**The rule of which map a date shows** — his words: *a map stays until another map's date is reached.* At 1150 the map is
1100's. **Going back** below the shown map's year switches at once to the map before, and starts preparing the one before
that; **going forward** prepares the maps ahead. Today `centuryOf` rounds to the nearest century (1150 → 1200): wrong
by this rule, replaced.

So the target is no longer *a year computed fast* but **a year already prepared when the slider reaches it**. Three
parts, all three asked for:

| # | what | expected |
| --- | --- | --- |
| A | **the map of a date and the maps to prepare** — pure, in core: the latest map year at or before the date; the maps to prepare, the next in the slider's direction first, then the other side | his rule held; the order of preparation decided in one place |
| B | **a year prepared off the main thread** — the cut, the borders, the tints, as typed arrays, in a worker, the cut itself faster (typed arrays instead of growing lists) | a map not yet prepared: ~0.5 s, and the slider never frozen |
| C | **the cache** — prepared years kept under a memory budget, measured in bytes, the oldest seen dropped first, never the shown map and its neighbours; the shown map's layers built from it; while the slider moves, the last ready map shown, the newest asked for wins | a map already prepared: one frame |

**Done, 2026-11-08 — C, its first half**: a year left is set aside whole (`scene/layers/yearShelf.ts`) — its countries,
tribes, borders and names off the scene but kept, under a stamp of the settings, relief and texture — and comes back in a
frame; the shown year plus four aside. Tried by the dev on the built site: *« le cache fonctionne mieux, aucun
problème »*. Left: the years ahead prepared, and what the GPU's memory allows (measured in Chrome).

**D — a loading bar that measures** (the dev, same night: *« est-ce qu'on peut streamer et avoir le progrès réel de ce
qui se passe ? »*; the mock-up `1b · Écran de chargement` — the step's name, the bar, a percentage). Today the bar's shares
are guesses (`STARTUP_SPLIT`, 60 % the year, 35 % the names — gone in an instant since the names are baked), it stands
still through the 2 s of cut and borders on the main thread, and the splash before it measures nothing. So:

1. **every step counts its own units, known ahead** — bytes to download, polities to cut, border groups, bake rows — and
   says *done / total*; a file's true size written by the build (the server's `Content-Length` is the compressed one);
2. **each step weighed by its measured time**, not a guess; their sum is the percentage;
3. **the heavy work off the main thread** (B), sending its counts — or the bar cannot repaint at all;
4. **one bar from the splash on**, the relief included, as in the mock-up.

Order: B first — without it the bar stays still whatever it measures — then D.

**The sequence, decided by the dev on 2026-11-08** (*"the sequence must be exactly the one in the screens Claude Design
made"* — `1b · Écran de chargement`, then `2 · L'atlas au repos`): **the splash stays until the first map — 1100 by
default — is wholly laid** (countries, borders, names, cities and events), its bar counting the real progress from the
first byte, the relief included; then it gives way straight to the atlas at rest. Today it is dismissed once the relief
is built (`loading/stages/startup.ts`, `ui.dismissSplash()` before the year), and a second bar runs over the bare
relief: **the bare relief is never shown alone, and there is one bar, never two.** This holds whatever the optimisations.

**Open, the dev's to decide when the frieze reaches it**: a date before the first map (no map yet drawn there) — the
bare relief, or the first map. Not reachable today: the year switch offers drawn years only.

## Where we stopped — 2026-11-08, 05:00 (the resume point of this work)

**Worktree** `.claude/worktrees/baked-years`, branch `atlas-baked-years`, based on main `04aed22`; committed there:
`1dbb65e` (names baked at the build), `d24b9e0` (the shelf). **Not merged into main.** **Uncommitted, gate green**
(atlas 1560 · core 1890 · Cartographer 2779 · CMS 372 · plugin 169; worker chunk 38.66 kB, no three.js):

- **B, first step**: the countries' cut (`FillCompute.cutFills`) and the tribes' cut (`TribeCompute.cutTribes`, `tribePatches.ts`
  moved to `core/pipeline/`) run in the worker, in parallel with the bake; their results primed into the layers
  (`primeFillCut`, `primeTribeCut`) before the layers are built.
- **C**: the events go aside with their year (`YEAR_LAYERS` includes `events`) — a return costs ~1 ms of ours, then one
  frame of ~80 ms (the GPU drawing the layers put back).
- **Measures**: `loading/yearTiming.ts`, `performance.measure` entries `atlas year <y> <step>`, readable in Chrome.

**Never commit** the test copy `public/years/1200/` nor the modified `public/years/index.json` — publishing 1200 is the dev's.

**Measured on the built site, first visit to 1200** (a loaded machine, ±30–70 % between runs): the page freezes 1–1.4 s
in one block — the countries' buffers and objects 539–752 ms, the border lines 226–387 ms, the exact borders 80 ms, all
on the main thread; the cut, 392–428 ms, already in the worker.

**Next, in this order** (the dev's « Vas-y » on it):

1. **commit this step on the branch** — the dev said yes, 2026-11-08 (*« c'est ce qu'on doit faire, oui »*), on the
   measures as proof; before the commit, `/review` — many files since `d24b9e0`;
2. the countries' buffers in the worker: send it the relief's heights once (~6 MB, at the relief's load), so it builds the
   position and tint buffers itself;
3. the border lines the same way;
4. the years ahead prepared, in the slider's direction (`core/data/mapOfDate.ts`, `mapsToPrepare`, written, not wired);
5. D, the measured bar — **CARTO-393** (the other instance, worktree `city-status-ring`) already makes the atlas's bar move
   through the relief's composition: read it before starting D, build on it;
6. wire `mapYearAt` in place of `centuryOf` once the dev decides what a date before the first map shows.

**Before merging**: rebase onto main (CMS-391 since: `ContentCity.showInAtlas`, `CONTENT_FORMAT_VERSION` 7, and
CARTO-393 if merged), gate again.

Steps 1 and 2 need no decision of the dev's beyond this order: nothing visible changes, only what is computed twice.
Step 4 ships a baked image: what it weighs on the wire against 4 s of CPU is measured at step 3 before it is chosen.

Related, not speed of a year: ATLAS-304 (frames per second), ATLAS-305 (quality levels), ATLAS-319 (the names' font,
23 → 12 kB).
