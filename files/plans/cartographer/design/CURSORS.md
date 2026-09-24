# Handoff: Cartographer canvas cursors

## Overview
Ten cursor images for the canvas of the Cartographer, the contribution tool of a 3D historical atlas of Europe. They cover the nine tool/state rows of the UI inventory: ⟨navigate⟩, ⟨draw⟩ (the Pen) and ⟨edit⟩ (white arrow). **The images are design. When each one appears is code**, driven by what lies under the pointer.

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
| `cross-branch` | Cross + branch mark | ⟨draw⟩, over an existing anchor: a new outline will start from it | 16 16 | `crosshair` |
| `cross-snap` | Cross + snap mark | ⟨draw⟩ with snap to river / snap to coast, pointer within snapping range of that feature | 16 16 | `crosshair` |
| `arrow` | White arrow | ⟨edit⟩ active | 6 4 | `default` |
| `arrow-handle` | White arrow + square | ⟨edit⟩, over a handle | 6 4 | `default` |
| `arrow-insert` | White arrow + plus | ⟨edit⟩, over a stretch, away from any handle: a click inserts an anchor | 6 4 | `copy` |
| `cross-thin` | Thin cross | ⟨edit⟩, dragging a marquee | 16 16 | `crosshair` |

CSS form:
```css
cursor: url(cursors/cross.svg) 16 16, crosshair;
/* PNG with a high-DPI variant: */
cursor: image-set(url(cursors/png/cross.png) 1x, url(cursors/png/cross-2x.png) 2x) 16 16, crosshair;
```
Hot spots are given in 32-px units for **every** file, the 64-px `-2x` PNGs included. Do not double them.

Precedence, highest first: ‹space› held (hand) › marquee drag › hover state (first anchor › existing anchor › snap range / handle › stretch) › tool default. This order is not in the scenarios. It is inferred from the table, so confirm it.

## Construction
- Canvas 32×32, `viewBox="0 0 32 32"`.
- Each glyph is drawn twice: a **white halo** (`#ffffff`, stroke 3; stroke 2 on the thin cross) under an **ink stroke** (`#1a1712`, stroke 1; 1.2 on the hands). This keeps it legible on terrain, sea and fills alike.
- The cross arms sit on x/y = 16.5 so the 1 px line covers pixel 16 exactly, which puts the hot spot at (16,16). The centre is left open (a 7 px gap) so the anchor under the pointer stays visible.
- The arrow is hollow (white fill, ink outline), after Illustrator's direct-selection tool. Its tip is at (6.5, 4.5), so its hot spot is (6,4).
- The modifier badges sit in the lower-right quadrant, clear of the arms:
  - closing ring: circle, r 3.5, centred at (25,25)
  - branch mark: a Y-fork
  - snap mark: diamond, 9 px, centred at (25,25)
  - handle square: 7×7, white with an ink outline
  - plus: 8 px
- The cursors are monochrome on purpose. Selection blue (`#1f5bff`) belongs to the anchors and the editing stroke on the canvas, not to the pointer.

## Not in the scenarios — no cursor drawn (decide before building)
- **Zoom in / out:** zoom has no mode. It is the wheel about the pointer, the [+]/[−] buttons, or PageUp/PageDown, and the cursor stays the active tool's. A magnifier cursor needs a zoom tool or a held key, and the scenarios define neither.
- **Pen with no drawing target:** s02 says the Pen refuses and says which polity to select first. No cursor is specified. The CSS `not-allowed` cursor is a candidate.
- **⟨edit⟩ while dragging an anchor or a selection:** not listed.
- **The snap feature's name** ("coast", "Seine"): a cursor image can't carry live text. Draw it as a canvas label next to the pointer, in screen pixels.

## Files
- `05 Cursors.dc.html`: the reference sheet. It needs `support.js`, `cursors/` and `assets/` next to it.
- `cursors/*.svg`: the 10 source cursors, 32×32.
- `cursors/png/*.png`: 32×32 files, plus `-2x` files at 64×64.
- `assets/europe-terrain.png`: the terrain backdrop, used only for the try-it pads.
