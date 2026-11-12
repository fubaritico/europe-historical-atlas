/**
 * Rebuild a year's islands and coastal seas from the land mask — CORE-421, the passes agreed with the dev on 2026-11-12:
 *
 * 1. **Inventory** — every island of the mask at its full precision, and who covers it as the year is drawn.
 * 2. **Clean** — every ring that holds nothing but islands of one polity (or none) is removed. A ring that touches the
 *    mainland, an island shared between two polities, or no land at all (a lake's hole) is kept as drawn.
 * 3. **Attribute** — each island keeps the polity that covered most of it; an uncovered one takes the polity of the
 *    nearest covered land within {@link SEA_KM}, else none (listed).
 * 4. **Sea surfaces** — every sea cell within {@link SEA_KM} of the shore takes the polity of the nearest held land, so
 *    two surfaces never overlap: a cell has one polity. A strip of coast no outline reaches (within {@link STRIP_KM} of
 *    the sea) takes it too, so the colour meets the coast.
 * 5. **Merge** — a polity's surface (its islands, its sea, its strip, less what its kept rings already hold) is traced
 *    on the mask's grid, simplified, and added to its claim as rings. Its land borders are not touched.
 * 6. **Check** — land covered by two polities that was not before, islands not held by their polity, the year reads.
 *
 * The fill is cut by the land mask in both applications, so the surfaces' outlines lie at sea and never show.
 *
 * Run from the repository root: pnpm exec tsx files/spikes/sea-zones/rebuild.ts <year folder> [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { chainSegments } from '../../../packages/core/src/data/coastlineChain'
import { createFieldCoastlineSource } from '../../../packages/core/src/data/coastlineSource'
import { createPackedLandMask, parseLandMaskMeta } from '../../../packages/core/src/data/landMask'
import { assembleAuthoredYear } from '../../../packages/core/src/data/yearConsistency'
import { parseYearPolities } from '../../../packages/core/src/data/yearSource'
import {
  horizontalToLongitude,
  latitudeToVertical,
  longitudeToHorizontal,
  verticalToLatitude,
} from '../../../packages/core/src/geo/mercator'
import polygonClipping from '../../../packages/core/node_modules/polygon-clipping/dist/polygon-clipping.esm.js'
import { formatYearJson } from '../../../packages/cartographer/src/devServer/yearJson'

import type { MultiPolygon, Polygon } from '../../../packages/core/node_modules/polygon-clipping'

import type { YearPolities } from '../../../packages/core/src/data/yearFormat'

/** How far from the shore a polity's sea reaches, in km. */
const SEA_KM = 15

/** How far inland a coast no outline reaches may be taken by the nearest polity, in km. */
const STRIP_KM = 3

/** Land bodies larger than this, in cells, are mainland (Great Britain, Ireland, Iceland among them). */
const ISLAND_MAX_CELLS = 20_000

/** Douglas–Peucker tolerance for a surface's outline, in cells — at sea, hidden by the mask. */
const SIMPLIFY_CELLS = 0.75

const NONE = -1
const SPLIT = -2

const folder = process.argv[2]
const write = process.argv.includes('--write')
if (!folder) throw new Error('usage: rebuild.ts <year folder> [--write]')

const maskBase = 'packages/atlas/public/masks/europe-land'
const meta = parseLandMaskMeta(JSON.parse(readFileSync(`${maskBase}.json`, 'utf8')), maskBase)
const mask = createPackedLandMask(meta, new Uint8Array(readFileSync(`${maskBase}.bin`)))
const { bbox } = meta
const W = meta.width
const H = meta.height
const N = W * H
const started = Date.now()
const say = (line: string): void => console.warn(`[${((Date.now() - started) / 1000).toFixed(1)} s] ${line}`)

const path = join(folder, 'polities.json')
const doc = parseYearPolities(JSON.parse(readFileSync(path, 'utf8')), path)
const polityIds = [...new Set(doc.claims.map((c) => c.polity))]

