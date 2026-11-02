# 21 — The panels: moved, resized, magnetised to the right column

> [Index](s00-index.md) · CARTO-342 · `files/plans/cartographer/panels-dock.md`. **The dev, 2026-11-02**: *"the panels
> must be draggable and resizable. And magnetised, like in Illustrator — magnetisable to the right, into the right-hand
> column"*; *"when there is no panel left in the column, the column disappears, it leaves the room to the canvas"*;
> no library.
>
> **Built 2026-11-02 on the branch `panels` (worktree `europe-map-panels`), uncommitted — not walked yet.**

```gherkin
Background:
  Given the Cartographer is open, every panel docked in the right column

Scenario: a panel floats where it is dropped
  When I drag {Cities} by its head over the canvas and release it
  Then it floats over the window where I released it, with a shadow
  And it is no longer in the column

Scenario: magnetised to the column
  Given {Cities} floats
  When I drag it by its head over the column, or within 24 px left of it
  Then a blue line shows where it will go, between two panels, above the first or below the last
  And on release it docks there, and the line goes

Scenario: moved within the column
  When I drag {Layers} by its head to the top of the column
  Then it is docked first

Scenario: the column disappears when empty
  When every panel floats
  Then the column is gone and the canvas takes its width
  And a panel dragged to the window's right edge docks again, and the column comes back

Scenario: resized
  When I drag a floating panel's right edge, bottom edge, left edge or bottom-right corner
  Then it takes that size, never smaller than 180 × 80
  And dragging the column's left edge widens or narrows it, between 200 and 640 px
  And dragging a docked panel's foot gives it that height, its body scrolling

Scenario: a click on a head is not a drag
  When I press a panel's head and release it without moving, or press a button in the head
  Then nothing moves

Scenario: kept across sessions
  Given I left {Cities} floating and the column at 340 px
  When I reload the Cartographer
  Then {Cities} floats where I left it and the column is 340 px wide
  And a layout that cannot be read opens as at first, said in the console
```

> **What this rung does not do**: closing a panel and opening it again (a *Window* menu, CARTO-239); one panel open
> at a time (CARTO-336); moving a panel with the keyboard — a courtesy in the editor
> ([[screen-reader-is-courtesy-in-the-editor]]), not built; a floating panel kept inside the window after the window
> shrinks — its head stays reachable only for the window it was dropped in.
