# A year in two seconds — the load and the change of year, measured — ATLAS-333

> The dev, 2026-11-02: _"my obsession is that we have something ultra-performant by the end of this day."_ The ticket's
> criteria: the published atlas shows its map in under two seconds; a change of year shows the new map in under two
> seconds.

## Measured, 2026-11-02 afternoon

**Method**: a temporary Vitest file (jsdom, never committed) running the application's own steps on the real files —
the z6 DEM, the land mask, `years/1100/` (the dev's, 8,418 anchors, re-exported from Cliopatria without Natural Earth's
coasts) and `years/1200/` (5,568) — through the inline compute, each step timed with `performance.now`. **Node, not the
browser**: the absolute numbers will differ in Chrome; the ranking is what this table is for.

| step                                                           | 1100                   | 1200     | when                     | thread in the browser |
| -------------------------------------------------------------- | ---------------------- | -------- | ------------------------ | --------------------- |
| relief and mask, read                                          | 12 ms                  | 12 ms    | startup                  | main                  |
| **bake #1**, the bare terrain                                  | **4,161 ms**           | 4,007 ms | startup                  | worker                |
| the year, read and projected                                   | 31 ms                  | 23 ms    | each year                | main                  |
| **`computePolitical`** — the 4× grid rasterised, grown, traced | **1,616 ms**           | 1,616 ms | each year                | worker                |
| `settleYearBorders` — exact lines from the anchors             | 46 ms                  | 35 ms    | each year                | main                  |
| **bake #2**, _with `politicalStrength: 0`_                     | **4,162 ms**           | 4,213 ms | each year                | worker                |
| the relief mesh                                                | 1,324 ms               | 1,301 ms | startup                  | main                  |
| the fills cut on the relief                                    | 330 ms                 | 304 ms   | each year                | main                  |
| the border lines                                               | 86 ms                  | 94 ms    | each year                | main                  |
| the names (three levels)                                       | ~2.5 s, measured 29/10 |          | each year, after the map | names' worker         |

## What the numbers say

1. **On an authored year, a change of year bakes the very texture the startup already baked.** `rebuildTexture` sets
   `politicalStrength: 0` whenever the fills carry the colour (`paintsExactFills`), so bake #2 is pixel for pixel bake #1
   — about two thirds of a change of year, for nothing.
2. **On an authored year, `computePolitical` computes nothing the map uses.** Its tints are the colours the request gave
   (`givenColours`), its traced lines are replaced by the exact ones (`settleYearBorders`), and the grid it installs only
   tints a bake run at strength 0. Its one consumer is `stages/political.ts:61`; `deriveBorders` is refused on an
   authored year already (`mapPipeline.retraceBorders`). The grid path stays for the dev panel's _exact fills_ off.
3. What is left on a change of year is ~0.5 s of main thread (read, lines, fills, borders), then the names.

## Measured again, 2026-11-08 — the Cliopatria 1100, 44,150 anchors, 107 polities

The dev's target, the same night: **under a second, and lower still**. Node, the real files, the relief at its 1280
segments:

| step of a change of year            | time                                    |
| ----------------------------------- | --------------------------------------- |
| exact borders (`settleYearBorders`) | 0.19 s                                  |
| border lines                        | 0.25 s                                  |
| the fills' cut (`fillTriangles`)    | 0.36 s warm, ~1 s cold (the first year) |
| the fills' buffers and the tribes   | 0.30 s                                  |
| **the names**                       | **~2.5 s** (29/10)                      |

**Baking the fills at the build does not pay**: the cut's output is 870,000 triangles, 21 MB raw, 3.3 MB gzipped — as
long to download as to compute. **Baking the names does**: 2.5 s of placement for a 216 kB file (82 kB gzipped).

**Done the same night** — the names baked at the build: `bake/namesBake.ts` (a Vite plugin, `vite build` only) places
every year of the manifest and writes `years/<year>/names.json` into the site; the page lays them when their key is its
own (`namesKey`), places them live otherwise, said in the console. The letters measured from the `.woff2` by `fontkit`,
checked against Chrome's `measureText` on the 57 characters of 1100: advances and ascents identical, the descent of « K »,
« A », « h » off by ≤ 0.028 em — 3 names of 197 (Antioch twice, Arles) 2 % larger, at the same place.

## The order of work

