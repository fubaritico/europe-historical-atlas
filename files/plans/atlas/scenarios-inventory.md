# The atlas's scenarios — the inventory before writing them (ATLAS-324)

> Opened 2026-11-01, past midnight, at the dev's request: *« il faut qu'on commence à monter des scénarios parce qu'on va
> en avoir besoin […] j'ai envie qu'on ait exactement la même approche qu'avec le cartographeur »* — and they are meant to
> be handed to Claude Design. The atlas has never had its reader's gestures written as scenarios; the Cartographer has
> eighteen (`files/plans/cartographer/scenarii/`). **This file is the state of things, read from the code on
> 2026-11-01; the scenarios themselves are not written yet.** The split below was proposed and accepted in principle
> the same night; the dev stopped the session to fix the cities' names first.

## Where to resume

1. Load `/scenarii-to-code` (§1 the shape, §7 code → scenario), and this file.
2. Create `files/plans/atlas/scenarii/` in the Cartographer's shape: `s00-index.md`, one `sNN` a gesture or screen,
   `s99-holes.md` (the skill finds `s00` and `s99` by name).
3. Write **s04 (levels of detail) and s06 (cities) first** — what was built on 2026-10-31 and 2026-11-01 — then the
   others in order. Each scenario gets `> **Built <date> (<commit>, <ticket>)**`, and *walked* where the dev saw it on
   screen (his screenshots of 31/10 and 01/11; ATLAS-323 tested by him).
4. Strike, never delete, every plan line the code contradicts (list below), with a dated note.
5. Put every hole below in `s99`, one by one; they are the dev's to settle.

## The proposed split

| file | covers |
| --- | --- |
| `s00-index` | the shared background, the notation, the list |
| `s01-open-the-atlas` | the splash, the progress bar, the fade-in over the relief |
| `s02-navigate` | arrows, wheel, drag, the window's edges, the limits, the view kept across a reload |
| `s03-click-and-focus` | the click that recentres, the double-click into focus mode, Escape |
| `s04-levels-of-detail` | the four stops, the fade in time, the two thresholds |
| `s05-the-countries` | fills, borders, vassals, tribes, the countries' names and their watermark |
| `s06-the-cities` | marks, names, the names' reach by distance, a point yielding to a country's name, the layers' order |
| `s07-the-events` | pins, flat or 3D icons, the sway, the shadows |
| `s08-the-sheet-and-its-decor` | frame, title, graduations, compass rose, rivers, coasts |
| `s09-when-something-is-missing` | the notices, blocking or not |
| `s10-language-and-accessibility` | the language, reduced motion, the screen reader |
| `s99-holes` | what is not decided |

## What a reader can do or see — read from the code, 2026-11-01

`S/` = `packages/atlas/src/`, `C/` = `packages/core/src/`. Plan names are in `files/plans/atlas/`.

### Opening the page — none of it has a plan

- **The splash**: parchment page, « EUROPE » 42 px, a dark silhouette of Europe 300 px, « HISTORICAL ATLAS » 15 px,
  letters spread, every A a Λ — **always English** (`S/ui/splash.ts:224-244`, `C/utils/lettering.ts`).
- **Built behind it**: sheet, relief, coastline, rhumbs, rivers if in, compass rose — the bare relief never flashes; the
  splash fades over 420 ms (`S/loading/stages/startup.ts:39-60`, `splash.ts:72,259-267`).
- **The progress panel**, bottom centre: « Chargement de l'année 1100… », then « Tracé des territoires… », « Extension
  jusqu'aux côtes… », « Attribution des couleurs… », « Composition de la texture… », « Tracé des frontières… » (0–60 %),
  « Placement des noms des pays… » (60 %), « Pose des événements… » (95 %) — English per the locale
  (`startup.ts:63-102`, `S/loading/computeLabels.ts`).
- **The fade-in**: fills, tribes, borders, names, events and cities come in together over the relief in 700 ms; the
  rivers come when their file lands (`S/app/fadeIn.ts`, `frameLayers.ts:90-97`).
- **A year not authored** gets no names, said in the console only (`S/loading/stages/names.ts:168-175`).

### Navigating — `02`, `03`

- Arrow keys pan, opposite keys cancel, speed scaled to the distance, inertia on release (τ 0.12 s), bound on `window`
  (`S/controls/mapControlsInput.ts:23,48-50`, `mapControlsDrive.ts:53-62,106-129`).
- `+ = PageUp` / `- _ PageDown`: one zoom step (`mapControlsInput.ts:26-28,51-57`).
- Wheel / trackpad zooms with eased impulses; **ctrl+wheel is left to the browser** (WCAG 1.4.4) (`:77-83,79`).
- Left drag grabs the map, continues off the canvas, keeps the momentum (`:84-123`).
- **Edge scrolling** within 24 px of the window's edge, on by default (`S/app/viewport.ts:31,182`,
  `mapControlsDrive.ts:77-94`) — no `pointerleave`: leaving the window by an edge probably keeps scrolling (inferred).
