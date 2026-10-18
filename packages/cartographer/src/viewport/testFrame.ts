import { createLandMask } from '@europe-historical-atlas/core/data/landMask'

import type { BackdropFrame } from './projection'

/**
 * The real backdrop's grid and bounds — **as a test fixture, and nothing else.**
 *
 * **It stopped being the application's frame on 2026-10-07.** Until then it was `RENDER_FRAME` in
 * `view/backdropFrame.ts`, declared by hand and used in production, which made these numbers a second
 * source of truth with a silent failure mode: project against one box while painting another and every
 * border slides off the terrain it borders, with no error anywhere. The application now takes them from
 * `packages/atlas/public/heightmaps/europe-dem-z5.json` itself, through the reader that already parses
 * it — see `frameFromHeightmap` in `loaders/backdropSource.ts`. That closes ARCH-102.
 *
 * **Why it still exists.** Six suites need a frame, and they need the *real* one: the projection,
 * framing and resolution tests assert against positions and scales that only mean something at this
 * grid and these bounds. Letting each of them re-declare the literal is what ARCH-102's first half
 * corrected — *"a copy in a test is the worse of the two"*, since it can drift from the thing it
 * verifies and nothing fails.
 *
 * **Nothing outside a test may import this.** Guarded by `backdropSource.test.ts`, which reads the
 * sources and asserts it: a production import would reinstate exactly the defect this rename removed,
 * and a comment asking nicely would not have stopped it.
 *
 * It is the render frame: the DEM reaches down to 11.18°N and out to 78.75°E.
 */
export const TEST_BACKDROP_FRAME: BackdropFrame = {
  size: { width: 1280, height: 1164 },
  bounds: {
    west: -45,
    south: 11.178401873711783,
    east: 78.75,
    north: 76.84081641443098,
  },
}

/**
 * A land mask over the same frame that says **sea everywhere** — as a test fixture, under the same rule.
 *
 * The quiet answer, so a test that does not care about the far side draws no frontier: a polity's own
 * outer limit derives as a coastline, which paints nothing.
 */
export const TEST_LAND_MASK = createLandMask(
  { width: 1, height: 1, scale: 1, bbox: TEST_BACKDROP_FRAME.bounds, source: 'test mask' },
  () => false
)
