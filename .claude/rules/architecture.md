# Architecture — europe-map

> Interactive 3D historical atlas of Europe. WebGL rendering, camera navigation, per-polygon picking.

## Tech Stack

| Category  | Technology          | Version      |
| --------- | ------------------- | ------------ |
| Language  | TypeScript (strict) | via tsconfig |
| 3D engine | three.js            | ^0.186       |
| Bundler   | Vite (+ HMR)        | ^8.3         |
| Package   | pnpm workspaces     | 10.7.1       |
| Tests     | Vitest              | ^5.0         |

> No Turbo and no Lerna — measured and refused 2026-09-24. See `files/plans/plan.md` (P2) for
> the two thresholds that would change that: a CI, or a gate past ~30 s.

## Project Structure

> Split into a pnpm workspace on **2026-09-24**. Two packages, and the boundary between them is a
> contract, not a folder: **`core` contains no three.js**, enforced by ESLint and proved by breaking it.
> That is what keeps the worker chunk at 13.5 kB with no renderer in it.

```
pnpm-workspace.yaml
package.json            # workspace root: tooling only, scripts delegate with --filter
tsconfig.json           # one type-check across both packages
vitest.config.ts        # one test run across both packages
eslint.config.js        # layer boundaries as a table, applied to both packages

packages/
├── core/               # @europe-atlas/core — pure TypeScript, NO three.js
│   └── src/
│       ├── utils/      # leaf: small pure helpers, importing nothing
│       ├── geo/        # leaf: projection maths
│       ├── data/       # domain + ports (heightmap, land mask, regions, rivers); reads geo/ + utils/
│       └── pipeline/   # the CPU work, worker-safe; reads data/, geo/, utils/
└── atlas/              # @europe-atlas/atlas — the application
    ├── index.html      # Vite entry point (canvas)
    ├── public/         # DEM, land mask, rivers
    ├── vite.config.ts
    └── src/
        ├── main.ts     # composition root: renderer, scene, camera, loop
        ├── scene/      # pluggable scene modules
        ├── camera/     # camera + CameraStateStore (independent of everything else)
        ├── controls/   # navigation; depends on camera/ only
        ├── picking/    # raycasting: answers WHERE, never WHAT
        └── ui/         # plain DOM over the canvas

files/plans/            # the plans — shipped since 2026-09-24
files/spikes/           # runnable experiments; their out/ stays ignored
```

**Cross-package imports use subpath exports**: `@europe-atlas/core/utils/math`, never a barrel. A single
barrel would flatten the four layers into one namespace and put `pipeline/` behind the same entry as the
rest — which is exactly what would smuggle three.js into the worker chunk.

## Scripts

```bash
pnpm dev          # Vite server + HMR
pnpm build        # production build (vite build)
pnpm preview      # preview the build
pnpm type-check   # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest
```

## 3D Pipeline (Milestone 1)

1. **Heightmap → relief**: load the B&W bitmap, subdivided `PlaneGeometry`, **CPU** displacement
   (read pixels → per-vertex `z`, `computeVertexNormals()`). CPU because raycasting must hit the real
   relief (GPU displacement is invisible to the raycaster).
2. **Texture**: `material.map` (colored/political map), UV alignment on the plane.
3. **Navigation**: camera moved with arrow keys (map-style pan).
4. **Picking**: `Raycaster` on click → intersection → camera fly-to (tween position + target).

## Data Layers (Milestones 2+)

- **Physical relief**: stable over time (a single heightmap).
- **Historical regions**: versioned by date (GeoJSON/mask per century, then per decade).
  The "click → region at time T" binding relies on this layer, not on the raw heightmap polygons.

## Git & Commits

Conventional commits. Format: `type(scope): subject` (lowercase, no trailing period, ≤ 100 chars).
Types: `build chore ci docs feat fix perf refactor revert style test`.
Suggested scopes: `scene`, `camera`, `controls`, `picking`, `data`, `repo`.

## Forbidden

```
❌ console.log              → console.warn / console.error
❌ explicit any             → strict TypeScript
❌ guessing a three.js API  → verify via opensrc/three or the web
❌ GPU leak                 → dispose() geometries/materials/textures on teardown
❌ global singleton         → inject renderer/scene/camera (DI)
```