/** Fractional mask column of a longitude. */
const colOf = (lon: number): number => longitudeToHorizontal(lon, bbox) * (W - 1)
/** Fractional mask row of a latitude. */
const rowOf = (lat: number): number => latitudeToVertical(lat, bbox) * (H - 1)
/** A cell's side in km at a row. */
const cellKm = (row: number): number =>
  ((bbox.east - bbox.west) / (W - 1)) * 111.32 * Math.cos((verticalToLatitude(row / (H - 1), bbox) * Math.PI) / 180)

// --- the land, and its bodies ---------------------------------------------------------------------------------------
const land = new Uint8Array(N)
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (mask.isLand(c / (W - 1), r / (H - 1))) land[r * W + c] = 1
const body = new Int32Array(N).fill(-1)
const bodySize: number[] = []
{
  const stack = new Int32Array(N)
  for (let start = 0; start < N; start++) {
    if (!land[start] || body[start] !== -1) continue
    const id = bodySize.length
    let top = 0
    let size = 0
    stack[top++] = start
    body[start] = id
    while (top > 0) {
      const i = stack[--top] as number
      size += 1
      const c = i % W
      const r = (i - c) / W
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc
          const nr = r + dr
          if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue
          const n = nr * W + nc
          if (!land[n] || body[n] !== -1) continue
          body[n] = id
          stack[top++] = n
        }
      }
    }
    bodySize.push(size)
  }
}
const isIsland = (b: number): boolean => b >= 0 && (bodySize[b] as number) <= ISLAND_MAX_CELLS

/** Water bodies this large, in cells, are seas (the Caspian among them); smaller ones are lakes, never a coast. */
const SEA_MIN_CELLS = 50_000
/** One byte a cell: 1 over a sea. */
const sea = new Uint8Array(N)
{
  const seen = new Uint8Array(N)
  const stack = new Int32Array(N)
  for (let start = 0; start < N; start++) {
    if (land[start] || seen[start]) continue
    const cells: number[] = []
    let top = 0
    stack[top++] = start
    seen[start] = 1
    while (top > 0) {
      const i = stack[--top] as number
      cells.push(i)
      const c = i % W
      const r = (i - c) / W
      for (const n of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r > 0 ? i - W : -1, r < H - 1 ? i + W : -1]) {
        if (n < 0 || land[n] || seen[n]) continue
        seen[n] = 1
        stack[top++] = n
      }
    }
    if (cells.length >= SEA_MIN_CELLS) for (const i of cells) sea[i] = 1
  }
}
/**
 * Whether a point lies within two cells of a sea.
 * @param pt - longitude, latitude
 * @returns true by a sea, false inland or by a lake
 */
const bySea = (pt: readonly [number, number]): boolean => {
  const c0 = Math.round(longitudeToHorizontal(pt[0], bbox) * (W - 1))
  const r0 = Math.round(latitudeToVertical(pt[1], bbox) * (H - 1))
  for (let dr = -2; dr <= 2; dr++)
    for (let dc = -2; dc <= 2; dc++) {
      const c = c0 + dc
      const r = r0 + dr
      if (c >= 0 && r >= 0 && c < W && r < H && sea[r * W + c]) return true
    }
  return false
}
say(`land bodies: ${String(bodySize.length)}, islands: ${String(bodySize.filter((s) => s <= ISLAND_MAX_CELLS).length)}`)

// --- rasterising rings ----------------------------------------------------------------------------------------------
/**
 * Visit every cell whose centre lies inside a set of rings, by the even-odd rule.
 * @param rings - the rings, as anchor ids
 * @param anchors - the anchor table
 * @param visit - called with each cell inside
 */
function rasterRings(rings: readonly (readonly number[])[], anchors: readonly [number, number][], visit: (i: number) => void): void {
  const edges: number[] = []
  let top = Infinity
  let bottom = -Infinity
  for (const ring of rings) {
    for (let k = 0; k < ring.length; k++) {
      const a = anchors[ring[k] as number] as [number, number]
      const b = anchors[ring[(k + 1) % ring.length] as number] as [number, number]
      const ya = rowOf(a[1])
      const yb = rowOf(b[1])
      edges.push(colOf(a[0]), ya, colOf(b[0]), yb)
      top = Math.min(top, ya, yb)
      bottom = Math.max(bottom, ya, yb)
    }
  }
  const xs: number[] = []
  for (let r = Math.max(0, Math.ceil(top)); r <= Math.min(H - 1, Math.floor(bottom)); r++) {
    xs.length = 0
    for (let e = 0; e < edges.length; e += 4) {
      const y0 = edges[e + 1] as number
      const y1 = edges[e + 3] as number
      if (y0 <= r === y1 <= r) continue
      const x0 = edges[e] as number
      xs.push(x0 + ((r - y0) / (y1 - y0)) * ((edges[e + 2] as number) - x0))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] as number))
      const to = Math.min(W - 1, Math.floor(xs[k + 1] as number))
      for (let c = from; c <= to; c++) visit(r * W + c)
    }
  }
}

