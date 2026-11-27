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

Read first: `/use-cartographer` (how an agent uses the Cartographer — its journal, local, says how the Pen behaves under my hands) and
`files/plans/cartographer/scenarii/s99-holes.md` from `H-36` on (what the tool still gets wrong).

## The surface method — the way to draw since 2026-11-27 (the Empire of 1200, CARTO-580)

> The dev, 27/11: _"extreme precision — no potatoes, no triangles"_, then _"precision, and speed: proceed as a machine,
> as a program"_. A plate at 1:9 M is ~3 km a pixel: it says **which** territories exist, never **where** their limit
> runs. The limit comes from open data that keeps old limits; the belonging from the CMS's sheets. 33 polities drawn
> the first evening (Holstein to Thuringia), the Empire's alerts from 1 966 to 1 290.

### The order of work — the dev's, 2026-11-27, compulsory

> _"Not just taking up my order: you build it into the way you must draw."_ The surface method below is HOW a polity is
> drawn; this is in WHICH ORDER, and what each laying must also do.

1. **The base is Cliopatria's map** of the year — its sovereigns, their lines, their Wikidata: a first draft, its
   political reading not binding (the dev, 27/11).
2. **Tier N-1 first: every direct vassal of each sovereign**, whatever its rank — duchy, march, county, bishopric,
   abbey, free town. The list is the base's, never my memory: the vassal links of 1200 (`direct_vassals.py`, the page
   `<year>/toutes-zones/resultats/vassaux-directs.md`; for the Empire, the vassals of the kingdom of Germany — 104 in
   1200). **Then N-2** (a county held of a duke: La Marck of Cologne, Leuchtenberg, Upper Lusatia…), each laid inside
   its N-1, never before it. **Careful with empires** (the dev, 27/11): the Empire has **kingdoms between it and its
   princes** — Germany, Italy, Burgundy-Arles, Bohemia — more an organisation of the territory than a holder's bond (the
   evidence system's « territory it depends on », not « the bond »). Read the base's chain before counting a tier, and
   accept the progressive fragmentation of the Empire as it is.
3. **Every laying also corrects the border between sovereign states** where the vassal reaches it: a vassal at its
   sovereign's edge carries that edge to its own limit, and the neighbouring sovereign's line moves with it — no
   Cliopatria straight line is left where a vassal has been laid (Prignitz inside Cliopatria's Denmark, 1200).
4. **Precision by zone**: **Western Europe exact** (commune limits, no geometric line); **Central Europe as exact as
   the data allows**; the farther from Europe, the more Cliopatria's lines are acceptable — _"sometimes we will have no
   choice, and it won't matter much; in some parts it matters a lot."_
5. **A vassal with too few sheets for the vote starts from the dev's previous map, never waits** (the dev, 27/11:
   _"if you understood it, make it intelligible in the skill"_). Its outline on his map of the year before (his 1100
   for 1200: Bavaria, Swabia, the two Lotharingias, Carinthia…), **minus what has split off since** and is already laid
   (Bavaria of 1200 = his Bavaria of 1100 without Austria and Styria), cut by the suzerain's domain with `compose.py`
   (`{"rings": <file>}`), checked against the public-domain plate of the period (Shepherd 1911, pl. 72, the Empire under
   the Hohenstaufen). The research of its places is launched at the same time and **corrects the outline afterwards,
   without blocking it** — the vote takes over once the sheets are there. Never district patches (Brandenburg of 1200:
   6 sheets, three islands).
6. **The same retracing for France and Spain** after the Empire (the dev, 27/11) — every sovereign of Western Europe.
7. **No holes: a duchy is laid as a frame** (the dev, 28/11: _"on the map we cannot have holes"_) — the region of the
   two plates (Shepherd pl. 72; Beidler 2019 p. 61, a reference), its lands with no lord read held by the frame
   (`accept_all`); the king's towns cut out as enclaves of the Empire; **a prince inside a frame keeps the suzerain the
   base gives it** (Trier under the Empire, never under Lorraine — my call, the dev having left it to me, 28/11), laid
   with `over` so it is carved out of the frame. A vassal too small or too deep is hidden in the atlas, never undrawn
   (CARTO-588).

1. **The data** (once, on the archive disk, `outils/geodata/`, each with its licence in `geodata.py`): BKG DLM250
   (named rivers, Germany) and VG250 (communes), GISCO NUTS 3 (districts, Europe), HydroRIVERS (steps of 500 m —
   outside Germany only). `compose.py` keeps two pickles in `outils/geodata/cache/` (delete one to rebuild it).
2. **A spec per polity** (`compose.py`, its header): the polity's registry fields (ids from the CMS's territory and
   Wikidata — `band-specs.py` in `cartes/1200/hre/` writes a whole band of them), **`{"vote": [NUTS districts]}`** —
   each commune goes to the holder most of its sheets name; a commune with no sheet follows its neighbours; a commune
   with only sheets naming no prince stays out — and `within` the suzerain. Add or remove districts and communes by hand
   only where the vote cannot know (Hadeln, saxon, left out of Bremen).
