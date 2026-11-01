# 04 — The levels of detail: the zoom is a scroll with stops

> [Index](s00-index.md) · ATLAS-295 · the plan and its decisions: [`../detail-levels.md`](../detail-levels.md).
>
> The dev, 2026-10-31, after seven screenshots where a city's name sat on a country's name still whole and neither read:
> *"if we don't change the way it's handled, I don't see how we'll manage"* — and the answer, after
> Europa Universalis: *"it's a bit like a scroll event"*, *"scroll stops"*. **What the map shows is chosen
> by a level, and a level by the zoom; at a stop everything changes at once, in a fade in time, never with the wheel.**
>
> **Built 2026-10-31** (`8b2fff2`, ATLAS-295), the order of the layers per level on 2026-11-01 (`d8012aa`, ATLAS-322).
> **Walked by the dev** on 31/10 evening and on 01/11 past midnight — the fade made softer, the reach widened, the order
> of the layers asked for, all from his screen. The table: `atlas/src/scene/detail/detailLevels.ts`; the fade:
> `detail/detailView.ts`; the layers read it in `scene/layers/frameLayers.ts`.

## The pyramid — one table, a stop a row

| level | from zoom | countries' names | vassals | cities' points | cities' names | names' reach | cities against the names |
| --- | --- | --- | --- | --- | --- | --- | --- |
| afar | 0 | whole | none | capitals | none | everywhere | **under** |
| second | 0.45 | watermark 40 % | direct | capitals, large cities | capitals | everywhere | over |
| third | 0.65 | watermark 25 % | all | every city | every city | 1.5 × | over |
| closest | 0.8 | watermark 25 % | all | every city | every city | 1.45 × → 1.25 × | over |

> **Adding, removing or inserting a level is a row** (the dev, 31/10: *"we can afford to add some, remove some, or slip one in between two existing stops"*), never a layer's code. The stops' zooms and every value
> are defaults, tuned on sight. The reach is in [s06](s06-the-cities.md).

```gherkin
Scenario: afar, the countries and the capitals' points
  Given the whole sheet in view, zoom 0
  Then every country's name shows whole, in its suzerain's realm
  And no vassal shows: a vassal wears its suzerain's colour, and no border parts them
  And the capitals show their point and no name
  And the large cities and the cities show nothing
```

```gherkin
Scenario: crossing the second stop, everything changes together
  Given zoom 0.40, the first level shown
  When I zoom in past 0.45
  Then the countries' names fade to 40 % of their opacity
  And the direct vassals come in, their own colour and their border together
  And the capitals' names come in beside their points
  And the large cities' points come in
  And all of it takes 0.6 s, whatever the wheel does meanwhile
```

```gherkin
Scenario: the third stop brings every vassal and every city
  Given the second level shown
  When I zoom in past 0.65
  Then the countries' names fade to 25 %
  And every level of vassals comes in
  And every city comes in, its point and its name, within the names' reach
```

```gherkin
Scenario: the closest stop only tightens the reach
  Given the third level shown
  When I zoom in past 0.8
  Then nothing comes or goes at the stop itself
  And as I go on closing in, the names' reach tightens, progressively, from 1.45 to 1.25 times the camera's distance
```

> **The one value that follows the zoom** (the dev, 31/10: *"they shrink further as we get closer to the highest zoom level"*). Everything else in the table changes only at a stop.

```gherkin
Scenario: the fade is in time, not in the wheel
  Given the first level shown, zoom 0.40
  When one quick turn of the wheel takes the zoom past 0.45 and on to 0.60
  Then the second level's values arrive in 0.6 s, at the same pace as after a slow turn
  And when the wheel takes the zoom past two stops at once, every value goes straight to the deeper level, in one fade
```

> **0.6 s**: 0.35 s first, then *"a little bit softer"* (the dev, 31/10). The fade is linear, each value covering
> its whole range in that time (`detailView.fadeView`).

```gherkin
Scenario: resting on a stop never flickers
  Given the second level shown at zoom 0.46
  When I zoom out to 0.44
  Then the second level stays
  And it is left only below 0.43 — a stop is entered at its zoom and left 0.02 further out
```

> **Two thresholds a stop** — Claude's, 31/10, technical, said to the dev (`DETAIL_HYSTERESIS`).

```gherkin
Scenario: the page opens on its level with no fade of its own
  Given the view kept at zoom 0.7 across a reload
  When the atlas opens
  Then the third level is shown from the first frame, with no fade from the first level
  And the map comes in by the startup's own fade
```

```gherkin
Scenario: afar the cities sit under the countries' names; from the second level, over them
  Given the first level shown
  Then a capital's point is drawn under the countries' names, still whole
  When I cross the second stop
  Then the cities are drawn over the names, gone to their watermark
  And the events' markers stay on top at every level
```

> **Built 2026-11-01** (`d8012aa`, ATLAS-322), the dev, 00:20. **One switch a row** (`citiesOverNames`), not a manager of
> layers — my proposal, his "yes"; widened into an order of the layers at its second case, not before. The order turns
> at the level's change, it is not faded.

## What the dev panel changes

```gherkin
Scenario: the vassals' switch, off
  Given the dev panel open, `vassals` → `enabled` unticked
  Then every vassal shows at every level, in its own colour and with its border
  And the cities and the names' watermark still follow the levels
```

> **The table replaced five sliders** (the dev, 31/10: *"there are too many settings"*) — the names' watermark zoom and
> share, the vassals' reveal start, end and fade. The switch stayed. On a year whose texture carries the colours (the
> panel's *exact fills* off) the vassals show whatever the level, since the bake paints them apart anyway
> (`frameLayers.frameDetail`).

## What this does not do

- **« Réduire les animations » is not read**: the 0.6 s fade runs whatever the system says — [s99](s99-holes.md).
- **Nothing on screen says which level is shown** — no scale, no mark; the dev reads it from what appears.
