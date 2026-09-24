# 01 — Foundations (Phase 0)

> Chapter of the [roadmap](../roadmap.md). Everything to stand up before the map itself.

## Repo state (at start)

- Minimal `package.json` (no bundler), empty `src/index.ts`.
- Strict `tsconfig.json` ready (`jsx: react-jsx` present but no React dependency).
- Chosen heightmap lives in `files/resources/blender/` (gitignored) — copy into the app at bootstrap.
- The inherited `.claude/` config (old `fubaritico-ds` design system) has been cleaned up and rewritten
  for this 3D project; DS skills/agents archived under `files/claude-archive/`.

## 0.1 — Bootstrap TS + 3D project

- Bundler **Vite** (native HMR, zero-config TS) + **three.js** + `@types/three`.
- Structure: `index.html`, `src/main.ts` (scene/renderer/loop bootstrap), `src/scene/`, `src/camera/`,
  `src/controls/`.
- Renderer, scene, `PerspectiveCamera`, `requestAnimationFrame` loop, resize handler.
- Dev panel: `Stats` (stats.js) + `lil-gui`.
- A placeholder cube/plane to validate the pipeline.

## 0.2 — Camera persistence across hot-reload (CRITICAL, done first)

- `CameraStateStore` serializing camera state: `position` + `quaternion` (or world matrix), `fov`/focal,
  and the controls `target`.
- Two cases covered:
  - **Vite HMR** (module replacement, no reload) → `import.meta.hot.data` / `import.meta.hot.dispose`
    to hand state to the new instance.
  - **Full refresh (F5)** → `sessionStorage`, throttled write + on `beforeunload`.
- **Synchronous restore BEFORE the first `render()`** → zero visible transition.
- Same seam later powers **Escape-to-return** (push/pop camera pose).
- Manual test: move the camera, edit code, verify the view is strictly identical.

## 0.3 — Knowledge base (basic memory)

- Seed a knowledge graph: technical decisions (Vite choice, displacement approach, thresholds…) as we go.
  Establish the convention from the first decision.

## 0.4 — `.claude/` cleanup — DONE

- CLAUDE.md/rules rewritten for the three.js context, DS skills purged/archived.
