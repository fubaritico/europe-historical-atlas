# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Full plan: `files/plans/roadmap.md` (chapters).
> This repo is **europe-map** (3D historical atlas, TS + three.js + Vite) — NOT the old fubaritico-ds DS.

## Where we are

`master` at `69e4709`, **1108 tests**, full gate green, production build verified, tree clean. See
`completed.md`, entry **2026-09-18 (nuit)**.

The camera has a **focus mode**: double-click arcs over and lands at maximum zoom, Escape flies back to
where the reader was, a single click leaves the mode on the point it designated. The atlas is named —
`EUROPE` above the splash silhouette, `HISTORICΛL ΛTLΛS` below it, both tracked to the silhouette's own
measure, and `EUROPE HISTORICΛL ΛTLΛS` on one line along the sheet.

## ▶ THE PLAN WAS TURNED AROUND — contribution comes first

**The dev's correction, 2026-09-18, and it governs everything below.** The recorded order had colours,
then cities, then tooling. That order is dead, for a structural reason rather than a change of mind:

> **Cities are not decor, they are content.** A place, a city, a battle, an event all come out of the
> *second* contribution tool. "Do the cities" was never a graphics task — there would have been nothing
> to place. *"Sans contribuer, on ne pourra pas remplir. Il faut donner à manger à la bête."*

**The agreed sequence, in the dev's own terms:**

1. **Tools able to contribute one century** — regions, borders, **their colour code**, and **how names
   are displayed**. Note what that absorbs: the colour fork (roadmap 04) and labelling stop being
   separate render chantiers and become part of what the Cartographer authors.
2. **The content contributor** — geolocating cities, battles, events.
3. **Define the format of all of it**, so it can be re-exploited rather than re-authored.
4. **Re-exploit at two scales**: the Europe-wide map, and a **country focus presented as a slideshow in
   steps of about ten years** — the step is open. The dev *has a design in mind* for the country focus:
   **ask him, do not design it for him.**

**Why this does not contradict the travée** (`files/plans/roadmap/06`, memory
[[one-century-as-a-structural-bay]]): the method said a finished century teaches us what contribution
requires. But **there is no century to finish** — OHM only covers from ~1700, `historical-basemaps` is
schematic *and* unpublishable. Nothing can be finished until something can be drawn.

## ▶ NEXT SESSION — the Cartographer (roadmap 06)

First deliverable, flagged **ultra important** by the dev: the spike **`files/spikes/fetch-atlas`** — a
georeferenced public-domain atlas plate as a watermark under the canvas, traced over, snapping to the
rivers and coastline we already own.

**Chapter 06's order, with what is already stale:**

1. ~~Spike: OHM ingest~~ — **DONE 2026-09-16** (`files/spikes/fetch-ohm`, 98.8 % at 1700).
2. **PoC, one year only**: open → paint → save → re-open identical → the 3D atlas renders it. The chapter
   says use **1700**, so the PoC tests the *editor* and not the source.
3. Extract `packages/core` + move to pnpm workspaces.
4. Stand up the Payload Studio — **schema first**, it is the real work and is tool-independent.
5. ~~Derived borders replace the ring-based ones~~ — **DONE 2026-09-17**, the ring path was deleted.

**Two decisions due on day one**: full shared topology or the pragmatic v1 of independent polygons
snapping to existing vertices (cheaper, but subdividing later becomes a redraw); and **the century**.

### The century is now contested — read this before assuming 1500

Recorded decision: **1500, sovereign-state level, Holy Roman Empire as one block**, because its several
hundred principalities are "months, not a POC".

The dev then named a different target (2026-09-18): **a focus on France, 11th → 15th century**, *"avec le
bordel que c'était… ce serait de l'ordre du miracle"*. Said as an ambition, not a decision — but it is
the same problem the Empire's block-treatment dodged: a tiny royal domain, the Plantagenets straddling
two crowns, homage and mouvance rather than borders. It hits the hard limit head-on:
**`RegionRaster.cells` holds one polity per cell**, so layered sovereignty cannot be expressed at all.

**Settle this at session start.** It may well be the best proving ground there is — a tool surviving
feudal France survives anything — but it likely forces the data structure to change, and five centuries
stepped by decade is roughly fifty authored states.

### The sources, and the one that just arrived

