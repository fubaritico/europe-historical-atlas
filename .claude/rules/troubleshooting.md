# Troubleshooting & Architectural Decisions — europe-map

> Issues hit and decisions made while building the 3D project. See `architecture.md` for the structure.
> Fresh repo: fill this in as you go (invent nothing — add only after seeing the problem).

## Anticipated gotchas (to confirm in practice)

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
- Restore **synchronously before the first `render()`**.
  Ref: document the real behavior once implemented (Phase 0.2).

### GPU leaks

**Rule**: call `dispose()` on geometries / materials / textures when tearing down a scene module. A plain
`scene.remove(mesh)` does not free GPU memory.

## Architectural decisions

- **Plain three.js (no React/R3F)** — canvas + TS is enough, fewer layers. Revisit if a complex UI overlay
  (historical event panels, M2) justifies a framework.
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
**pnpm workspaces alone, no Turbo**: pnpm already runs tasks in dependency order, and Turbo would only
add a cache worth a few seconds on a 12 s gate. Measured, with the thresholds that would reverse it, in
`files/plans/plan.md`. Prettier ignores `.claude`, `files`, `.husky`.

## History (to fill in)

_(Add each real solved problem here: symptom → root cause → solution → reference.)_
