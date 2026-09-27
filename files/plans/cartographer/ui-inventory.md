# Cartographer — component inventory for Claude Design

> Extracted from the thirteen scenario files on 2026-09-22, by grep rather than from memory.

## Hand Claude Design both this and the scenarios

**This file lists the parts. The scenarios give the application its shape.** The dev, 2026-09-22: _"les
scénarios, ils donnent carrément la forme à l'application."_

A mockup built on the inventory alone comes out plausible and wrong, because none of this is guessable
from a list of components:

- validating the polity form **switches to the Pen on its own**, with that polity as the target;
- the drawing target stays on screen for as long as the Pen is active;
- closing a ring inside another polity **asks who holds that ground**, right then;
- a polity with no territory is kept, not discarded, and is the normal starting state;
- undo never changes the tool in your hand, and never moves the view.

**Reading order for the design work:**

| read                                           | for                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| [s02](scenarii/s02-create-france-1100.md)      | the main journey: form → Pen → target → snapping → closing → the hole question |
| [s03](scenarii/s03-edit-existing-border.md)    | selection, handles, multiple move, deletion, undo/redo                         |
| [s01](scenarii/s01-open-and-navigate.md)       | the editor at rest: opening, layers, reading what is under the pointer         |
| [s10](scenarii/s10-check-before-publishing.md) | the densest list in the tool                                                   |
| [s07](scenarii/s07-manage-the-registry.md)     | the registry table, and the form reopened to edit                              |
| [s00](scenarii/s00-index.md)                   | the two tools, how an anchor reads, and why every rule is a default            |

The format is in [`format.md`](format.md) — needed only if a screen shows a
field.

## The seam, and it is the only rule that matters

**The chrome never touches geometry. It emits intentions.**

A panel says _"the user asked to delete the selected anchors"_; it never reaches into a ring. Break this
and regenerating a design breaks the editor — which is the whole reason the interface can be designed
separately from the tool.

## What Claude Design can and cannot do

|            |                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Can**    | every panel, form, list, dialogue, toolbar, status line, banner and table below — live HTML/CSS                               |
| **Cannot** | the `<canvas>`: the map, the anchors, the rubber band, the marquee, the cursors, the snap feedback, the feel of zoom and drag |

That second row is where an editor's experience lives, and it is code. Do not let a mockup pretend
otherwise: the drawing surface should appear in any screen as a grey rectangle with a note.

## Screen zones

```
┌────────────────────────────────────────────────────────────────┐
│ title bar — "Cartographer — 1110"  + modified marker           │
├───────────┬────────────────────────────────────┬───────────────┤
│ {Tools}   │                                    │ {Polities}    │
│           │          the canvas                │ {Details}     │
│ {Layers}  │        (code, not design)          │               │
├───────────┴────────────────────────────────────┴───────────────┤
│ status bar — coordinates · who holds this cell · scale · counts │
└────────────────────────────────────────────────────────────────┘
```

Plus a **drawing-target banner**, visible only while the Pen is active.

## Panels

