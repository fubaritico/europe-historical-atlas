# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Full plan: `files/plans/roadmap.md` (chapters).
> This repo is **europe-map** (3D historical atlas, TS + three.js + Vite) — NOT the old fubaritico-ds DS.

## Where we are

**Phase 0** + **M1.1** (relief) + **M1.3** (camera) + **M1.2** (parchment terrain + drawn coastline) +
**portolan decor** (sea-clipped rhumb network + compass rose) are **DONE**; dev-panel extracted to
`src/devPanel.ts` with reset-to-defaults. ~12 commits on `master` (`9dea60e`..`fb50948`), full gate
(type-check / lint / test / format + husky). **120 tests**. See `completed.md` (2026-09-15 entry) +
memory [[portolan-decor-and-line-rendering]].

## ▶ NEXT — render polish BEFORE placing elements (dev's explicit priority)

Get the map render to its best first (see [[next-render-backlog]]):

1. **Rivers** — main rivers' traced paths, **more rivers as you zoom** (LOD). Source = **Natural Earth**
   rivers (PD), reprojected via a new **`geo/mercator`** util (lon/lat ↔ Web Mercator ↔ DEM-bbox `(u,v)`),
   drawn via the shared **`scene/lineLayer`**. (`geo/mercator` is also needed for a true graticule + M2
   `historical-basemaps` borders.)
2. **Snow-capped hypsometry** — extend `terrainTexture`'s hypsometric ramp with a high-elevation
   **white/snow band** so peaks read snowy via the multiply composite (currently only lowland→highland
   brown).

Then: **deferred QUAL-007 refactors** (split `createDevPanel` per-folder builders; extract `main.ts` decor
wiring → `scene/portolanDecor.ts`). Then **M1.4** click picking (`PickingService` → `{point, faceIndex}`) +
fly-to arc + Escape-to-return (reuse reserved `camera/cameraState`). Then **elements**: city 3D models
(capitals/towns, era-versioned), country/place **labels**, **typography** choice. Then **M2**
(historical/political layers per century, `historical-basemaps`). Roadmap chapters 02–04.

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
