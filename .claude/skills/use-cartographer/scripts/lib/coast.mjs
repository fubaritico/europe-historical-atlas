import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { samplesInside } from './islands.mjs'

/**
 * The coastline the Pen follows, traced as the Cartographer traces it — the same mask, the same width, the same
 * functions of `core`, imported as they are. **Run under `tsx`** (`node --import tsx …`): `core` is TypeScript.
 *
 * Re-implementing the marching squares here would give a coast the Pen does not see; importing the code is the only
 * way the measure and the screen agree point for point.
 */

/** The mask the Cartographer loads, relative to a checkout (`main.tsx`: `/masks/europe-land`). */
export const MASK_BASE = 'packages/atlas/public/masks/europe-land'

/** The grid the Cartographer traces the shore at (`COASTLINE_TRACE_WIDTH`, `loaders/vectorLayers.ts`). */
export const TRACE_WIDTH = 2560

/**
 * A closed run of coast in degrees.
 * @typedef {object} CoastLoop
 * @property {number} id - its rank among the traced contours, longest first — stable for one mask
 * @property {import('./geo.mjs').LonLat[]} points - the points, the closing segment implied
 * @property {boolean} land - whether the mask holds land inside: an island's coast, not a lake's shore
 */

/**
 * Whether a position is land, by the mask the Cartographer loads.
 * @param {string} root - the checkout
 * @returns {Promise<(p: import('./geo.mjs').LonLat) => boolean>} the test
 */
export async function loadLand(root) {
  const core = join(root, 'packages/core/src')
  const { createPackedLandMask, parseLandMaskMeta } = await import(join(core, 'data/landMask.ts'))
  const { latitudeToVertical, longitudeToHorizontal } = await import(join(core, 'geo/mercator.ts'))
  const base = join(root, MASK_BASE)
  const meta = parseLandMaskMeta(JSON.parse(readFileSync(`${base}.json`, 'utf8')), `${base}.json`)
  const mask = createPackedLandMask(meta, new Uint8Array(readFileSync(`${base}.bin`)))
  return (/** @type {import('./geo.mjs').LonLat} */ p) =>
    mask.isLand(longitudeToHorizontal(p[0], meta.bbox), latitudeToVertical(p[1], meta.bbox))
}

/**
 * Trace the coast of a checkout's mask and keep the closed runs — the islands and the lakes' shores.
 * @param {string} root - the checkout
 * @returns {Promise<CoastLoop[]>} the closed runs, in degrees
 */
export async function traceCoastLoops(root) {
  return (await traceCoast(root)).filter((loop) => loop.closed)
}

/**
 * Trace the coast of a checkout's mask, every contour — the continents' open runs as well as the closed loops.
 * @param {string} root - the checkout
 * @returns {Promise<(CoastLoop & { closed: boolean })[]>} every contour, in degrees, longest first
 */
export async function traceCoast(root) {
  const core = join(root, 'packages/core/src')
  const { createPackedLandMask, parseLandMaskMeta } = await import(join(core, 'data/landMask.ts'))
  const { createMaskCoastlineSource } = await import(join(core, 'data/coastlineSource.ts'))
  const { chainSegments } = await import(join(core, 'data/coastlineChain.ts'))
  const { horizontalToLongitude, latitudeToVertical, longitudeToHorizontal, verticalToLatitude } =
    await import(join(core, 'geo/mercator.ts'))

  const base = join(root, MASK_BASE)
  const meta = parseLandMaskMeta(JSON.parse(readFileSync(`${base}.json`, 'utf8')), `${base}.json`)
  const mask = createPackedLandMask(meta, new Uint8Array(readFileSync(`${base}.bin`)))
  const contours = chainSegments(createMaskCoastlineSource(mask, TRACE_WIDTH).load())
  const bounds = meta.bbox
  /** @type {(CoastLoop & { closed: boolean })[]} */
  const loops = []
  const toUv = (/** @type {import('./geo.mjs').LonLat} */ p) => [
    longitudeToHorizontal(p[0], bounds),
    latitudeToVertical(p[1], bounds),
  ]
  contours.forEach((contour, id) => {
    /** @type {import('./geo.mjs').LonLat[]} */
    const points = contour.points.map((p) => [
      horizontalToLongitude(p.u, bounds),
      verticalToLatitude(p.v, bounds),
    ])
    // Majority of the points inside: an islet in a lake, or a lake on an island, can hold one sample of the other.
    // An open run (a continent's coast, cut by the frame) has no inside: it is land's edge by definition.
    let land = true
    if (contour.closed) {
      const samples = samplesInside(points)
      land = samples.filter((p) => mask.isLand(...toUv(p))).length * 2 > samples.length
    }
    loops.push({ id, points, land, closed: contour.closed })
  })
  return loops
}
