# Known Issues

Put here the know issues to avoid cluttering the context window.

- **`historical-basemaps` is GPL-3.0, with no separate data licence** (checked at the source: its
  `LICENSE` is the GPL and the README carves out nothing). A strict reading means redistributing those
  files puts the whole distributed work under GPL-3.0. `public/borders/` is therefore **git-ignored** —
  a spike to look at, not an asset to ship. Publishing needs one of: accepting GPL-3.0 for the project,
  fetching from upstream at runtime rather than redistributing, or a permissive source. The earlier
  session note claiming "historical-basemaps (CC-BY)" was **wrong**.
- ~~**Political borders are interrupted where states are small**~~ — **FIXED**, and the recorded cause was
  wrong. It was never about polity size: `separatesRegions` probes **2** DEM cells either side of a ring,
  while `snapToCoast` lets `expandRegionsOverLand` grow every claim by up to **its own value** (5–12).
  Wherever the expansion moved the frontier further than the probe reaches, both samples land in the same
  polity and the stretch is discarded — structural, and guaranteed, not a tuning matter. The real defect
  was having **two sources of truth for one object**: fills from the raster, borders from the rings.
  `extractRegionBorders` now derives the line from the raster itself, so it *is* the boundary of the
  fills — gapless by construction. The ring path survives behind the `border source` dev toggle only long
  enough to compare the two on screen; **delete it once the comparison is settled.**
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
  wiring only some of them left the rest doing nothing, and nothing caught it. **It swallowed a second
  set**: `snapToCoast` and the eight `palette*` slots were routed to `rebuildBorders`, which re-rasterises
  nothing — they did nothing at all. Now fixed by inverting the rule (an explicit allow-list of
  border-only keys, everything else takes the full rebuild), so a tunable added later defaults to
  correct-but-slower instead of silently inert. The missing tests remain the underlying hole.
- **The ESLint boundary glob `**/controls` is too broad** — it matched `utils/controls` as if it were the
  camera-controls layer. Worked around by renaming to `utils/controlSpec`; the config flaw remains and
  will catch the next `something/controls`.
- **`composeTerrainRgba` is long** (~90 lines) and grew again with the political layer.
- **The border ink barely reads against two palette slots** (A11Y-101, surfaced 2026-09-16). `borderColor`
  `#5c3a2e` drawn at `borderOpacity` 0.7 over `palette1` `#b8554a` gives about **1.6:1** — computed with
  the blend in *linear* space, which is how three composites with colour management on; the naive sRGB
  arithmetic gives 1.7:1, so neither rescues it. WCAG 1.4.11 asks 3:1 for graphical objects. `palette7`
  `#c46b42` is the other weak one — both are brownish-reds, like the ink. `assignRegionColors` only
  guarantees two adjacent *fills* differ from each other; it has no notion of the border ink, so a pair of
  neighbours can land on the two worst slots. Now that `extractRegionBorders` guarantees a line exists at
  every boundary, geometric completeness is done but **visual** completeness is not. Deliberately **not**
  fixed: border colour and opacity are an approved aesthetic. Cheapest options, dev's call — raise the
  opacity, darken the ink, or teach `assignRegionColors` to reject slots too close to `borderColor`.
- **No asset payload is validated, and no failure reaches the user** (SEC-001, widened by the dev into a
  roadmap chapter — see `files/plans/roadmap/07-robustness.md`). All four loaders check the HTTP status
  and throw, then **cast blindly**: `heightmap.ts:88`, `landMask.ts:140`, `regionSource.ts:104`,
  `riverSource.ts:79`. The one existing shape check is `landMask.ts:149` (declared size vs actual bytes) —
  the precedent to generalise. Every failure then ends in `console.error` only (`main.ts:430, 493, 513,
  526`), so a failed relief load shows a blank canvas with no explanation.
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
