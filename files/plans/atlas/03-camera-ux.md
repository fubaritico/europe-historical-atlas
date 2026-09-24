# 03 — Camera & on-screen UX

> Chapter of the [roadmap](../roadmap.md). Viewport, overlays, and the grand-strategy camera.

## Target screen & UX

Overall layout: a full-screen **3D viewport** with **HTML/CSS UI overlays** on top. UI is built in
**plain native TS (no React)** — DOM overlays positioned over the WebGL canvas.

- **Viewport** — the 3D projection of the map.
- **Dev stats panel** (dev only) — `Stats` (stats.js: FPS/ms/memory) + a `lil-gui` debug panel to tune
  parameters live (displacementScale, camera limits, fog…). Toggle off in prod.
- **Camera navigation UI** — on-screen buttons (zoom in/out, pan left/right/up/down, get closer) that
  dispatch the SAME commands as the keyboard (a single `CameraCommand` seam, two input sources).
- **Time slider** (M2+) — advance/rewind century by century. Options to decide: a slider, or a date
  field with up/down arrows, or both. Later possibly decade granularity (see M4).
- **Decorative border elements** — optional screen-edge chrome (frame/ornaments; ties to the compass rose).

## Camera model (inspired by grand-strategy games: EU4, Total War)

- **Angled top-down camera** looking at the ground plane; **pan** across the map (arrow keys / WASD /
  edge-scroll / drag), **zoom** with the wheel.
- **Zoom-dependent tilt** (optional): zoomed out → more top-down, zoomed in → more oblique.
- **Yaw rotation**: tentative — free during cruising, but locked/snapped to a default orientation when
  zoomed out / at rest. Not finalized; keep "free with a default heading" and refine.
- **Fly-to trajectory = an eased ARC**, never a straight line (aesthetic). The approach ends **locked at
  ~45° pitch**, close-up and slightly top-down.
- **Navigation limits (this is how "max limits" are defined)**: clamp the camera's **ground target** to
  the map's bounding box (+ small margin), and clamp **zoom distance** to `[minDistance, maxDistance]`.
  This — not fog — is what bounds navigation.
- **Fog**: a separate, purely aesthetic rendering effect (fade distant terrain, hide the finite plane's
  hard edge, add depth). Optional; decide independently of the limits.
- **Click-to-approach + Escape-to-return**: on click, **push the current camera pose** (position +
  target + zoom) onto a small stack and tween (along the arc) toward the clicked point; **Escape pops**
  and tweens back to the pre-click pose. Reuses the `CameraStateStore` serialization (Phase 0.2).

## Framing & off-field (hors-champ) — hide the map edges (to design)

The map is a finite plane; its hard edges must never be visible ("on ne doit pas voir au-delà"). The
current mesh matches the DEM bbox (1024×896, ~1.14:1) so the edges show. Solve with **four combined levers**:

1. **Extend the DEM extent** — re-fetch a wider bbox (N. Africa, Atlantic, Greenland, Urals/Asia) so
   Europe is **centred** and the edges fall far out in ocean/neighbours. `files/spikes/fetch-dem` already
   takes `--west/--south/--east/--north` — just widen them (heavier asset → maybe a lower zoom for the surround).
2. **Fog** — the aesthetic edge-hider we set aside: fades the distant terrain so the hard cut isn't seen.
3. **Camera bounds** — clamp the ground **target** to a region **inset** from the true edge, and set
   `maxDistance` (max zoom-out), both sized so the frustum **never reaches the plane edge** at any allowed
   zoom. This is the "recul max": you can frame all of Europe, but not pull back far enough to reveal the void.
4. **Decorative frame** — parchment chrome / compass rose masking the screen borders (ties to M2 UI chrome).

Order to tackle (M1.3+): (1) wider DEM extent, (3) camera bounds + maxDistance, (2) fog, (4) frame.