3. **`compose.py <spec> [--emit]`** cuts by the suzerain's own domain (minus its vassals, minus foreign polities, plus the
   polity's own present surface when it is redrawn), **takes its sea** (the suzerain's sea nearest its coast, 40 km,
   teeth under 1.5 km cut), drops points doubling an anchor, checks every 1200 sheet of the box, draws `plan.png`, and
   with `--emit` writes `ops.json`. **It refuses** while a sheet naming no prince falls inside — research it, or
   `accept` it with why, or `accept_in` the list of a backfill researching it (CARTO-585).
4. **A band in one go**: `after` lists the plans composed before (taken out of the domain), so a whole band is composed
   by one shell loop, smallest polities first, then laid by one call in the page.
5. **Lay it** (`serve.py <folder> --port 87xx`, then in the page `await import('http://127.0.0.1:87xx/<f>/page-ops.js')`,
   `await ops.load()`, `await ops.run(0, n)`): `ring` is **`placeRing`** (CARTO-584, the coder's: one history step, an
   anchor within 1 m reused, no snap, the Pen's closing — a vassal carved); `replace` is `replaceRun`; `pen` is the old
   click-by-click. A polity redrawn: `pilot.removeRings` its rings, then `placeRing` the new ones.
6. **Measure, before and after, always the same export**: `pnpm cities:alerts --map 1200 --box=…` from `main` (before)
   and from the drawing tree (after), `overlaps.mjs`, `shape.mjs` (its « spikes » are the corners of commune limits).

**What it costs**: ~4 s to compose a polity, under 1 s to lay it; the time is in choosing the districts.

**The traps met on 27/11** — each one cost a run:

- **zsh splits no variable into words**: `set -- ${=e}`, never `set -- $e` (a loop of NUTS pairs ran on one argument).
- **Wikidata answers 403 to Python without a `User-Agent`** header.
- **The page's anchor indices are not the file's**: the save renumbers. Find an anchor by its exact position.
- **Two positions within 1 m of one anchor**: `placeRing` refuses (rightly, nothing written) — `compose.py` drops them.
- **A modern commune can hold two lords' places** (Unna, Ense, Hamm…): the vote gives it to the majority; the minority
  stays a witness on the wrong side, said in the report, never forced.
- **A polity redrawn must get back its own surface** in the domain (the carve took it out of the lord's): fixed in
  `compose.py`.
- **An allegiance or a witness is not a holder** (`/enter-in-cms`): 447 sheets of 1200 held « by the king » on one
  witness line drew Wistedt into Bremen — the refusal of step 3 exists for that.

## Licence — before anything

A plate is one of the **verification layers** of a year — the whole method, base layer first: `/use-cartographer`,
`references/layers.md`.


**Every plate is a source of the year, and goes through `/create-data-mention` before the first stroke**: its licence
decides whether it is a **calque** (traced: a public-domain or free plate, Shepherd 1911 for one) or a **référence**
(read for the facts, the geometry drawn by us on the public-domain backdrop). Euratlas, the Duby atlas and every atlas
in copyright are **références, never calques** (memory `euratlas-data-and-licensing`). So a plate in copyright is
not traced here: it is read, and the polity drawn by hand. `years/1100/` is tracked and published — check
`git status` before any commit after a drawing session.

## Setup (once per session)

```bash
# the historian's tools live on the archive disk, never on the Mac (/find-sources, « The archive »)
O=/Volumes/Acer/atlas-historien/outils; python3 -m pip install -q --target $O/python numpy scipy scikit-image shapely
K=.claude/skills/draw-from-plate/scripts   # every script below is run with $O/py <script> (pillow is there already)
```

- **Plates**: `files/resources/euratlas/plates/plates.json` (gitignored), one entry per screenshot — image,
  meridians' x, parallels as `[y, lat]`. A new screenshot: `grid.py <image>` prints the graticule lines;
  read the labels on the image, add the entry. Shape: `assets/plates.example.json`.
- **The page**: the dev's own Cartographer (`pnpm dev:cartographer`) — find it by its page title
  (`/use-cartographer`), the port moves; never start a second one. Wait
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

**The Euratlas 1100 test drawing** (night of 2026-10-14, 137 polities) is out of the site, kept only in the git history
(`rules/known-issues/data.md`) — Euratlas is a reference, never traced into a published year. **`years/1100/` is his 1100
rebuilt from Cliopatria** (06/11, `b02ce87`), edited by him: `git status` before touching it. The night's defects, each
with the tool it asks for: `files/plans/cartographer/general-test-night.md`, and
`files/plans/cartographer/scenarii/s99-holes.md` from H-36 on.

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
