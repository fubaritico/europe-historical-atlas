# 01 — Opening the atlas: the splash and its one bar, until the first map is whole

> [Index](s00-index.md) · the order decided by the dev on 2026-11-08 (ATLAS-333, `files/plans/atlas/year-switch-speed.md`):
> the splash stays, its bar taking stock, until the first map is wholly laid — the screens of Claude Design, content
> before graphic design. ~~The relief first, then everything at once in a fade (29/10)~~ — replaced that day. Two bakes
> rather than one stays his call of 29/10.
>
> **Built**: the splash in September (before the workspace split of 24/09), the progress panel's words in French and
> English with ATLAS-159, the stages on 2026-10-29 (`164080c`), **the splash kept with one measured bar on 2026-11-08**
> (ATLAS-333). **Walked**: by me in Chrome on the built site, 08/11 (« Composing the texture… 9 % », « Cutting the
> territories… 81 % », « Placing the countries' names… 95 % », then the whole map); not yet by the dev. The code:
> `atlas/src/loading/stages/startup.ts`, `loading/startupBar.ts`, `ui/splash.ts`, `ui/progressOverlay.ts`.

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

> ~~**Behind the splash, the sheet and the relief are built** — and the splash fades out on Europe in relief, the bar
> then telling the year over the bare relief, which the year's layers fade in over (29/10).~~ **Replaced on 2026-11-08 by
> the dev** (ATLAS-333): *"the sequence must be exactly the one in the screens Claude Design made — first the splash with
> the loading bar; as long as the first map is not loaded, 1100 by default, the splash stays, with the bar taking stock of
> the progress"*. For now the splash stays the plain one below; the screens' graphic design comes later — *"for now it
> is the content that must be the same"*: the title, the step running, the bar, its percentage.

```gherkin
Scenario: the splash stays until the first map is wholly laid
  Given the splash shown
  When the relief, the land mask and the first bake are in, and the sheet, the relief and its decor are built
  Then the splash is still there, and the bar with it
  And it stays while the year 1100 is read, its countries cut, its borders, names and events laid
  When the events are pinned
  Then the bar is full, and the splash fades out over 0.42 s on the whole map — relief, countries, borders, names, events
  And the bare relief never shows on its own, untextured or without its year
```

> The first bake is still awaited before the relief's mesh is built: a mesh built while the texture is still in the
> worker takes no map and shows as bare material colour.

## The bar

```gherkin
Scenario: one bar on the splash tells every step of the opening
  Given the splash shown
  Then under the title it reads the step running, over a bar, with its percentage beneath — « 0 % » to « 100 % »
  And it reads in turn « Chargement du relief… », « Composition de la texture… », « Mise en relief… »,
      « Chargement de l'année 1100… », « Découpe des territoires… », « Tracé des frontières… »,
      « Placement des noms des pays… », « Pose des événements… »
  And the composition of the texture moves the bar row by row
  And each step is on screen before the work it names holds the page
  And the bar never goes back
```

> **The shares are measured, not estimated** (2026-11-08, Chrome, the built site served locally, two startups of
> ~5.9 s): the relief downloaded and handed to the worker 9 %, the texture composed 39 %, the relief raised with the
> sheet and decor 27 %, the year read 6 %, its countries and tribes cut 12 %, its borders 2 %, its names 5 % — the events
> are a file already loaded by then. In English for an English reader (« Loading the relief… », « Raising the relief… »,
> « Cutting the territories… »…). A screen reader hears the step as a status, the bar as a progress bar with its value.
>
> **Declared gap**: the download's bytes are not counted — its step ends at once at its end. Served locally it is a
> tenth of a second; online it may be the longest wait. Counting them needs the relief's and the mask's readers to report
> their bytes (core's data ports) — the next rung, ATLAS-333.

## All of it at once

> ~~**The year comes in over the relief in one fade** of 0.7 s, once the bar is full (29/10).~~ **Replaced on
> 2026-11-08**: the splash's own fade is the one reveal — the year's layers are whole under it before it goes.

```gherkin
Scenario: the map is whole the moment the splash goes
  Given the bar full
  Then the countries' fills, the tribes, the borders, the countries' names, the events and the cities are all there
      as the splash fades
  And the level of detail of the zoom is shown from the first frame, with no fade of its own (s04)
```

```gherkin
Scenario: a change of year keeps its own small bar
  Given the atlas open
  When I pick another year
  Then a panel at the bottom centre reads « Chargement de l'année 1200… » over a bar, the map staying on screen
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
