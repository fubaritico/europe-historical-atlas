# 22 — Copy and paste between maps

> [Index](s00-index.md) · CARTO-345 · the design, its decisions and the order of work: `../copy-paste-between-maps.md`.
> **The dev, 2026-11-03**: *"you paste, that's all; if there's a problem, ctrl+Z — simple"*. Every paste is **in place**,
> each point at its coordinates; the weld onto the target map's points is the one exception, and it is what keeps the
> rule of `s00` — two outlines over one place hold one anchor — true on arrival.
>
> **Step 1 built 2026-11-03 on the branch `carto-345` (worktree `europe-map-copypaste`) — walked by me through the menu
> the same evening (below), not by the dev yet**: the four
> copy scenarios and the clipboard's refusal, below the line « # 1 ». Everything after it is specified, not built.
> **Declared gaps of step 1**: the refusal of the tab's storage is said in the status bar's result zone, **not in red** —
> the red alarm of the status bar is CARTO-273, not built; ‹cmd+C› copies the polity selected only — several are step 7.

```gherkin
Feature: copy and paste between maps

Background:
  Given the map <source map> is open

Scenario: copy a polity
  When I select <copied polity> in {Polities}
  And I press ‹ctrl+C›
  Then the status bar reads « Copié : <copied polity>, de <source map> — ⌘V dans une autre carte pour coller » (Ctrl+V off a Mac)
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
  And « Coller les entités » and « Coller la fiche… » are greyed
  And every item shows its shortcut, ⌘ on a Mac, Ctrl elsewhere
  # « Coller le tracé… » struck 2026-11-05 — the dev: there is no outline replacement; a whole outline is a stretch

# 1 — a whole polity
# Built in core, rung 1, 2026-11-05 (branch carto-345-paste, `core/editor/paste.ts`), no interface yet: the sheet,
# every point in place under its own source, the end of the list, the free id, the suzerain kept or dropped, the
# name already in the map refused, the dates and a tribe's rank as copied.
# Rung 2, 2026-11-05 (`core/editor/pasteWeld.ts`): the weld at 2 km — onto a point of the map, else onto a stretch
# (the neighbour gains the point), and between two welded points the pasted outline follows the neighbour's (the
# dev, 2026-11-05); the count of welded points returned for the status bar. Measured on the backup's 118 polities
# absent from 1100, pasted one after the other: 22 896 of 45 461 points welded, the year re-read without a fault,
# 116 ms for the slowest paste (Norway, 209 rings). An islet the weld would leave under three points keeps its own.
# The cut by what is there and the vassal carved out of its suzerain, struck 2026-11-05 (the dev: « quand tu colles,
# tu colles »): the whole polity's paste is built in core.
# Wired 2026-11-05, at the dev's request (« y'a toujours pas d'UI »): ‹cmd+V› and Édition › Coller les entités paste
# the polities the clipboard holds, one step of the history, the last one selected, the status bar saying it —
# « Collé : <name>, de <source map> — <n> points, dont <w> soudés aux voisins », and « · Collé souverain : … » after it.
# Walked by me in my own Cartographer (worktree, port 5180) the same evening: Prussians copied from
# 1100-backup-2026-11-02, pasted into a copy of the dev's 1100 — at the top of {Polities}, selected, « 177 points, 2 of
# them welded to the neighbours »; Paste polities again refused (« Prussians is already in this map: two polities
# cannot bear the same name — nothing is pasted »); one ‹cmd+Z› back to 105 polities. Not walked by the dev yet.
# Declared gaps: a name already in the map is said in the status bar, not in the dialogue below — that dialogue sends
# the author to the paste of a stretch, not built; a stretch on the clipboard is refused with « Coller un tronçon n’est
# pas encore possible ».

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
  Then <copied polity> is pasted whole, welded to its neighbours at the weld distance
  And where it overlaps <target polity>, both keep their outline: the overlap is seen, for the author to arrange
  # « the pasted outline is cut where it overlaps <target polity> » and « the status bar says how much was cut »,
  # struck 2026-11-05 — the dev: « quand tu colles, tu colles ».

Scenario: paste a polity into a year its dates leave out
  Given <copied polity>'s sheet says it exists from 1120
  And <target map> is the year 1100
  When I press ‹ctrl+V›
  Then <copied polity> is pasted, its dates as they were, like any other paste
  And nothing is said about its dates: the paste is a gesture of comfort while drawing, not a check

# The suzerain is found by its name, never its id (the dev, 2026-11-05, on a measure: of the backup's 56 vassals
# pasted into 1100, 9 find their suzerain by id, 29 by name). « whose id <target map> holds » struck the same day.

Scenario: paste a polity whose suzerain is not in the map
  Given <copied polity> is a vassal of a polity whose name <target map> does not hold
  When I press ‹ctrl+V›
  Then <copied polity> is pasted as sovereign
  And the status bar reads « Collé souverain : son suzerain, <its name>, n'est pas dans cette carte »

Scenario: paste a polity whose suzerain is in the map
  Given <copied polity> is a vassal of a polity whose name <target map> holds, whatever its id there
  When I press ‹ctrl+V›
  Then <copied polity> is pasted as that polity's vassal, its outline whole
  # « and carved out of it as a vassal is », struck 2026-11-05 — the dev: « quand tu colles, tu colles ».

Scenario: paste a polity whose name is already in the map
  Given <target map> already has a polity named as <copied polity>
  When I press ‹ctrl+V›
  Then nothing is pasted, and the history gains no step
  And a dialogue reads « Ce pays est déjà dans cette carte » — two polities cannot bear the same name
  And it explains how to carry only the outline over: in <source map>, select every point of <copied polity>'s
    outline and copy them; here, select <copied polity> in {Polities} — after deleting its outline, if it is to be
    replaced — and press ‹ctrl+V›
  And [Fermer] closes it
  # The question « Coller son tracé sur elle, ou en faire une seconde entité ? » and its three buttons, struck
  # 2026-11-05 — the dev: « vous ne pouvez pas coller deux pays ayant le même nom », and no hybrid case.

Scenario: a name differently written is another polity
  Given <target map> has « Principality of Polotsky » and <copied polity> is « Principality of Polotsk »
  When I press ‹ctrl+V›
  Then <copied polity> is pasted as any polity is, at the top of {Polities}
  And it is for the author to delete the one not wanted — nothing tells the two apart, not even Wikidata (measured
    2026-11-05: Q200797 and Q517333 in the two maps of 1100)

Scenario: paste twice
  Given <copied polity> was pasted into <target map>
  When I press ‹ctrl+V› again
  Then the dialogue of a name already in the map opens

# 2 — points onto a polity: the dev's rule of 2026-11-05 evening (`open-outlines.md`)

> **The dev, 2026-11-05 evening**, trying to carry his backup's Venice — about twenty pieces — into his 1100: *"it's
> the points we want. That they make one or several outlines is not my business. I want to copy something."* So
> ‹cmd+C› copies **any points**, sorted into pieces along the outlines they lie on; ‹cmd+V› puts every piece down on
> the polity selected; ‹cmd+A› selects every point of the polity selected. The rule of the afternoon stands within it:
> no outline replacement — a whole outline is added, a part is merged.
>
> **Built and wired 2026-11-05 evening** (worktree `europe-map-copypaste`, `core/editor/clipboard.ts` `copyPoints`,
> `core/editor/pastePoints.ts`, `ui/utils/copySelection.ts`, `ui/utils/pasteClipboard.ts`, ‹cmd+A› through the store
> to the canvas, `canvas/storeAnswers.ts`). **Walked by the dev the same evening** on his backup's Venice: ‹cmd+A›,
> ‹cmd+C›, *Open…* a copy of his 1100, Venice's outline deleted, ‹cmd+V› — *"OK"*. **Declared gap**: the pasted points are not selected.
> **My choice, to confirm with the dev**: a piece ⟨retracer⟩ refuses is left out and named, the others pasted.

Scenario: select every point of a polity
  Given <copied polity> is selected
  When I press ‹ctrl+A›, or choose Édition › Tout sélectionner : <copied polity>
  Then the white arrow is taken, and every point of <copied polity> is selected
  And in a text field ‹ctrl+A› selects the text, as everywhere

Scenario: select all with no polity selected
  Given no polity is selected
  Then Édition › Tout sélectionner is greyed
  And ‹ctrl+A› selects nothing, and the status bar reads « Sélectionnez d’abord une entité : tout sélectionner prend tous ses points »

Scenario: copy points
  When I select two points or more of <copied polity> and press ‹ctrl+C›
  Then the clipboard holds the points, sorted into pieces: every outline selected whole is a closed piece, every run of
    points that follow one another is a piece of its own
  And the status bar reads « Copié : <n> points de <copied polity>, de <source map> — sélectionnez une entité, puis ⌘V »

Scenario: a point selected alone is left out, and said
  Given a selected point none of whose neighbours along an outline is selected
  When I press ‹ctrl+C›
  Then it is left out, and the status bar adds « un point seul laissé de côté : aucun voisin sélectionné »
  And when every selected point is alone, nothing is copied: « Aucun de ces points n’a de voisin sélectionné sur un tracé : rien n’est copié »

Scenario: paste points onto a polity
  Given points of <copied polity> are copied from <source map>
  When I select <target polity> in <target map> and press ‹ctrl+V›
  Then every whole outline copied is added to <target polity>, welded at 2 km — its outline when nothing is drawn
  And every other piece is merged into <target polity>'s outline: each end hooks onto the nearest point of it, however
    far (the dev: « tu prends le point le plus proche pour le merger avec »), and the part between them is replaced —
    the smaller change, as ⟨retracer⟩ chooses; a neighbour over the whole replaced part follows
  And one ‹ctrl+Z› takes the whole paste back
  And the status bar reads « Collé sur <target polity> : <n> points, dont <w> soudés aux voisins — <k> tracés ajoutés — <m> parties fondues dans le tracé »

Scenario: a piece onto a polity with nothing drawn
  Given <target polity> has nothing drawn
  When I paste a piece that is not a whole outline
  Then it becomes an open outline of <target polity> — « un tracé laissé ouvert » — to be resumed with the Pen

Scenario: a piece that joins the two ends of an open outline
  Given <target polity>'s outline is open
  When I paste a piece whose ends lie nearest its two ends
  Then the piece closes it, as Illustrator joins two ends

Scenario: a piece refused where ⟨retracer⟩ would refuse
  Given a border styled by hand covers the part a piece would replace
  When I press ‹ctrl+V›
  Then that piece is left out, the others are pasted, and the status bar adds « Une partie non collée : <⟨retracer⟩'s reason> »
  And when every piece is left out, nothing is recorded: « Rien n’est collé sur <target polity> »

Scenario: a whole outline onto a polity already drawn
  # Confirmed by the dev, 2026-11-05: the two outlines overlap and it looks messy, which is the point.
  Given a whole outline is copied
  And <target polity> already has an outline in <target map>
  When I select <target polity> and press ‹ctrl+V›
  Then the copied outline is added as one more outline, its points in place, never merged with the other

# Struck 2026-11-05 evening — the dev's rule above: « Ce bout est à <d> km … rien n'est collé » (an end hooks onto the
# nearest point, however far); « … n'a pas de tracé où accrocher ce tronçon » (a piece becomes an open outline).

# Struck 2026-11-05 — the dev: « il n'y a pas de remplacement de tracé »; « on ne commence pas à faire des cas hybrides ».
# ~~Scenario: paste an outline in place of a polity's~~ — « Coller le tracé », [Remplacer son tracé]
# ~~Scenario: paste an outline as one more island~~ — [Ajouter comme île]
# ~~Scenario: paste an outline onto the polity it overlaps~~

# 3 — a sheet onto an existing polity

> **The dev, 2026-11-05 night**: *"in the context menu, two choices — ctrl+C copies everything, ctrl+shift+C copies only
> the sheet; ctrl+C in the map copies only the points selected; then in the target file the Edit menu adapts to what
> is on the clipboard."* So one paste, under ‹cmd+V›, named after what the clipboard holds; ‹shift+cmd+V› is gone.
> Built in the worktree (`core/editor/pasteSheet.ts`, `ui/components/SheetPasteDialog/`, `state/clipboardSlice.ts`,
> `ui/utils/pasteCommand.ts`). **Not walked yet.**

Scenario: a polity's menu offers the clipboard
  When I right-click <copied polity> in {Polities}
  Then its menu reads « Modifier les propriétés… », « Copier » ‹⌘C›, « Copier la fiche » ‹⇧⌘C›, the paste, then the four
    stacking commands
  And the paste is named after what the clipboard holds — « Coller la fiche de <copied polity> sur <this polity>… »,
    « Coller les points de … sur … », « Coller les entités » — greyed « Coller » when it holds nothing

Scenario: copy a polity's sheet alone
  When I select <copied polity> and press ‹shift+cmd+C›, or choose « Copier la fiche »
  Then the clipboard holds its sheet, not its outline
  And the status bar reads « Copié : la fiche de <copied polity>, de <source map> — sélectionnez une entité, puis ⌘V »

Scenario: paste a sheet, field by field
  Given a sheet is copied from <source map>
  When I select <target polity> in <target map> and press ‹cmd+V›, or choose the paste in Édition or in its menu
  Then a dialogue lists each field that differs, with <target polity>'s value and the copied one, each box ticked
  And the polity's id is never offered, and its outline does not change
  When I untick « Nom » and press [Coller]
  Then <target polity> takes every ticked value and keeps its name, one step of the history
  And the status bar reads « Fiche collée sur <target polity> : <n> champs repris »

Scenario: a sheet that differs in nothing
  Given the copied sheet and <target polity>'s are the same in every field offered
  When I paste it
  Then no dialogue opens, and the status bar reads « Rien à coller : les fiches de … et de … sont les mêmes »

Scenario: a suzerain absent from the map is not offered
  Given the copied sheet names a suzerain whose name <target map> does not hold
  When the dialogue opens
  Then the line « Suzerain » is shown, unticked and greyed, with « absent de cette carte »

Scenario: a name another polity bears, or a suzerain that would loop
  When the fields ticked would give <target polity> another polity's name, or a suzerain closing a loop of homage
  Then nothing is pasted, and the status bar says why

# What the clipboard cannot hold

Scenario: the clipboard cannot be written
  Given the browser refuses the tab's storage
  When I press ‹ctrl+C›
  Then the status bar reads « La copie n’a pas pu être gardée : rien n’est copié » — in red once CARTO-273 is built
  And the console says why
```

