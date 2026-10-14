# Handoff: Cartographer canvas cursors

## Overview
Nine cursor images in use for the canvas of the Cartographer, the contribution tool of a 3D historical atlas of Europe. They cover the nine tool/state rows of the UI inventory: ⟨navigate⟩, ⟨draw⟩ (the Pen) and ⟨edit⟩ (white arrow). **The images are design. When each one appears is code**, driven by what lies under the pointer.

## About the design files
`05 Cursors.dc.html` is a **design reference built in HTML**, not production code. Open it in a browser: each card shows the cursor enlarged 4×, with its hot spot marked in magenta, the CSS line to use, and a terrain pad you can hover to try the real cursor. Build the behaviour in the target codebase using its own patterns. **The SVG/PNG files in `cursors/` are final assets**, so use them as they are.

## Fidelity
High-fidelity. The shapes, sizes and hot spots are final.

## Two rules (from the inventory — both have been broken before in this project)
1. **A cursor keeps its size in screen pixels at every zoom.** It is always 32×32 CSS px. Never scale it with the map.
2. **The cross's hot spot is its centre, not its top-left.** A one-pixel offset puts every anchor in the wrong place, and nobody sees it until someone measures it. Write a test: place an anchor at a known screen point and check the stored coordinate.

## Cursor table

| file | name | trigger (code decides) | hot spot | CSS fallback |
|---|---|---|---|---|
| `hand-open` | Open hand | ⟨navigate⟩ active, or ‹space› held under any tool | 16 16 | `grab` |
| `hand-closed` | Closed hand | dragging the view | 16 16 | `grabbing` |
| `cross` | Cross | ⟨draw⟩ active | 16 16 | `crosshair` |
| `cross-close` | Cross + closing ring | ⟨draw⟩, pointer within snapping radius of the open outline's **first** anchor: a click closes the ring (‹enter› closes on a straight segment) | 16 16 | `crosshair` |
| `cross-snap` | Cross + snap mark | ⟨draw⟩ with snap to river / snap to coast, pointer within snapping range of that feature | 16 16 | `crosshair` |
| `cross-add` | Cross + plus | ⟨draw⟩, no outline in progress, over one of the target's stretches: a click inserts an anchor, as Illustrator's Pen over a selected path. **Not from the handoff** — derived on 2026-10-11 from `cross` and the plus of `arrow-insert`; replace it if a designed one arrives | 16 16 | `crosshair` |
| `arrow` | White arrow | ⟨edit⟩ active | 6 4 | `default` |
| `arrow-handle` | White arrow + square | ⟨edit⟩, over a handle | 6 4 | `default` |
| ~~`arrow-insert`~~ | White arrow + plus | **Retired 2026-10-14** (the dev): the white arrow selects, it never adds a point — inserting is the Pen's (`cross-add`). The file is deleted; its plus lives on in `cross-add` | — | — |
| `cross-thin` | Thin cross | ⟨edit⟩, dragging a marquee | 16 16 | `crosshair` |

CSS form:
```css
cursor: url(cursors/cross.svg) 16 16, crosshair;
/* PNG with a high-DPI variant: */
cursor: image-set(url(cursors/png/cross.png) 1x, url(cursors/png/cross-2x.png) 2x) 16 16, crosshair;
```
Hot spots are given in 32-px units for **every** file, the 64-px `-2x` PNGs included. Do not double them.

Precedence, highest first: ‹space› held (hand) › marquee drag › hover state › tool default. The hover state, as `cursors.ts` orders it: for the Pen, first anchor (closing) › the target's stretch (plus) › a snap layer in reach (snap) › plain cross; for the arrow, handle › stretch › arrow.

## Construction
- Canvas 32×32, `viewBox="0 0 32 32"`.
- Each glyph is drawn twice: a **white halo** (`#ffffff`, stroke 3; stroke 2 on the thin cross) under an **ink stroke** (`#1a1712`, stroke 1; 1.2 on the hands). This keeps it legible on terrain, sea and fills alike.
- The cross arms sit on x/y = 16.5 so the 1 px line covers pixel 16 exactly, which puts the hot spot at (16,16). The centre is left open (a 7 px gap) so the anchor under the pointer stays visible.
- The arrow is hollow (white fill, ink outline), after Illustrator's direct-selection tool. Its tip is at (6.5, 4.5), so its hot spot is (6,4).
- The modifier badges sit in the lower-right quadrant, clear of the arms:
  - closing ring: circle, r 3.5, centred at (25,25)
  - ~~branch mark: a Y-fork~~ — removed from the app, 2026-10-11 (see the end of this file)
  - snap mark: diamond, 9 px, centred at (25,25)
  - handle square: 7×7, white with an ink outline
  - plus: 8 px
