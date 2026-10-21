---
paths:
  - "packages/atlas/**"
  - "packages/core/src/pipeline/**"
  - "**/eslint.config.js"
  - "turbo.json"
---
# Troubleshooting & Architectural Decisions — europe-map

> Issues hit and decisions made while building the 3D project. See `architecture.md` for the structure.
> Add only after seeing the problem — invent nothing.

## Gotchas

### Raycasting is blind to GPU displacement

**Anticipated problem**: with a `displacementMap` on a `MeshStandardMaterial`, the relief is computed in
the vertex shader (GPU); the CPU geometry stays flat → the `Raycaster` hits the flat plane, not the relief.
**Decision**: **CPU-side** displacement (read heightmap pixels → per-vertex `position.z` +
`geometry.computeVertexNormals()`). Picking then hits the real relief.

### Camera persistence across hot-reload (project requirement)

**Goal**: on HMR / refresh, the view must be strictly identical (zero transition).
**Approach**: a `CameraStateStore` serializing `position` + `quaternion` + `fov` + controls `target`.

- Vite HMR (no reload): `import.meta.hot.data` / `import.meta.hot.dispose` to hand off the state.
- Full refresh (F5): `sessionStorage` (throttled write + `beforeunload`).
- Restore **synchronously before the first `render()`** — `packages/atlas/src/camera/cameraState.ts`.

### GPU leaks

**Rule**: call `dispose()` on geometries / materials / textures when tearing down a scene module. A plain
`scene.remove(mesh)` does not free GPU memory.

## Architectural decisions

- **Plain three.js in the atlas, and no framework near its render loop** — canvas + TS is enough there, and
  the "revisit if a complex UI overlay justifies a framework" clause this entry used to carry **has been
  answered, for the other application**: the Cartographer's chrome is **React + Zustand** (the dev's call,
  2026-09-29) because its chrome *is* the application — panels, forms, a tree, a 51-row list. The atlas's own
  DOM is a splash and a progress overlay, so it stays vanilla and takes only `fubaritico-ds`'s tokens and
  styles, which cost it zero JavaScript. See `architecture.md`, "apps and resources".
  **What makes that safe is not the framework choice but one rule**: per-frame state never goes through a
  component. Camera, zoom, hover, a drag in progress — route any of those through component state and
  reconciliation runs at 60 Hz. The 2D canvas stays imperative; the document model lives in a plain store.
- **Two data layers**: physical relief (stable) vs historical regions (versioned by date).

## Tooling

### `pnpm add -D eslint ...` pulls incompatible majors (ESLint 10 / TypeScript 7)
**Problem**: a bare `pnpm add -D eslint typescript typescript-eslint eslint-plugin-import` resolved to
**ESLint 10** and **TypeScript 7**, which break peers: `typescript-eslint@8` requires `typescript <6.1`
and `eslint-plugin-import` requires `eslint ≤9` → unmet peer warnings, typed linting broken.
**Solution**: pin the known-good set — **eslint@^9**, **@eslint/js@^9**, **typescript@~5.7**,
**typescript-eslint@^8**, **eslint-plugin-import@^2**. Re-run `pnpm add -D` with explicit versions.
**Rule**: pin ESLint/TS majors; don't let `pnpm add` grab bleeding-edge majors for lint tooling.

### Quality tooling layout (single package, monorepo-ready)
ESLint 9 flat config (`eslint.config.js`) + Prettier (`.prettierrc`) + commitlint + husky (`pre-commit`
= lint-staged + type-check; `commit-msg` = commitlint) + lint-staged. ~~**Decision: stay single-package**~~ — **split 2026-09-24** into
`@europe-historical-atlas/core` (pure TS: `data/`, `pipeline/`, `geo/`, `utils/`) and `@europe-historical-atlas/atlas`.
~~**pnpm workspaces alone, no Turbo**~~ — **Turbo added 2026-10-01**, and the refusal was not overturned so
much as outgrown. It was refused when there were two packages, one lint run and one test run, where a cache
would have saved seconds on a 12 s gate. What changed: a **third package** with its own ESLint config, and
each package owning its `lint`, `type-check`, `test` and `coverage` — so something has to fan out across
them, and `turbo <task>` is that something. Both thresholds `plan.md` named were crossed (a CI, shipped
2026-09-24; and the gate). **Lerna stays refused** — it publishes, we publish nothing.
Prettier ignores `.claude`, `files`, `.husky`.

## History (to fill in)

_(Add each real solved problem here: symptom → root cause → solution → reference.)_

### Turbo replayed a green lint after the lint rules had changed (2026-10-12)

**Symptom**: measured, not reported. Appending a line to the root `eslint.config.js` left `atlas:lint` a
`cache hit`; so did changing `eslint-plugin-eha`, even with the plugin declared `workspace:*` in the
Cartographer. A rule change could have shipped with every package replaying the green lint it had before.
**Root cause**: a task's hash covers its own package's files and the hashes of the tasks in its
`dependsOn` — not files outside the package, and not a workspace dependency's sources by itself.
**Solution**: `globalDependencies` lists the root files every task reads (`eslint.config.js`,
`tsconfig.json`, `.prettierrc`), and `lint` depends on `^lint`, so a consumer's lint hash carries the
plugin's. Both probes re-run: `cache miss`. **Rule**: a package that consumes the plugin declares it as a
dependency, or its lint never sees a rule change.
