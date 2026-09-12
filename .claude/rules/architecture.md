# Architecture — europe-map

> Interactive 3D historical atlas of Europe. WebGL rendering, camera navigation, per-polygon picking.

## Tech Stack

| Category  | Technology          | Version      |
| --------- | ------------------- | ------------ |
| Language  | TypeScript (strict) | via tsconfig |
| 3D engine | three.js            | to install   |
| Bundler   | Vite (+ HMR)        | to install   |
| Package   | pnpm                | 10.7.1       |
| Tests     | Vitest              | to install   |

> No dependency is installed yet (fresh repo). Roadmap Phase 0.1 sets up the tooling.

## Project Structure (target)

```
index.html              # Vite entry point (canvas)
src/
├── main.ts             # bootstrap: renderer, scene, camera, loop
├── scene/              # pluggable scene modules (relief, lights…)
├── camera/             # camera + CameraStateStore (hot-reload persistence)
├── controls/           # navigation (arrow keys, pan/zoom)
├── picking/            # raycasting click → polygon/region
├── data/               # ports: heightmap, texture, historical regions
└── assets/ (or public/) # B&W heightmap, textures
files/plans/            # .md plans (gitignored)
```

## Scripts (target, to define in Phase 0.1)

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
