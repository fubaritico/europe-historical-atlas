/**
 * The sea zones — CORE-421 (the dev, 2026-11-12: the coasts bite into the sea, every island is redrawn, one algorithm
 * for Norway's skerries, Dalmatia's channels and the Aegean; "I'm sure it will fail" — so measure it).
 *
 * The rule, the one maritime borders use: **the sea belongs to the country of the nearest coast, up to a width from the
 * shore**; between two neighbours the limit falls halfway between their coasts. Measured on the land mask's own grid:
 * 1. every land cell takes the polity whose outline covers it (the year as drawn);
 * 2. the sea and the land no outline covers take, out to the width, the polity of the nearest covered land — a
 *    two-pass chamfer distance carrying the label, in kilometres;
 * 3. every island (land joined by edges and corners) takes the polity covering most of it, or, uncovered, the polity
 *    of the zone it lies in, or none.
 * Reported per region and per width: the islands, how many change hands against the year as drawn, how many stay
 * without a polity, and the points a zone's outline costs once simplified. And an image per region, to judge by eye:
 * the land in its polity's colour, the sea zones in a paler one, an island that changes hands in red, one left
 * without a polity in black.
 *
 * Run from the repository root: pnpm exec tsx files/spikes/sea-zones/measure.ts <year folder> <out folder>
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { chainSegments } from '../../../packages/core/src/data/coastlineChain'
import { createFieldCoastlineSource } from '../../../packages/core/src/data/coastlineSource'
import { createPackedLandMask, parseLandMaskMeta } from '../../../packages/core/src/data/landMask'
import { latitudeToVertical, longitudeToHorizontal, verticalToLatitude } from '../../../packages/core/src/geo/mercator'

import type { UvPoint } from '../../../packages/core/src/data/coastlineSource'

/** A box in degrees: west, south, east, north. */
type Box = readonly [number, number, number, number]

/** The three places the dev named. */
const REGIONS: Record<string, Box> = {
  norway: [3.5, 57.5, 31.5, 71.5],
  dalmatia: [12.0, 41.3, 20.5, 46.2],
  aegean: [19.5, 34.3, 30.5, 41.8],
}

/** The widths tried, in km. */
const WIDTHS = [5, 10, 15]

/** Islands bigger than this, in cells, are not counted — mainland, Sicily, Crete stay out of the island count. */
const ISLAND_MAX_CELLS = 20_000

/** Douglas–Peucker tolerance for a zone's outline, in cells — the outline lies at sea, where the mask hides it. */
const SIMPLIFY_CELLS = 0.75

const NONE = -1

const [yearFolder, outFolder] = process.argv.slice(2)
if (!yearFolder || !outFolder) throw new Error('usage: measure.ts <year folder> <out folder>')
mkdirSync(outFolder, { recursive: true })

const maskBase = 'packages/atlas/public/masks/europe-land'
const meta = parseLandMaskMeta(JSON.parse(readFileSync(`${maskBase}.json`, 'utf8')), maskBase)
const mask = createPackedLandMask(meta, new Uint8Array(readFileSync(`${maskBase}.bin`)))
const { bbox } = meta
const W = meta.width
const H = meta.height

const doc = JSON.parse(readFileSync(join(yearFolder, 'polities.json'), 'utf8')) as {
  anchors: [number, number][]
  claims: { polity: string; rings: number[][]; open?: number[] }[]
}
const registry = JSON.parse(readFileSync(join(yearFolder, 'registry.json'), 'utf8')) as {
  polities: { id: string; colour: string | null }[]
}
const polityIds = [...new Set(doc.claims.map((c) => c.polity))]
const colourOf = new Map(registry.polities.map((p) => [p.id, p.colour ?? '#888888']))

/** A column of the mask, fractional, for a longitude. */
const colOf = (lon: number): number => longitudeToHorizontal(lon, bbox) * (W - 1)
/** A row of the mask, fractional, for a latitude. */
const rowOf = (lat: number): number => latitudeToVertical(lat, bbox) * (H - 1)
/** A cell's side in km at a row: the grid is Mercator, so square on the ground, shrinking with the latitude. */
const cellKm = (row: number): number =>
  (((bbox.east - bbox.west) / (W - 1)) * 111.32 * Math.cos((verticalToLatitude(row / (H - 1), bbox) * Math.PI) / 180))