/**
 * Who covers each cell, and how many do.
 * @param year - the year
 * @returns the last polity covering a cell, and the count of polities covering it
 */
function coverage(year: YearPolities): { owner: Int16Array; count: Uint8Array } {
  const owner = new Int16Array(N).fill(NONE)
  const count = new Uint8Array(N)
  for (const claim of year.claims) {
    const p = polityIds.indexOf(claim.polity)
    rasterRings(claim.rings, year.anchors, (i) => {
      owner[i] = p
      if ((count[i] as number) < 255) count[i] = (count[i] as number) + 1
    })
  }
  return { owner, count }
}

/** The sources whose anchors the pen took from the coast. */
const coastSources = new Set(doc.sources.filter((s) => /natural earth/i.test(s.name)).map((s) => s.id))

// --- pass 1: the inventory ------------------------------------------------------------------------------------------
const before = coverage(doc)
/** Each island body's polity as drawn: the one covering most of it, SPLIT when two cover it, NONE when nobody does. */
const drawnOwner = new Map<number, number>()
{
  const tallies = new Map<number, Map<number, number>>()
  for (let i = 0; i < N; i++) {
    const b = body[i] as number
    if (!isIsland(b)) continue
    let tally = tallies.get(b)
    if (!tally) tallies.set(b, (tally = new Map()))
    const p = before.owner[i] as number
    if (p !== NONE) tally.set(p, (tally.get(p) ?? 0) + 1)
    if ((before.count[i] as number) > 1) tally.set(SPLIT, 1)
  }
  for (const [b, tally] of tallies) {
    if (tally.has(SPLIT) || tally.size > 1) drawnOwner.set(b, SPLIT)
    else drawnOwner.set(b, tally.size === 0 ? NONE : ([...tally.keys()][0] as number))
  }
  for (let b = 0; b < bodySize.length; b++) if (isIsland(b) && !drawnOwner.has(b)) drawnOwner.set(b, NONE)
}
const values = [...drawnOwner.values()]
say(`pass 1 — islands: ${String(values.length)}; held by one polity ${String(values.filter((v) => v >= 0).length)}, shared ${String(values.filter((v) => v === SPLIT).length)}, held by none ${String(values.filter((v) => v === NONE).length)}`)

// --- pass 2: clean ----------------------------------------------------------------------------------------------------
const kept: YearPolities = {
  ...doc,
  claims: doc.claims.map((claim) => {
    const rings = claim.rings.filter((ring) => {
      let islandCells = 0
      let keep = false
      rasterRings([ring], doc.anchors, (i) => {
        if (keep || !land[i]) return
        const b = body[i] as number
        if (!isIsland(b) || drawnOwner.get(b) === SPLIT) keep = true
        else islandCells += 1
      })
      if (keep) return true
      if (islandCells > 0) return false
      // No land cell's centre inside: an islet smaller than a cell — or a lake's shore — when every anchor came from the
      // coast; rebuilt by the sea surface, the lake hidden by the mask all the same. Otherwise kept as drawn.
      return !ring.every((id) => coastSources.has(doc.anchorSource[id] as number) && bySea(doc.anchors[id] as [number, number]))
    })
    // The open positions follow their rings; a ring removed takes its position with it.
    const open = (claim.open ?? [])
      .filter((k) => rings.includes(claim.rings[k] as number[]))
      .map((k) => rings.indexOf(claim.rings[k] as number[]))
    return open.length > 0 ? { ...claim, rings, open } : { polity: claim.polity, rings }
  }),
}
const removed = doc.claims.reduce((n, c, k) => n + c.rings.length - (kept.claims[k]?.rings.length ?? 0), 0)
say(`pass 2 — rings removed: ${String(removed)} of ${String(doc.claims.reduce((n, c) => n + c.rings.length, 0))}`)
const held = coverage(kept)

