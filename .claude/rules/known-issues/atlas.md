---
paths:
  - "packages/atlas/**"
  - "packages/core/src/pipeline/**"
---
# Known issues — the atlas (3D)

Open issues specific to `packages/atlas`: its render, its pipeline wiring, its dev panel. Loaded by path; indexed in `.claude/known-issues.md`.

- **The relief mesh is built at 1280 segments** (2026-10-16; the slider's maximum — over a 1920-column DEM since 2026-10-18, so no longer one vertex per column): 1.49 M vertices,
  built in ~390 ms on the main thread at startup and on each relief slider (512 was ~140 ms), ~48 MB of
  vertex data. 60 fps on the dev's machine at both ends; the coasts are only sharp at the top. **Two
  consequences to plan for**: (1) a weak machine (a phone) may not hold the frame rate — remedy, the one
  already written for `rasterScale` below: time the first build and step the `segments` tunable down
  (768 halves the vertices of 1024); (2) **M1.4 picking** will raycast ~3 M triangles — brute force is
  tens of milliseconds a click, so give the relief a spatial index (a BVH) when picking lands, not
  before. **Severity: worth knowing.**
- **`terrainOptions.ts`'s comment on `politicalMode` contradicts its value.** The comment argues for
  `'normal'` _"rather than multiply"_, and the value is `'overlay'` — a tuning pass moved the value and
  left the reasoning behind. Cosmetic, but it is the kind of comment someone trusts instead of reading the
  code. Fix it when that file is next opened. (Confirmed 2026-09-22 while checking that the Cartographer's
  fills must composite in `overlay` to match the bake — they must.)
- **The terrain PNG now exists in two places**, `files/spikes/terrain-bitmap/out/europe-terrain.png` and
  `files/plans/cartographer/design/assets/europe-terrain.png`, 6.6 MB each. The second is what makes
  the design screens open standalone, so the duplication is deliberate — but it is a copy that can drift
  from its generator. Regenerate both from the spike if the texture defaults ever change.
- **The focus mode has no keyboard way in** (A11Y-301, found 2026-09-18, **left open by decision**).
  Escape _leaves_ the focus, so half the feature is keyboard-operable; nothing enters it. A
  keyboard-only reader can pan and zoom but can never reach the close-up the feature exists for, and
  `MapControls.focused` is reflected nowhere in the DOM, so no screen reader learns the camera changed
  mode.
  **Why it was not fixed on the spot**, and the disagreement worth recording: the review's own remedy
  says to wait for M2's keyboard-reachable region list, on the grounds that binding a key to "the
  screen centre" would focus a point the reader cannot choose. **That argument does not hold here** —
  the arrow keys already move the camera's ground target, so the centre of the view _is_ the keyboard
  cursor, and it is exactly the point the reader just chose. A key bound to `focusOn(target.x,
target.z)` would be coherent with the navigation that already exists.
  It is open because it is **the dev's call, not an oversight**: the dev has already said the trigger
  is provisional and that the real entry will be a 3D button driven by event importance
  (`files/plans/atlas/focus-mode.md`). Deciding the keyboard gesture now would be deciding it twice. The
  announcement half (`aria-live` on entering/leaving focus) genuinely does wait for the HTML overlay.
- **A `click` fires at the end of every drag, and a map has to say so itself.** The DOM sends `click`
  whenever press and release share an element, _however far the pointer travelled between them_ —
  there is no built-in movement threshold, which is why Leaflet and Mapbox suppress the post-drag
  click explicitly. Caught in review on 2026-09-18, before it shipped: the single click had just been
  given a meaning (`panTo`), so every release of a drag-pan would have been answered by a 1400 ms
  flight with a full pull-out and dive.
  The fix is `MapControls.pointerDragged`, decided **once, where the drag lives**, from the pixel path
  walked during the press against a 4 px tolerance. **Do not let a second module decide it again**: a
  threshold in the gestures and a threshold in the controls would disagree about a slightly imprecise
  click, and no test could see the disagreement because it would live in two places. Note the
  tolerance also fixes something that predated it — `mapControls` treated _any_ movement during a
  press as a drag, so a click that wobbled panned the map.
  Guarded by two tests that were verified by breaking the guard on purpose, one against a stand-in and
  one composing the real controls with the real gestures.
- **Vertex colours are written in sRGB into an attribute three reads as linear.** `scene/sheet/graticuleFrame`
  and `scene/relief/mapEdge` are the only two users of `vertexColors`, and both do `tone.r / 255`. three
  composites in a _linear_ working space and converts to sRGB on output, so the value is brightened a
  second time and every one of those surfaces renders far lighter than its hex.
  **Measured on screen 2026-09-18, by decoding the dev's own screenshot**: `edgeBase` `#5f5342` predicted
  at `(164, 155, 139)` treating sRGB as linear, observed `(162, 155, 141)`. The band's near-black ink
  `#1a120b` is lightened the same way.
  **Why it matters beyond the look**: it silently eats any darkening. Two rounds of "plus foncé" on the
  cut edge moved the hex a long way and barely moved the screen — while brightening, in the same stroke,
  a wall the dev could not see. Anything tuned by eye on those two modules was tuned against the bug.
  **The fix** is a `srgbChannelToLinear` at the point the attribute is filled (written and reverted on
  2026-09-18 — it was landing in the middle of a visual regression and made the change unreadable).
  Mixing may stay in sRGB; only the last step converts. **Retuning the frame and the edge is part of the
  fix, not a follow-up.**
- **The map's thickness is cut at the wrong edge.** `createMapEdge` builds two walls and only one of them
  belongs where it is:
  - the **section** — sea level up to the land's surface — exists only where there is land at the map's
    boundary. That is the "épaisseur de l'Afrique" the dev asked for, and it is correctly placed.
  - the **board** — a uniform skirt below sea level, the whole way round, open ocean included. On screen
    _downward_ and _outward_ are the same direction as soon as the camera tilts, so it projects across
    the margin and fills the graduated band's transparent blocks with its own flat colour. **Measured:
    0.06 of depth covered 23 px against a 17 px band; at 0.165 it swallowed the band and part of the
    label lane.** Any positive depth intrudes — it is geometry, not tuning.
    `edgeDepth` is therefore **0**. The board can only come back once the thickness is carried by the
    **sheet's outer edge** instead of the map's — which is what the dev's own drawing showed: the _paper_
    has a thickness, not the inner rectangle. Not built.
- **The frame writes no depth, so anything drawn after it paints over it** — fixed 2026-09-18 by
  `FRAME_RENDER_ORDER`, and worth keeping because the failure mode is invisible. It cannot write depth
  (it would z-fight with the sheet four thousandths below it), so its visibility depended on landing in
  the transparent queue, which depended on `bandOpacity < 1`. At exactly 1 the band disappeared
  entirely with no error. The tell: the degree labels survived and the band did not, and the only
  difference between them was opacity. **Any new layer printed on the sheet needs an explicit order.**
- **The frame's three rules have no matter in them** (raised by the dev, 2026-09-18). They are geometry
  — perfect rectangles — while everything beside them has been given a broken edge: the degrees are
  displaced by the browser's own turbulence, the band reads through to the fibre beneath it. Two ways
  out, and they are not equivalent: rasterise the rules as SVG with the same turbulence (coherent with
  the numbers, but they lose their crispness at maximum zoom, which is the one thing geometry buys), or
  irregularise their edges in geometry (crisp, and a different piece of work — a rule is four vertices
  today and would become a strip). Not decided.
- **The sheet is baked on the main thread** and costs ~278 ms at 1024 and ~988 ms at 2048, which is why
  it is not baked at the terrain's density. The honest fix is to bake it in the worker, like the terrain.
- **A test that takes `Math.abs` of a gap cannot see a reversed order.** How the side borders shipped as
  two giant blocks instead of 66: `latitudeToVertical` descends in Z, `segmentsBetween` assumed
  ascending, and every assertion about graduation spacing was written on absolute differences. The
  graduations are now sorted, and two assertions check the ordering itself.
- **`historical-basemaps` is GPL-3.0, with no separate data licence** (checked at the source: its
  `LICENSE` is the GPL and the README carves out nothing). A strict reading means redistributing those
  files puts the whole distributed work under GPL-3.0. `public/borders/` is therefore **git-ignored** —
  a spike to look at, not an asset to ship. Publishing needs one of: accepting GPL-3.0 for the project,
  fetching from upstream at runtime rather than redistributing, or a permissive source. The earlier
  session note claiming "historical-basemaps (CC-BY)" was **wrong**.
- **The border staircase is a _resolution_ problem — do not try to fix it on the line alone.** A
  grid-derived border runs along cell edges, so a diagonal comes out as a staircase one cell high
  (~7.6 km at the DEM's own resolution, 45°N). Smoothing cannot remove it: corner-cutting shrinks the
  wiggle, but the amplitude belongs to the shape being smoothed. **Simplifying the line was tried on
  2026-09-16 and rejected on sight**: it moves the _line_ and not the coloured area, so the two visibly
  come apart — the same two-sources-of-truth failure the raster derivation was built to abolish.
  Softening the colour boundary to compensate was tried alongside it and rejected too: it dissolves any
  territory narrower than the softening, which on a fragmented year (the Lorraine mosaic under Louis XIV)
  is exactly what must survive. Both knobs were removed rather than left off.
  **The fix with no trade-off is a finer political raster**: the fill and the line both come out of that
  grid, so they stay together by construction. It also answers the Cartographer's grid-resolution
  question in roadmap chapter 06 — one grid, asked about in two places. Measured on 1700 (rasterise +
  expand + derive borders), which is what a change of year costs:
  | scale                                                                                                    | grid                    | step   | time   | segments |
  | -------------------------------------------------------------------------------------------------------- | ----------------------- | ------ | ------ | -------- |
  | 1×                                                                                                       | 1280×1164, 1.5 M cells  | 7.6 km | 95 ms  | 29 418   |
  | 2×                                                                                                       | 2560×2328, 6.0 M cells  | 3.8 km | 215 ms | 62 459   |
  | 4×                                                                                                       | 5120×4656, 23.8 M cells | 1.9 km | 825 ms | 130 877  |
  | The expansion dominates, not the rasterising — it is a breadth-first walk over every land cell, so it    |
  | grows with the area while the rasterising grows with the perimeter.                                      |
  | **Gotcha when changing it**: everything measured in _cells_ must scale with it, `snapToCoast` above      |
  | all, or its reach in kilometres silently halves and the colours stop short of the coastline again.       |
  | **Now held by construction** — the multiplication happens once, inside `inlineCompute.computePolitical`, |
  | rather than at each call site.                                                                           |
  | **Default raised to 4× on 2026-09-17**, once the compute moved off the main thread: the 825 ms it costs  |
  | is nobody's freeze any more. Cells go from 3.8 km to **1.9 km**. What it buys is the only fix to the     |
  | staircase with no trade-off, since fills and lines come out of the same grid.                            |
  | **What it costs, measured**: a 5120×4656 grid is 23.8 M cells, so **45.5 MB** for the `Int16Array` in    |
  | the worker, another 45.5 MB for the copy sent back to the main thread, and 45.5 MB more transiently      |
  | while `expandRegionsOverLand` copies to grow the claims — a peak around **136 MB** during a change of    |
  | year. Workable, but no longer negligible; watch it if a finer grid is ever considered.                   |
- **4× is a desktop default, and the resolution should eventually adapt — to the _machine_, not the
  network.** Raised by the dev on 2026-09-17 as "different resolutions depending on network speed", which
  is the wrong axis and worth stating plainly: the political raster is computed in the browser from a DEM
  and a mask that are downloaded at the same size whatever the setting. Changing `rasterScale` costs CPU
  and memory and **not one byte on the wire**. Two genuinely separate questions hide behind the one idea:
  - **Machine capability → `rasterScale`.** 825 ms and a 136 MB peak is a different proposition on a
    phone than on a laptop. Do not guess it from `navigator.deviceMemory` / `navigator.connection` —
    both are Chromium-only as far as is known here, and unverified. **Time the first political compute
    and step the scale down if it is slow**: a measurement works everywhere and tells the truth.
  - **Bandwidth → asset size.** The real network cost is the DEM (3 MB) and the mask (3 MB), both fixed
    today. Adapting that means generating tiers of each asset, which does not exist — `fetch-dem` takes a
    zoom, so it is possible, but it is a data-pipeline job, not a runtime toggle.
- **The political grid no longer leaves the worker, and picking should keep it that way.** A
  `PoliticalResult` carries the colours and the border lines, nothing else. When **M1.4 picking** lands,
  the reflex will be to ask for the grid back so a click can be answered here — resist it: a click is one
  query, a query is a message, and a round trip costs a millisecond against 45 MB held for the session.
  The port should grow a `regionAt(u, v)` rather than a getter for the cells, which also fits the design
  constraint already recorded — a click must return a **list** from a spatial query, not a single hit.
- **Islands no polygon claims stay uncoloured** (Balearics, Aegean): `expandRegionsOverLand` walks over
  land only, and BFS cannot cross the sea to reach them.
- **Only the newest call may write back, and it must be checked after _every_ `await`.** Once the compute
  went async, two overlapping rebuilds could resolve out of order and settle the map on a position the
  reader had already left — silently, with no error. `utils/latestOnly` gates both rebuilds. The subtlety
  that cost a review finding: guarding only the final state write is not enough, because a stale call
  goes on to rebuild the texture and the border layer afterwards. **One gate per result** — sharing one
  would have a bake needlessly cancel a year.
- **A worker that dies mid-session falls back to the main thread**, but recovering means redoing the
  setup: the inline compute starts holding neither the sources nor the year. `failoverToInline` re-pushes
  the sources and recomputes the year. Untested against a real worker crash — only against a simulated
  `onerror`.
- **`colorBySuzerain` does not merge two vassals unless the suzerain is pinned.** `assignRegionColors`
  colours by _index_ against adjacency and never reads a name; the option only changes which name is
  offered to the editorial pinning rules. So two princes under an unpinned crown still come out in
  different colours. Found while testing the compute port, 2026-09-17 — the option half-works, and the
  panel label promises more than it delivers.
- **`sea level (m)` no longer moves the coastline.** The land mask decides it now; the slider only sets
  the hypsometric ramp's origin. Rename or retire it before it wastes someone's afternoon.
- **The Elbe is not bridged to its mouth** — cause unidentified (confluence wrongly detected, or the sea
  out of range). Loire, Seine, Garonne and Thames are.
- **GPU max texture size is not checked.** The bake is 2560 px wide at supersample 2 and 3840 at 3, while
  WebGL2 only guarantees 2048. Fine on desktop, not guaranteed everywhere; clamp from
  `renderer.capabilities.maxTextureSize` if it ever bites. **Since 2026-10-16 the dev slider reaches supersample 4** (5120 px), past the 4096 of many mobile and integrated GPUs; the default stays 2. Whether to clamp, refuse or warn is an error-handling decision to take with the dev the day the default rises.
- **The ESLint boundary glob `**/controls` is too broad** — it matched `utils/controls` as if it were the
  camera-controls layer. Worked around by renaming to `utils/controlSpec`; the config flaw remains and
  will catch the next `something/controls`. **Same shape since 2026-10-27** (ATLAS-291): `app`, `loading`,
  `sources`, `tunables`, `devPanel` are generic words too — the Cartographer has a `ui/i18n/app`, the CMS a
  `src/app`. Harmless while only atlas rows name them (said in `eslint.config.js`). **Severity: worth knowing.**
- **Border contrast: why the line is a casing, and what is left** (A11Y-101). The original single brown
  ink `#5c3a2e` at 0.7 opacity gave ~1.6:1 against `palette1` `#b8554a` (blend computed in _linear_ space,
  as three composites with colour management on; naive sRGB gives 1.7:1 — neither rescues it), against a
  WCAG 1.4.11 floor of 3:1. **The structural point: no single ink can clear 3:1 against this palette**,
  because it spans a wide lightness range — an ink dark enough to read on gold Spain `#d4b24a` (L≈0.46)
  is too light-starved to read on the blue slot `#54719b` (L≈0.16), and the converse for a light ink.
  A **casing** answers it: whichever fill the line crosses, one of its two strokes separates from it —
  but only if the two sit at opposite ends of the lightness scale. Hence cream core `#f3e7cd` inside dark
  brown `#5c3a2e` at 0.9 opacity. _(An intermediate gold core `#d8b24a` was wrong on both counts: same
  lightness band as the casing, and four units from pinned Spain — a gold border on a gold country.)_
  **Still open**: `assignRegionColors` knows nothing about either stroke, so it cannot avoid a fill that
  sits between them; and a guard test asserting every palette slot and pinned colour clears 3:1 against at
  least one stroke would stop a future palette edit reintroducing the problem silently.
- **The frontier line is deliberately faint** (`frontierOpacity` 0.45 over parchment ≈ 1.6:1). It marks
  where the mapped world ends, which is illustrative rather than load-bearing — the coastline and the
  borders carry the functional information. Revisit if it ever becomes the only cue for something.
- **Two error-surface details worth knowing.** A `role="alert"` on a degraded failure would shout about a
  missing river; a `role="status"` on a blocking one would stay silent about a missing map — the severity
  is declared per asset in `assetMessages.ts`, never inferred from how it failed. And a blocking notice
  deliberately has **no dismiss button**: there is nothing behind it to go back to, and a close button
  would promise otherwise.
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
- **DEM assets committed** (`europe-dem-z6-1920.bin` read by the atlas, `europe-dem-z5.bin` by the Cartographer) so the
  app runs after a clone; their generator `files/spikes/fetch-dem` is committed too.
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
- **On an authored year, four dev-panel controls do nothing, and the panel does not say so** (2026-10-13,
  QUAL-001, **left open by decision**). The year's borders are exact and its colours are the Cartographer's
  (`files/plans/borders/plan.md`, step 4), so *snap to coast*, *colour by suzerain*, the editorial name rules
  and the *border smoothing* slider no longer apply. Only the smoothing slider says so (a console warning on
  release); the other two quietly rebuild to the same picture. **What it costs**: a minute of puzzlement over
  a dead slider, on a dev tool. **Remedy if it bites**: grey the controls while the installed year is
  authored — which needs the year's kind to reach the panel after it is built. **Severity: cosmetic.**
- **What the atlas does not yet draw of an authored year's borders** (2026-10-13, declared in
  `core/editor/atlasBorders.ts` and pinned by its tests): a hand's **weight** (a limit between two vassals of
  one lord is drawn as heavy as a sovereign one), a **dotted** hand (drawn dashed — no dot pattern yet), and
  an authored style on a **frontier** against unclaimed land (drawn in the frontier stroke, warned once per
  derivation). **Trigger**: the border-style session the dev announced on 2026-10-13. **Severity: worth knowing.**
