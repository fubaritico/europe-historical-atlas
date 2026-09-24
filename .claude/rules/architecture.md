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
├── core/               # @europe-historical-atlas/core — pure TypeScript, NO three.js
│   └── src/
│       ├── utils/      # leaf: small pure helpers, importing nothing
│       ├── geo/        # leaf: projection maths
│       ├── data/       # domain + ports (heightmap, land mask, regions, rivers); reads geo/ + utils/
│       └── pipeline/   # the CPU work, worker-safe; reads data/, geo/, utils/
└── atlas/              # @europe-historical-atlas/atlas — the application
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

**Cross-package imports use subpath exports**: `@europe-historical-atlas/core/utils/math`, never a barrel. A single
barrel would flatten the four layers into one namespace and put `pipeline/` behind the same entry as the
rest — which is exactly what would smuggle three.js into the worker chunk.

### Where this is going — apps and resources

The dev's own taxonomy, 2026-09-24: **Payload is an app, the atlas is an app, core is a resource.**
Three applications will live here, not two, and they do not all render the same way:

|                     | what it is                                                                                            | renders with                     | state today              |
| ------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| **atlas**           | the 3D map — the thing that gets published                                                            | three.js on a WebGL canvas       | built                    |
| **cartographer**    | the territory editor — anchors, rings, borders                                                        | **2D canvas** + plain DOM chrome | designed, chrome running |
| **places & events** | the content the map shows: cities with icons and 3D models, events with their consequences and actors | **Payload** (headless Next CMS)  | planned                  |
| **core**            | the format, the readers, the compositor, the maths                                                    | —                                | built, three-free        |

**All three ship in this repository** — committed, never git-ignored. **Two of them go online now**:
the atlas and, later, the cartographer, both static bundles. **Payload stays local for the moment** —
the dev's call, 2026-09-24, and a staged one with a named condition: going online means accounts, login
and a security layer, and the editor has to be proven first. Until then it keeps its database in a file
and the atlas reads what it produces over a **relative URL**, like every other asset it loads.

The day it does go online: Payload is a Next application, so a server runtime plus a database reachable
from it — a SQLite *file* does not survive a serverless filesystem, so network SQLite (libSQL / Turso,
spoken by the same adapter) or Postgres, and the auth layer with it.

**A trap worth stating once**: a browser cannot query a SQLite file over a relative URL. Either Payload
exports JSON that the atlas fetches like the DEM and the rivers, or the `.db` ships and is queried with
`sqlite-wasm`. Open, and written up in `files/plans/plan.md` (P7).

### The shared design system — decided, and it costs the atlas nothing

**The dev's call, 2026-09-24: it will be his own `fubaritico-ds`, as an external dependency**, used by
the atlas, the cartographer and the Payload admin alike. It is a **multi-framework** system: a React
component base today, a Stencil/web-component variant planned, Angular and Vue possible — and, crucially,
**the styles are independent of all of them and shared between them**.

**Read from the repository on 2026-09-24, not assumed:**

| package | what it ships | framework runtime |
|---|---|---|
| `@fubaritico-ds/tokens` | `./css` → `variables.css` (custom properties) + a TS token object | **none** |
| `@fubaritico-ds/styles` | one `styles.css` | **none** |
| `@fubaritico-ds/variants` | class-string builders over `class-variance-authority` | **none** (a couple of kB) |
| `@fubaritico-ds/stencil` | Stencil components, output targets `dist` and `dist-custom-elements`, plus React and Angular wrappers | web components — no React |
| `@fubaritico-ds/shared` | app-level React (router, query, testing-library) | React — **not a DS primitive** |

**Three levels of consumption, and the atlas only ever needs the first:**

1. **tokens + styles (+ variants)** — the whole visual language for **zero JavaScript**. The atlas's DOM
   is a splash, a progress overlay and, at M2, event panels. It does not need components; it needs the
   same colours, type and spacing as the other two apps.
2. **Stencil custom elements** — standard `HTMLElement`s, usable from vanilla TypeScript with no
   framework. The fallback if the atlas ever wants a real component.
3. **React components** — ~45 kB gzipped of React + ReactDOM on top of a 185 kB bundle, for an
   application whose DOM is three elements. **Not for the atlas.**

**The cartographer reaches the opposite conclusion, for the same reason.** Its chrome *is* the
application — panels, tab strips, a 51-row list, forms, dialogues, a splitter. That is what a component
library is for, and whichever variant is ready when it is built (React or Stencil) earns its place. The
2D canvas stays imperative either way.

**Because the styles are shared across variants, all three applications look identical whichever level
each one consumes.** That is the whole point of a multi-framework system, and it is what makes "React
design system" a non-problem here.

#### The real risk, and it is not the framework

Nothing a framework does costs frames in a WebGL application **as long as per-frame state never goes
through it**. Camera position, zoom, hover, a drag in progress: route any of those through component
state and reconciliation runs at 60 Hz, which is what actually kills these applications. Keep the canvas
imperative and the document model in a plain store, render on commit rather than on `pointermove`, and
the cost is zero — in either app.

**Worth being accurate about why the atlas is fast today**: it is not that it is vanilla. It is that the
CPU work runs in a worker, that no geometry is rebuilt per frame, and that exaggeration is a `scale.y`
rather than a re-displacement. There is almost no DOM to be slow. What vanilla buys is that the wrong
pattern is not available by default — which is worth keeping, but it is not the measurement.

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