## The menu bar — Fichier and Édition

> **Built 2026-11-03 on the branch `carto-345` (CARTO-239, entered in CARTO-345); walked by me the same evening** in my
> own Cartographer (port 5180, the worktree), in English: both menus and their keys, the hover from File to Edit, Copy
> greyed then active once Kingdom of France was selected, Copy run from the menu (« Copied: Kingdom of France, from
> 1100 — ⌘V in another map to paste », the focus back on Edit), « On the clipboard: … » after a reload, ‹cmd+O›
> opening « Open a map », ‹→› ‹↓› ‹escape› on the titles, a menu where nothing can act focused itself. No console
> error. **Not walked by the dev yet.** Beside the
> application's name in the top bar; `role="menubar"`, a `menuitem` per title and per command. The buttons of the top
> bar stay as they were. **Declared gap**: ~~every paste is shown greyed — none is built yet (steps 3 to 6)~~ — since 2026-11-05 « Coller
> les entités » is active when the clipboard holds polities; the stretch, the sheet and « Coller le tracé » (struck by
> the dev the same day, still shown) stay greyed.

```gherkin
Scenario: open a menu, its commands with their keys
  When I click « Fichier » in the top bar
  Then a menu lists « Ouvrir… ⌘O », « Enregistrer ⌘S », « Enregistrer sous… ⇧⌘S », « Enregistrer une copie »
  And off a Mac the keys read « Ctrl+O », « Ctrl+S », « Ctrl+Maj+S »

Scenario: the pointer over the other title opens its menu
  Given « Fichier » is open
  When the pointer moves over « Édition »
  Then « Édition » is open in its place

Scenario: Édition names what it would undo and what it pastes onto
  Given the last gesture was « Créer France » and « Kingdom of Poland » is selected
  When I open « Édition »
  Then it reads « Annuler Créer France ⌘Z », « Rétablir ⇧⌘Z » greyed, a hairline, « Copier ⌘C », a hairline,
    « Coller les entités ⌘V », « Coller le tronçon sur Kingdom of Poland ⌘V »,
    « Coller la fiche sur Kingdom of Poland… ⇧⌘V »
  # « Coller le tracé sur … ⌥⌘V » struck 2026-11-05 (the dev: no outline replacement)
  And with no polity selected the pastes read « … sur l’entité sélectionnée »

Scenario: a greyed command is shown and does nothing
  When I click a greyed command
  Then nothing happens, the menu stays open, and the console says the command cannot act now

Scenario: the menus by keyboard
  Given the focus is on « Édition »
  When I press ‹↓›
  Then its menu opens, its first command that can act focused
  When I press ‹↓› again
  Then the focus skips the greyed commands and the hairlines
  When I press ‹→›
  Then « Fichier » opens in its place, round the ends
  When I press ‹escape›
  Then the menu closes, the focus back on its title

Scenario: the titles by keyboard, as a system's menu bar
  Given the focus is on « Fichier »
  When I press ‹→›
  Then the focus is on « Édition », and no menu opens
  And ‹Tab› reaches the bar once, on the title last focused
  When I press ‹↑›
  Then « Édition » opens on its last command
  When I press ‹Tab›
  Then the menu closes, and the focus goes on from the bar

Scenario: a command chosen gives the focus back
  When I choose a command with ‹entrée›
  Then the menu closes and the focus is back on its title before the command runs
  And a command that opens a dialogue takes the focus from there

Scenario: a menu where nothing can act
  Given every command of a menu is greyed
  When I open it
  Then the menu itself has the focus, and ‹escape› closes it

Scenario: a press outside closes the menu
  Given a menu is open
  When I press anywhere outside the bar
  Then it closes, and nothing else is done
```