- Zoom 0→1: distance 6→1, pitch 55°→30°, relief exaggeration 0.75→0.15 (`controlsState.ts:215-226`,
  `tunables/params/camera.ts:86-89`).
- The target is clamped to the map's extent; no yaw (`S/controls/cameraFraming.ts:77-115`).
- Any key, wheel or press during a flight stops it (`cameraFlight.ts:85-87`); keys are left to a form field
  (`S/utils/editableFocus.ts`).

### Click, double-click, Escape — `focus-mode`

- A click waits 250 ms (for a double-click), then flies 1400 ms to the point **at the current zoom**
  (`S/app/mapInteraction.ts:34,115-129`); a press that moved more than 4 px is a drag, not a click.
- A double-click enters **focus mode**: an arcing flight out to the whole sheet then into zoom 1 on the point; the way
  back is remembered once (`focusMode.ts:51-57`, `cameraFlight.ts:32-38`). Double-click in focus: target to target.
- A click in focus leaves it, flying to the point at the zoom held before; **Escape** flies back to the remembered view
  (`focusMode.ts:73-92`, `mapInteraction.ts:137-142`). Pan, drag, wheel keep the mode.
- Past the relief's edge a click does nothing. Reduced motion: flights arrive at once.
- **Nothing is clickable**: events, cities, countries — the picker answers « where » only (`mapInteraction.ts:68,94`).

### The view kept — `01 §0.2`

- `{target, zoom}` saved in sessionStorage on `beforeunload`, restored before the first frame, clamped
  (`S/controls/mapCameraStore.ts:53-75`); HMR the same way. A corrupt value: the framed default, a console warning.
- **Reload in focus mode**: the close view comes back, the mode does not — Escape then does nothing
  (`mapControls.ts:155`).

### The countries — `vassal-lod`, `country-names`, `tribe-feather`, `detail-levels`

- **Levels of detail**: stops at 0.45 / 0.65 / 0.8, entered at the stop, left 0.02 below; everything crosses over in
  0.6 s of time (`S/scene/detail/detailLevels.ts`, `detailView.ts`).
- **Vassals**: none, then direct, then all levels; a vassal wears its suzerain's colour afar, its own colour and border
  come in together (`frameLayers.ts:56-60`, `homageReveal.ts`).
- **Borders** cross from a wide parchment line afar to the close-up casing by zoom/0.4, widths 0.45→1, opacity 0.6→1, a
  blur to 1 px — **no plan** (`frameLayers.ts:108-134`, `borderStrokes.ts:82-84`).
- **Tribes**: colour vanishing inset over 30 km, no stroke (`tribeLayer.ts`, `C/editor/tribeFeather.ts`).
- **Names**: one level at a time, cross-fading; watermark 1 / 0.4 / 0.25 / 0.25; white edge whole to 0.1, gone at 0.4;
  tribes' names inverted; blur 0.6 px close up; full name where it reaches 4 cells, else the short one; drawn over the
  relief (`nameLayer.ts`, `C/data/shortName.ts`, `C/pipeline/namePlacement.ts`).

### The cities — `cities`, `detail-levels`

- Points: capitals, + large cities, all; names: none, capitals, all, all — a point a level before its name
  (`detailLevels.ts:58-87`, `cityMarkers.ts:130-144`).
- Marks: capital ring + 60 % rim around a dark point, 15 px; large city the same, 11 px; city a dark point, 6 px;
  constant size on screen (`S/scene/cities/cityMarks.ts`).
- Names: Fondamento 13/12/11 px, right of the mark, never in capitals, **always French** (`place.name.fr`,
  `S/scene/events/mapEventLayer.ts:79`).
- **Reach**: a name shows while its city is within 1.5 × the camera's distance to the centre (third level), 1.45→1.25
  across the last; 10 % margin to leave; 0.6 s fade; points stay (`S/scene/cities/nameReach.ts`).
- **A capital's point on a country's name afar** is hidden until its own name shows (`nameCover.ts`; ATLAS-323, tested
  by the dev).
- Order: over the relief with no depth test, under the events' markers; the per-level order switch exists, every level
  « over the names » since ATLAS-323 (`cityMarkers.ts:40-44,331`, `detailLevels.ts` `citiesOverNames`).
- A city outside the frame: not drawn, console warning.

### The events — no plan (tickets and the `/make-event-icon` skill only)

- Drawn once the year is, inside the fade-in; no place, no pin.
- Zoom 0.55→0.65: flat drawings cross-fade into 3D icons and pins; a flat drawing at least 20 px
  (`S/scene/events/icons/crossFade.ts`, `settings.ts`).
- Swords float 0.6 icon heights, face the camera, sway ±25° on 4 s, out of phase; tower = a trebuchet on the ground,
  fixed ¾ turn, throwing; crown faces the camera (`settings.ts:21-65`, `meshes/trebuchet.ts`).
- Halos behind icons, lights turning with the camera, ground shadows to the south-east following the slope, icon
  shadows drawn from the posed model; 3D icons blurred 0.75 px close up.

