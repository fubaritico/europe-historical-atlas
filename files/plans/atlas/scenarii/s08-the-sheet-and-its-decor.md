# 08 — The sheet and its decor: paper, frame, title, rose, waters

> [Index](s00-index.md) · **mostly no plan** — the visual direction is `../05-decisions.md`'s « vintage school atlas /
> parchment », and the portolan's colour code; the rest was tuned on the dev's screen in September and October
> (`rules/known-issues/atlas.md` keeps the measures). The map is **printed on a sheet of paper**: everything below sits on
> it or around it.
>
> **Built** in September — the relief, the coastline, the rhumbs, the compass rose (the portolan decor), the sheet, its
> frame and its degrees on 18/09; the rivers always drawn, every rank, on 18/10 (`eb62f4c`). **Walked** by the dev while
> each was tuned; nothing here was walked again for these scenarios. The code: `atlas/src/scene/sheet/`, `decor/`,
> `waters/`, `relief/`.

## The sheet

```gherkin
Scenario: the map is printed on a sheet
  Given the whole sheet in view
  Then the map lies on a sheet of parchment-coloured paper, with a margin round it
  And a graduated band frames the map: one block every 2°, alternately dark and light
  And the degrees are written in the margin beside their graduation: « 10°E », « 30°O », « 45°N », never a minus sign
  And below the map, the title « EUROPE HISTORICAL ATLAS », spread, every A drawn as a Λ — the splash's lettering (s01)
```

> **The degrees' letters are French** (N · S · E · O) and the title English, for every reader — [s99](s99-holes.md) A-05.
> The reason written in `sheet/frameLabels.ts` (*« the only other text the reader ever sees is [French] »*) has been false
> since the progress text and the notices were translated (ATLAS-159); to reword with A-05's decision.

```gherkin
Scenario: where land meets the map's edge, the map has a thickness
  Given a tilted view of the map's southern edge, where Africa is cut
  Then the cut shows as a wall from sea level up to the land's surface
  And where the sea meets the edge there is no wall
```

> **The board below sea level is off** (`edgeDepth` 0): on screen it filled the graduated band's blocks. It comes back
> once the thickness is carried by the sheet's outer edge — the dev's own drawing (ATLAS-161, Backlog).

## The relief

```gherkin
Scenario: Europe in relief
  Given any view
  Then the land rises with its elevation, raised more afar (0.75) than close up (0.15)
  And its light and shade read under the countries' fills
  And the sea is flat, opaque, parchment-toned
```

> **The land and the sea are told by a land mask, not the elevation**: a DEM says how high, not wet or dry — the polders
> and the Caspian prove it. Its failure has a declared degraded mode ([s09](s09-when-something-is-missing.md)).

## The coast and the rhumbs

```gherkin
Scenario: the coastline is drawn as a line
  Given the whole sheet in view
  Then the coastline is an ink line along every shore, at 60 % of its opacity
  When I zoom in to the closest
  Then it reaches its whole opacity
```

```gherkin
Scenario: the rhumb lines of a portolan
  Given the whole sheet in view
  Then the rhumb lines radiate across the sea from the compass rose, at 16 % of their opacity
  When I zoom in to the closest
  Then they fade to 6 %, out of the way
```

```gherkin
Scenario: the compass rose
  Given the whole sheet in view
  Then a compass rose stands in the Atlantic, a fifth of the way from the west edge, at the rhumbs' centre
  And its eight winds are lettered N · NE · E · SE · S · SO · O · NO — in French
```

> **The rose is an SVG rasterised to a texture**, so it appears a frame or two after the relief; it carries its width and
> height, without which a texture SVG rasterises to nothing (`rules/known-issues/atlas.md`).

## The rivers

```gherkin
Scenario: the rivers, every rank at every zoom
  Given any view
  Then every river of the file is drawn, the great and the small, at every zoom
  And the Loire, the Seine, the Garonne and the Thames run to their mouth
```

> **Every rank always** (the dev's tuning, 18/10): the rank-by-zoom reveal stayed in the code, its thresholds set so
> nothing waits. **The Elbe stops short of its mouth** — cause not found (`rules/known-issues/atlas.md`).

```gherkin
Scenario: a rivers' file drawn for another frame
  Given a rivers' file whose frame differs from the relief's
  Then the rivers are not drawn
  And a notice says the rivers do not match this map (s09)
```

## What this does not do

- **The three rules of the frame are perfect rectangles**, while the degrees beside them have a broken edge — the dev
  raised it on 18/09; two ways out, not decided (ATLAS-162).
- **The frame and the cut edge render lighter than their colours** — sRGB written into an attribute read as linear
  (ATLAS-160).
- **Sea decor by era** — drakkars, galleons, dragons — is an idea, not built.
