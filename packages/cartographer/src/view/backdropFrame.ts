import type { BackdropFrame } from './projection'

/**
 * The frame everything on the canvas is georeferenced against — the DEM's own grid.
 *
 * **These are the numbers in `packages/atlas/public/heightmaps/europe-dem-z5.json`**, and they are
 * declared here rather than read because step 4d-1 draws no backdrop yet: nothing is loaded, so there is
 * nothing to read them from. **Step 4d-3 bakes the terrain and must take them from that file instead**,
 * at which point this constant goes away.
 *
 * **Until then they are a second source of truth, and the failure mode is silent**: project against one
 * box while painting another and every border slides off the terrain it borders, with no error anywhere.
 * That is the same hazard `known-issues.md` records twice — for the year manifest's declared bbox, and
 * for the render frame against the editorial zone. The remedy already exists and is not wired:
 * `boundsMatch` in `core/data/assetError.ts`, which is the `semantic` check of that taxonomy.
 *
 * **It is the render frame, not the editorial zone.** The DEM reaches down to 11.18°N and out to 78.75°E;
 * the zone the author draws in is narrower (lon −45…60, lat 20…76) and is a rectangle *drawn on top*.
 */
export const RENDER_FRAME: BackdropFrame = {
  size: { width: 1280, height: 1164 },
  bounds: {
    west: -45,
    south: 11.178401873711783,
    east: 78.75,
    north: 76.84081641443098,
  },
}
