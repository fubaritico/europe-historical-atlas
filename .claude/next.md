# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Full plan: `files/plans/roadmap.md` (chapters).
> This repo is **europe-map** (3D historical atlas, TS + three.js + Vite) — NOT the old fubaritico-ds DS.

## Where we are

**Phase 0** + **Milestone 1.1** (relief from DEM) + **Milestone 1.3** (grand-strategy camera) are **DONE**,
plus the DEM widened to a hors-champ frame and per-layer import boundaries. ~9 commits on `master`
(`9dea60e`..`7d1b20f`), single-package, full gate (type-check / lint / test / format + husky). **63 tests**.
See `completed.md` (2026-09-13 entry) for the camera details.

## ▶ NEXT — Milestone 1.2: parchment texture (still pending — we jumped to 1.3)

Hypsometric tint × hillshade **derived from the DEM** (no external asset — aligned by construction) → drop
the wireframe for the vintage "old map" look; apply the **hors-champ** treatment (uniform parchment outside
the focus). Then **1.4** click picking (`PickingService` → `{point, faceIndex}`) + fly-to arc + Escape-to-
return (reuse the reserved `camera/cameraState` pose store). Then **M2** (historical/political layers per
century, geometry from free `historical-basemaps`). Roadmap chapters 02 (relief/picking), 03, 04.

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
- **Camera model** (`controls/mapControls`, EU4-style): **frustum-aware clamp** — the target is bounded so
  the frustum's ground footprint (raycast of the 4 corners onto `y=0`, live fov+aspect) stays inside a world
  **`extent`** → pannable area grows zoomed-in, re-centres zoomed-out, **adapts to resize** (no fixed
  bounds). Zoom-linked distance+tilt, **inertia** (velocity + ease-out via exported `easeOutDecay`/
  `driveOrGlide`), drag-pan + edge-scroll, keyboard zoom `+/-/PageUp-Down`. Pointer move/up on `window` (drag
  continues off-canvas — intentional). All tunable in the dev-panel `camera` + `extent` folders + debug
  overlay. Defaults: minDist 1 / maxDist 6, pitch 30(in)→55(out), extent centre 0/0 half 5.8×5.2, τ 0.12.
- **Open idea (not done)**: a **fixed-aspect render + resolution set** (letterbox, console-style) for a
  constant framing regardless of window size — the frustum clamp already makes any aspect safe underneath.
- **`let`-const-ify gotcha**: the eslint `--fix` (prefer-const) hook runs after each edit; a freshly-added
  `let` whose reassignment lands in a *later* edit gets const-ified → next edit fails. Add the `let` and its
  first reassignment together, or re-`let` it. (Hit 3× this session.)

## Conventions (this project)

Docs/config in **English**, chat in **French**. Plans split into chapters (`files/plans/roadmap/`). Spikes
cataloged in `files/spikes/`. Commit subjects lowercase (commitlint). **Announce every command**
(cause / reason / action). Monorepo-ready but single-package (→ pnpm workspaces + Turbo, pure-TS `core`
first, only when a real seam needs it).
