# 01 — Opening the atlas: the relief first, then the rest at once

> [Index](s00-index.md) · no plan of its own — the order was decided on screen by the dev, 2026-10-29: *"the map in relief, it's good that we get it first. And then everything appears at once in a fade, with the loading bar showing clearly everything that is going on"*. Two bakes rather than one is his call too: Europe appearing early reads
> better than a blank parchment for the whole load — the cost, it bakes twice.
>
> **Built**: the splash in September (before the workspace split of 24/09), the progress panel's words in French and
> English with ATLAS-159, **the stages on 2026-10-29** (`164080c`). **Walked**: the stages by the dev on 29/10, the
> evening he asked for them; the splash's lettering is older and not walked again since. The code:
> `atlas/src/loading/stages/startup.ts`, `ui/splash.ts`, `ui/progressOverlay.ts`, `app/fadeIn.ts`.

## The splash

```gherkin
Scenario: the page opens on the splash
  When I open the atlas
  Then a parchment page fills the window
  And on it, centred on one measure: « EUROPE » above, a dark silhouette of Europe 300 px wide, « HISTORICAL ATLAS » below
  And the letters are spread, and every A is drawn as a Λ
  And a screen reader hears it as a status, the silhouette hidden from it, the title naming it
```

> **Always in English**, whatever the reader's language (`ui/splash.ts`, `core/utils/lettering.ts`) — a hole of
> [s99](s99-holes.md) (A-05): is the title a brand or a text?

```gherkin
Scenario: behind the splash, the sheet and the relief are built
  Given the splash shown
  When the relief, the land mask and the first bake are in
  Then the sheet, the relief, the coastline, the rhumbs and the compass rose are drawn — and the rivers, if their file is in
  And the splash fades out over 0.42 s, on Europe in relief
  And the bare relief, untextured, never shows
```

> The first bake is awaited before the relief's mesh is built: a mesh built while the texture is still in the worker
> takes no map and shows as bare material colour — the flash this order exists to remove.

## The bar

```gherkin
Scenario: one bar tells everything that follows
  Given the splash gone, the relief on screen
  Then a panel at the bottom centre reads « Chargement de l'année 1100… » over a thin bar
  And as the year is computed it reads each step as it runs — « Tracé des territoires… », « Extension jusqu'aux côtes… »,
      « Attribution des couleurs… », « Composition de la texture… », « Tracé des frontières… »
  And then « Placement des noms des pays… », and last « Pose des événements… »
  And the bar fills across them: the year to 60 %, its names to 95 %, the events to the end
  And none of the year's layers shows yet
```

> **The shares are Claude's estimate, not a measure** of the dev's browser (`STARTUP_SPLIT`): the year about 3 s, the
> names about 3 s in their worker under Node. To retune once timed on his screen. In English for an English reader
> (« Loading the year 1100… », « Drawing the territories… »…). A screen reader hears the panel as a status, the bar as a
> progress bar with its value.

## All of it at once

```gherkin
Scenario: the year comes in over the relief in one fade
  Given the bar full
  Then the bar goes
  And the countries' fills, the tribes, the borders, the countries' names, the events and the cities come in together,
      over 0.7 s
  And the level of detail of the zoom is shown from the first frame, with no fade of its own (s04)
```

```gherkin
Scenario: the rivers come when their file does
  Given the rivers' file slower than the relief
  Then the map is shown without them
  And they are drawn as soon as their file lands, without waiting for the year
```

```gherkin
Scenario: under « réduire les animations »
  Given the system's « réduire les animations » on
  When I open the atlas
  Then the splash goes at once, with no fade
  And the bar jumps from value to value rather than gliding
  And the year's layers are there at once, with no fade
```

## What this does not do

- **A year not authored gets no countries' names**, said in the console only (`loading/stages/names.ts`) — today every
  published year is authored (1100), so no reader meets it.
- **When the relief fails, the splash stays** under a blocking notice — in [s09](s09-when-something-is-missing.md).
- **The bar's shares are not measured** on the dev's machine; an uneven bar is the estimate, not a fault.
