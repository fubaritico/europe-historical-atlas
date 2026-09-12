# Known Issues

Put here the know issues to avoid cluttering the context window.

- **DEM asset committed** (`public/heightmaps/europe-dem-z5.bin`, 1.84 MB) so the app runs after a clone;
  its generator (`files/spikes/fetch-dem`) lives in gitignored `files/` — regenerating needs it.
- **Bundle > 500 KB** (three.js) — Vite warns at build; not optimized yet (code-split later if needed).
- **Camera persistence is scene-agnostic**: after a big scene change the restored pose can be off-frame →
  `sessionStorage.clear()` (key `europe-map:camera`) for the framed default.
- **Relief orientation** assumed north = −Z, east = +X; verified visually as correct. If a future DEM looks
  mirrored/upside-down, flip `u`/`v` in `reliefMesh` sampling.
