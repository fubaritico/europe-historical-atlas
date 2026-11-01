# 99 — Holes: what is not decided

> [Index](s00-index.md) · **the deliverable**, as in the Cartographer's set. A hole is a decision nobody has taken yet,
> found by trying to describe what the atlas does. **Each one is the dev's to settle**; when he does, the entry says
> *Settled <date>*, with his words, and the scenario it changes. Ids are prefixed `A-` so they never meet the
> Cartographer's `H-`.
>
> Opened 2026-11-01 with the holes of the inventory (`../scenarios-inventory.md`) and those found writing the ten
> scenarios.
> Each carries the scenario that found it, a severity (blocking / worth knowing / cosmetic) and the way out.

## Found writing s04 and s06

### A-01 · A large city's point hidden at the second level by a name no longer shown there — ATLAS-327

> **Settled 2026-11-01** by the dev: a fix ticket, in *À faire* — the rule held to the first level.

**Read in the code, not seen on screen.** ATLAS-323 hides a point *that has no name yet* when it falls on a letter of a
country's name **seen from afar** (`cities/nameCover.ts` reads `levels[0]`, the first level's names; `cityMarkers.ts`
applies it to every order). At the second level a large city has its point and no name, so a large city whose point lies
where an afar name stood is hidden there — though the names shown at that level are placed for the direct vassals and
gone to a 40 % watermark, and the cities are drawn over them. The dev's words and the plan speak of *a capital's point*,
*afar*. **Severity: worth knowing** — a few large cities missing at the second level. **Way out**: the rule held to the
first level (the names whole), or checked against the names of the level shown. [s06](s06-the-cities.md).

### A-02 · « Réduire les animations » is not read by the levels' fade, nor the names' reach fade

The system's setting is read once at startup (`prefers-reduced-motion`) and honoured by the inertia, the flights, the
splash and the startup's fade — not by the 0.6 s fade of a level change, nor the names' fade in and out of reach, nor
the swords' sway and the trebuchet (ATLAS-300, in Idées, is about the icons). **Severity: worth knowing** (WCAG 2.3.3
is AAA; a fade of 0.6 s is no vestibular trigger, the sway may be). **Way out**: the fades at once under the setting, one
line in `detailView` and the reach follower. [s04](s04-levels-of-detail.md), [s06](s06-the-cities.md).

### A-03 · The cities' names are French for every reader

`name.fr` is read whatever the language (`events/mapEventLayer.ts`); the content file carries no other. Part of A-05.
[s06](s06-the-cities.md).

### A-04 · The stops and the fade are defaults, tuned on sight

0.45 / 0.65 / 0.8 and 0.6 s (`../detail-levels.md`, « Not decided »). Not a defect: a reminder that a change is a row of
the table. **Severity: cosmetic.** [s04](s04-levels-of-detail.md).

## From the inventory — the other scenarios will cite them

### A-05 · The languages are mixed

A French reader gets an English splash and an English title on the sheet (« EUROPE HISTORICAL ATLAS »); an English reader
gets French degree letters (« 30°O »), French wind letters on the compass rose, French cities' names. Only the progress
text and the notices are translated. **Severity: worth knowing.** **Way out**: decide whether the title and the splash are
a brand (one language, chosen) or text (translated), then the rest follows — ATLAS-266 holds the language's choice.

### A-06 · Nothing is clickable

Events, cities, countries answer no click; the picker answers *where*, never *what* (`app/mapInteraction.ts`). `04-atlas-data`
promised clickable labels, `02 §1.4` a click that orients and moves closer. **Severity: worth knowing** — it is the atlas's
end goal (a region clicked shows an event). **Way out**: ATLAS-147 (who holds this point) in Backlog.

### A-07 · A reload in focus mode keeps the close view and loses the mode

`{target, zoom}` is restored, the focus is not; ‹escape› then does nothing (`controls/mapControls.ts`). **Severity:
cosmetic.** **Way out**: keep the mode and its way back with the view, or reopen out of focus at the remembered view.

### A-08 · The pointer leaving the window by an edge may keep the map scrolling — ATLAS-326

> **Settled 2026-11-01** by the dev: *"if it's just a mouseleave and a window blur, let's go"* — the pointer
> forgotten when it leaves the page, the held keys forgotten when the window loses the focus (a held arrow at a
> cmd+tab stays pressed today, same family). Ticket in *À faire*.

Edge scrolling within 24 px of the window's edge listens to no `pointerleave` — **inferred from the code**; **the dev, 2026-11-01**:
*"even [in Total War], there's the same problem"* — the behaviour is known to him, and a strategy game of reference shares
it (his observation, not checked here). **Severity: worth knowing.** **Way out**: stop the edge scroll on `pointerleave`
and on `blur` — or keep it as games do.

### A-09 · Messages that can never show

`yearRegistry…`, `yearPolicies…`, `yearBorders…` exist in the notices' catalogue, but every failure of a year is reported
as `regions` (`loading/stages/political.ts:112,135`). **Severity: cosmetic.** **Way out**: report each by its own kind, or
remove the three.

### A-10 · Failures the console alone hears

Names that cannot be placed, a face that fails, a city's name that cannot be drawn: a console message, nothing on screen
(`loading/stages/names.ts`, `cities/cityMarkers.ts`). **Severity: worth knowing.** **Way out**: a degraded notice, as for
the land mask — `rules/error-handling.md`, the dev's call. The proposal of 28/10 for the names is still open.

### A-11 · Code no one calls

`camera/cameraState.ts` — the view is kept by `controls/mapCameraStore.ts`. **Severity: cosmetic.** **Way out**: remove
it; the plan lines of `01-foundations §0.2` are struck (2026-11-01).

## Found writing s02 → s10

### A-12 · A kept view of the wrong shape is dropped with nothing said — ATLAS-328

> **Settled 2026-11-01** by the dev: a fix ticket, in *À faire* — the same console warning for both cases.

A kept view that is valid JSON but lacks its zoom or its target opens the whole sheet, and the console says nothing
(`controls/mapCameraStore.ts`, `isMapCameraState` → `null`); one that is not JSON warns « MapCameraStore: load failed ».
Found writing [s02](s02-navigate.md). **Severity: cosmetic** — only our own code writes that value. **Way out**: the same
warning for both — an error-handling decision (`rules/error-handling.md`), touched the day the file is.

### A-13 · A comment says the countries' names are in capitals

`cities/cityLabel.ts` (`CITY_NAME_TYPE`'s JSDoc, and the module's header) justifies the cities' small letters by *« the
countries' names are »* in capitals — they are not: written as entered, mixed case, the panel's `capitals` switch off
(`loading/stages/names.ts:49`; chosen on the bench 28/10). Found writing [s05](s05-the-countries.md); I had copied it into
s06 and `cities.md` first. **Severity: cosmetic** — a comment someone trusts instead of reading the code. **Way out**: the
JSDoc reworded with the true reason (a capital's name in capitals fought the countries' names afar), the next time the
file is touched or in this chantier's commit.

### A-14 · The events' file lost, the cities go with it, and the notice names the events only

> **Confirmed 2026-11-01** by the dev: the file carries places as well as events, and events carry their own place — so
> the notice should name both. No ticket asked yet.

Since 30/10 the cities ride in the content file beside the events; a failure of that file reads « Les événements n'ont
pas pu être chargés. La carte s'affiche sans ses événements. » while the cities are gone too. Read from the code, not
provoked. Found writing [s09](s09-when-something-is-missing.md). **Severity: cosmetic** — the notice understates. **Way
out**: the loss reworded to name the places too (« sans ses événements ni ses lieux »), one line of the two catalogues.