/** The grid of one region, padded so the zone near its edge is not cut short. */
interface Region {
  c0: number
  r0: number
  w: number
  h: number
}

/**
 * The region's grid.
 * @param box - the region in degrees
 * @param padKm - the padding, at least the widest zone
 * @returns its origin and size in mask cells
 */
function regionOf(box: Box, padKm: number): Region {
  const pad = Math.ceil(padKm / cellKm(rowOf((box[1] + box[3]) / 2))) + 2
  const c0 = Math.max(0, Math.floor(colOf(box[0])) - pad)
  const c1 = Math.min(W - 1, Math.ceil(colOf(box[2])) + pad)
  const r0 = Math.max(0, Math.floor(rowOf(box[3])) - pad)
  const r1 = Math.min(H - 1, Math.ceil(rowOf(box[1])) + pad)
  return { c0, r0, w: c1 - c0 + 1, h: r1 - r0 + 1 }
}

/**
 * Which polity covers each cell of the region, by the even-odd rule over all its rings — a scanline fill through cell
 * centres. A later claim overwrites an earlier one where two overlap.
 * @param g - the region
 * @returns the polity index per cell, or {@link NONE}
 */
function rasterOwners(g: Region): Int16Array {
  const owner = new Int16Array(g.w * g.h).fill(NONE)
  // Every ring, an open one too: `open` names the rings the author left unclosed, and their fill is closed by the
  // line between their two ends, as the Cartographer fills them.
  doc.claims.forEach((claim) => {
    const p = polityIds.indexOf(claim.polity)
    const edges: [number, number, number, number][] = []
    for (const ring of claim.rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = doc.anchors[ring[i] as number] as [number, number]
        const b = doc.anchors[ring[(i + 1) % ring.length] as number] as [number, number]
        edges.push([colOf(a[0]) - g.c0, rowOf(a[1]) - g.r0, colOf(b[0]) - g.c0, rowOf(b[1]) - g.r0])
      }
    }
    for (let r = 0; r < g.h; r++) {
      const y = r
      const xs: number[] = []
      for (const [x0, y0, x1, y1] of edges) {
        if (y0 <= y === y1 <= y) continue
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0))
      }
      if (xs.length < 2) continue
      xs.sort((a, b) => a - b)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.max(0, Math.ceil(xs[k] as number))
        const to = Math.min(g.w - 1, Math.floor(xs[k + 1] as number))
        for (let c = from; c <= to; c++) owner[r * g.w + c] = p
      }
    }
  })
  return owner
}

/**
 * The land of the region, one byte a cell.
 * @param g - the region
 * @returns 1 over land
 */
function landOf(g: Region): Uint8Array {
  const land = new Uint8Array(g.w * g.h)
  for (let r = 0; r < g.h; r++) {
    for (let c = 0; c < g.w; c++) {
      if (mask.isLand((g.c0 + c) / (W - 1), (g.r0 + r) / (H - 1))) land[r * g.w + c] = 1
    }
  }
  return land
}

/**
 * Carry each covered land cell's polity over the rest, nearest first, out to a width — a two-pass chamfer distance in km.
 * @param g - the region
 * @param seed - the polity of each covered land cell, NONE elsewhere
 * @param maxKm - the width
 * @returns the polity each cell takes, NONE beyond the width
 */
