# The levels of detail — the zoom as a scroll with stops (ATLAS-295)

> Opened 2026-10-31, evening, after the first cities on the map: from afar a city's name sat on a country's name still
> whole, and neither read (the dev's seven screenshots, 20:04–20:08). Close up, over the watermark, it read
> (Bohemia: Prague, Erfurt, Mayence). His diagnosis: *« si on ne change pas la manière dont c'est géré, je vois pas
> comment on va pouvoir faire »*.

## The rule

**The zoom is a scroll with stops, not a slope.** Before, every layer followed the zoom continuously — the vassals by
level from 0.45 to 0.8, the names' watermark from 0.85, the cities by order. Now **a level of detail** is chosen by the
zoom, and **when a stop is crossed everything changes at once, in a short fade in time** — never tied to how fast the
wheel turns. Europa Universalis does this (the dev: *« c'est un peu comme un événement de scroll »*; the game's own
behaviour **from memory**, not checked).

**The levels are a pyramid, one table** (the dev: *« on peut se permettre d'en ajouter ou d'en enlever ou d'en glisser
un entre deux paliers préexistants […] des scroll top »*): a stop is a row — the zoom it starts at, and what it shows.
Adding, removing or inserting a level is a row, never a layer's code.

## Decisions

| # | decision | by |
| --- | --- | --- |
| 1 | **Three levels.** **1, afar**: the countries' names whole; the capitals' points, **no name**; no vassal. **2**: the names at a 40 % watermark; the direct vassals; the capitals' names; the large cities' points. **3, close**: the names at 25 %; every level of vassals; every city with its name. | the dev, 31/10 — the deeper vassals at level 3, my proposal, his « ok » |
| 2 | **Nothing follows the zoom continuously any more**: at a stop, everything fades to the new level in time. | the dev, 31/10 |
| 3 | **A city enters by its point, and its name comes at the next level** — the capital: point at 1, name at 2; the large city: point at 2, name at 3; the city: both at 3, there being no level 4. | Claude, 31/10, from the dev's « peut-être simplement les villes moyennes, mais sans leur nom encore » — to confirm on the map |
| 4 | **Two thresholds a stop** (a hysteresis): a level is entered a little closer than it is left, so a camera resting on a stop never flickers between two. | Claude, 31/10 — technical, said to the dev |
| 8 | **The reach is a distance to the camera, not a circle** (the dev, 31/10, 21:40: *« quand c'est près, ça doit être affiché. Des fois, c'est pas affiché […] plus ça va vers le haut […] moins on en voit »*): a name shows while its city is no further from the camera than a share of the camera's distance to the centre of the screen — on screen, nearly a level line. The circle around the centre cut the cities at the bottom of a tilted view, the nearest. Shares: **1.5** at the third level, **1.45 → 1.25** across the fourth (1.3 and 1.25 → 1.1 first; *« augmente la distance d'apparition »*, 31/10). | the dev, 31/10 — the measure and the values, my proposal, his « vas-y » |
| 7 | **Four levels, the reach set by each** (the dev, 31/10, 21:08: *« créer un quatrième niveau […] entre le 2 et le 3 […] le rayon de visibilité, à ce moment-là, il change. Et ils se réduisent encore au fur et à mesure qu'on s'approche du plus haut niveau de zoom »*): a new third level at **0.65** takes the names to 25 % and brings every city with its name within **0.9** times the camera's distance; the fourth, at **0.8**, keeps the same and **tightens the reach from 0.7 to 0.4 as the zoom closes in — progressive, the one value here that follows the zoom**. The values are a start; my reading of his message, said to him before building. | the dev, 31/10 — the values, my proposal |
| 6 | **A city's name shows only within reach of the point the camera looks at** (the dev, 31/10, his screenshot of 20:49: the cities at the back of a tilted view shrink and their names become unreadable, Constantinople too). The reach **follows the zoom** — a share of the camera's distance to that point (1.2 first; per level since decision 7), so it covers the same part of the screen at every zoom; a name **enters and leaves in the levels' fade**, never with the distance; a little further out to leave than to enter. The points stay. `atlas/src/scene/cities/nameReach.ts`. | the dev, 31/10 — the reach following the zoom and its two thresholds, my proposals, his « implémente ça » |
| 5 | **The table replaces five sliders** — the names' watermark zoom and share, the vassals' reveal start, end and fade (the dev, 31/10: *« il y a trop de réglages »*). The vassals' on/off switch stays. | the dev, 31/10 |

## Where it lives

- `atlas/src/scene/detail/` — the table (`detailLevels`), the level a zoom chooses with its hysteresis, and the fade in
  time toward what the level shows. Pure, tested with literals.
- The layers read the faded values, never the zoom, for these three things: the vassals' detail (fills, borders, names),
  the names' watermark, the cities' points and names.

## Not decided

- The zoom of each stop: **0.45 and 0.8** to start (the old start and end of the vassals' reveal), to tune on sight.
- The fade's length: **0.6 s** — 0.35 s first, *« un petit peu plus doux »* (the dev, 31/10).
- The event icons collide with cities (the swords on Tripoli, the trebuchet on Tyr) — another subject, noted.
