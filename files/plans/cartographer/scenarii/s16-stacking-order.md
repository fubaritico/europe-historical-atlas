# 16 — Stacking order

> Written 2026-10-11, from the dev's request: _"il faut qu'on puisse changer l'ordre… back to front"_,
> **by a context menu à la Illustrator** (« Bring to Front »…), **not by drag and drop** — his call,
> recorded in `next.md` the same day. Illustrator's _Object › Arrange_ is the model: four commands.

## What the order is, in the file

The polities are painted in the order of the document's **claims** — the first is at the back, the last
at the front. That order is saved, so the atlas paints the same way. **Changing it is an edit of the
document**: one step in the history, undone by ‹ctrl+Z›, like any other gesture.

It only shows where two fills overlap — a vassal drawn inside its suzerain, a contested strip, a draft
outline over a neighbour. Where borders are shared, nothing overlaps and the order changes nothing on
screen.

```gherkin
Scenario: bring a polity to the front
  Given "Kingdom of France" and "Duchy of Normandy" overlap, and France is painted over Normandy
  When I right-click "Duchy of Normandy" in {Polities}
  Then a menu offers [Bring to Front], [Bring Forward], [Send Backward], [Send to Back]
  When I choose [Bring to Front]
  Then Normandy is painted over France
  And {History} gains one step, "bring to front — Duchy of Normandy"
  And ‹ctrl+Z› puts France back on top

Scenario: one step at a time
  Given four polities painted A, B, C, D from back to front
  When I choose [Bring Forward] on B
  Then the order is A, C, B, D
  When I choose [Send Backward] on B
  Then the order is A, B, C, D again

Scenario: a command that would change nothing
  Given D is already at the front
  When I right-click D
  Then [Bring to Front] and [Bring Forward] are disabled
  And [Send Backward] and [Send to Back] are enabled

Scenario: a polity with no territory has no place in the stack
  Given "Kingdom of León" has no territory
  When I right-click it in {Polities}
  Then the four commands are disabled, since there is nothing to paint
```

> **Defaults, not decisions** (`s00`: every rule here is a default):
>
> - The menu opens on a **row of {Polities}**. Illustrator also offers it on the canvas, on a selected
>   object; here a right-click on a fill could do the same after it aims at that polity. Not written yet.
> - **Illustrator's shortcuts**: ‹⇧⌘]› front, ‹⌘]› forward, ‹⌘[› backward, ‹⇧⌘[› back, acting on the
>   target. Proposed, not asked for.
> - **The list keeps its sort by name** (`s01`), so the order is seen on the canvas, not in the list.
>   Illustrator's Layers panel lists front-to-back instead — see `H-33`.
