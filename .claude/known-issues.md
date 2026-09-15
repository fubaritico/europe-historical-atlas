# Known Issues

Put here the know issues to avoid cluttering the context window.

- **`historical-basemaps` is GPL-3.0, with no separate data licence** (checked at the source: its
  `LICENSE` is the GPL and the README carves out nothing). A strict reading means redistributing those
  files puts the whole distributed work under GPL-3.0. `public/borders/` is therefore **git-ignored** —
  a spike to look at, not an asset to ship. Publishing needs one of: accepting GPL-3.0 for the project,
  fetching from upstream at runtime rather than redistributing, or a permissive source. The earlier
  session note claiming "historical-basemaps (CC-BY)" was **wrong**.
- **Political borders are interrupted where states are small** — diagnosed, not fixed. `separatesRegions`
  probes 2 DEM cells either side; in a fragmented region the probe lands in a third polity and the
  segment is dropped. Looks like relief cutting the lines (mountains are fragmented, plains are not) but
  is not. See `next.md` for the raster-derived fix.
- **Islands no polygon claims stay uncoloured** (Balearics, Aegean): `expandRegionsOverLand` walks over
  land only, and BFS cannot cross the sea to reach them.
- **Changing the political year re-bakes the whole texture** (seconds at supersample 2). Scrubbing
  centuries smoothly would need a second transparent surface above the relief — at the cost of losing
  `overlay` and `softLight`, which only exist in the CPU compositor.
- **`sea level (m)` no longer moves the coastline.** The land mask decides it now; the slider only sets
  the hypsometric ramp's origin. Rename or retire it before it wastes someone's afternoon.
- **The Elbe is not bridged to its mouth** — cause unidentified (confluence wrongly detected, or the sea
  out of range). Loire, Seine, Garonne and Thames are.
- **GPU max texture size is not checked.** The bake is 2560 px wide at supersample 2 and 3840 at 3, while
  WebGL2 only guarantees 2048. Fine on desktop, not guaranteed everywhere; clamp from
  `renderer.capabilities.maxTextureSize` if it ever bites.
- **`devPanel.ts` has no tests** (it imports lil-gui and would need a DOM). This is the hole the inert
  river sliders went through: the widths and reveal thresholds are captured when a layer is built, so
  wiring only some of them left the rest doing nothing, and nothing caught it.
- **The ESLint boundary glob `**/controls` is too broad** — it matched `utils/controls` as if it were the
  camera-controls layer. Worked around by renaming to `utils/controlSpec`; the config flaw remains and
  will catch the next `something/controls`.
- **`composeTerrainRgba` is long** (~90 lines) and grew again with the political layer.
- **The political tint's black point sits at 0 m** (A11Y-005): with the heightmap layer at default
  strength the coastal contrast against the coastline ink drops from ~6:1 to ~2.7:1. An aesthetic call
  now that the render has been approved.
- **SVG-as-texture needs explicit `width`/`height`** (not just `viewBox`): loaded as an `<img>` for a
  three texture, a viewBox-only SVG rasterises to 0×0 → blank/invisible. `compassRoseSvg` sets both.
- **Compass rose loads async** (SVG → Image → texture via `TextureLoader`): it appears a frame or two after
  the relief. No `onError` wired yet; if it silently fails to show, check the data-URL / SVG validity.
- **Texture regen is a full pixel pass** (~1.5M px): heavy dev-panel tweaks (`terrainTexture`) fire on
  release. Kept snappy by a trig-free integer hash (`utils/hash`); a supersample option was considered
  and declined (memory [[portolan-decor-and-line-rendering]] — baked lines hit the same resolution ceiling).
- **DEM asset committed** (`public/heightmaps/europe-dem-z5.bin`, 2.98 MB) so the app runs after a clone;
  its generator (`files/spikes/fetch-dem`) lives in gitignored `files/` — regenerating needs it.
- **Camera reframing after the DEM widening**: the extent changed (bbox now W−45…E78.75), so a persisted
  camera pose can be off-frame → `sessionStorage.clear()` (map camera key `europe-map:map-camera`) for the framed default.
- **Bundle > 500 KB** (three.js) — Vite warns at build; not optimized yet (code-split later if needed).
- **Camera persistence is scene-agnostic**: after a big scene change the restored pose can be off-frame →
  `sessionStorage.clear()` (map camera key `europe-map:map-camera`) for the framed default.
- **Relief orientation** assumed north = −Z, east = +X; verified visually as correct. If a future DEM looks
  mirrored/upside-down, flip `u`/`v` in `reliefMesh` sampling.
- **A11y backlog (M2 HTML-overlay milestone)**: the map is a bare WebGL canvas with no DOM-accessible
  equivalent. Deferred to when the HTML UI overlay lands (roadmap 03): (a) `mapControls` binds arrow/zoom
  keys on `window` and `preventDefault`s them app-wide (only exempting form fields via `isEditableFocused`)
  → scope to a focusable canvas with `role`/`tabindex` and gate on focus; (b) `<canvas>` needs an
  accessible name/role + a keyboard-reachable region list for picking (M1.4/M2); (c) Stats overlay is
  mouse-only. Keyboard zoom (`+`/`-`/PageUp/Down), `prefers-reduced-motion`, and ctrl+wheel passthrough are
  already handled.
