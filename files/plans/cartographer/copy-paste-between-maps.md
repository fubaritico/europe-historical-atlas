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
    gesture (« State of the art » below). **The paste that saves time — first in the order of work**;
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
| Édition | Coller le tracé sur *‹the selected polity›*… | ⌥⌘V | the clipboard holds one polity and one polity is selected |

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
  - « Coller le tracé » in the menu of a polity of the target map — **the outline onto it**;
  - « Coller la fiche… » in the same menu — **the sheet onto it**, field by field.
- **Each paste is one step of the history**: one ‹ctrl+Z› takes it back whole, weld and cut included.

## Scenarios

The names between `< >` are placeholders, never keys (keys are written ‹ctrl+V›): `<source map>` and `<target map>`
are any two maps of `years/`, `<copied polity>` the copied polity, `<target polity>` a polity of the target map.
**No new key**: the paste is ‹ctrl+V› only (single letters are taken — ‹Q› doubles ‹P›, ‹W› doubles ‹R›).

```gherkin
Feature: copy and paste between maps

Background:
  Given the map <source map> is open

Scenario: copy a polity
  When I select <copied polity> in {Polities}
  And I press ‹ctrl+C›
  Then the status bar reads « Copié : <copied polity>, de <source map> — ‹ctrl+V› dans une autre carte pour le coller »
  And nothing in the map changes, and the history gains no step

Scenario: the clipboard follows the tab to another map
  Given <copied polity> is copied
  When I open <target map> with Open…
  Then the status bar reads « Dans le presse-papier : <copied polity>, de <source map> »

Scenario: copying replaces what was copied
  Given <copied polity> is copied
  When I select another polity and press ‹ctrl+C›
  Then the clipboard holds that polity only

Scenario: nothing selected, nothing copied
  Given no polity is selected
  When I press ‹ctrl+C›
  Then the status bar reads « Sélectionnez une entité politique ou un tronçon à copier »
  And the clipboard keeps what it held

Scenario: select several polities in {Polities}
  When I click a polity in {Polities}, then ‹cmd›-click two others
  Then the three are selected in the list
  And no anchor is selected on the map, and no tool edits an outline
  And Édition › Copier is active

Scenario: copy and paste several polities
  Given three polities are selected in {Polities} of <source map>
  When I press ‹cmd+C›, open <target map> and press ‹cmd+V›
  Then the three are pasted, each as « paste a polity » pastes one
  And one ‹cmd+Z› removes the three

Scenario: the menu says what can be pasted
  Given the clipboard holds a stretch
  When I open Édition
  Then « Coller le tronçon sur … » is active when one polity is selected, greyed otherwise
  And « Coller les entités », « Coller la fiche… » and « Coller le tracé… » are greyed
  And every item shows its shortcut, ⌘ on a Mac, Ctrl elsewhere

# 1 — a whole polity

Scenario: paste a polity onto free ground
  Given <copied polity> is copied from <source map>
  And <target map> is open, with no polity on the ground <copied polity> covers
  When I press ‹ctrl+V›
  Then <copied polity> is a polity of <target map>, at the same place, selected
  And its sheet is the copied one: name, short name, rank, status, colour, Wikidata id, dates
  And each of its points keeps its source, declared in <target map> if <target map> did not have it
  And where its edge comes within the weld distance of a neighbour's or of the coast, it takes their points
  And the status bar says how many points were pasted, and how many welded to their neighbours
  And one ‹ctrl+Z› removes it, and <target map> is as before

Scenario: paste a polity into a map started empty
  Given <target map> holds no polity
  When I press ‹ctrl+V›
  Then <copied polity> is pasted with its own points, nothing to weld onto, and the status bar says so

Scenario: a pasted tribe takes the inner band
  Given <copied polity> has the rank « tribe » in its sheet
  When I paste it into <target map>
  Then it is drawn with the inner band, as every tribe of <target map>

Scenario: paste a polity over ground already held
  Given <target map> has <target polity> over part of what <copied polity> covers
  When I press ‹ctrl+V›
  Then the pasted outline is cut where it overlaps <target polity>: <target polity> keeps its ground
  And the status bar says how much was cut, and from whom

Scenario: paste a polity into a year its dates leave out
  Given <copied polity>'s sheet says it exists from 1120
  And <target map> is the year 1100
  When I press ‹ctrl+V›
  Then <copied polity> is pasted, its dates as they were, like any other paste
  And nothing is said about its dates: the paste is a gesture of comfort while drawing, not a check

Scenario: paste a polity whose suzerain is not in the map
  Given <copied polity> is a vassal of a polity whose id <target map> does not hold
  When I press ‹ctrl+V›
  Then <copied polity> is pasted as sovereign
  And the status bar reads « Collé souverain : son suzerain, <its name>, n'est pas dans cette carte »

Scenario: paste a polity whose suzerain is in the map
  Given <copied polity> is a vassal of a polity whose id <target map> holds
  When I press ‹ctrl+V›
  Then <copied polity> is pasted as that polity's vassal, and carved out of it as a vassal is

Scenario: paste a polity whose name is already in the map
  Given <target map> already has a polity named as <copied polity>
  When I press ‹ctrl+V›
  Then a question reads « <target map> a déjà <copied polity>. Coller son tracé sur elle, ou en faire une seconde entité ? »
  And [Coller le tracé] does what « Coller le tracé » does
  And [Seconde entité] pastes it under a new id, its name followed by « (2) »
  And [Annuler] changes nothing

Scenario: paste twice
  Given <copied polity> was pasted into <target map>
  When I press ‹ctrl+V› again
  Then the question of a name already in the map is asked

# 2 — an outline onto an existing polity

Scenario: copy a stretch
  When I select anchors that follow one another on <copied polity>'s outline
  And I press ‹ctrl+C›
  Then the status bar reads « Copié : un tronçon de <copied polity>, <n> points, de <source map> »

Scenario: paste a stretch onto a polity's outline
  Given a stretch of <copied polity> is copied from <source map>
  And <target map> is open, with <target polity> drawn otherwise over the same ground
  When I select <target polity> and press ‹ctrl+V›
  Then the stretch's two ends hook onto the nearest anchors of <target polity>'s outline
  And the part of <target polity>'s outline between them is replaced by the stretch, its points at their coordinates — the
    smaller change, as ⟨retracer⟩ chooses
  And a neighbour whose outline ran over the whole replaced part takes the stretch too, as ⟨retracer⟩ does
  And the pasted points are selected
  And the status bar says how many points were pasted onto <target polity>
  And one ‹ctrl+Z› gives <target polity>'s outline back — the way to undo a wrong side, too

Scenario: a stretch whose ends are too far from the outline
  Given an end of the copied stretch lies farther than the weld distance from <target polity>'s outline
  When I press ‹ctrl+V›
  Then nothing is pasted, and the history gains no step
  And the status bar reads « Ce bout est à <d> km du tracé de <target polity> : rien n'est collé »

Scenario: a stretch refused where ⟨retracer⟩ would refuse
  Given a third polity touches the part of <target polity>'s outline the stretch would replace (a triple point)
  Or a border styled by hand covers it
  When I press ‹ctrl+V›
  Then nothing is pasted, and the status bar says why, in ⟨retracer⟩'s own words

Scenario: paste an outline in place of a polity's
  Given <copied polity> is copied from <source map>
  And <target map> is open, with <target polity> drawn otherwise
  When I open the menu of <target polity> and choose « Coller le tracé »
  Then a question reads « Coller le tracé de <copied polity> sur <target polity> ? »
  When I press [Remplacer son tracé]
  Then <target polity> has the copied outline only, welded to its neighbours, and keeps its own sheet
  And its old outline's points that nothing else holds leave at the next save, as a removed polity's do

Scenario: paste an outline as one more island
  When I press [Ajouter comme île] in the same question
  Then <target polity> keeps its outline and gains the copied one as one more ring

Scenario: paste an outline onto the polity it overlaps
  Given the copied outline overlaps <target polity>'s own
  When I press [Ajouter comme île]
  Then the two rings are kept as they are, never merged — the overlap is seen on the map, and the weld repairs what
    the author keeps

# 3 — a sheet onto an existing polity

Scenario: paste a sheet, field by field
  Given <copied polity> is copied from <source map>
  When I open the menu of <target polity> in <target map> and choose « Coller la fiche… »
  Then a dialogue lists each field that differs, with <target polity>'s value and <copied polity>'s
  And each line has a box, ticked
  And the polity's id is never offered
  When I untick « Nom » and press [Coller]
  Then <target polity> takes every ticked value and keeps its name
  And one ‹ctrl+Z› gives every field back

Scenario: a sheet that differs in nothing
  Given <copied polity>'s sheet and <target polity>'s are the same in every field offered
  When I choose « Coller la fiche… »
  Then the status bar reads « Rien à coller : les fiches sont les mêmes », and no dialogue opens

Scenario: a suzerain absent from the map is not offered
  Given <copied polity>'s sheet names a suzerain whose id <target map> does not hold
  When the dialogue opens
  Then the line « Suzerain » is shown, unticked and greyed, with « absent de cette carte »

# What the clipboard cannot hold

Scenario: the clipboard cannot be written
  Given the browser refuses the tab's storage
  When I press ‹ctrl+C›
  Then the status bar reads, in red, « La copie n'a pas pu être gardée : rien n'est copié »   # decision
  And the console says why
```

