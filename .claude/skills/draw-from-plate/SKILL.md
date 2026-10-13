---
name: draw-from-plate
description: Draw polities in the Cartographer from a georeferenced reference plate (a screenshot of a historical atlas, Euratlas 1100 so far), one polity at a time, reusing neighbours' anchors, and check each against the plate before the next. Use when copying a map into the Cartographer, tracing a reference, the "general test" / répétition générale, drawing a duchy, a vassal or a kingdom from a plate, or when the dev pastes atlas screenshots to draw.
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

A plate from Euratlas, the Duby atlas or any copyrighted atlas is a **reference, never a source to publish**
(memory `euratlas-data-and-licensing`). The year drawn from it stays local: `years/` is never committed, and
at the end of a test the year is moved aside as `years/<year>.<name>/` and the dev's own year put back.

## Setup (once per session)

```bash
S=<scratchpad>; python3 -m venv $S/venv && $S/venv/bin/pip install -q pillow numpy scipy scikit-image shapely
K=.claude/skills/draw-from-plate/scripts   # every script below is run with $S/venv/bin/python
```

- **Plates**: `files/resources/euratlas/plates/plates.json` (gitignored), one entry per screenshot — image,
  meridians' x, parallels as `[y, lat]`. A new screenshot: `grid.py <image>` prints the graticule lines;
  read the labels on the image, add the entry. Shape: `assets/plates.example.json`.
- **The page**: the dev's Cartographer runs on `http://localhost:5174/` — never start a second server. Wait
  for the backdrop. Inject the helpers in one line with the browser's JavaScript tool — Vite serves the file:
  `(0,eval)(await (await fetch('/@fs/<repo>/.claude/skills/draw-from-plate/scripts/page-helpers.js')).text());
  await __d.calib()`. Re-inject after any reload (Vite reloads the page when the Cartographer's code changes).

## The procedure — one polity, all six steps, then the next

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
   **read the status sentence of every step**: `Branching from a shared anchor` (an anchor will be reused),
   `Following the <water>` (a water snap), `Closing the outline`, `Drawing in` (a free point). A step whose
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

16 polities of Euratlas 1100 in `years/1100/` (the dev's own 1100 kept in `years/1100.avant-test-euratlas/`):
the Franks, the Empire, England, Hungary, Poland, Bohemia (vassal of the Empire), Normandy, Brittany,
Flanders, Toulouse (vassals of the Franks), León-Castile, Pamplona-Nájera, Aragon-Navarre, Barcelona,
Cerdanya, Besalú. Next on the Ebro: Zaragoza (its plan found `shared=0` at `share 5` — check it), Lérida,
Tortosa. Then Aquitaine, Burgundy-Provence, Italy, Scandinavia, Scotland, Wales, Ireland, the Almoravids,
Byzantium.
