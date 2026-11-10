# The bands' distances computed at the build — ATLAS-407

> The dev, 2026-11-09: _"do we keep this irregular computation of the width of the semi-transparent zone, which makes the
> computation explode?"_ — and 2026-11-10, the approach agreed: computed once, the map then reads data already prepared.
> The bands themselves: `overlap-hatching.md` (« Built, 2026-11-09 »), `core/data/vassalBand`.

## Measured, 2026-11-10

**Method**: a throwaway Node script (never committed) running core's own cut on `years/1100`, `1200`, `1300`, the relief
at 1280 segments, five runs each, the median. The machine was loaded (the Cartographer open, the historian drawing); the
cut alone came out at 0.37–0.43 s, as on 09/11, so the load did not distort the ranking.

| part of the cut                                                  | 1100    | 1200    | 1300    |
| ---------------------------------------------------------------- | ------- | ------- | ------- |
| the fills cut, no band                                           | 0.37 s  | 0.37 s  | 0.43 s  |
| **each polity's band** — every vertex against its own outline    | 0.82 s  | 0.90 s  | 1.19 s  |
| the realm's band from afar — the union and every member's vertex | 0.46 s  | 0.03 s  | 0.12 s  |
| building the distance fields (every polity)                      | 4 ms    | 4 ms    | 4 ms    |
| **the undulation**                                               | **0**   | **0**   | **0**   |

- **The undulation costs nothing in the cut**: it is computed per fragment in the fill shader
  (`scene/political/fills/fillShader`, `bandWave`). Keeping it or not is a question of look only.
- **The cost is the query at every vertex** — 440,000 to 585,000 of them a year. Half of each query is the even-odd ray
  across the whole row of buckets, which a fill's vertex does not need (it lies inside its polity). **Dropping the ray
  was measured too: it halves the query, a map still ~1 s** — not enough on its own, so not the remedy.

**What a year's distances weigh** (the two distances of every banded vertex):

| encoding                    | 1100            | 1200            | 1300            |
| --------------------------- | --------------- | --------------- | --------------- |
| `float32`, as the shader reads them | 3.4 MB, brotli 1.0 MB | 3.6 MB, brotli 1.1 MB | 4.5 MB, brotli 1.3 MB |
| **one byte, steps of ⅓ km** | 0.86 MB, **brotli 132 kB** | 0.91 MB, **brotli 146 kB** | 1.1 MB, **brotli 174 kB** |

At one byte, a year's distances weigh what its names do (`names.json`, 216 kB raw) — unlike the fills themselves, whose
bake was refused on 08/11 at 3.3 MB gzipped (`year-switch-speed.md`).

## The approach

**At `vite build` only**, a third bake beside the names and the overlaps (`bake/namesBake.ts`, `bake/overlapsBake.ts`):
for every year of the manifest, the fills cut and measured exactly as the worker does, and their distances written into
the site as `years/<year>/bands.bin` — never into `public/` or the repository. **The built site** reads the file with the
year's others and the worker cuts the fills without measuring; **the dev server** has no build, so it measures them as
today — the only place they are computed live.

| decision | by | why |
| --- | --- | --- |
| the distances computed at the build, read by the page | the dev, 2026-11-10 | measured above |
| per vertex, in the cut's order — not an image of distances per year | Claude, proposed | two polities' fills overlap on contested ground: one pixel cannot hold both their distances; per vertex the shader is unchanged |
| one byte a distance, steps of ⅓ km, clamped to ±127 steps | Claude, proposed | a band 10 or 20 km wide on cells ~7 km across: ⅓ km is below what the interpolation shows |
| **gzipped by the build, inflated by the page** (`DecompressionStream`) | Claude | the host serves a `.bin` uncompressed — checked on the site, 2026-11-10: the relief's `.bin` leaves at its 6.7 MB, `content-encoding` absent — so a year would cross at 0.9–1.2 MB; gzipped, 308–399 kB, whatever the host |
| **no fallback**: the built site always reads the file, the dev server always measures | the dev, 2026-11-10 | _"why would the file be missing?"_ — on the site it never is: the build writes it with the map, both shipped together, and the build stops on a year it cannot read. A file that does not arrive is a failed load, the rule of 08/11 (ATLAS-394, ATLAS-395): a whole map or an error, never a map computed another way |
| the file carries the grid and the count of polities; a mismatch throws | Claude | another grid or another year is another map: a defect, said before a distance is laid on the wrong vertex |
| **checked polity by polity**: each polity's count of vertices and a print of where they lie; a polity whose cut differs is measured on the page, it alone, exactly, said in the console | the dev, 2026-11-10 | found on his test of the built site: Chrome and Node do not compute the projection's `Math.log` and `Math.tan` to the same last digit (measured on 200,000 latitudes), and one last digit adds or drops vertices of the cut (1100: 441,721 in Node, 441,717 in Chrome; rings moved by one ulp in Node: 441,724) |
| a projection that gives the same digits everywhere, our own logarithm and tangent | the dev, 2026-11-10, a ticket | CORE-412 — _"if you can do that, it means we really master everything that happens"_ |

**For later, to know**: a quality level (ATLAS-305) or a relief made finer for the machine (ATLAS-165) changes the
segments — the build will then write one file per level.

## Built, 2026-11-10

Measured in Node on the files the build wrote (`vite build`, the five-run median, the relief at 1280):

| year | cut, no band | cut, bands measured | **cut, bands read from the file** | file, gzipped | build time |
| ---- | ------------ | ------------------- | --------------------------------- | ------------- | ---------- |
| 1100 | 345 ms       | 1,628 ms            | **348 ms**                        | 308 kB        | 1.7 s      |
| 1200 | 371 ms       | 1,296 ms            | **369 ms**                        | 340 kB        | 1.3 s      |
| 1300 | 407 ms       | 1,702 ms            | **419 ms**                        | 399 kB        | 1.8 s      |

The download is the new cost: 300–400 kB a map, fetched beside the settling, in parallel with it.

## Steps

1. **core** — encode and decode a year's distances (one byte, ⅓ km), with its segments and vertex count; tests, the
   round trip within ⅓ km.
2. **core** — the cut takes distances already measured: `cutYearFills` lays them instead of measuring when given,
   refused loudly when the vertex count does not match.
3. **atlas, `bake/bandsBake.ts`** — the Vite plugin, build only, the years read by the page's own chain (the overlaps'
   pattern); its test.
4. **atlas, the loading** — on the built site, fetch `bands.bin` with the year's files and hand it to the worker, a
   failure being the year's failure as any of its files; on the dev server, measure as today.
5. **Measure on the built site** (`pnpm build && pnpm preview`): a change to a map not prepared, 1300 → 1100, back to
   0.3–0.4 s; the bands identical on screen, close and from afar.
6. The scenario of the bands written (`/scenarii-to-code` §7, the debt of 09/11), the glossary, the closing comment.
