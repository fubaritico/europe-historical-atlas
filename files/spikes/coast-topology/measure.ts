/**
 * Does the traced coastline keep the land mask's islands? — CORE-421 (the dev, 2026-11-12: the smoothing may stay, but it
 * must never weld two islands, split one or create one; one coast for both applications).
 *
 * Two measures, read-only:
 * 1. **The islands**: the land mask's islands (land cells joined by an edge or a corner; lakes, water joined by an edge)
 *    against the closed contours of the coast
 *    traced at the Cartographer's grid (2 560 cells across), the atlas's (3 840) and the mask's own (5 120), counted
 *    whole and inside three boxes (Kvarner, Dalmatia, the Aegean).
 * 2. **A year's coastal anchors**: the anchors lying on the Cartographer's coast today (within 300 m), and how far each
 *    falls from the coast traced at the atlas's grid and at the mask's own — what a change of coast would leave off it.
 *
 * Run from the repository root: pnpm exec tsx files/spikes/coast-topology/measure.ts [year]
 */
import { readFileSync } from 'node:fs'

import { chainSegments } from '../../../packages/core/src/data/coastlineChain'
import { createMaskCoastlineSource } from '../../../packages/core/src/data/coastlineSource'
import { createPackedLandMask, parseLandMaskMeta } from '../../../packages/core/src/data/landMask'
import { horizontalToLongitude, verticalToLatitude } from '../../../packages/core/src/geo/mercator'

import type { Contour } from '../../../packages/core/src/data/coastlineChain'
import type { UvPoint } from '../../../packages/core/src/data/coastlineSource'

/** A box in degrees: west, south, east, north. */
type Box = readonly [number, number, number, number]

/** The places the dev showed on 2026-11-12. */
const BOXES: Record<string, Box> = {
  Kvarner: [13.8, 44.3, 15.3, 45.4],
  Dalmatia: [13.5, 42.3, 18.6, 45.6],
  Aegean: [22.5, 35.5, 28.5, 40.5],
}

/** The grids traced: the Cartographer's, the atlas's, the mask's own. */
const WIDTHS = { cartographer: 2560, atlas: 3840, mask: 5120 } as const

/** An anchor within this of the Cartographer's coast is a coastal anchor. */
const ON_COAST_KM = 0.3

const year = process.argv[2] ?? '1200'
const base = 'packages/atlas/public/masks/europe-land'
const meta = parseLandMaskMeta(JSON.parse(readFileSync(`${base}.json`, 'utf8')), base)
const mask = createPackedLandMask(meta, new Uint8Array(readFileSync(`${base}.bin`)))
const bounds = meta.bbox

/**
 * A uv point in degrees.
 * @param p - the point
 * @returns longitude, latitude
 */
const toDegrees = (p: UvPoint): [number, number] => [
  horizontalToLongitude(p.u, bounds),
  verticalToLatitude(p.v, bounds),
]

/**
 * Whether a box in degrees lies wholly inside another.
 * @param inner - the box tested
 * @param outer - the box around
 * @returns true when inside
 */
const inside = (inner: Box, outer: Box): boolean =>
  inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]

/**
 * The land mask's islands and lakes, by flood over cells joined by an edge: each component's box in degrees.
 * The sea (the water touching the grid's edge) is left out.
 * @returns the land components and the enclosed water components
 */
function maskComponents(): { land: Box[]; lakes: Box[] } {
  const { width, height } = meta
  const seen = new Uint8Array(width * height)
  const isLand = (i: number): boolean => mask.isLand((i % width) / (width - 1), Math.floor(i / width) / (height - 1))
  const land: Box[] = []
  const lakes: Box[] = []
  const stack = new Int32Array(width * height)
  for (let start = 0; start < width * height; start++) {
    if (seen[start]) continue
    const kind = isLand(start)
    let top = 0
    stack[top++] = start
    seen[start] = 1
    let [c0, r0, c1, r1] = [width, height, -1, -1]
    let touchesEdge = false
    while (top > 0) {
      const i = stack[--top] as number
      const c = i % width
      const r = Math.floor(i / width)
      if (c < c0) c0 = c
      if (c > c1) c1 = c
      if (r < r0) r0 = r
      if (r > r1) r1 = r
      if (c === 0 || r === 0 || c === width - 1 || r === height - 1) touchesEdge = true
      // Land joins through corners too, water through edges only: two cells meeting at a corner are one island to
      // any trace, and the water between them is not a strait.
      const left = c > 0
      const right = c < width - 1
      const up = r > 0
      const down = r < height - 1
      const edges = [left ? i - 1 : -1, right ? i + 1 : -1, up ? i - width : -1, down ? i + width : -1]
      const corners = kind
        ? [left && up ? i - width - 1 : -1, right && up ? i - width + 1 : -1, left && down ? i + width - 1 : -1, right && down ? i + width + 1 : -1]
        : []
      for (const n of [...edges, ...corners]) {
        if (n < 0 || seen[n] || isLand(n) !== kind) continue
        seen[n] = 1
        stack[top++] = n
      }
    }
    const [w, n] = toDegrees({ u: c0 / (width - 1), v: r0 / (height - 1) })
    const [e, s] = toDegrees({ u: c1 / (width - 1), v: r1 / (height - 1) })
    const box: Box = [w, s, e, n]
    if (kind) land.push(box)
    else if (!touchesEdge) lakes.push(box)
  }
  return { land, lakes }
}

/**
 * A contour's box in degrees.
 * @param contour - the contour
 * @returns its box
 */
