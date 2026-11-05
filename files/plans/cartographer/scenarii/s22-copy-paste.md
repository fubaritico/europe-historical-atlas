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
# tu colles »): the whole polity's paste is built in core. Declared gaps: the status bar, the selection, the dialogue
# and ‹ctrl+V› come with the interface, after every paste is built.

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

# 2 — a stretch onto a polity: one rule, the dev's (2026-11-05)

> **The dev, 2026-11-05**: *"there is no outline replacement. Keep the mechanics simple: you paste, there is nothing,
> it takes the place; you paste, there is something, we weld."* An outline selected whole is **a stretch like any
> other**; to replace a polity's outline, the author deletes it in the target map, then pastes. The replacement and
> the island of the earlier version are struck below.

Scenario: copy a stretch
  When I select anchors that follow one another on <copied polity>'s outline
  And I press ‹ctrl+C›
  Then the status bar reads « Copié : un tronçon de <copied polity>, <n> points, de <source map> — sélectionnez une entité, puis ⌘V »

Scenario: copy a whole outline
  When I select every anchor of one of <copied polity>'s rings
  And I press ‹ctrl+C›
  Then the clipboard holds a stretch, closed, and the status bar reads as for any stretch
  # The refusal « a whole ring is copied by copying the polity » (step 1, built 2026-11-03), struck 2026-11-05.

Scenario: paste a stretch onto a polity with nothing drawn
  Given a whole outline is copied from <source map>
  And <target polity> has no outline in <target map>
  When I select <target polity> and press ‹ctrl+V›
  Then the copied outline becomes <target polity>'s, its points in place
  And where it comes within the weld distance of a neighbour's or of the coast, it takes their points
  And <target polity> keeps its own sheet
  And one ‹ctrl+Z› gives <target polity> back with nothing drawn

Scenario: an open stretch onto a polity with nothing drawn
  Given an open stretch is copied — not a whole outline
  And <target polity> has no outline
  When I press ‹ctrl+V›
  Then nothing is pasted, and the history gains no step
  And the status bar reads « <target polity> n'a pas de tracé où accrocher ce tronçon : copiez un tracé entier »

Scenario: paste a stretch onto a polity's outline
  # Confirmed by the dev, 2026-11-05: a part of an outline, pasted, is merged into the outline already there —
  # « il faut un merge, une fusion ». The document holds closed outlines only, so an open part cannot lie apart.
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

Scenario: a whole outline onto a polity already drawn
  # Confirmed by the dev, 2026-11-05: the two outlines overlap and it looks messy, which is the point — the author's
  # first reflex is to delete the old one. To carry only a part over, he copies a part, and it is merged (above).
  Given a whole outline is copied
  And <target polity> already has an outline in <target map>
  When I select <target polity> and press ‹ctrl+V›
  Then the copied outline is added to <target polity> as one more ring, its points in place
  And every pasted point within the weld distance of a point of <target map> takes that point
  And the two rings are never merged: where they overlap, it is seen on the map (the dev, 2026-11-03)

# Struck 2026-11-05 — the dev: « il n'y a pas de remplacement de tracé »; « on ne commence pas à faire des cas hybrides ».
# ~~Scenario: paste an outline in place of a polity's~~ — « Coller le tracé », [Remplacer son tracé]
# ~~Scenario: paste an outline as one more island~~ — [Ajouter comme île]
# ~~Scenario: paste an outline onto the polity it overlaps~~

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
  Given <copied polity>'s sheet names a suzerain whose name <target map> does not hold
  # « whose id » struck 2026-11-05: a suzerain is found by its name, as in « paste a polity » (the dev)
  When the dialogue opens
  Then the line « Suzerain » is shown, unticked and greyed, with « absent de cette carte »

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
> bar stay as they were. **Declared gap**: every paste is shown greyed — none is built yet (steps 3 to 6).

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