| #   | what                                                                                                                                                                                                                          | expected                                    | ticket                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| 1   | **an authored year skips `computePolitical` and bake #2**: the colours from `authoredRegionColours`, the startup's texture kept; the installed grid cleared, so a later bake with _exact fills_ off never paints a stale year | a change of year ~6 s → ~0.5 s + names      | ATLAS-333                                   |
| 2   | **the names kept per year**: a year seen once comes back without its 2.5 s; then whether to place them at build time                                                                                                          | going back to a year: instant               | ATLAS-333                                   |
| 3   | **measure in the browser**, production build, the dev's machine — the startup's real split (bake #1, mesh, shaders)                                                                                                           | the startup's ranking, true                 | ATLAS-333                                   |
| 4   | the startup: **the bare terrain baked at build time** (an image shipped) instead of 4 s at each visit; the relief mesh off the main thread                                                                                    | the relief in well under 2 s                | ATLAS-333, ATLAS-166 (the sheet, same move) |
| 5   | the fills and the lines cut in the worker — the 0.4 s freeze left on a change of year                                                                                                                                         | no freeze                                   | ATLAS-146                                   |
| 6   | the neighbouring year read ahead, while the reader looks at this one                                                                                                                                                          | a change of year with no wait for the files | ATLAS-333                                   |
| 7   | **the names baked at the build** (2026-11-08) — done; step 4's bake of the terrain is the same move                                                                                                                           | the names with the map, not 2.5 s after     | ATLAS-333                                   |

**After 2026-11-08's measures, the order is 7 (done), then 5 with a faster cut** (typed arrays instead of growing lists;
the fills and lines off the main thread, ~0.5 s and no freeze), **then 6** (the neighbouring year prepared ahead: a change
under 0.2 s when it is ready).

## The slider — a map ready before the reader reaches it (the dev, 2026-11-08)

> The dev, the same night: _« il va y avoir la frise synchronoptique, et quand on va déplacer la réglette, il faut qu'on
> ait un rafraîchissement de la carte qui soit acceptable »_ — and _« faut penser à long terme »_: not only centuries,
> **emblematic years too**, so many maps, never a handful.

**The rule of which map a date shows** — his words: _a map stays until another map's date is reached._ At 1150 the map is
1100's. **Going back** below the shown map's year switches at once to the map before, and starts preparing the one before
that; **going forward** prepares the maps ahead. Today `centuryOf` rounds to the nearest century (1150 → 1200): wrong
by this rule, replaced.

So the target is no longer _a year computed fast_ but **a year already prepared when the slider reaches it**. Three
parts, all three asked for:

| #   | what                                                                                                                                                                                                                                                                                                                                                                                 | expected                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| A   | **the map of a date and the maps to prepare** — pure, in core: the latest map year at or before the date; the maps to prepare, the next in the slider's direction first, then the other side                                                                                                                                                                                         | his rule held; the order of preparation decided in one place |
| B   | **a year prepared off the main thread** — the cut, the borders, the tints, as typed arrays, in a worker, the cut itself faster (typed arrays instead of growing lists)                                                                                                                                                                                                               | a map not yet prepared: ~0.5 s, and the slider never frozen  |
| C   | **the cache** — ~~prepared years kept under a memory budget, measured in bytes, the oldest seen dropped first, never the shown map and its neighbours~~ **three maps, like a video player's buffer: the shown one, the one before and the one after** (see below); the shown map's layers built from it; while the slider moves, the last ready map shown, the newest asked for wins | a map already prepared: one frame                            |

