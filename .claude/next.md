# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Full plan: `files/plans/roadmap.md` (chapters).
> This repo is **europe-map** (3D historical atlas, TS + three.js + Vite) — NOT the old fubaritico-ds DS.

## Where we are

**Phase 0** (bootstrap, camera hot-reload persistence, quality tooling, `.claude` cleanup) + **Milestone
1.1** (Europe relief from a georeferenced DEM) are **DONE**. 5 commits on `master` (`9dea60e`..`1580921`),
single-package, under a full gate (type-check / lint / test / format + husky). 29 tests. See `completed.md`.

## ▶ NEXT — Milestone 1.2: parchment texture

Hypsometric tint × hillshade **derived from the DEM** (no external asset — aligned by construction) → leave
the wireframe for the vintage "old map" look. Then **1.3** grand-strategy camera (arrow pan, wheel zoom,
bounds, ~45° tilt) → **1.4** click picking + fly-to arc + Escape-to-return. Then **M2** (historical/political
layers, per-century). Details: roadmap chapters 02 (relief/picking), 03 (camera/UX), 04 (atlas/data).

## Key facts to reload

- **Dev panel is a KEEPER** (dev decision): the lil-gui + Stats overlay stays as a **toggleable, extensible
  debug tool** — grow it with more tools, add an on/off toggle; do NOT strip it for prod. See [[dev-tools-panel]].
- **Relief tuning = a VALUE-REMAP easing, NOT blur** (hard-won): plains ≤ `plainsCeiling` stay 1:1; peaks
  ease toward `peakTarget` (sharp ridges kept). Defaults: exag 1.0, ceiling 575, peak-target 1900, smoothing
  0; `worldPerMetre = 1/10000` in `reliefMesh`. Exaggeration slider is intentionally low-sensitivity.
- **DEM**: `public/heightmaps/europe-dem-z5.{bin,json}` (1280×1164, Int16 metres, Web Mercator, ~3 MB,
  bbox W−45/S11.18/E78.75/N76.84 — widened to a **hors-champ frame** à la Total War: Europe is the focus,
  the surround (Iceland/SE-Greenland tip, Atlantic, Sahara, Caucasus→Karakoram) is context to render as a
  uniform parchment out-of-frame. North capped ~77° to bound Web-Mercator stretch. Regenerate via
  `files/spikes/fetch-dem` (gitignored): `--west -45 --south 18 --east 70 --north 76 --zoom 5 --grid 1280`.
- **Camera persistence**: map camera (`controls/mapControls`) persists `{target, zoom}` under sessionStorage
  key `europe-map:map-camera`; `sessionStorage.clear()` for a framed default. (The pose-based
  `camera/cameraState` store on key `europe-map:camera` is reserved/unused, kept for M1.4 fly-to.)

## Conventions (this project)

Docs/config in **English**, chat in **French**. Plans split into chapters (`files/plans/roadmap/`). Spikes
cataloged in `files/spikes/`. Commit subjects lowercase (commitlint). **Announce every command**
(cause / reason / action). Monorepo-ready but single-package (→ pnpm workspaces + Turbo, pure-TS `core`
first, only when a real seam needs it).
