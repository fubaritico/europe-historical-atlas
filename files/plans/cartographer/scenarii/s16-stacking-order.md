# 16 — Stacking order, by groups

> Written 2026-10-11, rewritten the same evening. The dev first asked for Illustrator's four *Arrange*
> commands from a context menu on {Polities}, not drag and drop. Then he gave the model, from
> Illustrator's Layers panel ([`design/references/illustrator-layers-suzerain-vassal.png`](../design/references/illustrator-layers-suzerain-vassal.png)):
> *"le suzerain est considéré comme le fond, et le vassal comme un sous-calque"* — and *"il faudrait
> pouvoir changer l'empilement des vassaux… et la pile au niveau des pays eux-mêmes, soit des groupes
> formés par un pays."*

## The model

- **A polity and its vassals form a group** — Illustrator's layer and its sublayers. The suzerain is
  the group's background; its vassals are painted over it. A vassal with vassals of its own is a group
  inside the group.
- **The stack is re-ordered among siblings only**, at any level: the top-level groups among themselves
  (France against the Empire, each moving **with all its vassals**), and the vassals of one suzerain
  among themselves.
- **A vassal never goes under its suzerain, and never leaves its group by stacking.** Changing group is
  changing suzerain — the polity form (`s08`), not a stacking command.
- **The paint order is read off the tree**: the groups in their order, each suzerain then its vassals in
  theirs, depth first. One function in `core`, read by the Cartographer **and** the atlas.

```gherkin
Scenario: bring a group to the front, vassals with it
  Given the Kingdom of France has the Duchy of Normandy as a vassal
  And the Holy Roman Empire is painted over the Kingdom of France
  When I right-click "Kingdom of France" in {Polities} and choose [Bring to Front]
  Then France is painted over the Empire
  And Normandy is painted over France, and over the Empire with it
  And {History} gains one step, "bring to front — Kingdom of France"

Scenario: re-order two vassals of one suzerain
  Given Normandy and Aquitaine are both vassals of France, Aquitaine painted over Normandy
  When I choose [Bring Forward] on Normandy
  Then Normandy is painted over Aquitaine
  And both are still painted over France

Scenario: a vassal cannot be sent under its suzerain
  Given Normandy is the lowest of France's vassals
  When I right-click Normandy
  Then [Send Backward] and [Send to Back] are disabled
  And France is still painted under Normandy

Scenario: a command that would change nothing is disabled
  Given the Kingdom of France is the top-level group at the front
  When I right-click it
  Then [Bring to Front] and [Bring Forward] are disabled

Scenario: the atlas paints the same order
  Given an order set in the Cartographer and saved
  When the atlas shows that year
  Then every overlap is painted in the order the Cartographer showed
```

> **Defaults, not decisions** (`s00`):
>
> - **{Polities} becomes the tree**, as in the dev's screenshot — a group's head, its vassals indented
>   beneath. Already planned for step 5; it is what makes the order **visible** rather than only seen on
>   the canvas. Within a level, the list shows the stack front first, as Illustrator does. *(mine)*
> - A polity with no territory still heads its group: its vassals are drawn even if it is not.
> - ~~Illustrator's shortcuts ‹⇧⌘]› ‹⌘]› ‹⌘[› ‹⇧⌘[› on the target,~~ and the same menu on a fill on the
>   canvas — proposed, never asked for. *(The shortcuts are struck: the dev asked for keys on 2026-10-16
>   and proposed others, ‹cmd+↑› ‹cmd+↓› — built, below.)*
> - `H-33` (list by name or by stack) is settled by the tree if the dev agrees.

## From the keyboard — built 2026-10-16 (`5c96eaf`)

> **The dev, 2026-10-16**: *« c'est une opération que je dois répéter plein de fois »* — asked as a priority.
> The keys are the ones he proposed. ‹ctrl› stands for ‹cmd› off a Mac.

```gherkin
Scenario: move the selected polity one step, then to the end
  Given "Duchy of Normandy" is selected, with Aquitaine painted over it among France's vassals
  When I press ‹cmd+↑›
  Then Normandy is painted over Aquitaine
  And the result zone reads "Bring Forward — Duchy of Normandy"
  And {History} gains one step, "bring forward — Duchy of Normandy"
  When I press ‹cmd+↓›
  Then it is sent one step backward — "Send Backward — Duchy of Normandy"
  When I press ‹shift+cmd+↑›, or ‹shift+cmd+↓›
  Then it goes to the front, or to the back, of its group — [Bring to Front], [Send to Back]
  And a key held down repeats, one step per repetition

Scenario: the keys are heard on the page, not in a field
  Given "Duchy of Normandy" is selected
  When I press ‹cmd+↑› with the focus in {Polities}, or on the map
  Then Normandy moves
  But with the focus in a text field, in an open dialogue, or in the open stacking menu
  Then the key does what that place does with it, and nothing moves in the stack

Scenario: a modified arrow neither pans the map nor moves the list's cursor
  Given the focus is on the map, or on a row of {Polities}
  When I press ‹cmd+↑›
  Then the map does not pan and the list's cursor stays on its row
  And only the stacking command runs

Scenario: the menu shows the keys
  When I open the stacking menu on a row of {Polities}
  Then each command shows its keys at the row's end: ⇧⌘↑ · ⌘↑ · ⌘↓ · ⇧⌘↓
  And each announces them to assistive technology

Scenario: what the keys refuse, said
  Given no polity is selected
  When I press ‹cmd+↑›
  Then nothing moves, and the result zone reads "Select a polity to bring forward"
  Given "Kingdom of France" is the top-level group at the front
  When I select it and press ‹cmd+↑›
  Then nothing moves, and the result zone reads "Bring Forward — Kingdom of France: already in place"
  And either refusal is logged to the console as a warning, with nothing recorded in {History}
```

> **Tested by the dev, 2026-10-16**: *« c'est bon »* (`completed.md`); no walk written down. The rule
> *"a modified arrow is left to the stacking keys"* is written in three places (map, list, shortcut) — open
> in `known-issues.md` (ARCH-001), to put in common at the next shortcut of the kind.

## Where a new polity lands — built 2026-10-17 (`72ba74f`, CARTO-242)

> **The dev's call, 2026-10-17**: a new polity always appeared at the very top of {Polities}, so drawing a
> row of neighbours one after another meant moving each down by hand.

```gherkin
Scenario: a new polity is created just above the one selected, in its group
  Given "Reaume de France" is selected, with "Sacrum Imperium" above it in {Polities}
  When I press [New polity], name it "Bourgogne" and validate, owing the same suzerain as France — nobody
  Then {Polities} reads, top to bottom: Sacrum Imperium · Bourgogne · Reaume de France
  When I press ‹ctrl+z›
  Then Bourgogne is gone and the order is as it was, in one undo step

Scenario: not in the same group, or nothing selected — the top of its own group
  Given nothing is selected
  When I create "Bourgogne"
  Then it is at the top of its group, as before
  Given "Reaume de France" is selected
  When I create a polity owing another suzerain than France does
  Then it goes to the top of its own group, not beside France
```

> **Tested by the dev, 2026-10-17**: *« ça me l'ajoute bien au-dessus. C'est bon, ça fonctionne. »* (the
> ticket); no walk written down. A selected polity deleted or undone away before validation counts as
> nothing selected.
