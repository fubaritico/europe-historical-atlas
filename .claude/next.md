# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Single source for "what's next".
> Full plan: **`files/plans/roadmap.md`** (Phase 0 → Milestones 1–4).

## ⚠️ PERMANENT REMINDER — this is no longer fubaritico-ds

This repo used to be the **fubaritico-ds** design system (React/Stencil/Storybook monorepo).
It is now a **3D Europe map project in TypeScript + three.js + Vite**. The inherited DS config was
cleaned up (see below). If any residual DS reference surfaces (Stencil/Storybook/Lerna/Tailwind/BEM/
React), it is obsolete — ignore it and remove it.

## Project milestones (see roadmap.md for detail)

- **M1** — 3D navigable map (relief from heightmap, texture, arrow-key nav, clickable polygons + fly-to).
- **M2** — Interactive historical map: click shows **event info** (battle, political decision, invention…,
  its **consequences** and **actors**). **20 historical maps, one per century (1st → 21st)**.
- **M3** — Prototype on a **single century**: logical click wiring. Study: 2D matrix? how to bind a
  polygon-click → geographic region **at a point in time**.
- **M4** — Multi-century / decade extension (history "accelerates" — fast-moving borders in the
  15th–18th c. → possibly decade-level granularity).

## ▶ Cleanup status — `.claude/` de-fubaritico-ization

**DONE** — inherited DS config removed / rewritten for the 3D project:

- `CLAUDE.md`, `rules/{architecture,decision-tree,troubleshooting,tests,modular-architecture}.md` rewritten.
- DS skills (React/Stencil/Storybook/monorepo/BEM — 14) **archived** under `files/claude-archive/`.
- `/review` retooled to 4 dimensions (security, architecture, quality, accessibility); DS review agents
  (`styles`, `platform-safety`, `react-best-practices`) archived; agents + references rewritten.
- `completed.md` / `known-issues.md` are clean skeletons.

**Verify**: `grep -ri "fubaritico" .claude` should return **0** (run to confirm).

## Screen & camera vision (see roadmap.md → "Target screen & UX" + "Camera model")

Full-screen 3D viewport + **native-TS HTML overlays** (no React): dev stats panel (stats.js + lil-gui),
camera-nav buttons, later a century time-slider, optional decorative border chrome. Camera modeled on
**grand-strategy games (EU4 / Total War)**: angled top-down, pan + wheel-zoom, optional zoom-dependent
tilt. Navigation bounded by **clamping the ground target to the map bbox + zoom `[min,max]`** (NOT fog).
Click → push camera pose + fly to point; **Escape → pop + return** to the pre-click pose. M1 renders the
map in **wireframe** first; texture is **derived from the heightmap** (hypsometric) since no matching
color map exists yet.

## Decisions & open questions

**Resolved**: no React (plain three.js + native-TS UI); **no Blender** (relief generated at runtime from a
grayscale PNG via CPU displacement — parametric, hot-reloadable); limits via clamping (not fog); M1 pick =
point on relief. **Visual direction = vintage school-atlas / parchment** (muted nation colors, drawn
coastlines, prominent+meaningful relief). **Sea = stylized flat opaque** + coastal liseré + compass rose,
not clickable at first. **Political layer = nation-level first**, borders drawn as **lines + fills**,
region system agnostic to admin level. **Georeferenced DEM sourced NOW** (Terrarium tiles, Web Mercator,
no key) via standalone `tools/fetch-dem`, then compare render vs `europeelevation.png`. **Labels = projected
HTML/CSS DOM overlays** (data-driven, declutter by zoom, parchment style), NOT baked into texture.

**North star — Definition of done**: a **vertically complete, polished slice for ONE century** (relief +
parchment sea + colored nations + drawn borders + labels + click→event + camera). Not a pile of demos.

**Data model**: per century → vector GeoJSON (source: borders/fills/label anchors) + derived rasterized
**ID-map** (2D matrix, EU4 `provinces.bmp` style) for O(1) picking + GPU highlight. Everything keyed by
**lon/lat**. Events carry a `location` lonlat → auto-placed 3D signpost/text. Palette = **browns/vintage**.

**Quality tooling DONE ✅**: ESLint 9 flat (typed, no React) + Prettier + commitlint + husky (pre-commit =
lint-staged + type-check; commit-msg = commitlint) + lint-staged. Pinned ESLint 9 / TS 5.7 / tseslint 8
(env pulled ESLint 10 / TS 7 which break peers). **Single-package, monorepo-ready** — split to pnpm
workspaces + **Turbo** (not Lerna/Nx) only when a real seam needs it (first candidate: pure-TS `core`).

**M1-look heightmap**: `files/resources/blender/europeelevation.png` (8-bit, sea=black → free mask).

**Pending**:

1. **Asset location**: `public/heightmaps/` vs `src/assets/`?
2. **DEM params**: Europe bbox (lon/lat) + tile zoom (resolution vs weight)? WebMerc now, equirect later.
3. **Lighting** (sun azimuth + ambient, shadows?).
4. **Camera yaw**: free-with-default vs locked.
5. **Fog**: aesthetic or skip?

## Proposed order of work

1. `.claude/` cleanup — DONE.
2. **DEM spike** (`files/spikes/fetch-dem`) — DONE ✅. Terrarium DEM adopted (georeferenced, Web Mercator,
   bbox W−33.75/S31.95/E56.25/N74.02); needs gamma ~0.45 to lift plains. Beats `europeelevation.png`.
3. Phase 0.1 — bootstrap Vite + three.js (+ stats.js/lil-gui dev panel).
4. Phase 0.2 — camera hot-reload persistence (critical); same seam serves Escape-to-return.
5. Milestone 1 — wireframe relief (from Terrarium DEM) → parchment texture → grand-strategy camera + click/Escape.