function nearest(g: Region, seed: Int16Array, maxKm: number): Int16Array {
  const dist = new Float32Array(g.w * g.h).fill(Infinity)
  const label = new Int16Array(seed)
  for (let i = 0; i < seed.length; i++) if (seed[i] !== NONE) dist[i] = 0
  const relax = (i: number, j: number, step: number): void => {
    const d = (dist[j] as number) + step
    if (d < (dist[i] as number)) {
      dist[i] = d
      label[i] = label[j] as number
    }
  }
  for (let r = 0; r < g.h; r++) {
    const k = cellKm(g.r0 + r)
    for (let c = 0; c < g.w; c++) {
      const i = r * g.w + c
      if (c > 0) relax(i, i - 1, k)
      if (r > 0) {
        relax(i, i - g.w, k)
        if (c > 0) relax(i, i - g.w - 1, k * Math.SQRT2)
        if (c < g.w - 1) relax(i, i - g.w + 1, k * Math.SQRT2)
      }
    }
  }
  for (let r = g.h - 1; r >= 0; r--) {
    const k = cellKm(g.r0 + r)
    for (let c = g.w - 1; c >= 0; c--) {
      const i = r * g.w + c
      if (c < g.w - 1) relax(i, i + 1, k)
      if (r < g.h - 1) {
        relax(i, i + g.w, k)
        if (c < g.w - 1) relax(i, i + g.w + 1, k * Math.SQRT2)
        if (c > 0) relax(i, i + g.w - 1, k * Math.SQRT2)
      }
    }
  }
  for (let i = 0; i < label.length; i++) if ((dist[i] as number) > maxKm) label[i] = NONE
  return label
}

/**
 * The islands of the region: land joined by edges and corners, up to {@link ISLAND_MAX_CELLS}, away from its edge.
 * @param g - the region
 * @param land - the region's land
 * @returns each island's cells
 */
function islandsOf(g: Region, land: Uint8Array): number[][] {
  const seen = new Uint8Array(g.w * g.h)
  const found: number[][] = []
  for (let start = 0; start < land.length; start++) {
    if (seen[start] || !land[start]) continue
    const cells: number[] = []
    const stack = [start]
    seen[start] = 1
    let edge = false
    while (stack.length > 0) {
      const i = stack.pop() as number
      cells.push(i)
      const c = i % g.w
      const r = Math.floor(i / g.w)
      if (c === 0 || r === 0 || c === g.w - 1 || r === g.h - 1) edge = true
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc
          const nr = r + dr
          if (nc < 0 || nr < 0 || nc >= g.w || nr >= g.h) continue
          const n = nr * g.w + nc
          if (seen[n] || !land[n]) continue
          seen[n] = 1
          stack.push(n)
        }
      }
    }
    if (!edge && cells.length <= ISLAND_MAX_CELLS) found.push(cells)
  }
  return found
}

/**
 * The most frequent polity among some cells, ignoring {@link NONE}.
 * @param cells - the cells
 * @param labels - a polity per cell
 * @returns the polity, or NONE when no cell has one
 */
function majority(cells: number[], labels: Int16Array): number {
  const counts = new Map<number, number>()
  for (const i of cells) {
    const p = labels[i] as number
    if (p !== NONE) counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  let best = NONE
  let most = 0
  for (const [p, n] of counts) {
    if (n > most) {
      most = n
      best = p
    }
  }
  return best
}

/**
 * Douglas–Peucker on an open or closed run.
 * @param points - the run, in cells
 * @param tolerance - the tolerance, in cells
 * @returns the points kept
 */
function simplify(points: UvPoint[], tolerance: number): UvPoint[] {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [a, b] = stack.pop() as [number, number]
    const pa = points[a] as UvPoint
    const pb = points[b] as UvPoint
    let worst = 0
    let at = -1
    for (let i = a + 1; i < b; i++) {
      const p = points[i] as UvPoint
      const dx = pb.u - pa.u
      const dy = pb.v - pa.v
      const len = Math.hypot(dx, dy)
      const d = len === 0 ? Math.hypot(p.u - pa.u, p.v - pa.v) : Math.abs(dy * p.u - dx * p.v + pb.u * pa.v - pb.v * pa.u) / len
      if (d > worst) {
        worst = d
        at = i
      }
    }
    if (worst > tolerance && at > 0) {
      keep[at] = 1
      stack.push([a, at], [at, b])
    }
  }
  return points.filter((_, i) => keep[i])
}