/** How far each cell lies from water — a sea or a lake — in km: the strip of coast no outline reaches. */
const waterDist = new Float32Array(N).fill(Infinity)
for (let i = 0; i < N; i++) if (!land[i]) waterDist[i] = 0
{
  const step = (i: number, j: number, s: number): void => {
    const d = (waterDist[j] as number) + s
    if (d < (waterDist[i] as number)) waterDist[i] = d
  }
  for (let r = 0; r < H; r++) {
    const k = cellKm(r)
    for (let c = 0; c < W; c++) {
      const i = r * W + c
      if (c > 0) step(i, i - 1, k)
      if (r > 0) step(i, i - W, k)
    }
  }
  for (let r = H - 1; r >= 0; r--) {
    const k = cellKm(r)
    for (let c = W - 1; c >= 0; c--) {
      const i = r * W + c
      if (c < W - 1) step(i, i + 1, k)
      if (r < H - 1) step(i, i + W, k)
    }
  }
}

/**
 * Land no polity holds, as a neighbour in the spread: water between a polity and such land is shared halfway, so a
 * border crosses a lake rather than following its far shore (the dev, 2026-11-12). Its coast strip is left out of it,
 * so the strip still goes to the polity whose outline stopped short of the shore.
 */
const UNCLAIMED = 32_000

// --- passes 3 and 4: attribute and spread ------------------------------------------------------------------------------
const label = new Int16Array(N).fill(NONE)
const dist = new Float32Array(N).fill(Infinity)
for (let i = 0; i < N; i++) {
  if (!land[i]) continue
  const b = body[i] as number
  const drawn = isIsland(b) ? (drawnOwner.get(b) as number) : NONE
  const p = drawn >= 0 ? drawn : (held.owner[i] as number)
  if (p !== NONE) {
    label[i] = p
    dist[i] = 0
  } else if (!isIsland(b) && (waterDist[i] as number) > STRIP_KM) {
    label[i] = UNCLAIMED
    dist[i] = 0
  }
}
/** One chamfer pass, carrying the nearest held land's polity. */
const relax = (i: number, j: number, step: number): void => {
  const d = (dist[j] as number) + step
  if (d < (dist[i] as number)) {
    dist[i] = d
    label[i] = label[j] as number
  }
}
for (let r = 0; r < H; r++) {
  const k = cellKm(r)
  for (let c = 0; c < W; c++) {
    const i = r * W + c
    if (c > 0) relax(i, i - 1, k)
    if (r > 0) {
      relax(i, i - W, k)
      if (c > 0) relax(i, i - W - 1, k * Math.SQRT2)
      if (c < W - 1) relax(i, i - W + 1, k * Math.SQRT2)
    }
  }
}
for (let r = H - 1; r >= 0; r--) {
  const k = cellKm(r)
  for (let c = W - 1; c >= 0; c--) {
    const i = r * W + c
    if (c < W - 1) relax(i, i + 1, k)
    if (r < H - 1) {
      relax(i, i + W, k)
      if (c < W - 1) relax(i, i + W + 1, k * Math.SQRT2)
      if (c > 0) relax(i, i + W - 1, k * Math.SQRT2)
    }
  }
}
for (let i = 0; i < N; i++) if ((dist[i] as number) > SEA_KM || label[i] === UNCLAIMED) label[i] = NONE

