## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-09-12 — Genesis: fubaritico-ds → europe-map, Phase 0 + Milestone 1.1

Repurposed the repo from the old `fubaritico-ds` design system into a **3D historical atlas of Europe**
(TypeScript + three.js + Vite). Commits `9dea60e`..`1580921` on `master`. All under a full quality gate.

- **`.claude/` cleanup** — rewrote CLAUDE.md + rules for the three.js project; archived DS/React/Stencil
  skills + agents (and stale `financial-app`/micro-frontend leftovers) to `files/claude-archive/`;
  retooled `/review` to 4 dimensions. `grep fubaritico` → only intentional reminders remain.
- **Quality tooling** (`9dea60e`) — ESLint 9 flat (typed, no React) + Prettier + commitlint + husky
  (lint-staged + type-check + test) + lint-staged. Pinned ESLint 9 / TS 5.7 / tseslint 8.
- **Plans** — roadmap split into `files/plans/roadmap/` chapters; spikes cataloged in `files/spikes/`.
- **DEM spike** (`files/spikes/fetch-dem`) — georeferenced heightmap from AWS Terrarium tiles (no key,
  Web Mercator); emits Int16-metres `.bin` + `.json`.
- **Phase 0.1** (`0934783`) — Vite + three.js bootstrap (renderer/scene/camera/loop/resize, Stats + lil-gui).
  Vendored three source via `opensrc`; fixed `Clock`→`Timer`.
- **Phase 0.2** (`a2d67aa`) — camera viewpoint persisted across reload/HMR (`CameraStateStore`,
  sessionStorage, restore-before-first-render, HMR self-accept + teardown). Vitest + jsdom wired.
- **Milestone 1.1** (`1580921`) — Europe relief from the DEM: `heightmap` port + `reliefMesh` (CPU
  displacement). Height **easing** (plains 1:1, peaks eased toward a target — sharp, NOT blur) → game-map
  look. lil-gui defaults: exag 1.0, ceiling 575, peak-target 1900, smoothing 0. 29 tests.

### 2026-09-13 — Euratlas data decision, import boundaries, DEM widening, Milestone 1.3 (grand-strategy camera)

Big camera session. Commits `3dea0d6`..`7d1b20f` on `master`, full gate (type-check/lint/test/husky), **63 tests**.

- **Euratlas research + decision** (memory [[euratlas-data-and-licensing]]) — the local
  `files/resources/euratlas` samples ARE real vector shapefiles (21 centuries) but geographically cropped
  to the Alps; the Simple License forbids redistributing the vectors / reconstituting an atlas → for the
  published portfolio demo, M2 geometry = free **historical-basemaps** (CC-BY), Euratlas kept as a
  **private toponymy reference** (facts, de minimis, never the geometry). No regen needed.
- **Import boundaries** (`3dea0d6`) — ESLint `no-restricted-imports` per layer (data leaf; scene→data;
  camera independent; controls→camera; main root). Modularity enforced without splitting packages.
- **DEM widened** (`be5ebf2`) — regenerated to a Total-War **hors-champ frame** (bbox W−45/S11/E78.75/N76.84,
  1280×1164, ~3 MB); no code change (data-driven mesh). See `next.md` for the regen command.
- **EU4 map camera** (`b2142ad`, `9a32fa6`) — new pluggable `controls/mapControls` replacing OrbitControls:
  arrow pan, wheel zoom, yaw locked north, zoom-linked distance + tilt. **Frustum-aware clamp**: the target
  is bounded so the frustum's ground footprint (raycast of the 4 corners onto `y=0`) stays within a world
  `extent` → pannable area grows when zoomed in, re-centres when out, **adapts to resize**. **Drag-pan +
  edge-scroll**. **Inertia** = velocity + ease-out decay (snappy start, gliding release), factored into
  exported `easeOutDecay`/`driveOrGlide`. Debug overlay `scene/debugRect` (extent + live footprint).
  Persistence `{target, zoom}` on `europe-map:map-camera`.
- **Zoom-linked exaggeration** (`7d1b20f`) — relief flattens as you zoom in (× `exaggZoomIn`, default 0.5),
  cheap `scale.y` transform (no geometry rebuild).
- Multi-agent `/review` each step. A11y deferred to the **M2 HTML-overlay backlog** (window-scoped key
  capture, canvas role/semantics) — keyboard zoom (`+/-/PageUp/Down`), `prefers-reduced-motion`, and
  ctrl+wheel passthrough are already handled.

### 2026-09-15 — Milestone 1.2 (parchment terrain + drawn coastline), dev-panel extraction, portolan decor

Long render-craft session. Commits `50485c0`..`fb50948` on `master`, full gate each step, **120 tests**.
See memory [[portolan-decor-and-line-rendering]] + [[next-render-backlog]].

