# The panels: moved, resized, magnetised to the right column — CARTO-342

> The dev, 2026-11-02, evening: *"the panels must be draggable and resizable. And magnetised, like in Illustrator —
> magnetisable to the right, into the right-hand column."* Earlier the same evening: *"you can re-dock them in the
> column dedicated to them, remove them, move them. And when there is no panel left in the column, the column
> disappears, it leaves the room to the canvas."* And: *"I hope you are not going to bring me a draggable JS or the
> like"* — **no library**.

## What is decided (by the dev)

| | | by |
| --- | --- | --- |
| 1 | a panel is grabbed by its head and moved anywhere over the window | the dev |
| 2 | a panel is resized | the dev |
| 3 | dropped near the right column, it docks there — magnetised, like Illustrator | the dev |
| 4 | the column holds the docked panels; with none left, it disappears and the canvas takes its width | the dev |
| 5 | no library | the dev |

## How (proposed by Claude)

- **Pointer events and pointer capture**, nothing else. The panel's head is the handle (any press on `.panel__head` that
  is not on a button or a field), found by delegation — `Panel` and the five panels are not changed.
- **No per-frame state through React** (`rules/troubleshooting.md`): during a drag or a resize the frame is moved by
  its style, imperatively, and the dock's insertion line shown the same way; **the store is written once, on release**.
- **The arithmetic is pure and tested with literals** — where a drop lands (the column, at which place, or floating at
  which rectangle), the magnet's reach (24 px from the column), a rectangle resized from an edge with its minimum size,
  a rectangle kept inside the window.
- **The layout is a slice of the store** (`panelsSlice`), out of the undo line like the layers: which panels are docked
  in what order, each floating panel's rectangle, the column's width, a docked panel's height.
- **Kept across sessions** in the page's `localStorage`, read once at start; a layout that cannot be read opens on the
  default, said in the console — the same choice as the view carried between maps (`persistence/carriedView.ts`).

## Rungs

1. **Move, float, dock** — a panel dragged out floats where it is dropped; dragged near or onto the column, an
   insertion line shows where it will go and it docks there on release; the column vanishes when empty.
2. **Resize** — a floating panel by its edges and its corner; the column by its left edge; a docked panel by its foot.
3. **Kept** — the layout survives a reload.
4. **Not in this ticket**: closing a panel and opening it again (needs a *Window* menu, CARTO-239); one panel open at a
   time (CARTO-336) — to reconcile with this layout when that ticket is taken.
