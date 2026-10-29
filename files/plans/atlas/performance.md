# The atlas's frame budget — the diagnosis of 2026-10-29

> The dev, 2026-10-29, 02:40: *« quand je lance l'Atlas, mon Mac souffle, le CPU chauffe. Lorsque je passe sur un autre
> moniteur qui affiche plus de choses, je descends de 43 à 13 images par seconde, le zoom est ralenti. Il faudrait que je
> sois au-dessus de 30. »* He thought the blur was applied once and then stood still. It is applied at every frame.
>
> This file is the reference text; its French twin for the morning is the fix ticket **ATLAS-304**, at the top of À faire.
> Everything under *Measured* was measured that night, in a probe described at the end so it can be replayed in five
> minutes. Everything under *Hypotheses* was **not** — each line says how to test it. Nothing under *Remedies* is decided.

> **The 13 fps were my measuring tab, not his screen — reproduced on 29/10 at midday.** His external monitor is
> 2212 × 1319 at a pixel ratio of 1 (2.9 Mpx, less than the 4.0 Mpx measured below). With the code of that night, his
> tab alone ran at ~44 fps, fluid. My automation tab, opened on the same server in a window of 2560 × 1319 at 2
> (13.5 Mpx), ran itself at 12.8 fps with the GPU saturated (6 blits a frame), and **his counter fell back to ~13** while
> it ran — the dev confirmed on sight. Two atlases drawing every frame share one GPU. So the night's *C1 → the fall to
> 13 fps* and the extrapolation to ~15 Mpx do not explain his screen; the costs measured stay true, and the remedies
> stay worth having (the dev, same day: *« les optimisations sont quand même très pertinentes »*), but the ticket is put
> on hold. **The rule that comes out of it**: never leave a measuring tab open while he reads his own counter — close it,
> or measure only with his tab closed.

## Measured