function contourBox(contour: Contour): Box {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const p of contour.points) {
    const [lon, lat] = toDegrees(p)
    if (lon < w) w = lon
    if (lon > e) e = lon
    if (lat < s) s = lat
    if (lat > n) n = lat
  }
  return [w, s, e, n]
}

/** A traced coast's segments in local kilometres, bucketed for the nearest search. */
interface SegmentIndex {
  near: (lon: number, lat: number) => number
}

/**
 * Index a coast's segments by a grid of 0.05°, to answer the distance from a point to the nearest segment.
 * @param contours - the coast
 * @returns the index
 */
function indexSegments(contours: Contour[]): SegmentIndex {
  const CELL = 0.05
  const buckets = new Map<string, number[]>()
  const coords: number[] = []
  for (const contour of contours) {
    const pts = contour.points.map(toDegrees)
    const count = contour.closed ? pts.length : pts.length - 1
    for (let i = 0; i < count; i++) {
      const a = pts[i] as [number, number]
      const b = pts[(i + 1) % pts.length] as [number, number]
      const id = coords.length / 4
      coords.push(a[0], a[1], b[0], b[1])
      const key = `${Math.floor(a[0] / CELL)},${Math.floor(a[1] / CELL)}`
      const list = buckets.get(key)
      if (list) list.push(id)
      else buckets.set(key, [id])
    }
  }
  return {
    near(lon: number, lat: number): number {
      const kx = 111.32 * Math.cos((lat * Math.PI) / 180)
      const ky = 110.57
      const cx = Math.floor(lon / CELL)
      const cy = Math.floor(lat / CELL)
      let best = Infinity
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const id of buckets.get(`${String(cx + dx)},${String(cy + dy)}`) ?? []) {
            const ax = ((coords[id * 4] as number) - lon) * kx
            const ay = ((coords[id * 4 + 1] as number) - lat) * ky
            const bx = ((coords[id * 4 + 2] as number) - lon) * kx
            const by = ((coords[id * 4 + 3] as number) - lat) * ky
            const ex = bx - ax
            const ey = by - ay
            const len = ex * ex + ey * ey
            const t = len === 0 ? 0 : Math.max(0, Math.min(1, -(ax * ex + ay * ey) / len))
            const d = Math.hypot(ax + t * ex, ay + t * ey)
            if (d < best) best = d
          }
        }
      }
      return best
    },
  }
}

/**
 * A distribution in one line.
 * @param values - the values, in km
 * @returns median, 90th percentile, max, and how many exceed 0.5 and 1 km
 */
function spread(values: number[]): string {
  const sorted = [...values].sort((a, b) => a - b)
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? NaN
  const over = (km: number): number => sorted.filter((v) => v > km).length
  return `median ${at(0.5).toFixed(2)} km · p90 ${at(0.9).toFixed(2)} · max ${(sorted.at(-1) ?? NaN).toFixed(2)} · > 0.5 km: ${String(over(0.5))} · > 1 km: ${String(over(1))}`
}

const started = Date.now()
const { land, lakes } = maskComponents()
console.warn(`mask ${String(meta.width)}×${String(meta.height)}: ${String(land.length)} land components, ${String(lakes.length)} lakes (${String(Date.now() - started)} ms)`)

const traces = Object.fromEntries(
  Object.entries(WIDTHS).map(([name, width]) => {
    const t0 = Date.now()
    const contours = chainSegments(createMaskCoastlineSource(mask, width).load())
    console.warn(`${name} (${String(width)}): ${String(contours.filter((c) => c.closed).length)} closed contours, ${String(contours.filter((c) => !c.closed).length)} open (${String(Date.now() - t0)} ms)`)
    return [name, contours]
  })
) as Record<keyof typeof WIDTHS, Contour[]>

console.warn('\nIslands and lakes wholly inside each box — the mask against each trace:')
for (const [name, box] of Object.entries(BOXES)) {
  const truth = land.filter((b) => inside(b, box)).length + lakes.filter((b) => inside(b, box)).length
  const row = Object.entries(traces).map(
    ([trace, contours]) => `${trace} ${String(contours.filter((c) => c.closed && inside(contourBox(c), box)).length)}`
  )
  console.warn(`  ${name}: mask ${String(truth)} · ${row.join(' · ')}`)
}

const doc = JSON.parse(readFileSync(`packages/atlas/public/years/${year}/polities.json`, 'utf8')) as {
  anchors: [number, number][]
}
const cartographer = indexSegments(traces.cartographer)
const atlas = indexSegments(traces.atlas)
const full = indexSegments(traces.mask)
const coastal = doc.anchors.filter(([lon, lat]) => cartographer.near(lon, lat) <= ON_COAST_KM)
console.warn(`\n${year}: ${String(doc.anchors.length)} anchors, ${String(coastal.length)} on the Cartographer's coast (≤ ${String(ON_COAST_KM)} km)`)
console.warn(`  their distance to the atlas's coast: ${spread(coastal.map(([lon, lat]) => atlas.near(lon, lat)))}`)
console.warn(`  their distance to the mask's own coast: ${spread(coastal.map(([lon, lat]) => full.near(lon, lat)))}`)
for (const [name, box] of Object.entries(BOXES)) {
  const local = coastal.filter(([lon, lat]) => lon >= box[0] && lon <= box[2] && lat >= box[1] && lat <= box[3])
  console.warn(`  ${name}, ${String(local.length)} coastal anchors → mask's coast: ${spread(local.map(([lon, lat]) => full.near(lon, lat)))}`)
}