/** Each island's polity once attributed: as drawn, else the most frequent label of its cells, else none. */
const islandOwner = new Map<number, number>()
{
  const tallies = new Map<number, Map<number, number>>()
  for (let i = 0; i < N; i++) {
    const b = body[i] as number
    if (!isIsland(b) || drawnOwner.get(b) !== NONE) continue
    let tally = tallies.get(b)
    if (!tally) tallies.set(b, (tally = new Map()))
    const p = label[i] as number
    if (p !== NONE) tally.set(p, (tally.get(p) ?? 0) + 1)
  }
  for (const [b, p] of drawnOwner) {
    if (p !== NONE) {
      islandOwner.set(b, p)
      continue
    }
    const tally = tallies.get(b)
    let best = NONE
    let most = 0
    for (const [q, n] of tally ?? []) if (n > most) [best, most] = [q, n]
    islandOwner.set(b, best)
  }
}
const given = [...drawnOwner].filter(([b, p]) => p === NONE && (islandOwner.get(b) as number) >= 0).length
const orphans = [...islandOwner.values()].filter((p) => p === NONE).length
say(`pass 3 — islands given a polity: ${String(given)}; left without: ${String(orphans)}`)

/** The polity each cell's surface adds, NONE where it adds nothing. */
const surface = new Int16Array(N).fill(NONE)
for (let i = 0; i < N; i++) {
  const b = body[i] as number
  let p = NONE
  if (land[i]) {
    if (isIsland(b) && drawnOwner.get(b) !== SPLIT) p = islandOwner.get(b) as number
    else if (held.owner[i] === NONE && (waterDist[i] as number) <= STRIP_KM) p = label[i] as number
  } else p = label[i] as number
  // Never what the polity's kept rings hold already: two rings over one ground would make a hole by the even-odd rule.
  if (p !== NONE && held.owner[i] !== p) surface[i] = p
}
say('pass 4 — sea and lake surfaces laid')

// --- pass 5: merge ------------------------------------------------------------------------------------------------------
/**
 * Douglas–Peucker over a run of grid points.
 * @param pts - the points, in cells
 * @param tolerance - in cells
 * @returns the points kept
 */
function simplify(pts: [number, number][], tolerance: number): [number, number][] {
  if (pts.length < 4) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = 1
  keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length > 0) {
    const [a, b] = stack.pop() as [number, number]
    const [ax, ay] = pts[a] as [number, number]
    const [bx, by] = pts[b] as [number, number]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    let worst = 0
    let at = -1
    for (let k = a + 1; k < b; k++) {
      const [px, py] = pts[k] as [number, number]
      const d = len === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len
      if (d > worst) [worst, at] = [d, k]
    }
    if (worst > tolerance && at > 0) {
      keep[at] = 1
      stack.push([a, at], [at, b])
    }
  }
  return pts.filter((_, k) => keep[k])
}

const SEA_SOURCE = Math.max(...doc.sources.map((s) => s.id)) + 1
/**
 * Trace a polity's sea surface (its islands, its sea, its strip) as polygons in degrees.
 * @param p - the polity
 * @returns the closed contours, outer ones and holes alike
 */
function traceSurface(p: number): [number, number][][] {
  let [c0, r0, c1, r1] = [W, H, -1, -1]
  for (let i = 0; i < N; i++) {
    if (surface[i] !== p) continue
    const c = i % W
    const r = (i - c) / W
    if (c < c0) c0 = c
    if (c > c1) c1 = c
    if (r < r0) r0 = r
    if (r > r1) r1 = r
  }
  if (c1 < 0) return []
  const bw = c1 - c0 + 3
  const bh = r1 - r0 + 3
  const segments = createFieldCoastlineSource({
    width: bw,
    height: bh,
    level: 0.5,
    valueAt: (x, y) => {
      const c = c0 - 1 + x
      const r = r0 - 1 + y
      return c < 0 || r < 0 || c >= W || r >= H ? 0 : surface[r * W + c] === p ? 1 : 0
    },
  }).load()
  const rings: [number, number][][] = []
  for (const contour of chainSegments(segments)) {
    if (!contour.closed) continue
    const grid = contour.points.map((q) => [c0 - 1 + q.u * (bw - 1), r0 - 1 + q.v * (bh - 1)] as [number, number])
    // A tiny islet's contour is kept whole: simplified, its four points would fall under three.
    const ring = grid.length <= 8 ? grid : simplify([...grid, grid[0] as [number, number]], SIMPLIFY_CELLS).slice(0, -1)
    if (ring.length < 3) continue
    rings.push(ring.map(([x, y]) => [horizontalToLongitude(x / (W - 1), bbox), verticalToLatitude(y / (H - 1), bbox)]))
  }
  return rings
}