**Method.** A tab of my own on the dev's server (`localhost:5173`), window 1440×700 CSS at a device pixel ratio of 2 =
2880×1400 = **4.0 Mpx** (his laptop's whole screen is 2880×1800, 5.2 Mpx; the external monitor's size is unknown, H6).
A probe injected into the page: the driver's GPU timer (`EXT_disjoint_timer_query_webgl2`) around each animation frame,
and draw calls, triangles, framebuffer binds, blits and clears counted on the WebGL prototype. The zoom pinned through
`sessionStorage` (with the camera's unload save blocked); the settings flipped through the dev panel. **Once the GPU
saturates the timer inflates** (queued command buffers overlap): read the frame rate instead.

| situation (4.0 Mpx) | fps | GPU per frame | what is drawn |
| --- | --- | --- | --- |
| zoomed fully out, still — the blurs off by construction | 60 | **7.9 ms** | 5.4 M triangles, 33 draws, 138 k line instances |
| zoom 0.5, the **three blurs** | **40** | saturated (~80 ms read) | 42 framebuffer binds, **6 full-page blits**, 13 clears |
| zoom 0.5, borders' blur off | 53 | 34 ms | 4 blits |
| zoom 0.5, borders' and icons' off | 60 | 13.3 ms | 2 blits |
| zoom 0.5, all off | 60 | **7.0 ms** | 0 blits |
| zoom 0.5, **each blur alone**, unsaturated: none / names / borders / icons | 60 | 6.1 / 7.5 / 6.9 / 7.3 ms | the 3D icons are hidden at 0.5: the icons' is the bare chain's price |
| zoom 0.12 and 0.20, the three on / off | 60 | 15.9 / 7.1 and 15.6 / 6.9 ms | +8.8 ms for the three |
| a quarter of the pixels (1.0 Mpx), off / the three | 60 | 5.3 / 13.9 ms | |
| zoom 1.0, the three on / off | 41 / 60 | saturated / 5.8 ms | 50 draws; **43 of 195 frames carry a CPU spike of 10–14 ms** |

**The base, blurs off, by part.** Relief at 1280 segments: 7.0 ms; at 640: 4.2; at 256: 4.0 — and the draped lines,
cut on the same grid, go 143 k → 90 k → 58 k instances with it. The exact fills: 1.68 M triangles, ≈ 2.5 ms. The
borders: 76 k instances, ≈ 0.6 ms. The rest (sheet, rivers, coast, names, the main buffer's resolve): ≈ 1 ms.
At zoom 0.5 the base is the same as at zoom 0.12 (7.0 vs 7.1 ms): what grows with the zoom is only the blurs' share.

**One blur alone ≈ 1 ms; the three together ≈ 9 ms at zoom 0.12 and ≈ 18 ms at zoom 0.5. The cost is not additive**, and
the excess grows with the zoom. That is the finding that reorders the remedy.

**Scaling with the screen.** Base: ≈ 4.7 ms fixed (geometry) + ≈ 0.6 ms per Mpx. The three blurs: ≈ 8.6 ms at 1 Mpx,
≈ 18 ms at 4 Mpx. Extrapolated to ~15 Mpx (a 5K at 2×, or a 4K "looks like 2560×1440"): ≈ 65 ms a frame → ≈ 15 fps. His 13.

**Startup** (the dev server, unminified modules — `three.module.js` alone is 5.8 MB; not production, H7): seven long
tasks on the main thread, 3.2 s in all, one of **2.2 s** right before the fills and the borders appear (their
construction: the 137 polities cut on the relief's grid, 143 k line instances), then 249 ms for their first frame (shader
compilation); the relief ≈ 260 ms. JS heap 334 MB. The names arrive 15 to 60 s after navigation depending on the run
(their worker computes ~10 s, the rest is waiting). The icons' shadows upload one texture per redraw.

**Gestures.** No raycast on hover (only on click and double-click — brute force over 3 M triangles, tens of ms, known).
The wheel: 1.7 ms of CPU per frame during the motion, one notch = 0.01 of zoom. **One 37 ms spike the first time the
blurs switch on** (shader compilation and target allocation), once per page.

## Causes, measured, by weight

- **C1 — the three blurs together** (`scene/blur/separateImages.ts`, then `scene/screenBlur.ts`). Each, every frame: its layer drawn alone into a 4-sample
  image the size of the drawing buffer (with a depth buffer nothing reads), resolved (a blit), blurred across then down,
  resolved again, laid as a full-screen quad. They switch on as soon as the zoom leaves 0 — `closeness = zoom / 0.4`
  in `scene/layers/frameLayers.ts`, and a radius of 0.1 px runs the whole chain. Alone ≈ 1 ms; together 9 to 18 ms at
  4 Mpx, growing with the pixels. → **the fall to 13 fps.**
- **C2 — the loop draws at every refresh**, still or not (`app/frameLoop.ts`): 8 ms of GPU out of 16.7, permanently.
  → **the fan.**
- **C3 — the icons' shadows on the CPU** (`scene/events/shadows/iconShadows.ts`): 10–14 ms, ~13 times a second from
  zoom 0.55, off-screen icons included. → the heat close up.
- **C4 — the whole geometry drawn at every frame whatever the framing**: the relief's 3 M triangles ≈ 3 ms, the fills'
  1.7 M ≈ 2.5 ms. Fixed; does not grow with the screen.
- **C5 — at startup**, 2.2 s of main thread blocked to build the fills and the borders, 0.25 s of shader compilation at
  their first frame.

## Hypotheses — not measured; verify before choosing

- **H1 — why the blurs together cost more than their sum.** (a) On an Apple GPU, which draws by tiles, each blur
  interrupts the main pass: the image in progress (4-sample colour plus depth, ~130 MB at 4 Mpx) is stored and loaded
  back; (b) three distinct target sets ≈ 530 MB at 4 Mpx, ~2 GB at 15 Mpx — memory pressure; (c) ANGLE's Metal resolve
  path. Test: one shared target set (settles b); then two blurs on one layer (tells a from b).
- **H2 — why the excess grows with the zoom** (8.8 → 18 ms): wider and longer lines on screen, the level-1 names; or
  H1 getting worse. Test: each blur alone at 0.12 and at 0.5.
- **H3 — the terrain texture's anisotropy of 16** (`scene/relief/terrainTexture.ts`, sampled by the fills too) inside
  the base's 0.6 ms per Mpx. Test: anisotropy 1.
- **H4 — the main canvas's MSAA share.** Test: `antialias: false`.
- **H5 — the 2.2 s task is `fillTriangles` + `tribePatches` + the lines' split on the grid**, on the main thread. Test:
  `performance.mark` around `rebuildFills` and `rebuildBorders`.
- **H6 — the external monitor's real pixel count**, unknown. Ask him: `devicePixelRatio` and `innerWidth × innerHeight`
  there; at what zoom, and full screen or not, the 43 and the 13 were read.
- **H7 — production starts differently** (a minified bundle). Test: on the published site or `pnpm preview`.

## Remedies, proposed — nothing decided

- **R1 — one target set shared by the three blurs**, with no depth buffer, without the second resolve (the two blur
  passes ping-pong between two plain images instead of returning into the multisampled one), and a threshold: under
  0.25 px of radius, off. Light; measure at once. Expected: back toward additive, ~3 ms for the three at 4 Mpx. Nothing
  visible changes.
- **R2 — if R1 is not enough: the blurs at half resolution** (four times fewer pixels). Visible: a little softer — the
  dev judges on screen.
- **R3 — draw only when something changed** (*rendu à la demande*, `glossaire.md`): the camera (velocity, flight, drag,
  keys, edge scroll), a layer arriving or rebuilt, the panel (`gui.onChange`), the window, a visible animation (the 3D
  icons close up sway → the loop keeps running; ATLAS-300 says whether they stop at rest). One invalidation gate that
  everything goes through, or a forgotten path leaves the screen one frame behind. Nothing visible; zoomed out, the fan
  goes quiet.
- **R4 — the shadows**: redraw only the icons in frame, only when their pose changed, and a 5–10× lighter raster (reused
  arrays, a smaller tile) — or on the GPU.
- **R5 — startup**: the fills' and the lines' cut in the worker (core is three-free, `fillTriangles` already lives in
  `core/pipeline`), the buffers transferred; `renderer.compileAsync` before the first frame.
- **R6 — later**: the relief and the fills in tiles, frustum-culled; a BVH for the click (ATLAS-147).
- **R7 — in reserve**: 1.5 device pixels per CSS pixel on large screens (less sharp — his call); anisotropy 8.

**Order proposed**: R1 → measure → R3 → R4; the rest after. The dev's calls: R2's look, R3 against ATLAS-300, R7's
sharpness, the blur's threshold.

## R1, built and measured (29/10, midday)

**Built, then set aside as a method** (the dev, same afternoon: *« un contrat d'interface commun, une injection »*, the
standard staying *très haute*): the blur is a `BlurMethod` (`scene/blur/screenBlur.ts`) injected into the layers by
`main.ts`. **`separateImages`** is the code of 28/10 unchanged, each blur with its own images — the standard, in service.
**`sharedImages`** is R1, dormant for the lower quality levels (ATLAS-305): one image set for the three blurs, the
capture resolved once, colour only, the passes capture → spare → result, `SHARED_BLUR_THRESHOLD` = 0.25 CSS px. **One correction to the plan above**: the capture keeps its depth
buffer — the 3D icons' material (`icons/meshes/parts.ts`, `MeshStandardMaterial`, depth test and write on) needs it for
its own faces — but `resolveDepthBuffer` and `storeMultisampledDepthBuffer` are off, so it is never copied nor kept
(three 0.186, `WebGLTextures.updateMultisampleRenderTarget`).

**Measured** with the same probe, same window (1440 × 700 CSS at 2 = 4.0 Mpx), zoom 0.5 pinned, in my own tab:

| at zoom 0.5 | fps | GPU (ms) | copies a frame |
| --- | --- | --- | --- |
| no blur | 60 | 9.5 | 0 |
| names only | 60 | 11.5 | 1 |
| borders only | 60 | 10.8 | 1 |
| borders + names | 60 | 14.3 | 2 |
| names + icons | 60 | 15.4 | 2 |
| **the three** | **54–55** | saturated (timer reads ~51) | **3** (6 before) |

**Reading**: the three went from 40 fps to 54–55 fps on 4.0 Mpx; the copies halved; two blurs together now cost their
sum. The three together are still just past the 16.7 ms budget — their sum (≈ 8 ms over the base) on a base that read
9.5 ms today against 7.0 ms last night (same page, same zoom: the machine's state, not the code — hypothesis). Per
blur: borders ≈ 1.3 ms, names ≈ 2 ms, icons ≈ 4 ms (drawn from the whole scene, for the markers' lights).
**On ~15 Mpx** (a 5K screen at 2): the blurs' ≈ 8 ms scale with the pixels to ≈ 30 ms — R1 alone would not hold 30 fps
there; at 3.7 Mpx (a 27-inch 2560 × 1440 at 1) it would. **His screen's pixel ratio decides whether R2 is needed.**

## The probe — how to replay the measurement

Open a tab of your own on his dev server (never his tab; the two share the GPU if both are visible). Then, in the
JavaScript tool, **one probe per page** — two probes each beginning a timer query break both (`beginQuery` while one is
active is an error, and every result comes back `null`):

```js
const canvas = document.querySelector('#scene'), gl = canvas.getContext('webgl2')
const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') // present in Chrome on macOS
// count on the prototype: drawElements / drawArrays (+Instanced), bindFramebuffer, blitFramebuffer, clear
// wrap window.requestAnimationFrame: per callback, beginQuery(TIME_ELAPSED_EXT) … cb(ts) … endQuery, keep
//   { ts, cpu: performance.now() delta, query, draws, blits } ; resolve queries later with
//   gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) then QUERY_RESULT / 1e6 (ms)
// measure(label, 2500 ms): median of gpu, cpu, draws, blits; fps from the distinct ts gaps
```

Gotchas met that night, all worth a minute each:

- **Pin the zoom** through `sessionStorage['europe-map:map-camera'] = {"target":[0,0,0],"zoom":Z}` and reload — but the
  atlas saves the live camera on `beforeunload`, over yours: patch `Storage.prototype.setItem` to ignore that key before
  reloading. One wheel notch is 0.01 of zoom (`zoomSpeed`), so 50 notches from 0 is zoom 0.5 too.
- **Wait for the map**: the draw count stabilises (≥ 25 draws, unchanged for 3 s) between 15 and 30 s; a fixed wait
  measured a half-loaded map once (3.4 M triangles instead of 5.4 M).
- **The dev panel's classes are prefixed** (`lil-controller`, `lil-name`, `lil-widget`, `lil-boolean`): set a number by
  writing `input.value` then dispatching `input` and `blur`; a boolean by clicking its checkbox. Labels used: `border
  blur close up (px)` (1), `3D icon blur close up (px)` (0.75), `blur close up (px)` (the names', 0.6), `mesh segments`,
  `exact fills (authored year)`, `draw borders`.
- **The tool's limit is 45 s a call**: split a series; a rebuild of the relief or a political bake blocks the page for
  seconds. Keep results on `window` so a timeout loses nothing.
- **The window would not resize** on his laptop (already full screen): to test the pixel scaling, redefine
  `innerWidth`/`innerHeight` as getters and dispatch `resize`; restore them from `visualViewport`, never `delete` them.
- **Nothing persists**: the panel's values live in the page, so a reload is a clean slate; his own tab was never touched.

## What this does not cover

The names' placement itself (~10 s in its worker, `rules/known-issues/atlas.md`), the political compute (825 ms) and the
two bakes are one-shot costs at launch and on a change of year; they warm the machine for a few seconds and were not
measured again here. The Cartographer was not measured at all.