| panel               | holds                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{Tools}`           | ⟨navigate⟩ · ⟨draw⟩ ‹P› · ⟨edit⟩ ‹A› · `[↶ Undo]` `[↷ Redo]` (disabled states carry the undo stack's only visible reading, and each names its step: "Undo — move anchor") |
| `{Tools}` sub-strip | shown under ⟨draw⟩ only: ⟨free point⟩ · ⟨snap to river⟩ · ⟨snap to coast⟩                                                                                                 |
| `{Layers}`          | backdrop · coastline · rivers · graticule · cities · fills · borders · unclaimed · diff. Each with visibility and opacity                                                 |
| `{Polities}`        | the year's polities as a **nested tree**, like Illustrator's layers: a vassal sits under its lord, and `[+ New polity inside]` is what creates one. Colour swatch, name, rank. Markers: "no territory", "ended 1104", "begins 1115", licence, personal union. A branch is labelled with its relation ("owes France"); dragging a row asks before changing homage. Hover highlights the fill |
| `{Details}`         | the selected polity's card, and the creation/edit form (below)                                                                                                            |
| `{Hands}`           | border hands set by hand, listed as exceptions to the derived rules                                                                                                       |
| `{Reference}`       | a hand-placed reference image, when one is loaded                                                                                                                         |

## Forms and dialogues

|                                                    | fields / choices                                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **polity form** (creation and edit, the same form) | name · rank · status · exists from · exists to · suzerain · colour (or "automatic") · Wikidata id — `[OK]` `[Cancel]` |
| **OHM identity import**                            | search box, result rows "name (Q…) — rank · status · no geometry", multi-select                                       |
| **who holds this hole?**                           | an existing polity · a new polity · nobody, deliberately (+ a reason)                                                 |
| **overlap between peers**                          | take the ground · leave it · adjust the outline, with the area in km²                                                 |
| **save over an existing year**                     | "1110 already exists — 52 polities, 17 104 anchors, modified 3 days ago" → replace · choose another year · cancel     |
| **delete a shared anchor**                         | "held by 2 paths — France, Holy Roman Empire" → confirm · cancel                                                      |
| **delete a polity**                                | "appears in 1 year, holds 3 rings" → reassign to… · leave unclaimed · cancel                                          |
| **merge duplicates**                               | which identity survives                                                                                               |
| **unsaved work on close**                          | save · discard · cancel                                                                                               |

## Bars and banners

|                           | content                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **title bar**             | `Cartographer — <file> — <year>`, modified marker                                                                                                                                                                   |
| **status bar**            | pointer coordinates · the polity holding that cell · scale in km/px · counts. Also carries transient messages: "inserted 412 vertices from the coastline", "no river within 12 km", "undone off screen — [show me]" |
| **drawing-target banner** | "Drawing: Kingdom of France" + colour swatch. Visible for as long as the Pen is active. **Non-negotiable** — without it, four hundred anchors can land in the wrong country unnoticed                               |
| **GPL banner**            | persistent, on a read-only file: "GPL-3.0 source — reference only"                                                                                                                                                  |
| **backdrop warning**      | "backdrop resolution exceeded — position from the vectors"                                                                                                                                                          |

## Buttons, by where they live

- **file**: `[Open…]` · `[Open as reference…]` · `[Save]` · `[Save as…]` · `[Export for the atlas…]` · `[Load backdrop image…]`
- **polities**: `[+ New polity]` · `[Edit properties…]` · `[Draw territory]` · `[Edit vertices]` · `[Add a name…]` · `[Reassign…]` · `[Remove from this year]` · `[Delete]`
- **geometry**: `[Duplicate into the selected polity]` · `[Hand ▸ …]` · `[Reset anchor]`
- **registry**: `[Registry]` · `[Merge…]` · `[Find duplicates]` · `[Hierarchy]` · `[Import identities from OHM…]`
- **checking**: `[Check this year]` · `[Compare with…]` · `[Provenance report]` · `[Accept]` · `[Border hands]`
- **zone**: `[Remove out-of-zone polities]`

## Zoom controls — missing from the scenarios, found on the first mockup

The scenarios only ever zoom with the wheel ([s01](scenarii/s01-open-and-navigate.md)), so the first
design came back with no zoom control at all. A map tool needs visible ones.

| control | note |
|---|---|
| `[+]` `[−]` | floating over the canvas, bottom-right |
| `[fit to frame]` | frames the whole editorial zone |
| the scale | **already in the status bar** — do not repeat it beside the buttons |

Keyboard equivalents exist in the atlas already and belong in the tooltips: `+` / `−` and
`PageUp` / `PageDown`. The wheel zooms **about the pointer**, which is a canvas behaviour and therefore
code.

## Icon buttons — three rules this project has already paid for

Icons for the tools, undo/redo, zoom and layer visibility. Text stays wherever a button commits something
irreversible — `[Save as…]`, `[Delete]`, `[Merge…]`. **An icon alone is fine for a mode, not for a
consequence.**

1. **An accessible name on every icon-only button** (`aria-label`), not just a `title`.
2. **24×24 minimum hit area**, whatever the glyph's size — WCAG 2.5.8, which is the **AA** bar. The
   familiar 44×44 is 2.5.5 and is AAA.
3. **A tooltip naming the action and its shortcut.**

Both of the first two were shipped wrong once already, on the notice dismiss button (A11Y-201, A11Y-202,
2026-09-17): a 19×23 hit area and a glyph at `opacity: 0.65` compositing to 3.71:1.

## Cursors — the image is design, the trigger is code

> **Delivered 2026-09-23** as final assets: `files/plans/cartographer/design/cursors/` (SVG + PNG 1×
> and 2×), documented in that folder's `CURSORS.md`, with a reference sheet at `05 Cursors.dc.html`.
> Each is 32×32 with a **white halo under the ink stroke**, so one cursor reads over terrain, sea and
> political fills alike — the border casing's argument, applied to the pointer.

**When** each one appears is code, driven by what lies under the pointer.

| tool / state | cursor |
|---|---|
| ⟨navigate⟩, and ‹space› held under any tool | open hand · closed hand while dragging |
| ⟨draw⟩ | cross |
| ⟨draw⟩ over the outline's first anchor | cross + closing ring — the outline can be closed here |
| ⟨draw⟩ over an existing anchor | cross + branch mark — a new outline will start from it |
| ⟨draw⟩ within snapping range of a river or coast | cross + snap mark, with the feature's name |
| ⟨edit⟩ | white arrow |
| ⟨edit⟩ over a handle | white arrow + square |
| ⟨edit⟩ over a stretch, away from any handle | white arrow + plus — a click inserts an anchor |
| ⟨edit⟩ dragging a marquee | thin cross |

**Two rules they must obey**, both already paid for elsewhere in this project: a cursor keeps its size in
screen pixels at every zoom, and the cross's hot spot is its centre, not its top-left — a one-pixel offset
puts every anchor in the wrong place, and it is invisible until someone measures it.

## The backdrop image for mockups

Design the panels **over the real terrain**, not over grey. The reason is concrete: the polity palette runs
from gold `#d4b24a` to slate blue `#54719b` over a parchment ground, which is what makes a blue selection
colour disappear on a blue country. That class of mistake is obvious on sight and invisible in a
description.

