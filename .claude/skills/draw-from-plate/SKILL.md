---
name: draw-from-plate
description: Draw polities in the Cartographer from a georeferenced plate of a historical atlas (traced only when its licence allows; a plate in copyright, Euratlas included, is read as a reference), one polity at a time, reusing neighbours' anchors, and check each against the plate before the next. Use when copying a map into the Cartographer, tracing a reference, the "general test" / répétition générale, drawing a duchy, a vassal or a kingdom from a plate, or when the dev pastes atlas screenshots to draw.
allowed-tools: Bash Read Write Edit
metadata:
  author: europe-map
  version: "1.0"
---

# Draw from a plate

Written after the general test of 2026-10-13 (Euratlas 1100 copied into the Cartographer, 16 polities). The
dev, watching me redraw Navarre three times: *"prends ton temps — tu vas à toute vitesse, du coup tu dois
recommencer"*. Then, on Barcelona drawn the slow way: *"quand tu prends ton temps, ça va mieux"*. **The
procedure below is the slow way. Do not skip a step to go faster: every skipped check cost a redraw.**

Read first: `files/plans/cartographer/drawing-as-claude.md` (how the Pen behaves under my hands) and
`files/plans/cartographer/scenarii/s99-holes.md` from `H-36` on (what the tool still gets wrong).

## Licence — before anything

**Every plate is a source of the year, and goes through `/create-data-mention` before the first stroke**: its licence
decides whether it is a **calque** (traced: a public-domain or free plate, Shepherd 1911 for one) or a **référence**
(read for the facts, the geometry drawn by us on the public-domain backdrop). Euratlas, the Duby atlas and every atlas
in copyright are **références, never calques** (memory `euratlas-data-and-licensing`). So a plate in copyright is
not traced here: it is read, and the polity drawn by hand. `years/1100/` is tracked and published — check
`git status` before any commit after a drawing session.

## Setup (once per session)

```bash
S=<scratchpad>; python3 -m venv $S/venv && $S/venv/bin/pip install -q pillow numpy scipy scikit-image shapely
K=.claude/skills/draw-from-plate/scripts   # every script below is run with $S/venv/bin/python
```

- **Plates**: `files/resources/euratlas/plates/plates.json` (gitignored), one entry per screenshot — image,
  meridians' x, parallels as `[y, lat]`. A new screenshot: `grid.py <image>` prints the graticule lines;
  read the labels on the image, add the entry. Shape: `assets/plates.example.json`.