### The sheet and its decor — mostly no plan

- Rivers: every rank at every zoom; refused with a notice if their frame differs from the relief's.
- Coastline 0.6→1, rhumbs 0.16→0.06 with the zoom; compass rose at (0.2, 0.64), French wind letters (N · NE · … · NO).
- Paper sheet, graduated band one block a 2°, **French** degree letters (« 30°O »), title « EUROPE HISTORICAL ATLAS »
  with Λ, **English**; a wall around the map's edge (`S/scene/sheet/*`, `frameLabels.ts:51-60`).

### When something is missing — `07-robustness`

- Relief fails or anything escapes the startup: the splash stays, a **blocking** notice (alert, no close button)
  « Le relief n'a pas pu être chargé. La carte ne peut pas être affichée. » (`S/app/assetMessages.ts`, `ui/notice.ts`).
- Land mask fails: a degraded notice with « × », « La côte est déduite de l'altitude : les polders hollandais passent
  sous l'eau et les lacs fermés apparaissent comme des plaines. »
- Year fails: the countries and borders missing, the events still shown; rivers or events failing: the map without them.
- Wording by kind (« n'a pas pu être chargé », « est illisible », « est incomplet », « ne correspond pas à cette carte »,
  « a échoué ») plus a technical line `lang="en"`.
- **Any uncaught error**: blocking « Une erreur inattendue s'est produite. La carte peut être incomplète. » — **no plan**
  (`S/ui/errorNet.ts:57-72`).

### Language and accessibility — mostly no plan

- French if `navigator.languages[0]` is fr, English otherwise; only the progress text and notices are translated.
- Reduced motion (read once): inertia nearly off, flights instant, no splash or startup fade — **not honoured** by the
  levels' fades, the sword's sway, the trebuchet, the names' reach fade.
- Screen reader: splash and progress as status with labels, notices alert or status, labelled close — **the canvas has
  no role or name; focus mode is neither announced nor reachable by keyboard** (A11Y-301).
- The dev panel (lil-gui « europe-map · dev », Stats) exists in `pnpm dev` only.

## Plans the code contradicts — to strike with a dated note

1. **`03-camera-ux`**: WASD panning (only the arrows), on-screen camera buttons and a `CameraCommand` seam (none), yaw
   (none), fly-to at ~45° (close-up pitch is 30°), click-to-approach with a pose stack and Escape popping (replaced by
   focus mode). Also `05-decisions:16`.
2. **`01-foundations §0.2`**: position + quaternion + fov, throttled writes, `import.meta.hot.data` — the code saves
   `{target, zoom}` on `beforeunload`, HMR through sessionStorage.
3. **`focus-mode`**: `dip = sin(πt)` → the code uses `4t(1−t)`; the wiring names `src/mapInteraction.ts`, now
   `app/mapInteraction.ts`.
4. **`vassal-lod`**: a continuous zoom→level mapping with `revealStart` / `revealEnd` / `fade` sliders — replaced by the
   levels of detail and an on/off switch.
5. **`country-names`**: watermark « from 0.85 to 40 % » → per level 1 / 0.4 / 0.25 / 0.25 from 0.45; the short name « cut
   to initials (K. of France) » → the title dropped.
6. **`cities`**: decision 9's « larger and in capitals » (never capitals since 31/10); « What exists » (vassals 0.45→0.8,
   watermark from 0.85); « draws no city yet »; decision 2 (one threshold for the last order and the watermark).
7. **`detail-levels`**: decision 1 « three levels » (four since decision 7); decision 7's reaches superseded by decision 8
   and the later 1.5 / 1.45→1.25.
8. **`frameLabels.ts:12-13`**: « the only other text the reader ever sees is French » — no longer true since the i18n.
9. **`07-robustness` « Still to do: retry »**: not built — open work rather than a contradiction.
10. **`04-atlas-data:41-42`** « labels are clickable », **`02 §1.4`** a click « orients toward the point and moves
    closer » — nothing is clickable, a click only recentres.

## Holes — for `s99`, the dev's to settle

- **Mixed languages**: a French reader gets an English splash and title; an English reader gets French degree letters,
  wind letters and city names.
- **Reduced motion** not honoured by the levels' fades, the sway, the trebuchet, the names' reach fade (ATLAS-300 is
  about the icons).
- **Nothing is clickable** — events, cities, countries (`04` and `05` promised it).
- **Reload in focus mode** loses the mode; Escape then does nothing.
- **Edge scrolling** when the pointer leaves the window by an edge (inferred, to verify on screen).
- **Messages that can never show**: `yearRegistry…`, `yearPolicies…`, `yearBorders…` — every year failure is reported
  as `regions` (`political.ts:112,135`).
- **Unused code**: `camera/cameraState.ts` (persistence goes through `controls/mapCameraStore.ts`).
- Names that cannot be placed, or a face that fails: console only, no notice (`names.ts:69-108`).
