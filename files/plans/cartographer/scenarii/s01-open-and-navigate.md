# 01 — Open an existing payload, read it, move around it

> [Index](s00-index.md) · shared Background applies.

## Opening

```gherkin
Scenario: open a year that OHM supplies
  Given no file is loaded
  When I press [Open…]
  And I choose "europe-1100.json"
  Then the file is read and validated field by field
  And the {Polities} panel lists 51 entries, sorted by name
  And each entry shows its colour swatch, its name, and its rank
  And the fills are painted on the backdrop
  And the derived borders are drawn over the fills
  And the title bar reads "Cartographer — europe-1100.json — 1100"
  And the status bar reads "51 polities · 16 579 vertices · unclaimed land 55 %"
```

```gherkin
Scenario: the payload is malformed
  Given a file whose third region has a string where a longitude belongs
  When I open it
  Then nothing is loaded
  And a message names the field: "payload.regions[2].rings[0][14] — expected a number, got a string"
  And the previous file, if any, is still loaded and untouched
```

> The readers for this already exist: `src/data/assetError.ts`, taxonomy
> `transport | schema | consistency | semantic`. The tool points them at a hand-picked file instead of a
> fetch — which chapter 07 named as the case that would justify revisiting the schema-library question.

```gherkin
Scenario: the payload carries a licence we cannot publish
  Given "europe-1100.json" from historical-basemaps, whose source field says GPL-3.0
  When I open it
  Then it opens in read-only mode
  And a persistent banner reads "GPL-3.0 source — reference only. Editing it would make the result
    GPL-3.0."
  And [Save] is disabled
  And every polity in the {Polities} panel carries a licence marker
```

> **Why this is in scenario 01 and not an afterthought.** `public/borders/europe-1100.json` exists today
> and is GPL. It is the first file a contributor would reach for, and opening-then-editing it is exactly
> what GPL §0 calls modifying. The groundwork document, §6 quinquies.

## Reading what is there

```gherkin
Scenario: identify what is under the pointer
  Given "europe-1100.json" is loaded
  When I move the pointer over the Île-de-France
  Then the status bar reads "2°21′E 48°51′N · unclaimed"
  When I move the pointer over Bavaria
  Then the status bar reads "11°34′E 48°08′N · Holy Roman Empire · empire"
  And the Holy Roman Empire's entry in {Polities} is highlighted while the pointer is over it
```

```gherkin
Scenario: find what is missing
  Given "europe-1100.json" is loaded
  When I enable the "unclaimed" layer
  Then every land cell no polity claims is hatched
  And the hatching covers the whole of France, Castile, Denmark, Bohemia and northern Italy
  And the status bar reads "unclaimed land 55 %"
```

> This is the contributor's to-do list, and it is the metric chapter 06 imposes — by surface, never by
> polity count.

```gherkin
Scenario: select a polity from the list
  Given "europe-1100.json" is loaded
  When I click "Holy Roman Empire" in {Polities}
  Then it becomes the selected polity
  And its fill is outlined
  And its 894 anchors are NOT drawn as handles yet
  And {Details} shows its name, rank, status, dates, suzerain and colour
```

> Handles belong to ⟨edit⟩, not to selection: selecting a polity in a list is reading, not editing.
> **Hole H-03** is about *when* they appear once ⟨edit⟩ is active — 894 of them at continent scale is a
> smear. See [99-holes](s99-holes.md).

## Moving around

```gherkin
Scenario: zoom about the pointer
  Given the editor has just opened, framed on the editorial zone
  When I turn the wheel forward with the pointer over Reims
  Then the view scales up about the pointer, which stays on Reims
  And the backdrop, the vectors, the fills and the borders scale together
  And stroke widths and handle sizes stay constant in screen pixels
  And the status bar reads the new scale in "km per screen pixel"
```

