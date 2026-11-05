# Copy and paste between maps — a polity, an outline, a sheet — CARTO-345

> **Asked by the dev, 2026-11-03**: copy from one map into another what the second lacks, and put one polity's outline
> or sheet onto another polity. **Three copies kept** (the dev, same day): **a whole polity**, **an outline onto an
> existing polity**, **a sheet onto an existing polity**. Left out for now: a suzerain with its vassals at once, and an
> outline from one polity onto another within the same map.
>
> **Any map to any map** (the dev, same day: *"it has to speak to every case"*). A map is a folder of `years/`
> (`s19`), whatever it was made as — a year, a backup, an automatic save, a copy saved with *Save a copy*; the map it is
> pasted into may be the same year, another year (much does not change from one year to the next: 1101 can start from
> 1100 with polities taken out), or a map started empty. The scenarios name a **source map** and a **target map**,
> never a particular one.
>
> **Status: scenarios proposed, to be validated by the dev before any code.** The decisions he has to take are at the
> end, with my proposal; nothing in them is his until he says so.

## The combinations

| source map | target map | what is particular |
| --- | --- | --- |
| a year (`1100`) | another year (`1200`, `1101`) | the sheet's dates may say the polity does not exist in the target's year |
| a backup, a copy (`1100-backup-2026-11-02`) | the map it was saved from (`1100`) | the same year; ids may differ if one of them was imported (Cliopatria) |
| an automatic save (`1100.autosave.<date>`) | the map it saved (`1100`) | taking back what a later gesture lost |
| any map | a map started empty | no neighbour, no coast to weld onto: the paste is the first geometry |
| any map | itself | out of this plan — ‹ctrl+V› there asks the « name already in the map » question |

**The first use, measured 2026-11-03**: from `1100-backup-2026-11-02` (144 polities, 58 481 points — his drawing and
Natural Earth, no Euratlas, so every point may be copied) into `1100` (106 polities, 28 108 points, from Cliopatria):
the Baltic tribes, the Irish kingdoms (Ireland is empty), his hand-drawn Poland (167 points) over Cliopatria's (82).
**122 of the backup's 144 ids are absent from `1100`** — so a polity is never matched across maps by its id: the dev
says where it goes.

**A pasted outline shares no point with its new neighbours**, nor with the target's coast: its anchors are another
table's. Left as they are, they give doubled borders, slivers and overlaps — the second geometry `s00` forbids. Hence
the weld at paste (below), built on `core/editor/anchorWeld.ts`, which welds one anchor today.

## Paste in place — the rule every paste follows (the dev, 2026-11-03)

- **Every pasted point arrives at its own coordinates**, longitude and latitude unchanged: the two maps share one
  backdrop, so an outline falls where it was. Nothing is smoothed, simplified or shifted.
- **What was pasted stays selected**, as it has just arrived: the author may move it — that is his business, not
  the paste's.