- **With `exact fills` off, a tribe is still filled** (2026-10-16, review ARCH-101). Tribes lose their tint in
  `sources.regionTints`, which only the exact fill layer reads; the grid path kept in the dev panel for
  comparison bakes the compute's own tints. Remedy if that path ever ships again: a null tint per tribe in
  the compute request, keeping the regions' indices aligned. **Severity: cosmetic** — a comparison switch.
- **`fillTriangles` slows sharply on a coarse grid** (measured 2026-10-18, ATLAS-258): the 137 polities of 1100
  cut in ~0.45 s at 1280 or 640 cells across, ~1.1 s at 320, and **~237 s at 32** — a cell then holds hundreds
  of edges, and each of its two planes is split along every one of them. Harmless at the relief's real
  subdivision; it bit a test built at 32 segments (`tribeYear.test.ts` now builds at 640). Remedy if a coarse
  grid is ever wanted (a phone's `segments` step-down, see the first entry): split a cell only by the edges
  that cross the piece being split, or clip the ring to the cell first. **Severity: worth knowing.**
- **A tribe's fade is cut at the coast per vertex** (ATLAS-258): an outset spill over the sea is dropped where
  the vertices' interpolated land value falls under one half — at worst half a DEM cell either side of the
  mask's coast, under the coastline's own stroke. The cut against a neighbour's ground is exact (it reads a
  signed distance, not a flag). Remedy if it shows: a signed distance to the coast, as for the neighbours.
  **Severity: cosmetic.**
- **Le manifeste des années déclare la bbox du rendu, et personne ne vérifie qu'elle correspond au DEM.** — ATLAS-143
  `years/index.json` porte la boîte géographique contre laquelle les années dessinées se projettent, et elle
  **doit** être celle du DEM : si elle diffère, chaque frontière glisse hors du terrain qu'elle borde, sans
  erreur nulle part. Le choix de la déclarer plutôt que de la lire du relief était volontaire — la prendre du
  relief chargé rendrait la source dépendante de l'ordre de chargement, ce dont `mapSources` met en garde.
  **Le remède existe déjà et n'est pas branché** : `boundsMatch` dans `assetError.ts`, appelé là où les deux
  boîtes sont en main, c'est-à-dire dans le pipeline. C'est le contrôle `semantic` de la taxonomie.
  **Sévérité : à savoir** — 1100 est publié depuis le 16/10 (`years: [1100]`) et sa bbox n'est comparée au DEM par
  rien : à brancher.