**The window of three maps — the dev, 2026-11-08 evening** (_"you have to have a spirit of compromise: not go all the way
into a principle if we see it will break, but take the best out of it — next, previous, a bit like a video player's
buffer"_). It replaces the memory budget in bytes: WebGL does not tell how much GPU memory is free, so no budget could be
set safely for every machine, and the atlas must run on as many as it can. A year weighs ~55–70 MB on the GPU (an
estimate from the buffers' sizes, after the shared vertices of `43fb59a`): three maps, ~200 MB at worst. **Many maps are
meant** — centuries, emblematic years between them (814, 843, 1066, 1492…), the sequences of a country's focus — so the
window is counted in maps, never in years. Comparing two years to load only what differs was weighed and refused by
him: each year stays independent.

**A map prepared in the background that fails — the dev, same evening** (_"you have to qualify the error before taking a
decision on screen"_): **recoverable** — the network down, no answer, HTTP 5xx, 408, 429 — is **retried until it works**,
waiting longer each time (1 s doubling up to 30 s), at once when the browser says it is back online, given up only when
the map leaves the window; each failure a `console.error` with its cause and attempt. **Irreversible** — a file absent
(404 and the other 4xx), a file that arrived but cannot be read (schema, consistency, semantic), a defect of the compute
— is not retried: a `console.error`, nothing on screen while the reader has not asked for that map; asked, its ordinary
loading meets the same error and tells it (ATLAS-395).

**Done, 2026-11-08 — C, its first half**: a year left is set aside whole (`scene/layers/yearShelf.ts`) — its countries,
tribes, borders and names off the scene but kept, under a stamp of the settings, relief and texture — and comes back in a
frame; the shown year plus four aside. Tried by the dev on the built site: _« le cache fonctionne mieux, aucun
problème »_. Left: the years ahead prepared, and what the GPU's memory allows (measured in Chrome).

**D — a loading bar that measures** (the dev, same night: _« est-ce qu'on peut streamer et avoir le progrès réel de ce
qui se passe ? »_; the mock-up `1b · Écran de chargement` — the step's name, the bar, a percentage). Today the bar's shares
are guesses (`STARTUP_SPLIT`, 60 % the year, 35 % the names — gone in an instant since the names are baked), it stands
still through the 2 s of cut and borders on the main thread, and the splash before it measures nothing. So:

1. **every step counts its own units, known ahead** — bytes to download, polities to cut, border groups, bake rows — and
   says _done / total_; a file's true size written by the build (the server's `Content-Length` is the compressed one);
2. **each step weighed by its measured time**, not a guess; their sum is the percentage;
3. **the heavy work off the main thread** (B), sending its counts — or the bar cannot repaint at all;
4. **one bar from the splash on**, the relief included, as in the mock-up.

Order: B first — without it the bar stays still whatever it measures — then D.

**The sequence, decided by the dev on 2026-11-08** (_"the sequence must be exactly the one in the screens Claude Design
made"_ — `1b · Écran de chargement`, then `2 · L'atlas au repos`): **the splash stays until the first map — 1100 by
default — is wholly laid** (countries, borders, names, cities and events), its bar counting the real progress from the
first byte, the relief included; then it gives way straight to the atlas at rest. Today it is dismissed once the relief
is built (`loading/stages/startup.ts`, `ui.dismissSplash()` before the year), and a second bar runs over the bare
relief: **the bare relief is never shown alone, and there is one bar, never two.** This holds whatever the optimisations.

**Open, the dev's to decide when the frieze reaches it**: a date before the first map (no map yet drawn there) — the
bare relief, or the first map. Not reachable today: the year switch offers drawn years only.

## The maps ahead are not ready when the reader reaches them — 2026-11-10 (ATLAS-396 reopened)

**What the dev sees**: from 1100 to 1200, then 1300 at once — 1300 seems to load from nothing; the same backwards, 1300 →
1200 → 1100. The window aims right (after 1200 going forward: 1300 first, then 1100 — `mapsToPrepare`), so the fault is
in when and how the preparation runs. **Read in the code, not measured in his browser**:

1. **It starts only when the mouse is still.** `mapBuffer.tryOne` waits for `whenQuiet` before anything —
   `app/quietTime.ts:13` counts `pointermove` as a gesture, so 800 ms without moving the mouse, then an idle callback.
   Moving the mouse to the next button postpones it: clicked within two or three seconds, the next map was never started.
2. **A click on a map being prepared starts it over.** The click runs `rebuildPolitical`, a whole load of its own; the
   preparation in flight is not joined, and the two share the one worker — the click waits longer than with no
   preparation at all.

Not measured yet: how long a preparation takes in his browser (in Node: ~1 s on the built site, ~4 s on the dev server,
where the bands and the names are computed live).

**The dev's model, 2026-11-10**: _"this loading should start at once"_, and _"an object that streams — it pauses, it
resumes, so nothing is lost"_. Agreed, applied where a pause means something:

| step | thread | what it becomes |
| --- | --- | --- |
| read the year, settle it, cut the fills, measure the tribes | the worker | **starts at once** when a map is shown, never waits for quiet, runs to its end — it does not touch the page |
| lay it aside: the arrays to the GPU, the layers built (countries, tribes, borders, names) | the page | **a job that pauses and resumes**: cut into small pieces, laid between the reader's gestures; a gesture pauses it, quiet resumes it where it was — nothing done twice |
| the reader asks for a map being prepared | — | **joins the preparation in flight**, from where it stands, instead of a load of its own |

**Decided by the dev, 2026-11-10**: the lay pauses on **a press of the mouse, a click, the wheel and the keyboard** —
not on the mouse moving (`pointermove` leaves the gestures that pause it). The pieces of the lay: the countries, the
tribes, the borders, the names, each in an idle slot. And measured in his browser, on a quiet page — not in an automation
tab at startup, whose 6–12 s of 2026-11-10 counted the cut's wait behind the other work and are void (he lives ~2.5 s).

**The ingredients, in order**: (1) a register of the preparations in flight, beside the shelf; (2) a click reads it — a
map shelved comes back at once, one in flight is awaited and laid, none is loaded whole; (3) the map clicked has
priority — never dropped when the window moves, never waiting for quiet; (4) the preparation in two times, the worker's
part at once, the lay alone waiting; (5) the lay paused and resumed; (6) the preparation's measures in the page; (7) tests
checked against the naive code. Untouched: the window of three maps, its order, the rule of failures.

**Built, 2026-11-10** (worktree `baked-years`, not committed yet):

- **the register** — `loading/computedYears.ts`, in the pipeline's context: a year's read and worker compute
  (`prepareAside.computeAhead`, measured `ahead`) registered under the map's stamp (`MapLayers.yearStamp`, the shelf's);
  let go when the window moves, when the map is set aside, or when it fails;
- **the click joins it** — `political.drawYear` takes the year's compute in flight (measured `join`) instead of fetching
  and cutting again; its read failure told as the year's own error; one started under other settings is let go and the
  year loaded whole;
- **at once** — `mapBuffer.tryOne` no longer waits for quiet; `prepareAside` computes, then waits for quiet before its
  block alone (measured `aside`); a map busy at the end answers `later` and its try again reuses the compute;
- **the gestures** — `app/quietTime.ts`: a press, a click, the wheel, a key; the mouse moving no longer counts; a button
  held keeps the map busy however long (a drag of the map is a press that lasts — the dev's _"mouse down"_). **A press
  counts on the map alone** (the dev, same day, _"target the event"_): the frieze's slider will move by a drag, the button
  held all along — a press on the interface holds nothing off, so the maps keep being laid aside while the slider moves.
  The maps the slider reaches are shown by the click's own path, which never waits for quiet.

**Not built — the lay in pieces (ingredient 5)**: the block cannot be cut as it stands — it sets the map shown aside,
lays the prepared one in the same layers, sets it aside and puts the shown one back, and the screen must never draw in
between (the reader would see the prepared map). Pausing between pieces needs the layers built off the scene, a year at
a time — a change of `MapLayers` itself. **First measure the block** (`atlas year <year> aside` in his browser): ~150 ms
measured on 08/11; if so, a press during it waits a tenth of a second, and the pieces are not worth that change.

## Where we stopped — 2026-11-09, past midnight (ATLAS-396, the resume point of this work)

**Branch `atlas-396-speed`, worktree `baked-years`, two commits tested by the dev, NOT merged into `main`, not
pushed**: `53eb792` (a prepared map sent to the GPU unseen — first visit 43 ms → one frame) and `14887af` (a year's
countries cut, shared and laid in the worker — countries on the page 156–243 → 85–95 ms on 1200). **First thing**:
bring them into `main` and push (rebase onto `main` first).

**Uncommitted in the worktree, on hold**: the tribes measured and laid in the worker (`layTribes`, `tribeBuffers` in
core, the land and the relief read before the wait — review done, 3 findings fixed). **No gain measured**: 1200 has no
tribe; on 1100 the countries' step at startup, same minute, 170–192 ms before, 139–186 ms after — within what the
machine alone varies (the borders, untouched, moved 4× between series). **Next, the dev agreeing**: fine
`performance.measure` marks inside the countries' step (dispose, build, bounds, add, tribes) to see where the time goes
before moving more code; drop the tribes' change if they weigh nothing. Then the borders (~250 ms) and the names
(~150 ms block). **Measure only on a quiet machine** — the historian's scripts and gates ran the load to 24 tonight.

## Where we stopped — 2026-11-08, evening

**ATLAS-333 is done, merged into `main` and pushed** (the branch `atlas-baked-years` rebased onto `0e2aec6`, the
historian's day included; one conflict, an import in `core/editor/retrace.ts`). Tried by the dev on the built site:
_"nothing to say"_. On top of the afternoon's state below: the splash and its one bar measured from the first byte
(`de7ac41`, `1f74274`), the twelve read-only year modules moved from `editor/` to `data/` (`ec336a8`), the year settled in
the worker (`fed5b59`), a name's letter four corners (`05f26bc`), the page's copy of a layer's buffers let go once uploaded
(`b418d5c`), the fills' vertices shared (`43fb59a`), **the window of three maps** (`ba3a8aa`).

**Measured on the built site** (Chrome, 2026-11-08 evening): a map not prepared, 0.3–0.4 s; a neighbour prepared in the
background, one frame of 43 ms on its first showing (its buffers sent to the GPU), 8 ms after; a return, 1 ms of ours; the
page's heap ~250 MB with three maps.

**Next — ATLAS-396**, in À faire: the 43 ms (a prepared map drawn once off screen during its preparation), the fills' and
borders' buffers built in the worker (~50 ms each when a map is not prepared), and the map of a date by his rule
(`data/mapOfDate`, written, not wired; `centuryOf` still rounds to the nearest century).

**Built on this work — ATLAS-399, the overlaps hatched** (2026-11-09): a map-legend subject with its own plan,
`overlap-hatching.md`. It leans on the second point above — its common zones are cut in the worker beside the fills, and
computed when the site is built — and must cost the loading nothing.

## Where we stopped — 2026-11-08, afternoon

**Branch `atlas-baked-years`, rebased onto main (CMS-391, CARTO-393), not merged**: `addad3a` (the cuts in the worker,
review of seven readers), `dccf1a6` (the year buttons below the edge-scroll band), `83c0e3f` (the fills' and tribes'
vertices read the relief's heights in place). All three tested by the dev on the built site.

**Measured in Chrome, built site, after `83c0e3f`** — the main thread on a change of year: the fills step 186 ms (1200)
and 233 ms (1100 with its tribes), down from 433–836 ms; the borders 45–250 ms; settling the borders 75–385 ms; a change
1100 → 1200, 0.96 s in all, down from 1.2–1.7 s. **The night's 540–750 ms were not the main thread being the main
thread**: a call per node and an array per tribe vertex — Chrome ran the same loop five times slower than Node.

**Next, to be ordered by the dev**: D, the splash he decided (one measured bar until the first map is wholly laid) —
the main thread's blocks are now short enough for the bar to step between them; the borders and their settling; the
fills' buffers in the worker; the years ahead prepared.

## Where we stopped — 2026-11-08, 05:00

**Worktree** `.claude/worktrees/baked-years`, branch `atlas-baked-years`, based on main `04aed22`; committed there:
`1dbb65e` (names baked at the build), `d24b9e0` (the shelf). **Not merged into main.** **Uncommitted, gate green**
(atlas 1560 · core 1890 · Cartographer 2779 · CMS 372 · plugin 169; worker chunk 38.66 kB, no three.js):

- **B, first step**: the countries' cut (`FillCompute.cutFills`) and the tribes' cut (`TribeCompute.cutTribes`, `tribePatches.ts`
  moved to `core/pipeline/`) run in the worker, in parallel with the bake; their results primed into the layers
  (`primeFillCut`, `primeTribeCut`) before the layers are built.
- **C**: the events go aside with their year (`YEAR_LAYERS` includes `events`) — a return costs ~1 ms of ours, then one
  frame of ~80 ms (the GPU drawing the layers put back).
- **Measures**: `loading/yearTiming.ts`, `performance.measure` entries `atlas year <y> <step>`, readable in Chrome.

~~**Never commit** the test copy `public/years/1200/` nor the modified `public/years/index.json` — publishing 1200 is the dev's.~~
**Struck 2026-11-08 evening**: a rule of mine, filed as his — he never said it. **His decision**: 1200 is in the index and
goes online with 1100 (_"I'm not asking your opinion, that's how it is"_); main carries his own `years/1200/` and
`index.json`, and this worktree's copies give way to them at the rebase.

**Measured on the built site, first visit to 1200** (a loaded machine, ±30–70 % between runs): the page freezes 1–1.4 s
in one block — the countries' buffers and objects 539–752 ms, the border lines 226–387 ms, the exact borders 80 ms, all
on the main thread; the cut, 392–428 ms, already in the worker.

**Next, in this order** (the dev's « Vas-y » on it):

1. **commit this step on the branch** — the dev said yes, 2026-11-08 (_« c'est ce qu'on doit faire, oui »_), on the
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