/**
 * The points a polity's zone costs: its outline traced on the region's grid, simplified.
 * @param g - the region
 * @param zone - the polity per cell
 * @param p - the polity
 * @returns the outline's points, simplified
 */
function outlinePoints(g: Region, zone: Int16Array, p: number): number {
  const segments = createFieldCoastlineSource({
    width: g.w,
    height: g.h,
    level: 0.5,
    valueAt: (x, y) => (zone[Math.round(y) * g.w + Math.round(x)] === p ? 1 : 0),
  }).load()
  return chainSegments(segments).reduce((sum, contour) => sum + simplify(contour.points, SIMPLIFY_CELLS / g.w).length, 0)
}

/**
 * A hex colour as three bytes.
 * @param hex - `#rrggbb`
 * @returns red, green, blue
 */
const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

const SEA: [number, number, number] = [214, 205, 178]

const widest = Math.max(...WIDTHS)
for (const [name, box] of Object.entries(REGIONS)) {
  const g = regionOf(box, widest)
  const land = landOf(g)
  const owner = rasterOwners(g)
  const seed = new Int16Array(owner.length).fill(NONE)
  for (let i = 0; i < owner.length; i++) if (land[i] && owner[i] !== NONE) seed[i] = owner[i] as number
  const islands = islandsOf(g, land)
  const today = islands.map((cells) => majority(cells, seed))
  const split = islands.filter((cells) => new Set(cells.map((i) => seed[i]).filter((p) => p !== NONE)).size > 1).length
  console.warn(`\n${name}: ${String(g.w)}×${String(g.h)} cells, ${String(islands.length)} islands; as drawn: ${String(today.filter((p) => p === NONE).length)} without a polity, ${String(split)} split between two`)
  for (const width of WIDTHS) {
    const zone = nearest(g, seed, width)
    const after = islands.map((cells, k) => (today[k] !== NONE ? (today[k] as number) : majority(cells, zone)))
    const changed = after.filter((p, k) => p !== today[k]).length
    const orphans = after.filter((p) => p === NONE).length
    // An island's every cell takes its polity, so the zone carries it whole.
    for (let k = 0; k < islands.length; k++) for (const i of islands[k] as number[]) zone[i] = after[k] as number
    const present = [...new Set(Array.from(zone).filter((p) => p !== NONE))]
    const points = present.reduce((sum, p) => sum + outlinePoints(g, zone, p), 0)
    console.warn(`  ${String(width)} km: ${String(changed)} islands given a polity (none had one), ${String(orphans)} left without · ${String(present.length)} polities · outlines ${String(points)} points`)
    if (width !== 10) continue
    const image = new Uint8Array(g.w * g.h * 3)
    const changedCells = new Uint8Array(g.w * g.h)
    const orphanCells = new Uint8Array(g.w * g.h)
    islands.forEach((cells, k) => {
      if (after[k] !== today[k]) for (const i of cells) changedCells[i] = 1
      if (after[k] === NONE) for (const i of cells) orphanCells[i] = 1
    })
    for (let i = 0; i < zone.length; i++) {
      const p = zone[i] as number
      let px: [number, number, number] = SEA
      if (p !== NONE) {
        const c = rgb(colourOf.get(polityIds[p] as string) ?? '#888888')
        px = land[i] ? c : [Math.round((c[0] + SEA[0] * 2) / 3), Math.round((c[1] + SEA[1] * 2) / 3), Math.round((c[2] + SEA[2] * 2) / 3)]
      } else if (land[i]) px = [120, 110, 95]
      if (changedCells[i]) px = [220, 30, 30]
      if (orphanCells[i]) px = [0, 0, 0]
      image.set(px, i * 3)
    }
    const ppm = join(outFolder, `${name}-10km.ppm`)
    writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${String(g.w)} ${String(g.h)}\n255\n`), Buffer.from(image)]))
    execFileSync('sips', ['-s', 'format', 'png', ppm, '--out', ppm.replace(/\.ppm$/, '.png')], { stdio: 'ignore' })
  }
}