- **M1.2 terrain** (`50485c0`) — `scene/terrainTexture`: pure compositor (parchment × hypsometric tint ×
  DEM hillshade × **vellum fBm grain**) baked into a `DataTexture` on an **unlit** `MeshBasicMaterial`
  (painted "old map" look, camera-independent). Scene lights removed. `data/coastlineSource`
  (marching-squares 0 m contour → normalized `(u,v)` segments). Coastline drawn as **draped 3D lines** with
  light jitter + overdraw + zoom-linked opacity. `utils/hash` shared. Dev-tuned defaults baked via a
  `⤓ log ALL settings` button.
- **Coastline reversal** (hard-won) — first baked the shoreline INTO the texture; too blurry
  (DataTexture 1280px + LinearFilter resolution ceiling) → reverted to 3D lines. Don't re-try baked lines.
- **Dev-panel extraction** (`44cf533`) — all lil-gui wiring → `src/devPanel.ts` (`createDevPanel(deps)`,
  root-level because it imports controls+scene types the `scene/` boundary forbids). Added
  **`↺ reset to defaults`** (snapshots defaults at build, one rebuild per system — not lil-gui's
  per-controller `reset()` storm).
- **Portolan decor** (`fb50948`) — generalized `coastlineLayer` → **`scene/lineLayer`** (shared uv→3D
  lines). **`scene/rhumbNetwork`**: multi-centre portolan web, each line **walked over the DEM, kept only
  over water** (stops at the coast). **Compass rose D** (`scene/compassRose` + pure `scene/compassRoseSvg`,
  hex-validated) as an SVG→texture quad on the Atlantic, **portolan colour code** (principal ink,
  half-winds green, quarter-winds red). `utils/math` (clamp/lerp) + `disposeHandle` de-dup. Multi-agent
  `/review`: fixed SEC/ARCH/QUAL; **deferred** QUAL-007 (split `createDevPanel` per-folder, extract
  `scene/portolanDecor.ts`).

### 2026-09-16 — Rivers, land mask, fat lines, declarative tunables, political overlay (WIP)

Long session, **120 → 245 tests**, commits `8783364`..`beb24fc` on `master`, full gate each step.

- **Declarative tunables** (`4b9c95a`, `81f32e7`) — `utils/controlSpec.ts` + `devParams.ts`: every option's
  range/step/label declared beside its default, mapped over `keyof T` so an undescribed option fails
  type-check (**verified**: it raises two errors). `devPanel` renders the declaration; `main.ts` seeds
  from the defaults. Tests assert defaults sit inside their own slider and groups cover the table.
  Texture folder split into 7 numbered sub-folders mirroring the compositing order.
- **Fat lines** (`8783364`) — `LineBasicMaterial.linewidth` is pinned to 1 px by WebGL, so any controlled
  width needs `LineSegments2` + `LineMaterial`. Chosen by the caller *asking* for a width (a `> 1`
  threshold silently ignored sub-pixel values). `setOpacity`/`setColor`/`setResolution` replace callers
  reaching into `object.material`.
- **Rivers** (`f6e3921`) — Natural Earth 10m, 591 polylines / 537 KB, simplified to 500 m (just under a
  screen pixel at max zoom). One layer per `scalerank`; reveal + width interpolate across ranks, opacity
  only, never a geometry rebuild. `extendRiversToSea` bridges mouths (NE stops at the estuary head);
  only *free* endpoints extend — a tip another polyline passes is a confluence (129 → 96 extensions).
- **Land mask** (`462bed2`, `d6dead5`) — **the session's key correction**: a DEM answers "how high", not
  "wet or dry". Measured: connectivity flood-fill does *not* rescue the Netherlands (dikes are narrower
  than a cell) and turns the Caspian/Dead Sea into plains. Asset = `ne_10m_land` minus `ne_10m_lakes`
  (the land layer carves no lakes), baked at 4× the DEM, 2.9 MB raw / 152 KB gzipped. 16/16 spot checks.
  Killed `coastCoverage` + `gradientAt`: the mask's bilinear coverage supersedes them.
- **Draping** (`8c584f4`, `50731ac`) — `reliefWorldY` exported from `reliefMesh`; overlays sample the
  *mesh's* vertex grid (512 segments vs a 1280 DEM), else a river read at its true elevation sits below
  the drawn valley floor. Every draped layer must track `relief.scale.y` or it floats by the
  exaggeration ratio — invisible on a plain, glaring on a crest.
- **Political overlay, WIP** (`beb24fc`) — `historical-basemaps`, 20 centuries, **GPL-3.0 so git-ignored**.
  Rings rasterised in-browser into an index grid; tint is a terrain-bake layer between ground colour and
  hillshade. Claims grow over land the schematic outlines missed; borders keep only stretches separating
  two polities. Colours pinned per power by name pattern, rest from an editable palette, no two
  neighbours alike.