Two ways to get the image, and the cheap one is enough:

1. **A screenshot of the atlas** — `pnpm dev`, **political layer off** (the Cartographer's backdrop is the
   terrain without the polity tint), Europe framed flat. Costs nothing and is literally what the user will
   see.
2. **Bake it in Node** — `pipeline/composeTerrainRgba` is pure, with no DOM and no three.js (the ESLint
   boundary enforces it), so a ~40-line spike can read the DEM and the land mask, compose, and write a PNG
   with `zlib` and no dependency. Worth doing only when an exact, regenerable, arbitrary-resolution image
   is needed.

## Two lists worth designing properly

**The check report** ([s10](scenarii/s10-check-before-publishing.md)) — rows grouped by kind, worst first,
each saying what is wrong, where, and what it would take to fix; clicking frames it on the canvas. Plus one
line: "publishable: yes / no". It is the contributor's to-do list and the only completion gauge.

**The registry** ([s07](scenarii/s07-manage-the-registry.md)) — every polity **of the open year**: name,
rank, existence dates, suzerain, colour, Wikidata id. Filterable by name and rank, with "no territory"
marked. Corrected 2026-09-27: one registry per year, so there is no "which years it appears in".

## Screens worth mocking first

1. **The editor at rest** — a year open, polities listed, nothing selected. Establishes the whole layout.
2. **Drawing** — Pen active, target banner up, sub-strip visible, status bar live.
3. **The polity form** — used at creation and at edit, so it carries the identity model.
4. **The check report** — the densest list, and the one that decides whether the tool feels finished.

## To add to the existing mockups — 2026-09-27

The five screens in `design/` predate three decisions and do not show them. None needs a redesign; each is
an addition to a panel that already exists.

1. **`{Polities}` becomes a nested tree** ([s08](scenarii/s08-vassalage.md)) — the dev's request, the one
   that matters most because it changes a gesture rather than a display: a vassal is created *inside* its
   lord, so the relation can no longer be forgotten in a form field. To show: the disclosure triangles, two
   levels of indent (France → Aquitaine → Poitou), the relation label on the branch, and the confirmation
   dialogue for a drag that changes homage. **Illustrator's look, not Illustrator's meaning** — nesting here
   is homage, not stacking, and the mockup has to make that legible or the metaphor misleads.
2. **The three marks on a derived year** ([s05](scenarii/s05-derive-a-year.md)) — "carried over", "ended
   1104", "begins 1115", with the counts line and the filter. Plus the **dashed ghost** on canvas for an
   ended polity: visible, not rendered.
3. **`{Overrides}`** ([s13](scenarii/s13-overrides.md)) — a panel that does not exist in any screen yet:
   rows grouped by kind, each with its target, the derived value it replaced, `[Clear]` and `[Show me]`, and
   the count in the status bar. Plus the **style bar** that appears when a marquee has selected segments:
   pattern, weight, ink, `[Clear]`.