- **The page**: the dev's own Cartographer (`pnpm dev:cartographer`, usually `http://localhost:5174/`) — find the
  port his server is on, never start a second one. Wait
  for the backdrop. Inject the helpers in one line with the browser's JavaScript tool — Vite serves the file:
  `(0,eval)(await (await fetch('/@fs/<repo>/.claude/skills/draw-from-plate/scripts/page-helpers.js')).text());
  await __d.calib()`. Re-inject after any reload (Vite reloads the page when the Cartographer's code changes).

## The procedure — one polity, all six steps, then the next

> **Steps 2–3 (`plan.py`, colour seeds, `auto`/`autoC`) take geometry from the plate: only for a calque.** For a
> **référence** — a plate in copyright, Euratlas included — the plate is read for facts and the outline is drawn by
> hand on the public-domain backdrop.

1. **Read the plate.** `ruler.py <image> x0 y0 x1 y1 <scale> out.png` enlarges the area with a pixel grid.
   Identify the polity's colour (`px.py`), its neighbours already drawn, its coast, and anything odd: an
   enclave, a county inside it, a label sitting on a border.
2. **Plan, and look at the plan.** `plan.py '<spec>' ops.json preview.png` extracts the outline by colour and
   sequences the gestures: `free` points, `coast` clicks, `shared` runs (a neighbour's ring), `close`. **Open
   the preview** — shared runs are drawn in full. Spec: `{"name","id","img","seeds":[[x,y,tol],…],"dp":1.5,
   "close":4,"share":5,"smooth":5}`; `id` is excluded from the neighbours (pass the polity's id when
   redrawing it). Then `check` what the plan says against the enlarged plate.
3. **When the plan is wrong, compose the steps by hand** — it is often faster than tuning the spec. Read
   points on the grid image (enlarged px → plate px → lon/lat with `plates.plate(key)`), and take
   neighbours' anchors with `anchors.py <polity> lon,lat [lon,lat]`. Barcelona, Cerdanya and Besalú were
   all drawn this way.
4. **Draw.** Create the polity (`__d.newPolity(name)`), then each step with `__d.hoverAt` + `__d.click` and
   **read the status sentence of every step**, in the page's language — fr: « Départ d’une ancre partagée » (an
   anchor will be reused), « Suit … » (a water snap), « Fermeture du contour », « Dessin dans … » (a free point);
   en: `Branching from a shared anchor`, `Following the <water>`, `Closing the outline`, `Drawing in`. **The helpers
   match the English sentences and labels** (« New polity », « OK »): run them in a page set to English, or update
   their patterns. A step whose
   sentence is not the one expected is a defect to fix now, not later. ‹ctrl+S› at the end (`__d.save()`).
5. **Check against the plate.** `check.py <id>` — shared anchors and overlap with each polity: a neighbour
   drawn beside instead of on shows `shared=0`. `overlay.py <plate> x0,y0,x1,y1 out.png id,id,…` — the saved
   rings over the plate, enlarged. **Look at it.** Fix before going on.
6. **Dress it in the dialog.** Double-click its row in `{Polities}` → *Edit polity*: Rank, Suzerain (a vassal),
   Colour (type the hex in the field). The Design-system lists are clicked with the mouse (their options are
   not reachable from a script). ‹ctrl+S›. Show the dev, then the next polity.

Order: draw a polity's **neighbours first**, so its borders are reuses, not new lines. A vassal inside its
lord is drawn after the lord.

## Gotchas — each one cost a redraw on 2026-10-13

- **A colour mask leaks through rivers and text.** Light blue rivers and dark labels cross every realm: a seed
  on them floods the map. Seed only on flat colour (`px.py` first), keep `tol` ≤ 30, never seed a light blue
  region. A plan whose preview is a frame around the map is a leak.
- **A shared run can overshoot** past where the polity leaves the neighbour (Barcelona over Cerdanya's crest):
  read the preview's red runs end to end; cut by hand at the junction.
- **Two rings holding both clicked anchors** — the Pen follows one without saying which (`H-43`). Aim first at
  an anchor only the wanted ring holds.
- **A river-sourced anchor is taken by the river click** (`anchorOverWater`): hovering it says *Following the
  <river>*, and that is right — the anchor is reused. A border-follow from it needs the next anchor clicked
  one by one.
- **Closing fires early**: the last free point near the first anchor triggers *Closing the outline*. Drop the
  last point when it is within ~8 px of the start; and to follow a neighbour's ring back to the start, click
  the anchor **before** the first one, then the first.
- **After a close, a click starts a new outline.** `Escape` clears it.
- **Recreating a polity loses its rank, suzerain and colour** — redo step 6.
- **The Pyrenees crest drawn from one plate is ~5 km off another** — plates differ by a few km; measure,
  don't chase it.

## What exists already (update at the end of a drawing session)

**137 polities of Euratlas 1100** drawn on the night of 2026-10-14, kept in `years/1100.euratlas-137b/` (the reference
of CARTO-237); `years/1100/` started from it and is now the dev's year, edited by him (`git status` before touching
it). Everything the eight plates cover is drawn,
vassals and sub-vassals included, with rank, status, suzerain and the plate's colour from
`files/resources/euratlas/meta-1100.json` (applied by `apply-meta.py` after a save, then a reload). Not drawn, no plate:
the Finns, Chudes, Mordvins, Burtas, Cheremiss; Norway, Sweden, Novgorod cut at 60°N, the Almoravids at 32°N. The night's
defects, each with the tool it asks for: `files/plans/cartographer/general-test-night.md`, and `files/plans/cartographer/scenarii/s99-holes.md` from H-36 on.

## Tools added on the night of 2026-10-14

- `scripts/night-helpers-ext.js` — inject after `page-helpers.js`. A hidden tab gets no
  `requestAnimationFrame` and timers throttled to one a minute: the file ticks on a `MessageChannel`. Adds `ring`
  (steps by kind, closed by searching for *Closing*), `island`, `islandAt`, `coastRun` (adaptive: bisects a coast
  click that inserted nothing — **never across land between two far coast points**, it took lakes once), `river`,
  `auto`/`autoC` (play a `plan.py` plan from `files/resources/euratlas/ops/`).
- A long script outlives the browser tool's 45 s: start it as `(async()=>{…; window.__f=log})()` and poll.
- **‹ctrl+z› ×N is the way back** from a script that went wrong — the history held the night.
- `files/resources/euratlas/euratlas-1100-entities.json` — the 138 entities of Euratlas 1100 with title, rank and
  `dependsOn` (private reference). **Euratlas's entity pages swap the empires' names** against the plates.