> **The `Given` used to read "the whole frame is visible", and it stopped being reachable on
> 2026-10-08.** The zoom-out limit is now **cover** — the dev's call: *"le zoom maximal doit correspondre
> au cover, à l'encombrement maximal que peut avoir la carte"* — so on any window wider than the backdrop
> is tall there is no scale at which the whole frame fits with room to spare. Nothing in this scenario
> depended on it: zooming about the pointer holds its invariant at every scale. The opening view frames
> the **editorial zone** instead, which is the ground the author may draw in; a third of the backdrop
> lies east of 60°E and is not.

```gherkin
Scenario: the backdrop gives out before the grid does
  Given I have zoomed past 7.6 km per pixel
  Then the backdrop is visibly soft
  And the coastline, the rivers and the graticule stay sharp
  And the status bar warns "backdrop resolution exceeded — position from the vectors"
```

> Measured: the baked texture is 1 280 px over 123.75° of longitude. Groundwork §6 sexies, trap 2.

```gherkin
Scenario: pan
  When I hold ‹space› and drag
  Then the whole view moves with the pointer
  And no point is created, moved or deleted

Scenario: pan without a modifier while no tool is active
  Given ⟨navigate⟩ is the active tool
  When I drag on the canvas
  Then the view pans
```

> ‹space› works **whatever tool is active**, as it does in Illustrator, and releases back to it. Panning
> mid-outline must not cost the outline, exactly as the atlas's focus mode already survives a pan.

## Choosing a tool

```gherkin
Scenario: the tool strip and its two keys
  Given a file is loaded
  When I press ‹P›
  Then ⟨draw⟩ becomes the active tool and the cursor becomes a cross
  When I press ‹A›
  Then ⟨edit⟩ becomes the active tool and the cursor becomes a white arrow
  And the handles of the selected polity appear
  When I press ‹escape› with nothing in progress
  Then ⟨navigate⟩ becomes the active tool
```

```gherkin
Scenario: there is no whole-path selection tool
  Given ⟨edit⟩ is active
  When I click a polity's outline away from any handle
  Then no transform box appears
  And the path is not selected as one object
  And nothing can be rotated or scaled
```

> Decided 2026-09-22: *"Pas de sélection générale d'un tracé avec l'outil V, car nous ne voulons juste que
> dessiner. Pas manipuler ou déplacer des tracés."* Moving a whole outline remains reachable — select all
> its anchors with a marquee — but it is a consequence, not a feature. See [s00](s00-index.md).

```gherkin
Scenario: a drag that ends where it started must not count as a click
  Given ⟨navigate⟩ is active
  When I press, move 2 pixels, and release
  Then the view has not meaningfully moved
  And this is treated as a click, not a drag
```

> The atlas already had to learn this: the DOM fires `click` at the end of *every* drag with no movement
> threshold. `MapControls.pointerDragged` decides it once, against a 4 px tolerance. **Do not decide it a
> second time here** — the same tolerance, in the same place.

> ~~`Scenario: frame a polity` — When I double-click "Kingdom of Poland" in {Polities}, Then the view zooms and
> pans so its extent fills the canvas with a margin.~~
>
> **Superseded 2026-10-12** (`21bb1a2`, `s07` *edit a polity that already exists*): a double-click on a row of
> {Polities} opens that polity's form, and since 2026-10-17 a double-click in its fill on the map does too
> (CARTO-246). **Framing a polity has no gesture today** — it waits on the canvas's zoom buttons and "fit"
> (CARTO-172). Struck on 2026-10-18 by the scenario audit, which found the line contradicting the code.

## Layers

```gherkin
Scenario: read the backdrop through what is drawn
  When I lower the "fills" layer opacity to 30 %
  Then the terrain reads through the political colours
  And the derived borders keep their own opacity
```

```gherkin
Scenario: load a reference image in place of the backdrop
  When I press [Load backdrop image…] and choose a scan
  Then the image replaces the baked texture
  And two handles let me move it and resize it
  And no control points are asked for, and no warp is computed
  And the status bar reads "backdrop: hand-placed image — not georeferenced"
```

> Decided 2026-09-22: the reference map is **reported by eye, never traced**, so a substitute backdrop
> needs no kilometre-accurate registration. Groundwork §6 quinquies.
