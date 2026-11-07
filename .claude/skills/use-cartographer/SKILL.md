---
name: use-cartographer
description: Draw or retouch a map in the Cartographer through the dev's Chrome — a polity, a border, a vassal, an island, a coast — with the Pen and the white arrow, then check the result in the file and in the Cities panel. Use whenever asked to draw or change something on a map, in French or English, with or without the word Cartographe.
when_to_use: « dessine », « dessine ceci dans le Cartographe », « dessine-moi la Navarre », « retouche », « retouche la frontière », « retouche ceci dans le Cartographe », « corrige la carte », « déplace la frontière », « fais passer la frontière entre … et … », « trace », « ajoute un pays / un vassal / une île », « ferme le contour », « mets cette ville du bon côté », « applique tes recherches à la carte », draw, retouch, trace, move a border, fix the map. For copying a plate of a historical atlas, /draw-from-plate first, then this.
metadata:
  author: europe-map
  version: '1.0'
---

# Using the Cartographer, as an agent

The Cartographer (`packages/cartographer`) is the dev's 2D editor of the maps the atlas publishes. An agent uses it as
he does: **through his Chrome** (the `claude-in-chrome` tools), on **his** dev server — never by writing `polities.json`
by hand, which would bypass the document model's shared anchors. The outcome of a session is a map changed exactly where
asked, **nothing else moved**, proved in the file.

The detailed record of every session so far — what was tried, what failed, the numbers — is
[`references/journal.md`](references/journal.md) — **local, never committed** (the dev, 2026-10-12; excluded in
`.git/info/exclude`), so absent from a clone. **Read it before a first drawing session, and whenever a gesture
below does not behave as written.** Add your own dated section to it at the end of each session.

## Before anything — the rules of the 14/10 night (they cost a page, a frame rate and drawings)

1. **One writer per map.** A map open in a tab **saves itself two seconds after every gesture** (`AUTOSAVE_DELAY_MS`,
   `persistence/autosaveKeeper.ts`) — the map itself, plus a `<map>.autosave.<date>` copy. Two tabs on one map overwrite
   each other. So **the dev closes his Cartographer tab before you draw** — ask him, and wait for his yes. Another agent
   drawing (the historian, the code session) is the same: one session at a time on `years/<map>/`.
2. **Never reload or drive the dev's tab.** Open your own (`tabs_create_mcp`), close it when done. Never two of your
   own tabs on the Cartographer: a second one beside his killed his page once, and his frame rate (43 → 13 images/s).
3. **Copy the map before touching it**: `cp -R packages/atlas/public/years/<map> packages/atlas/public/years/<map>.before-<who>-<date>`
   (git-ignored). Every gesture lands on disk within two seconds; this copy is the only way back outside ‹⌘Z›.
4. **Find his server, never start one**: read the page title on each port first —
   `curl -s localhost:<port>/ | grep -o '<title>[^<]*</title>'` for 5173–5176; the Cartographer's is
   « Cartographer — Europe Historical Atlas ». Its port moves with the launch order (REPO-383). The CMS is on 3100.
5. **Drawing is facts, not tracings.** A plate in copyright (Euratlas, Duby) is read, never traced; a public-domain or
   CC plate may be (`/draw-from-plate`). Every historical choice you make is said to the dev — it is his to settle.

## Plan outside the browser, then draw

A retouch is decided before the first click, in the file:

- **Where things are**: the towns' coordinates from the CMS base, read-only —
  `sqlite3 "file:packages/cms/cms.db?mode=ro"` (`place_periods`, `places`). The map's polities and rings:
  `years/<map>/polities.json` (rings are lists of anchor indices) and `anchors.json`.
- **Who holds what now**: point-in-ring for each town on the saved file; the anchors of the shared border between the
  two polities (the indices both rings hold, contiguous).
- **Simulate the change on a scratch copy** and re-test every town before the first click. On 2026-11-07 the simulation
  found a third town on the wrong side that the panel had not shown.
- Scratch scripts go in the session's scratchpad, never in the repository.

## Opening, aiming, saving

