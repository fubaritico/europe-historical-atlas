# `@europe-historical-atlas/atlas`

The map itself: a relief of Europe drawn as an old printed sheet, navigated like a grand-strategy game.
This is the application that gets published.

```bash
pnpm dev       # from the workspace root — Vite + HMR, and the camera pose survives a reload
pnpm build     # type-checks both packages, then builds this one into packages/atlas/dist
```

## What is in here

```
index.html        the entry; the canvas is the whole page
public/           DEM, land mask, rivers — the physical assets, all public domain
src/
├── main.ts       the composition root: create, inject, connect, tear down. Wiring only.
├── scene/        pluggable scene modules — relief, terrain texture, lines, frame, decor
├── camera/       the camera and its persistence; depends on nothing else
├── controls/     navigation — pan, zoom, drag, inertia, flight, focus mode
├── picking/      raycasting. Answers WHERE, never WHAT
├── ui/           plain DOM over the canvas — splash, progress, notices
└── utils/        helpers that need a browser (focus, reduced motion)
```

Everything that is _not_ about drawing lives in [`@europe-historical-atlas/core`](../core/README.md) —
formats, readers, compositing, projection maths — imported by subpath:
`@europe-historical-atlas/core/data/heightmap`.

The layer direction is enforced by ESLint, not by habit: `camera/` may not reach into `scene/`,
`picking/` may not know what it hit, `ui/` may not know there is a renderer, and nothing may import
`main.ts`. The rules are a table at the bottom of the root `eslint.config.js`.

## Why it is fast, accurately

Not because it avoids a framework — it has almost no DOM to be slow. The reasons are specific, and they
are worth preserving when the UI grows:

- **the CPU work runs in a Worker.** Rasterising a century, growing claims over land and deriving
  borders costs ~825 ms at the default 1.9 km grid. None of it is on the main thread.
- **no geometry is rebuilt per frame.** Zoom-linked exaggeration is a `scale.y`, not a re-displacement
  of 260 000 vertices.
- **the terrain is unlit.** The look is painted into the texture once, so there is nothing to light.
- **only the newest call writes back.** Overlapping rebuilds are gated, so a stale result cannot settle
  the map on a year the reader has already left.

**The rule that keeps it true when a framework arrives**: per-frame state — camera, zoom, hover, a drag
in progress — never goes through a component. Reconciliation at 60 Hz is what kills applications like
this one, not the framework itself.

## The political layer is absent, deliberately

`public/borders/` is git-ignored. The only complete free set of century-by-century borders we found is
GPL-3.0 with no separate data licence, so it is a spike to read, never an asset to ship. The fills and
the drawn borders come back the day the geometry is **ours** — see `files/plans/plan.md` (P5).
