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
> - Illustrator's shortcuts ‹⇧⌘]› ‹⌘]› ‹⌘[› ‹⇧⌘[› on the target, and the same menu on a fill on the
>   canvas — proposed, never asked for.
> - `H-33` (list by name or by stack) is settled by the tree if the dev agrees.
