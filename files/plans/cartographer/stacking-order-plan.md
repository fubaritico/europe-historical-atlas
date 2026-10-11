# Stacking order — plan

> Written 2026-10-11 at the dev's request (*"tu feras un plan pour la fonctionnalité"*). Governing
> scenario: [`scenarii/s16-stacking-order.md`](scenarii/s16-stacking-order.md). **Nothing here is built
> until the dev says go** — one piece already exists, see step 1.

## What it is

Illustrator's *Object › Arrange*: **Bring to Front**, **Bring Forward**, **Send Backward**, **Send to
Back**, chosen from a **context menu on a row of {Polities}** (the dev's call, not drag and drop).

The order is the document's `claims` array — first painted at the back, last at the front — so a move
is **an edit of the document**: one history step, undone by ‹ctrl+Z›, saved with the year.

## Steps — each verified and committed alone

| | what | where | how we know it works |
| --- | --- | --- | --- |
| **1** | the pure operation: `restack(doc, polity, move)` and `availableMoves(doc, polity)` | `core/editor/stacking.ts` | **already written, 11 tests green, not committed** — I started it before being asked. Keep it or drop it: the dev's call |
| **2** | the recorded action `restackPolity(id, move, step)` | `cartographer/state/editionSlice.ts`, through `recorder` like `moveAnchor` | `{History}` gains *"bring to front — Duchy of Normandy"*; ‹ctrl+Z› restores the order |
| **3** | the context menu: right-click on a row (and ‹shift+F10› / the context-menu key, for the keyboard) opens the four commands, those that would change nothing disabled | `components/PolityContextMenu.tsx` (view) + its wiring in `PolityList` | a test per command, a test for the disabled states, a test that ‹escape› and a click outside close it |
| **4** | the canvas repaints in the new order — nothing to write, it already paints `claims` in order | — | a canvas test: after *Bring to Front*, the fill test (`polityAt`) answers the polity brought forward where the two overlap |

## The menu — one decision taken, one to ask

- **Taken (mine)**: the design system's `Menu` for the list itself — it owns the keyboard model and the
  disabled items. It does not place itself (its README: *"N/A — positioning"*), and its `Dropdown`
  anchors to a trigger button, not to a pointer position. So **a thin shell of ours** places it at the
  right-click, closes it on ‹escape› and on a press outside. Substitutable later by an import change.
- **To ask, if the dev wants it**: a `ContextMenu` from the design system's Claude — a menu opened at
  a point. Same shape as the `ColorField` hand-off of 2026-10-10.

## Open — the dev's calls, none blocking step 1–4

1. **`H-33` — the list's order.** It stays sorted by name (`s01`); the stacking is then seen on the
   canvas only. Illustrator's Layers panel lists front-to-back instead.
2. **The same menu on the canvas** — a right-click on a fill aiming at it first, as Illustrator offers
   *Arrange* on a selected object. Not in `s16` yet.
3. **Illustrator's shortcuts** ‹⇧⌘]› ‹⌘]› ‹⌘[› ‹⇧⌘[›, on the target. Proposed, never asked for. Note:
   ‹⌘› keys go to the browser today (`onModifiedKey`), so they would have to be taken for the map.
4. **The atlas does not follow this order alone** — it puts a vassal over its suzerain first
   (`toRegionPayload`, depth of homage), and keeps the claims order only between equals. So sending a
   vassal behind its suzerain shows in the Cartographer and **not** in the atlas. Whether the
   Cartographer should paint by the same rule belongs with `s08` (vassalage).

## Cost

Steps 2–4: one action, one component, its wiring, and their tests — the size of the ColorField's
integration. No change to the file format: the order of `claims` is already saved.
