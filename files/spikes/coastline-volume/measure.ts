/**
 * How many points must a pan redraw?
 *
 * Written for step 4d-2(a): the Cartographer's static canvas is repainted on every `pointermove` of a
 * pan, so the size of the vector layers is the number that decides whether they can be drawn plainly or
 * need culling and decimation. `s02` says to measure before building; this is that measurement.
 *
 * It reaches into `coastlineSource.ts` rather than `createMaskCoastlineSource`, for a mechanical reason:
 * that module has **type-only** imports, so Node's type stripping can load it as is, while `landMask.ts`
 * imports `./assetError` without an extension and Node ESM refuses that. The mask is therefore unpacked
 * here, reproducing exactly what `createMaskCoastlineSource` does — bilinear coverage, shore at 0.5.
 *
 * Run: node --experimental-strip-types files/spikes/coastline-volume/measure.ts
 */
import { readFileSync } from 'node:fs'

import { chainSegments } from '../../../packages/core/src/data/coastlineChain.ts'
import { createFieldCoastlineSource } from '../../../packages/core/src/data/coastlineSource.ts'
import {
  boundsOf,
  boxesOverlap,
  detailThresholdSquared,
  visibleBox,
} from '../../../packages/cartographer/src/view/culling.ts'

import type { Box } from '../../../packages/cartographer/src/view/culling.ts'

const base = 'packages/atlas/public/masks/europe-land'
const meta = JSON.parse(readFileSync(`${base}.json`, 'utf8')) as {
  width: number
  height: number
  scale: number
}
const bits = new Uint8Array(readFileSync(`${base}.bin`))

/**
 * Whether a mask cell is land, out of the packed bitfield (MSB first, row-major, 1 = land).
 * @param col - the column
 * @param row - the row
 * @returns 1 over land, 0 over water
 */
const at = (col: number, row: number): number => {
  const index = row * meta.width + col
  const byte = bits[index >> 3] ?? 0
  return (byte >> (7 - (index & 7))) & 1
}

/**
 * The land fraction around a normalized position, bilinear — what `LandMask.coverage` returns.
 * @param u - horizontal coordinate in [0, 1]
 * @param v - vertical coordinate in [0, 1]
 * @returns the land fraction in [0, 1]
 */
const coverage = (u: number, v: number): number => {
  const fx = Math.min(meta.width - 1, Math.max(0, u * (meta.width - 1)))
  const fy = Math.min(meta.height - 1, Math.max(0, v * (meta.height - 1)))
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(meta.width - 1, x0 + 1)
  const y1 = Math.min(meta.height - 1, y0 + 1)
  const tx = fx - x0
  const ty = fy - y0
  const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx
  const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx
  return top * (1 - ty) + bottom * ty
}

console.warn(`mask: ${String(meta.width)}×${String(meta.height)}, scale ${String(meta.scale)}`)

for (const width of [1280, 2560, 5120]) {
  const height = Math.max(2, Math.round((width * meta.height) / meta.width))
  const started = performance.now()
  const segments = createFieldCoastlineSource({
    width,
    height,
    level: 0.5,
    valueAt: (x, y) => coverage(x / (width - 1), y / (height - 1)),
  }).load()
  const ms = Math.round(performance.now() - started)
  const chainStarted = performance.now()
  const contours = chainSegments(segments)
  const chainMs = Math.round(performance.now() - chainStarted)
  const points = contours.reduce((total, c) => total + c.points.length, 0)
  const longest = contours[0]?.points.length ?? 0
  const closed = contours.filter((c) => c.closed).length
  console.warn(
    `trace at ${String(width)}×${String(height)}: ${String(segments.length)} segments in ${String(ms)} ms\n` +
      `  chained: ${String(contours.length)} contours (${String(closed)} closed), ` +
      `${String(points)} points, longest ${String(longest)}, in ${String(chainMs)} ms\n` +
      `  sub-paths per repaint: ${String(segments.length)} -> ${String(contours.length)} ` +
      `(${(segments.length / Math.max(1, contours.length)).toFixed(0)}x fewer)`
  )
}

/**
 * What a repaint actually traces, once culling and decimation are applied.
 *
 * The numbers above are what exists; these are what gets drawn, which is the figure the frame rate
 * follows. Reproduces `painter.ts`'s two rules rather than importing them, the painter being tied to a
 * canvas context this script has none of.
 * @param runs - the runs, in backdrop pixels, with their boxes
 * @param scale - the view's scale
 * @param canvas - the canvas size in device pixels
 * @returns how many points would be handed to the context
 */
function drawnPoints(
  runs: { points: [number, number][]; bounds: Box }[],
  scale: number,
  canvas: { width: number; height: number }
): number {
  // Centred on the backdrop, as the opening view is.
  const originX = (canvas.width - RENDER_WIDTH * scale) / 2
  const originY = (canvas.height - RENDER_HEIGHT * scale) / 2
  const view = visibleBox({ scale, originX, originY }, canvas)
  const minGapSquared = detailThresholdSquared({ scale, originX, originY })
  let drawn = 0
  for (const run of runs) {
    if (!boxesOverlap(run.bounds, view)) continue
    let keptX = 0
    let keptY = 0
    let first = true
    const last = run.points.length - 1
    for (let i = 0; i <= last; i++) {
      const [x, y] = run.points[i] as [number, number]
      if (first) {
        drawn += 1
        keptX = x
        keptY = y
        first = false
        continue
      }
      const dx = x - keptX
      const dy = y - keptY
      if (i !== last && dx * dx + dy * dy < minGapSquared) continue
      drawn += 1
      keptX = x
      keptY = y
    }
  }
  return drawn
}

const RENDER_WIDTH = 1280
const RENDER_HEIGHT = 1164
const CANVAS = { width: 1600, height: 1200 }

const traced = createFieldCoastlineSource({
  width: 2560,
  height: 2328,
  level: 0.5,
  valueAt: (x, y) => coverage(x / (2560 - 1), y / (2328 - 1)),
}).load()
const runs = chainSegments(traced).map((contour) => {
  const points: [number, number][] = contour.points.map((point) => [
    point.u * RENDER_WIDTH,
    point.v * RENDER_HEIGHT,
  ])
  return { points, bounds: boundsOf(points) }
})
const total = runs.reduce((sum, run) => sum + run.points.length, 0)

console.warn(`\nwhat a repaint traces, from ${String(total)} coastline points:`)
for (const scale of [0.9, 1, 2, 4, 8, 16, 32]) {
  const drawn = drawnPoints(runs, scale, CANVAS)
  const share = ((drawn / total) * 100).toFixed(1)
  console.warn(`  scale ${String(scale).padStart(3)}: ${String(drawn).padStart(6)} points (${share} %)`)
}
