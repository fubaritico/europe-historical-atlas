# Overlaps hatched in the atlas, baked on the ground — ATLAS-399

> A map-legend subject, like the borders and the fills before it, built on the speed work rather than inside it
> (the dev, 2026-11-09: _"a hybrid subject — it must not reduce the performance, and it must fit into what was built
> yesterday, but it is a subject of map legends in its own right"_). Epic DESIGN-262: hatching is the mark of an
> uncertain belonging (`files/plans/evidence-system.md`, §6). Speed foundation: `year-switch-speed.md`, ATLAS-396.

## Why

The dev's test, 2026-11-09 (two kingdoms drawn overlapping, `test1` and `test2`): the Cartographer hatches the common
ground (CARTO-364); **the atlas has no way to draw an overlap**. Two states: the one painted last covers the other,
opaque, by list order. A state and a tribe, or two tribes: the tribes' layer is transparent, so the colours mix and each
outline is drawn as a border inside the other — the Baltic of 1100 (his capture of 09/11 at 02:40, first filed as 1200
by mistake). Measured: 25 overlaps in 1100, 16 in 1200, ~1.3 s to compute each year (`core/editor/overlaps.ts`).

## Decided

| what | by | when |
| --- | --- | --- |
| the atlas hatches the common ground, as the Cartographer does | the dev | 2026-11-09 |
| **baked in a texture, never resized with the zoom** — _"no fixed width, it vibrates when you zoom, because it resizes"_; the stripes wide enough to read | the dev | 2026-11-09 (and 06/11, CARTO-365) |
| no hand carving of the pasted outlines as the answer — the atlas must draw an overlap | the dev | 2026-11-09 |
| it costs the loading nothing, and fits the speed work of 08/11 | the dev | 2026-11-09 |
| where it sits: its own ticket and plan, depending on ATLAS-396's fills cut in the worker | me — he left it to me | 2026-11-09 |

## The approach — proposed, to be confirmed rung by rung

1. **Computed once, when the site is built**, with the countries' names (ATLAS-333): the common zones of a year are
   part of the baked year. `overlaps.ts` moves from `core/editor/` to `core/data/`, like the year's outlines on 08/11,
   so the build and the worker can read it.
2. **Cut exactly, like the fills**: each common zone becomes triangles on the relief's planes, in the worker, beside the
   fills (ATLAS-396, its second point). The zone is **taken out of both countries' fills**, so no colour mixes and no
   state hides another.
3. **Striped by one small image repeated on the ground** (a tiling texture, with its mipmaps — the GPU's reduced copies
   for the view from afar, which keep thin stripes from shimmering). It grows with the zoom like the relief and is
   never resized: no vibration. The image is a mask; the colours are the zone's countries, one stripe each in turn, as
   in the Cartographer (`canvas/paint/hatchPainter.ts`). Not one big image of the whole map: its edge would show its
   pixels close up, where the cut zone stays exact.
4. **Stripes 15–20 km wide**, tuned on sight once, then **one constant in `core`**, no dev-panel setting
   (the dev, 2026-11-09: no more tunables in the panel).
5. **The zone's outline kept** — the lines seen inside Lithuania become the hatched zone's contour (proposed 09/11,
   not decided).

## Built, 2026-11-09 — what the dev decided on screen

| what | by | when |
| --- | --- | --- |
| stripes 25 km wide (_"un petit peu plus grandes"_ than 18) | the dev | 2026-11-09 |
| the overlaps computed at the site's build (`years/<year>/overlaps.json`, `bake/overlapsBake`), the dev server live; a file for another version of the year computed again, the names' rule | the dev (_"go"_), the rule his of 08/11 | 2026-11-09 |
| on contested ground **the name does not change**: the polity higher in the list keeps its name (`regionRaster`'s `'earlier'`, the names only) | the dev | 2026-11-09 |
| a contested vassal's hatch wears its band, revealed with the zoom | the dev | 2026-11-09 |
| **trial**: the sovereigns banded too, 60 % of their colour over an undulating width of at most 20 km (the tribes' wave); the vassals 50 % over 10 km; from afar a realm banded on its outline, sovereign and vassals together | the dev | 2026-11-09 |
| the borders' close-up look and their dashes change **by step**, with the rest — no fade with the zoom | the dev | 2026-11-09 |
| the names at 30 % on screen close up; the vassals' borders finer, their dots closer | the dev | 2026-11-09 |
| the trial committed as it is, its cost (below) a ticket of its own | the dev | 2026-11-09 |

**Measured** on 1100, 1200, 1300 (Node, the cut at 1280 cells): the cut 0.38–0.43 s alone, **1.8–2.3 s with the bands of
every polity and of every realm** — in the worker, so a map not prepared arrives ~1.5 s later. Remedy, its own ticket: the
distances computed when the site is built (a distance image per year, read by the shader, as the stripes are).

## Open

- The outline kept or not (point 5) — kept for now.
- The bands' distances at the build (the cost above).
- The sovereigns' band in the Cartographer, if the trial is kept.
- The Cartographer's side of CARTO-365 (its hatches still a fixed width on screen): the same tiling stripes, held by
  the map — to do with or after this.