## The order of work — each step verified and committed alone

1. **The clipboard and Copier**: one polity, a stretch; carried by the tab from one map to the next; its refusal said.
2. **The shortcut converter, then the menu bar, Fichier and Édition**, every item with its shortcut shown for the
   system it runs on — the home every paste below lands in; the stacking menu and the top bar's hints move onto the
   converter in the same step.
3. **Paste a stretch onto an outline** — ⟨retracer⟩ fed by the clipboard: the paste that saves the most time.
4. **Paste a whole polity** — in place, welded at 2 km, cut by what is there, its suzerain kept or dropped, the
   question of a name already in the map.
5. **Paste an outline onto a polity** — in place of its own, or as one more island.
6. **Paste a sheet onto a polity** — the dialogue, field by field.
7. **Several polities selected in `{Polities}`**, no outline selected, copied and pasted together.

## Decisions for the dev — my proposal for each

| what | my proposal | the alternative | by |
| --- | --- | --- | --- |
| a pasted polity over ground already held: who wins | **the target wins**: the paste takes the free ground only, the rest is cut and said — what is there was drawn or cleaned by hand. To let the paste win, the author first removes the target polity's outline, then pastes (the dev: *"and if you don't like it, ctrl+Z"*) | the paste wins, and the target's polities are carved | **the dev**, 2026-11-03, on my proposal |
| a polity pasted into a year its dates leave out | **pasted, nothing said** — the dates do not matter to a paste (the dev: *"it's a productivity gesture, to save time"*, like the cities: comfort while drawing) | pasted and said (my proposal) · refused | **the dev**, 2026-11-03 |
| paste in place; what is pasted stays selected | — | — | **the dev**, 2026-11-03 |
| no preview, no validation: pasted at once, the weld and the cut with it, ‹ctrl+Z› if wrong | — | a preview with ‹entrée› / ‹échap› (my proposal, refused) | **the dev**, 2026-11-03 |
| a stretch pasted onto an outline, first in the order of work | — | — | **the dev**, 2026-11-03, on my proposal |
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
