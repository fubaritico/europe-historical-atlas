# Atlas — scenarios

> Opened 2026-11-01 (ATLAS-324), at the dev's request: *"we have to start building scenarios because we are going to need them […] I want exactly the same approach as with the Cartographer"* — and they are meant to be
> handed to Claude Design. The Cartographer's set is the model (`../../cartographer/scenarii/`).
>
> **Written from the code, then checked against what the dev saw.** The atlas was built for six weeks on chapters
> (`../01-foundations.md` … `../07-robustness.md`) and on his word in the moment, never on gestures. So each scenario says
> **when it was built** (commit, ticket) and **whether it was walked** — seen on screen by the dev — and the code is the
> evidence of behaviour, not of intent: where the code does something nobody asked for, the scenario says so. The
> inventory these were written from, with the files and lines: [`../scenarios-inventory.md`](../scenarios-inventory.md).

## How to read these

| notation | means |
| --- | --- |
| `‹key›` | a keyboard key |
| *zoom 0.45* | the camera's zoom, `0` the whole sheet, `1` the closest (`controls/controlsState.ts`) |
| « … » | a text the reader sees, quoted exactly as the code writes it |
| `> **Built …**` | when and where it shipped; *walked* when the dev saw it on screen |

**A scenario that cannot be written without inventing an answer is a hole**, and it goes in
[`s99-holes.md`](s99-holes.md) rather than being patched over — one entry a hole, the dev's to settle.

## The background every scenario shares

```gherkin
Background:
  Given the atlas open in a desktop browser, on the year 1100
  And its 113 cities and its events loaded from the content file
  And the dev panel closed (it exists under `pnpm dev` only)
```

## Defaults, and the few real constraints

Most numbers in these scenarios are **defaults tuned on sight** — a stop's zoom, a fade's length, a size in pixels. They
change by a value in a table, and a scenario quoting one is not a law about it. The constraints are the few the dev set
as rules:

- **The zoom is a scroll with stops, not a slope** (31/10): what the map shows changes at a stop, in a fade in time.
- **The importance that orders the map is political** (30/10), and the religious seat counts as political (31/10).
- **A country's name comes first** (01/11): a point with no name yields to it.
- **Nothing is shown more certain than it is** (DESIGN-262) — not drawn yet; no scenario here may contradict it.

## The scenarios

| # | file | what it covers | state |
| --- | --- | --- | --- |
| 01 | [open the atlas](s01-open-the-atlas.md) | the splash, the progress, the fade-in over the relief | written 01/11 |
| 02 | [navigate](s02-navigate.md) | arrows, wheel, drag, the window's edges, the limits, the view kept across a reload | written 01/11 |
| 03 | [click and focus](s03-click-and-focus.md) | the click that recentres, the double-click into focus mode, ‹escape› | written 01/11 |
| 04 | [levels of detail](s04-levels-of-detail.md) | the four stops, the fade in time, the two thresholds | written 01/11 |
| 05 | [the countries](s05-the-countries.md) | fills, borders, vassals, tribes, the countries' names and their watermark | written 01/11 |
| 06 | [the cities](s06-the-cities.md) | marks, names, their reach by distance, a point yielding to a name, the layers' order | written 01/11 |
| 07 | [the events](s07-the-events.md) | pins, flat or 3D icons, the sway, the shadows | written 01/11 |
| 08 | [the sheet and its decor](s08-the-sheet-and-its-decor.md) | frame, title, graduations, compass rose, rivers, coasts | written 01/11 |
| 09 | [when something is missing](s09-when-something-is-missing.md) | the notices, blocking or not | written 01/11 |
| 10 | [language and accessibility](s10-language-and-accessibility.md) | the language, reduced motion, the screen reader | written 01/11 |
| 11 | [the language button](s11-the-language-button.md) | the interface: a button that unfolds the languages, kept for the next visit — **not built** (ATLAS-329) | written 02/11 |
| 12 | [the help button](s12-the-help-button.md) | the interface: every gesture with its key, a short walkthrough opened by itself at the first visit — **not built** (ATLAS-135) | written 02/11 |
| 13 | [the navigation pad](s13-the-navigation-pad.md) | the interface: a nine-key pad above the button bar, the keyboard's commands, two contextual corners — **not built** (ATLAS-149) | written 02/11 |
| 14 | [the snapshot](s14-the-snapshot.md) | the interface: a PNG of the view, framed like the sheet, a cartouche with the year and the credits — **not built** | written 02/11 |
| 15 | [choosing the century](s15-the-century.md) | the interface: « ‹ XIᵉ siècle › » at the top, a list of twenty, the undrawn greyed — **not built** (ATLAS-150) | written 02/11 |
| 99 | [holes](s99-holes.md) | what is not decided | open |