- The cursors are monochrome on purpose. Selection blue (`#1f5bff`) belongs to the anchors and the editing stroke on the canvas, not to the pointer.

## The cursors are the canvas's, and nowhere else

Added 2026-10-08, from the dev's own scenario. Over the **chrome** — `{Polities}`, a form, a button, the
status bar — the pointer is whatever the platform says it is: an arrow over a row, a caret over a field.
None of the ten images in the table above ever appears there. A cross hovering over a list would claim that clicking
there puts a point down, and the gesture that selects a drawing target is a click in exactly that list.

So the rule is one line of scope: these cursors are set on the canvas element, never on `body`.
[s02](../scenarii/s02-create-france-1100.md) has the scenario.

**Verified in Illustrator itself, by the dev, 2026-10-08** — so this is no longer our inference about the
program these tools are taken from: *"le curseur de l'outil sélectionné n'est affiché que sur la zone de
travail. Dès que le curseur survole un des panneaux ou la barre de sélection d'outils, c'est le curseur
par défaut."* Our canvas is that work area, and the chrome is those panels.

## Four questions the handoff left open — settled 2026-09-22, and one re-settled 2026-10-08

**This section used to be headed "decide before building" and listed them as open.** They had been
answered the same day the handoff landed, in conversation, and this file was never reopened — the exact
failure `.claude/known-issues.md` records about itself: *a decision taken elsewhere is worse than no
decision, because the document someone opens to build from still asks the question.* Corrected here.

- **Precedence: confirmed** as inferred above — ‹space› held › marquee drag › hover state › tool default.
- **A cursor does not change during a drag.** Once the pointer is down the shape is fixed until release,
  so a hover state crossed mid-drag cannot flicker the pointer.
- **The snap feature's name** ("coast", "Seine") is a **canvas label** drawn beside the pointer in screen
  pixels, not a cursor: a cursor image cannot carry live text.
- **No drawing target → the CSS `not-allowed` cursor, over the canvas, with no eleventh image.**
  A tool can always be picked up; the cursor is what refuses. Settled 2026-09-22, and both options were
  weighed again on 2026-10-08 before the same answer was kept — the dev first described a *badged* cross,
  then dropped it on its cost (*"on ne va pas se faire chier à faire un autre curseur"*), and separately
  weighed disabling the two tool buttons instead. The cursor wins for one reason: it says **where** the
  gesture is refused rather than **whether** the tool exists. Nothing about the Pen is unavailable — a
  subject is missing. So the cross *disappears* while there is no target, rather than being marked.
  **It applies to ⟨edit⟩ too**, the half the handoff never asked about: selecting points with nobody
  selected is selecting *whose* points? Same missing subject, same refusal.
  It is also the cursor after a **`ctrl+z`** takes the target's polity away under a tool already in hand —
  derived from whether the target resolves, so nothing has to watch for it.
  [s02](../scenarii/s02-create-france-1100.md) has the scenarios, including the walk across the zones.

## Still not in the scenarios — no cursor drawn

- **Zoom in / out: confirmed 2026-10-08, no zoom tool and no magnifier.** Zoom has no mode — the wheel
  about the pointer, the `[+]`/`[−]` buttons the mockups already carry, or PageUp/PageDown — and the
  cursor stays the active tool's. The dev weighed a zoom tool the same day and dropped it: *"on s'en
  fout pour l'instant… on a un bouton plus et un bouton moins sur les maquettes, c'est très bien."* So
  `s00`'s **two tools and only two** stands, with ‹space› for the hand.
- **⟨edit⟩ while dragging an anchor or a selection:** not listed.

## Files
- `05 Cursors.dc.html`: the reference sheet. It needs `support.js`, `cursors/` and `assets/` next to it.
- `cursors/*.svg`: the 10 source cursors, 32×32 — `cross-branch` among them, **kept in this kit for reference only**: the app no longer ships it.
- `cursors/png/*.png`: 32×32 files, plus `-2x` files at 64×64.
- `assets/europe-terrain.png`: the terrain backdrop, used only for the try-it pads.

> **`cross-branch` removed, 2026-10-11, the dev's call**: the mark over a neighbour's anchor was not useful to him. The behaviour stays — a Pen click on an anchor another outline holds joins it, so the border is shared — with the plain cross over it.
