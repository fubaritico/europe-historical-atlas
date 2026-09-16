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
- **The border staircase is a *resolution* problem — do not try to fix it on the line alone.** A
  grid-derived border runs along cell edges, so a diagonal comes out as a staircase one cell high
  (~7.6 km at the DEM's own resolution, 45°N). Smoothing cannot remove it: corner-cutting shrinks the
  wiggle, but the amplitude belongs to the shape being smoothed. **Simplifying the line was tried on
  2026-09-16 and rejected on sight**: it moves the *line* and not the coloured area, so the two visibly
  come apart — the same two-sources-of-truth failure the raster derivation was built to abolish.
  Softening the colour boundary to compensate was tried alongside it and rejected too: it dissolves any
  territory narrower than the softening, which on a fragmented year (the Lorraine mosaic under Louis XIV)
  is exactly what must survive. Both knobs were removed rather than left off.
  **The fix with no trade-off is a finer political raster**: the fill and the line both come out of that
  grid, so they stay together by construction. It also answers the Cartographer's grid-resolution
  question in roadmap chapter 06 — one grid, asked about in two places. Measured on 1700 (rasterise +
  expand + derive borders), which is what a change of year costs:
  | scale | grid | step | time | segments |
  |---|---|---|---|---|
  | 1× | 1280×1164, 1.5 M cells | 7.6 km | 95 ms | 29 418 |
  | 2× | 2560×2328, 6.0 M cells | 3.8 km | 215 ms | 62 459 |
  | 4× | 5120×4656, 23.8 M cells | 1.9 km | 825 ms | 130 877 |
  The expansion dominates, not the rasterising — it is a breadth-first walk over every land cell, so it
  grows with the area while the rasterising grows with the perimeter.
  **Gotcha when changing it**: everything measured in *cells* must scale with it, `snapToCoast` above
  all, or its reach in kilometres silently halves and the colours stop short of the coastline again.
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
- **Border contrast: why the line is a casing, and what is left** (A11Y-101). The original single brown
  ink `#5c3a2e` at 0.7 opacity gave ~1.6:1 against `palette1` `#b8554a` (blend computed in *linear* space,
  as three composites with colour management on; naive sRGB gives 1.7:1 — neither rescues it), against a
  WCAG 1.4.11 floor of 3:1. **The structural point: no single ink can clear 3:1 against this palette**,
  because it spans a wide lightness range — an ink dark enough to read on gold Spain `#d4b24a` (L≈0.46)
  is too light-starved to read on the blue slot `#54719b` (L≈0.16), and the converse for a light ink.
  A **casing** answers it: whichever fill the line crosses, one of its two strokes separates from it —
  but only if the two sit at opposite ends of the lightness scale. Hence cream core `#f3e7cd` inside dark
  brown `#5c3a2e` at 0.9 opacity. *(An intermediate gold core `#d8b24a` was wrong on both counts: same
  lightness band as the casing, and four units from pinned Spain — a gold border on a gold country.)*
  **Still open**: `assignRegionColors` knows nothing about either stroke, so it cannot avoid a fill that
  sits between them; and a guard test asserting every palette slot and pinned colour clears 3:1 against at
  least one stroke would stop a future palette edit reintroducing the problem silently.
- **The frontier line is deliberately faint** (`frontierOpacity` 0.45 over parchment ≈ 1.6:1). It marks
  where the mapped world ends, which is illustrative rather than load-bearing — the coastline and the
  borders carry the functional information. Revisit if it ever becomes the only cue for something.
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