- **No preview, no validation** (the dev, 2026-11-03: *"you paste, that's all; if there's a problem, ctrl+Z —
  simple"*): the paste is written at once, the weld and the cut with it, and the status bar says what was done — how
  many points, how many welded, what was cut. One ‹ctrl+Z› takes it all back. A paste that cannot be made writes
  nothing and says why. **The weld is the one
  exception to « in place »**: a pasted point within the weld distance of a point of the target map is replaced by
  that point — the target's point stays, the pasted one goes — so a pasted point moves by that distance at most, and
  always towards the target map.
- **One pastes what one selected** (the dev, same day: *"you'll spend the time you thought you'd save cleaning up"*):
  - **a stretch** — anchors selected on an outline: pasted onto a polity of the target map, **its two ends hook onto
    that polity's outline and the stretch between them is replaced** — the gesture ⟨retracer⟩ already makes
    (`core/editor/retrace.ts`, a neighbour sharing the stretch follows), its new run taken from the clipboard instead
    of the pen. The rest of the outline does not move: nothing to realign. QGIS's *Reshape Features* is the same
    gesture (« State of the art » below). Second in the order of work since 2026-11-04 (below);
  - **a whole polity** — clean only on free ground (an empty Ireland, a map started empty); elsewhere it is cut by
    what is there, as QGIS's *Avoid overlap* cuts a new polygon by its neighbours.

## Several polities — copied together, never edited together (the dev, 2026-11-03)

- **Several polities are selected in `{Polities}` only**, never on the map — ‹cmd›-click adds or removes one,
  ‹shift›-click a run of the list (‹ctrl› off a Mac).
- **As soon as two are selected, no outline is**: the map shows no anchor selected and no tool edits anything. An
  outline is edited one polity at a time, always — the dev: *"otherwise it becomes Illustrator, where you must watch
  what you select"*; and no groups.
- **What a multiple selection is for is copying**: every sheet and every outline of it, pasted into another map each
  as a whole polity (copy 1 below), in one step of the history.

## The menu bar — CARTO-239 enters this plan (the dev, 2026-11-03)

The pastes are many and depend on what the clipboard holds, so they live where software keeps them: a menu bar at the
top of the Cartographer, **Fichier** and **Édition** first. **Every item shows its shortcut, as any software does** — the
Mac's symbols on a Mac (⌘Z, ⇧⌘Z), ‹Ctrl› elsewhere (Ctrl+Z, Ctrl+Maj+Z); both keys are already heard everywhere
(`canvas/navigation.ts`, `persistence/saveShortcut.ts`). An item that cannot act now is greyed, never hidden.

| menu | item | shortcut | active when |
| --- | --- | --- | --- |
| Fichier | Ouvrir… | ⌘O | always |
| Fichier | Enregistrer | ⌘S | always (exists) |
| Fichier | Enregistrer sous… | ⇧⌘S | always |
| Fichier | Enregistrer une copie… | — | always |
| Édition | Annuler *‹the step's name›* | ⌘Z | a step behind (exists) |
| Édition | Rétablir *‹the step's name›* | ⇧⌘Z | a step ahead (exists) |
| Édition | Copier | ⌘C | one polity, several polities, or a stretch selected |
| Édition | Coller les entités | ⌘V | the clipboard holds one polity or several |
| Édition | Coller le tronçon sur *‹the selected polity›* | ⌘V | the clipboard holds a stretch and one polity is selected |
| Édition | Coller la fiche sur *‹the selected polity›*… | ⇧⌘V | the clipboard holds one polity and one polity is selected |
| ~~Édition~~ | ~~Coller le tracé sur *‹the selected polity›*…~~ — struck 2026-11-05, the dev: no outline replacement, a whole outline is a stretch | ~~⌥⌘V~~ | — |

**What it looks like** (the dev, 2026-11-03, a screenshot of Illustrator's *Window* menu on a Mac): a dense list,
one line per command — its name on the left, its shortcut on the right in the Mac's symbols (⇧⌘F9), a tick before an
option that is on, a ▶ for a submenu, thin separators between groups, greyed commands still shown. Proportions taken
from it; the colours stay ours (`theme.css`). The bar is **inside the page**, as on Windows — a Mac puts an
application's menus in the system's bar, a web page cannot.

**The shortcut converter** (the dev, same day: *"a component that takes the command and converts it"*): each command's
keys are **written once**, in one table — `{ key: 'V', command: true, shift: true }` — and three things are read from
it, so they can never drift apart:
- **what the menu shows**, by the system: on a Mac the symbols in Apple's order, ⌃⌥⇧⌘ then the key (⇧⌘V); elsewhere
  words joined by « + » (Ctrl+Maj+V in French, Ctrl+Shift+V in English);
- **what a screen reader is told** (`aria-keyshortcuts`, both systems' forms);
- **what the keyboard listens for** — ‹cmd› or ‹ctrl›, as today.

The system is **read once at the root** (`navigator.userAgentData?.platform`, else `navigator.platform`) and handed
to the converter — injected, so a test gives it « Mac » or « Windows ». **Read as anything but a Mac, it shows Ctrl**:
both keys work everywhere, so a wrong guess shows the other system's label, never a shortcut that does nothing
(**the dev's call**, 2026-11-03, on my proposal — `rules/error-handling.md`, a substitution, said once in the console). **The shortcuts written by
hand today move onto it**: the stacking menu (`ui/utils/stackingShortcut.ts`, Mac symbols only) and the top bar's
hints (`Editor/i18n/*.json`, « ⌘S / ctrl+S » both at once).

**‹⌘V› is the one obvious paste for what the clipboard holds** — polities, or a stretch onto the selection; the other
two are always reached by their own keys or the menu. The keys ⌘O, ⇧⌘S, ⇧⌘V and ⌥⌘V are **my proposal** (none is
taken in the Cartographer: checked in `saveShortcut.ts`, which leaves ⇧⌘S out on purpose for *Save as…*); the
inventory of the other menus (Affichage…) stays CARTO-239's, with the dev.

## How it works on screen — one clipboard, three pastes

- **Copy**: a polity selected (in `{Polities}` or on the map), or anchors selected on an outline, ‹ctrl+C›, or
  « Copier » in its menu. The status bar says what was copied, and from which map.
- **The clipboard follows the tab** from one map to the next, as the view already does (`persistence/carriedView.ts`,
  `sessionStorage`): *Open…* reloads the page, the clipboard is still there.
- **Three pastes, three gestures**:
  - ‹ctrl+V› — what the clipboard holds: **a stretch**, onto the polity selected in the target map; **a whole
    polity**, a new polity of the target map, at its place;
  - ~~« Coller le tracé » in the menu of a polity of the target map — **the outline onto it**~~ — struck 2026-11-05:
    a whole outline is copied as a stretch and pasted with ‹ctrl+V› (below);
  - « Coller la fiche… » in the same menu — **the sheet onto it**, field by field.
- **Each paste is one step of the history**: one ‹ctrl+Z› takes it back whole, weld and cut included.

## Scenarios

The names between `< >` are placeholders, never keys (keys are written ‹ctrl+V›): `<source map>` and `<target map>`
are any two maps of `years/`, `<copied polity>` the copied polity, `<target polity>` a polity of the target map.
**No new key**: the paste is ‹ctrl+V› only (single letters are taken — ‹Q› doubles ‹P›, ‹W› doubles ‹R›).

**The scenarios live in [`scenarii/s22-copy-paste.md`](scenarii/s22-copy-paste.md)** since 2026-11-03 — one home, where
`/scenarii-to-code` reads them and marks what is built.


## The order of work — each step verified and committed alone

1. **The clipboard and Copier**: one polity, a stretch; carried by the tab from one map to the next; its refusal said.
2. **The shortcut converter, then the menu bar, Fichier and Édition**, every item with its shortcut shown for the
   system it runs on — the home every paste below lands in; the stacking menu and the top bar's hints move onto the
   converter in the same step.
> **Order changed by the dev, 2026-11-04**, trying steps 1 and 2 in his Cartographer: *"you select the country,
> ctrl+C, you open the other file, ctrl+V — there, you've copied the country; by default it appears at the top of
> the list in {Polities}"* — and *"if one cannot paste, it is not finished"*. Copy alone gave him nothing to do: the
> **whole polity's paste comes first**, the stretch's second.

3. **Paste a whole polity** — **first since 2026-11-04**, at the top of `{Polities}`'s list; in place, welded at 2 km, cut by what is there, its suzerain kept or dropped, the
   question of a name already in the map.
4. **Paste a stretch onto an outline** — ⟨retracer⟩ fed by the clipboard.
5. ~~**Paste an outline onto a polity** — in place of its own, or as one more island.~~ — **struck by the dev,
   2026-11-05**: *"there is no outline replacement; to replace one, delete it in the target and paste the other. No
   hybrid cases: you paste, there is nothing, it takes the place; there is something, we weld."* A whole outline is
   copied as a stretch (step 4), and three pastes remain: **a polity, a stretch, a sheet**.
6. **Paste a sheet onto a polity** — the dialogue, field by field.
7. **Several polities selected in `{Polities}`**, no outline selected, copied and pasted together.

> **Order changed again by the dev, 2026-11-05**: the name-conflict dialogue sends the author to the paste of a
> stretch, so a polity's paste shipped alone would point at a gesture that does not exist — *"implement every case of paste before
> the user journey through the UI"*. Hence **every paste of steps 3 to 7 is built first, in `core`, with its tests**;
> the menu items, the dialogues and the walk in the app come after, all together.

## Decisions for the dev — my proposal for each

| what | my proposal | the alternative | by |
| --- | --- | --- | --- |
| a pasted polity over ground already held: who wins | **the target wins**: the paste takes the free ground only, the rest is cut and said — what is there was drawn or cleaned by hand. To let the paste win, the author first removes the target polity's outline, then pastes (the dev: *"and if you don't like it, ctrl+Z"*) | the paste wins, and the target's polities are carved | **the dev**, 2026-11-03, on my proposal |
| a polity pasted into a year its dates leave out | **pasted, nothing said** — the dates do not matter to a paste (the dev: *"it's a productivity gesture, to save time"*, like the cities: comfort while drawing) | pasted and said (my proposal) · refused | **the dev**, 2026-11-03 |
| paste in place; what is pasted stays selected | — | — | **the dev**, 2026-11-03 |
| no preview, no validation: pasted at once, the weld and the cut with it, ‹ctrl+Z› if wrong | — | a preview with ‹entrée› / ‹échap› (my proposal, refused) | **the dev**, 2026-11-03 |
| ~~a stretch pasted onto an outline, first in the order of work~~ — **reversed**: the whole polity first | — | — | **the dev**, 2026-11-04 (2026-11-03 on my proposal) |
| a pasted polity appears **at the top of `{Polities}`'s list** | — | — | **the dev**, 2026-11-04 |
| a pasted polity whose name is already in the map | **refused by a dialogue** that says two polities cannot bear the same name, and explains how to carry only the outline over: copy the whole outline in the source map as a stretch, select the polity in `{Polities}` here — its outline deleted first if it is to be replaced — and ‹ctrl+V› | — | **the dev**, 2026-11-05 |
| a stretch pasted onto a polity | **nothing drawn → it takes the place** (a whole outline only); **something drawn → it is welded** — no « Coller le tracé », no hybrid case | « Coller le tracé », replace or add as an island (struck) | **the dev**, 2026-11-05 |
| a part of an outline pasted onto a polity already drawn | **merged into its outline**: its two ends welded onto it, the path between them replaced, as ⟨retracer⟩ does (the dev: *"it needs a merge, a fusion"*) | lying apart as an open line — a new kind of object in the document (my alternative, not taken) | **the dev**, 2026-11-05, on my proposal |
| the weld distance | **2 km** on the ground, edge points and coast points alike, each welded onto the nearest point or stretch — one constant, tuned by use (the dev: *"it's a matter of practice and trial"*) | a distance set at the paste, in a field | **the dev**, 2026-11-03, on my proposal |
| an outline added as an island over the polity's own | **kept as two rings, nothing said** — the overlap is seen; the author needs the outline and disposes of it, the weld repairing (the dev: *"what would you merge? it makes a big mess"*) | merged into one ring · the overlap said in the status bar (my proposal) | **the dev**, 2026-11-03 |
| one polity at a time, or several | **several, selected in `{Polities}` only, copied together and never edited together**: two selected, no outline is | one only (my proposal) | **the dev**, 2026-11-03 |
| where the pastes live | **a menu bar, Fichier and Édition** (CARTO-239 enters this plan), each item with its shortcut as in any software | the other map's `{Polities}` (impossible: one map open at a time) | **the dev**, 2026-11-03, on my proposal |
| the new shortcuts ⌘O, ⇧⌘S, ⇧⌘V, ⌥⌘V | as in the table above | — | **the dev**, 2026-11-03, on my proposal |
| the shortcuts shown by the system the Cartographer runs on, through one converter | — | — | **the dev**, 2026-11-03 |
| a system read as anything but a Mac shows Ctrl, said once in the console | — | refuse to show shortcuts | **the dev**, 2026-11-03, on my proposal |
| the clipboard cannot be written | **said in red in the status bar**, nothing copied, the console says why — a declared refusal, never a silent one (`rules/error-handling.md`) | — | **me — proposed** |

## State of the art

- **QGIS, *Reshape Features*** — replaces part of a polygon's boundary with a line drawn from the boundary and back to
  it; **QGIS, *Avoid overlap*** (snapping options) — a new polygon is cut by the existing ones of the layer. Read on
  the QGIS training manual, « Feature Topology »: https://docs.qgis.org/3.40/pt-PT/docs/training_manual/create_vector_data/topo_editing.html
  (found, 2026-11-03). The manual warns that reshape does not by itself keep shared borders consistent — which our
  anchors shared by index do.
- **Illustrator, *Paste in Place*** — the dev's reference for the Cartographer's gestures: what is pasted keeps its
  position and stays selected (from memory, the dev's own use).

**Related, not built**: CARTO-254 (the dev, 2026-10-18) — weld an *origin* outline onto a *target* outline at once,
the origin taking the target's points. The weld at paste is that gesture, run on what was just pasted; the day
CARTO-254 is built, both use one function.

## Not in this plan

- A suzerain with its vassals at once; an outline from one polity onto another in the same map (the dev, 2026-11-03).
- Cities and events: they are not in the map, they are in the CMS.