/**
 * A set of rings as the region they fill by the even-odd rule.
 * @param rings - the rings, in degrees, unclosed
 * @returns the region
 */
function evenOdd(rings: [number, number][][]): MultiPolygon {
  const polys: Polygon[] = rings.filter((r) => r.length >= 3).map((r) => [[...r, r[0] as [number, number]]])
  if (polys.length === 0) return []
  return polys.length === 1 ? [polys[0] as Polygon] : polygonClipping.xor(polys[0] as Polygon, ...polys.slice(1))
}

const result: YearPolities = {
  ...kept,
  sources: [...kept.sources, { id: SEA_SOURCE, name: 'sea surface computed from the land mask (CORE-421)', licence: 'fact' }],
  anchors: kept.anchors.map((a) => [a[0], a[1]] as [number, number]),
  anchorSource: [...kept.anchorSource],
  claims: kept.claims.map((c) => ({ ...c, rings: c.rings.map((r) => [...r]) })),
}
/** Every existing anchor by its exact position, so a point the union kept is the same anchor — sharing kept. */
const byPosition = new Map<string, number>()
result.anchors.forEach((a, id) => {
  const key = `${String(a[0])},${String(a[1])}`
  if (!byPosition.has(key)) byPosition.set(key, id)
})
/**
 * The anchor at a position: an existing one when there is one, else a new one.
 * @param pt - the position
 * @returns its id
 */
function anchorAt(pt: [number, number]): number {
  const key = `${String(pt[0])},${String(pt[1])}`
  const found = byPosition.get(key)
  if (found !== undefined) return found
  const rounded: [number, number] = [Number(pt[0].toFixed(6)), Number(pt[1].toFixed(6))]
  result.anchors.push(rounded)
  result.anchorSource.push(SEA_SOURCE)
  const id = result.anchors.length - 1
  byPosition.set(key, id)
  return id
}

let merged = 0
let slivers = 0
let failed = 0
let added = 0
polityIds.forEach((polity, p) => {
  const claim = result.claims.find((c) => c.polity === polity)
  if (!claim) return
  const sea = traceSurface(p)
  if (sea.length === 0) return
  const drawn = claim.rings.map((ring) => ring.map((id) => result.anchors[id] as [number, number]))
  let union: MultiPolygon
  try {
    union = polygonClipping.union(evenOdd(drawn), evenOdd(sea))
  } catch (error) {
    // Said, and the polity left as drawn with its surface beside it: two rings over one sea, which the mask hides.
    console.error(`[rebuild] ${polity}: the union failed (${error instanceof Error ? error.message : String(error)}) — its surface added beside`)
    failed += 1
    for (const ring of sea) claim.rings.push(ring.map(anchorAt))
    return
  }
  const inGround = (i: number): boolean => held.owner[i] === p || surface[i] === p
  /** Whether a ring encloses the centre of a land cell that passes a test. */
  const encloses = (ring: [number, number][], test: (i: number) => boolean): boolean => {
    let found = false
    rasterRings([ring.map((_, k) => k)], ring, (i) => {
      if (!found && land[i] && test(i)) found = true
    })
    return found
  }
  const rings: number[][] = []
  for (const polygon of union) {
    const [outer, ...holes] = polygon.map((ring) => ring.slice(0, -1) as [number, number][])
    // Clean after the union: a piece holding none of the polity's land is a sliver between the drawn coast and the
    // surface's, at sea — the mask hides it; a hole holding no one else's land is one too.
    if (!outer || outer.length < 3 || !encloses(outer, inGround)) {
      slivers += 1 + holes.length
      continue
    }
    rings.push(outer.map(anchorAt))
    for (const hole of holes) {
      if (hole.length < 3 || !encloses(hole, (i) => !inGround(i))) {
        slivers += 1
        continue
      }
      rings.push(hole.map(anchorAt))
    }
  }
  added += rings.length - claim.rings.length
  claim.rings = rings
  // The union closes every outline: none is left open.
  delete claim.open
  merged += 1
})
say(`pass 5 — polities merged with their sea: ${String(merged)}; union failed, surface added beside: ${String(failed)}; rings gained: ${String(added)}; slivers dropped: ${String(slivers)}`)