- **The dev owns the Atlas historique mondial directed by Georges Duby** (Larousse). **In copyright** —
  not public domain. Memory [[duby-atlas-is-a-reference-not-a-tracing-source]].
  **Copyright protects the drawing, not the fact**: where a frontier ran, which cities existed, when a
  battle was fought are facts nobody owns. So it gets exactly the status Euratlas already has here — a
  reference beside the keyboard, never a plate scanned under the canvas and traced for publication. Its
  highest value is the **Studio registry** (identity, hierarchy, events), which has no free source at all.
- **Provider per era is still blocking for publication**: `historical-basemaps` is GPL-3.0 and cannot
  ship, OHM is CC0 and can, and today 1700 quietly holds an OHM payload while every other year holds GPL.

## Left open by decision, not missed

- **A11Y-301 — nothing enters the focus mode from the keyboard.** Escape leaves it; no key enters it.
  The review said to wait for M2's region list; **that argument does not hold** — the arrow keys already
  move the camera's ground target, so the centre of the view *is* the keyboard cursor. It is open because
  it is **the dev's call**: he has said the trigger is provisional and the real entry will be a 3D button
  driven by event importance, so deciding the gesture now decides it twice.
- **QUAL-021 — `buildTitle` in `mapLayerBuilders.ts` is reached by no test.** `rebuildFrame` is never
  called in the suite. Blast radius, not diff; already true before this session.

## Still open on the decor (none urgent)

1. **Vertex colours are written in sRGB into an attribute three reads as linear** (`known-issues`, first
   entry). It silently eats every darkening on the frame and the cut edge, so anything tuned by eye on
   those two modules was tuned against the bug. Retuning them is part of the fix, not a follow-up.
2. **The thickness is cut at the map's edge instead of the sheet's** — why `edgeDepth` is 0.
3. **The frame's three rules have no matter in them** — raised, not decided.

## Small things never picked up

- **The brown/cream stroke on two screenshots**, from 2026-09-16 — never explained.
- **The coastal band** (Iceland, Scandinavia, the Caspian) — one click settles it: drop the `coastline`
  layer opacity to 0 and see whether the band goes with it.
- **`double` borders are implemented, tested, and produced by no rule.**
- **Vector coastline** (`ne_10m_coastline` through the rivers pipeline) — the last open render complaint.
- **The compass SVG is validated by nothing** — the fifth asset, missed by chapter 07's own audit.
- **Retry after a blocking failure** — no way out but a page reload, and nothing says so. The taxonomy
  already says only `transport` is worth retrying. Build the **action seam** first.

## Key facts to reload

- **Three camera modes are settled: normal, focus, country** — the gestures to reach them are not
  ([[focus-mode-is-permanent]]). A **top-down country view is impossible as things stand**: `pitchForZoom`
  ties pitch to zoom, so approaching always means grazing. Pitch must decouple from zoom during a focus.
- **Only entering a focus arcs.** Leaving one already carries its own pull-out; bending it too sends the
  camera past its destination and back.
- **A `click` fires at the end of every drag**, with no movement threshold in the DOM — hence
  `MapControls.pointerDragged`, decided once, where the drag lives. Never decide it a second time.
- **A border is not an object, it is a relation** — derive it from the fills; never author it separately.
- **The staircase is a *resolution* problem.** Now at 4× (1.9 km cells, ~136 MB peak, ~825 ms).
- **The bake is not political** — five callers. Two ports, one implementation.
- **A worker boundary is a bundle boundary**: hence `pipeline/`, whose ESLint rule refuses `three`.
- **Only the newest call may write back**, checked after *every* await before *every* side effect.
- **`bootstrap()` is this codebase's modularity sink** (ARCH-012).
- **The atlas's name lives once**, in `utils/lettering` — the splash stacks the halves, the sheet runs
  them together.
- **Assets**: `public/heightmaps/`, `public/masks/`, `public/rivers/` committed; `public/borders/*.json`
  git-ignored (GPL). **1700 holds the OHM payload**, original backed up at
  `files/spikes/fetch-ohm/out/europe-1700.hb-backup.json`.
- **`let`-const-ify gotcha**: the eslint `--fix` hook runs after each edit; add a `let` and its first
  reassignment together.

## Conventions (this project)

Docs/config in **English**, chat in **French**. Plans split into chapters (`files/plans/roadmap/`). Spikes
cataloged in `files/spikes/`. Commit subjects lowercase, **body lines ≤ 100 chars** (commitlint).
**Announce every command** (cause / reason / action). **`rm -rf` needs explicit permission every time.**