- **Open a map**: `http://localhost:<port>/?map=<map>` (a folder of `years/`, e.g. `1100`), or _Open…_ in the top bar.
  **Wait for the backdrop** (« Préparation du fond de carte… », « Preparing the backdrop… » in English, ~10 s, and it only progresses in the tab in front):
  a click or a wheel notch sent before is lost or lands elsewhere. Screenshot first, act after.
- **Calibrate**: hover two far-apart points, read longitude/latitude in the status bar (whole minutes, ±1.4 km), and
  check against border corners visible on screen. The projection is Mercator: x linear in longitude, y linear in
  `ln(tan(π/4 + φ/2))`. The file's anchors, projected, are better targets than the eye.
- **Zoom before acting** — the tools wait for a zoom where a snap is ~10 km; the wheel zooms by notches and **drifts**:
  zoom, screenshot, find the place again, zoom. Pan with the arrow keys on the focused canvas (any tool in hand).
- **Save**: the map saves itself (rule 1). ‹⌘S› / _Save_ writes it at once; _Save as…_ (‹⌘⇧S›) makes another map.
  The file's date is the proof (`ls -la years/<map>/`) — the bar may say nothing.

## The gestures that work

- **Tools**: ‹P› the Pen, ‹A› the white arrow (anchors), ‹R› ⟨retracer⟩; ‹space› held borrows the hand.
- **Hover, wait a second, read the status bar, then click.** The bar names what a click will do, in the page's language (English shown here) — « Following the
  coastline for X », « Following the Rhône », « Inserting a point into X », « Closing the outline of X »,
  « Branching from a shared anchor ». A click sent with the pointer move arrives before the hover is computed.
- **Insert, then move — never in one drag.** With the Pen: hover a stretch, wait for « Inserting a point into X »,
  click. Then the white arrow: hover the new handle, drag it. A press-and-drag with the Pen inserts nothing.
- **Moving a shared anchor moves it for both polities** — that is how a border is moved without a gap.
- **Following**: two consecutive clicks on the same coast, river or neighbour's ring insert everything between them, the
  shorter way. Water wins over an anchor at the click. Click along a long thin island, not round it.
- **A neighbour is drawn on its neighbour's anchors** (blue dots with the Pen in hand), never beside its outline.
- **‹Backspace›** takes back the last anchor under the Pen; **‹⌘Z›** undoes a gesture — fifty times is a safe way back,
  and the automatic save then writes the undone state.
- **A new polity**: `[+]` in the action bar at the foot of {Polities}; fill **rank, status, suzerain and colour** as you go — a polity without them is
  not drawn as the dev expects. A polity's islands are part of it.
- **After a doubtful click, move the pointer away and look for the rubber band** (the blue line from the last anchor):
  « Branching from a shared anchor » on hover alone means nothing was started.

## Verify — in the panel, then in the file

- **{Cities} is the live check**: a town's name leaves red the moment the border passes it. Its advanced filters (the
  funnel) list the towns of one holder by the sources; « Pas encore sur la carte » lists the holders the map lacks.
- **Diff the file against your copy**: the anchor count, the list of polities whose rings changed (only those asked),
  the shared run still contiguous (`set(ringA) & set(ringB)`). Then re-run the point-in-ring test on every town.
- **Close your tab**, and tell the dev in a few lines: what moved, which towns changed side, every historical choice, and
  what was left (a point planned and not needed is a better border — say it).

## After the session

- Add a dated section to [`references/journal.md`](references/journal.md): what worked, what did not, the numbers.
- A gesture walked goes into its scenario (`files/plans/cartographer/scenarii/sNN-…`), marked walked with the date; a
  surprise into `s99-holes.md`. A gesture that failed is a ticket (`/trello`, Idées), never a silent workaround.
- Never commit `years/` yourself: the dev decides what is published (`known-issues/data.md`).

## Gotchas

- **A hidden tab does not draw**: Chrome stops `requestAnimationFrame` in a tab not in front — every hover waits.
- **River names are the dataset's**: `Schelde`, `Maas`, `Sane` (the Saône), not French.
- **A coast click that inserts nothing is a straight line** across the cape it skipped: bisect the stretch — never
  between two coast points far apart over land.
- **The view does not stay under the pointer while zooming** — re-find the place after each notch.
- **Key text**: `Backspace`, not `BackSpace`; ‹⌘› is `cmd` in the key tool.