// --- pass 6: check --------------------------------------------------------------------------------------------------------
const after = coverage(result)
let newCollisions = 0
let lost = 0
for (let i = 0; i < N; i++) {
  if (!land[i]) continue
  if ((after.count[i] as number) > 1 && (before.count[i] as number) <= 1) newCollisions += 1
  if (before.owner[i] !== NONE && (after.count[i] as number) === 0) lost += 1
}
const islandMiss = new Set<number>()
for (let i = 0; i < N; i++) {
  const b = body[i] as number
  if (!isIsland(b) || drawnOwner.get(b) === SPLIT) continue
  const p = islandOwner.get(b) as number
  if (p !== NONE && after.owner[i] !== p) islandMiss.add(b)
}
say(`pass 6 — land cells newly covered by two polities: ${String(newCollisions)}; islands not wholly held by their polity: ${String(islandMiss.size)}; land cells lost: ${String(lost)}`)
{
  // Which pairs of polities newly share land, and how much — the first two covering a cell.
  const first = new Int16Array(N).fill(NONE)
  const pairs = new Map<string, number>()
  for (const claim of result.claims) {
    const p = polityIds.indexOf(claim.polity)
    const mine = new Uint8Array(0)
    void mine
    rasterRings(claim.rings, result.anchors, (i) => {
      if (!land[i] || (before.count[i] as number) > 1) return
      const f = first[i] as number
      if (f === NONE) first[i] = p
      else if (f !== p) {
        const key = `${polityIds[f] as string} / ${claim.polity}`
        pairs.set(key, (pairs.get(key) ?? 0) + 1)
      }
    })
  }
  for (const [key, n] of [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 12)) say(`  collision ${key}: ${String(n)} cells`)
}
for (const id of (process.env.DEBUG_POLITIES ?? '').split(',').filter(Boolean)) {
  const k = doc.claims.findIndex((c) => c.polity === id)
  const was = doc.claims[k]
  const now = result.claims[k]
  say(`  ${id}: rings ${String(was?.rings.length)} → kept ${String(kept.claims[k]?.rings.length)} → ${String(now?.rings.length)}; open ${JSON.stringify(was?.open ?? [])} → ${JSON.stringify(now?.open ?? [])}; sizes ${JSON.stringify(was?.rings.map((r) => r.length))} → ${JSON.stringify(now?.rings.map((r) => r.length))}`)
}
const registry = JSON.parse(readFileSync(join(folder, 'registry.json'), 'utf8'))
const borders = JSON.parse(readFileSync(join(folder, 'borders.json'), 'utf8'))
assembleAuthoredYear({ registry, polities: result, borders }, folder)
say('the year still reads')

/**
 * The year with the anchors no outline names any more taken out, the rest renumbered — what the Cartographer does at
 * its next save. Refused while a border run names anchors: its indices would have to follow, and none does today.
 * @param year - the year
 * @param runs - the border runs of the year's borders file
 * @returns the year, compacted
 */
function compact(year: YearPolities, runs: readonly unknown[]): YearPolities {
  if (runs.length > 0) {
    say('compaction skipped: a border run names anchors')
    return year
  }
  const used = [...new Set(year.claims.flatMap((c) => c.rings.flat()))].sort((a, b) => a - b)
  const index = new Map(used.map((id, k) => [id, k]))
  say(`compaction: ${String(year.anchors.length - used.length)} unused anchors removed, ${String(used.length)} kept`)
  return {
    ...year,
    anchors: used.map((id) => year.anchors[id] as [number, number]),
    anchorSource: used.map((id) => year.anchorSource[id] as number),
    claims: year.claims.map((c) => ({ ...c, rings: c.rings.map((r) => r.map((id) => index.get(id) as number)) })),
  }
}

if (write) {
  const compacted = compact(result, (borders as { runs?: unknown[] }).runs ?? [])
  assembleAuthoredYear({ registry, polities: compacted, borders }, folder)
  writeFileSync(path, formatYearJson(compacted))
  say(`written: ${path}`)
} else say('nothing written (dry run) — add --write')
