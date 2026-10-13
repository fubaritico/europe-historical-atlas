# Our own borders — the plan

> Opened 2026-10-13. The dev, 2026-10-12: *"il faudrait qu'on puisse faire nos propres frontières, c'est dans
> les specs."* Governing documents: `cartographer/format.md` (*Where the borders come from*, *A line is
> selectable*), `scenarii/s08-vassalage.md` (the hands), `scenarii/s13-overrides.md` (overriding them).

## Where it stands — measured 2026-10-13, before any line of this plan

| piece | state |
| --- | --- |
| `borders.json` | in the format, read and written by the Cartographer — `pairs` and `runs`, each with a hand, a type, a source. **Empty** in `years/1100/` |
| the exact derivation | `core/editor/borderGraph.ts` (runs held by 2+ rings), `derivedBorders.ts` (far side by inclusion, relation from the registry, precedence run > pair > rule), `borderRelation.ts`. **Tested, no caller** |
| the Cartographer | draws the polities' outlines and fills. **No border, no hand, no override** |
| the atlas | derives its lines from the **raster** of the fills (`regionBorders.ts`, 1.9 km cells, Chaikin-smoothed), split `between` / `frontier`. Reads an authored year where the manifest lists one, the 21 GPL payloads elsewhere (`mapPipeline.ts`, `unauthored`) |

## Decisions

| | decision | by | date |
| --- | --- | --- | --- |
| **D1** | **The atlas draws an authored year's borders from the anchors** — exact lines, their hands and their overrides — and no longer from the raster. The raster stays for the years still read from the GPL payloads. This reverses `format.md`'s *"the atlas keeps deriving from the raster"*: through the raster the atlas sees no anchor, so no run override and no hand could ever reach it. | dev | 2026-10-13 |
| **D3** | **The line may stay geometric, assumed** — straight strokes between the anchors, as Duby's plates are; at most a light smoothing. **What matters is that a city falls on the right side of its border.** Cities will be the pivots for correcting borders, once they can be contributed. | dev | 2026-10-13 |
| **D4** | **What is shown is the author's, in `{Layers}`** — the mockup's panel (`design/`, screenshot 2026-10-11 22.34.58): an eye and an opacity per layer — backdrop, coastline, rivers, graticule, cities, fills, borders, unclaimed. Step 1 builds it for the layers that exist. **Whether the blue edit outlines stay on every polity or only on the aimed one is decided by use**, not in advance: *"il faut se servir de l'application"*. | dev | 2026-10-13 |
| D2 | Where the hands table lives. **Claude's proposal**: one constant in `core`, read by both apps (as `riverDisplay.ts`), a panel to edit it later; a per-year table in `borders.json` only if a century ever needs other hands. | — | open |

**Claude's proposal, from D3 — no smoothing by default on an authored year's lines**: smoothing cuts the
corners, so the line leaves the anchors exactly where the author placed them; a city sitting in a bend could
then read on the wrong side. The line goes through the anchors; a light smoothing stays a setting, judged by
eye at step 4.

**Worth knowing, from D1**: the atlas's fills stay on the raster, so a fill's edge may sit up to one cell
(1.9 km) off its exact border line — as it already does against today's smoothed line. The border's casing
should cover it. **Check at step 4**; remedy if seen: a finer raster under the borders.

## The steps — each usable on its own, each committed alone

| | what | done when |
| --- | --- | --- |
| **1** | **See the borders in the Cartographer**, read-only: call `deriveBorders` once per document version, draw each in its relation's hand (`s08`), over the fills, under the edit outlines. The status bar names what is under the pointer — *"France – Burgundy · sovereign"* | walked on France and Burgundy: the shared Saône–Rhône is one sovereign line, the coast draws nothing, a vassal drawn inside its lord is dotted |
| **2** | **The hands table** (`s08`, *the five hands*): pattern, dash cadence, width per relation — per D2 | changing a row redraws every border of that relation |
| **3** | **Override** (`s13`): select a run with the white arrow, style it from a bar, write `runs`/`pairs` into `borders.json`, undoable; `{Overrides}` lists every override with `[Clear]` | an override survives a reopen and a moved anchor (`s13`'s two guarantees) |
| **4** | **The atlas draws them** — the adapter carries lines (run, relation, hand) besides the fills; the line layer draws each hand | the 1100 map in the atlas shows the Cartographer's lines and styles |
| **5** | **Retire the GPL** — delete `public/borders/` and the `unauthored` reader | **triggered** the day 1100 is wholly drawn, not scheduled |

The order is the dependencies': see before tuning, the table before what beats it, the editor before the
atlas so we know what we publish.

## Progress — 2026-10-13, delivered by Claude while the dev was away (each piece walked in his Chrome)

| | commit | what |
| --- | --- | --- |
| 1a | `997cbb1` | the derivation cut where a polity's far side turns from sea to land, the coast read from the anchors' provenance — 11 true borders on the 1100 year |
| 1b | `19d316f` | the Cartographer draws the borders in their hands (`core/editor/borderHands.ts`, D2 as proposed), and the status bar names what is under the pointer |
| 1c | `4799226` | `{Layers}` — eye and opacity for backdrop, fills, coastline, rivers, borders, unclaimed |
| 3a | `ae34714` | the run overrides dress their own segments only (a defect: one shared anchor dressed a whole border); the arrow's selection reaches `{Line}`, six patterns, this stretch or the whole border |
| 3b | `2b9caf0` | `{Overrides}` — every dressed stretch and pair, orphans listed, `[Clear]` undoable |
| 4 | `b85714f` | the atlas draws an authored year's borders from the anchors (`core/editor/atlasBorders.ts`), no longer grows its claims past the drawn line, and paints it in the Cartographer's colours — walked in the dev's Chrome, *"ça correspond bien"* |

**Left for the dev's eye**: the blue edit outlines over the borders (D4, decided by use); the patterns' rendering
at the zooms he works at — dotted and dashed read fine, double could not be told from dashed in a reduced
capture; weight and ink of a line (`s13`) are not offered yet, only the pattern.

