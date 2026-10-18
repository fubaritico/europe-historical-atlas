/**
 * How far a point is from a set of rings, **on the ground**, and on which side — the signed distance a
 * tribe's vanishing edge is drawn from (ATLAS-258, `files/plans/atlas/tribe-feather.md`).
 *
 * **Negative inside, positive outside**, inside read by the even-odd rule — the fills' rule in both
 * applications, so a ring inside another is a hole here as it is there.
 *
 * **In kilometres, through the projection's own scale.** The rings come in a grid's normalized `(u, v)`,
 * which is linear in Web Mercator. Mercator is conformal, so around a point it scales every direction
 * alike, by `R · cos φ`: the distance is measured in projected space and multiplied by that scale at the
 * point's latitude. Over the few tens of kilometres a feather spans, the scale's change is far below a
 * DEM cell — exact enough, and one formula for both applications.
 *
 * **Clamped to a reach**: beyond `reachKm` from every edge, the answer is `±reachKm`. A ramp narrower than
 * the reach cannot tell the two apart, and the clamp is what lets the edges be filed in buckets the size of
 * the reach, so a query reads only the edges near it instead of every edge of the ring.
 */

import { latitudeToMercatorY, verticalToLatitude } from './mercator'

import type { GeoBounds } from './mercator'

/** The WGS-84 equatorial radius in kilometres — Web Mercator's sphere. */
export const EARTH_RADIUS_KM = 6378.137

/** Degrees → radians. */
const DEG2RAD = Math.PI / 180

/** A point of a grid, normalized: `u` west→east, `v` north→south, both `0..1` over the grid's bounds. */
export interface GridPoint {
  /** West→east, `0..1`. */
  readonly u: number
  /** North→south, `0..1`. */
  readonly v: number
}

/** An edge in projected space: `x0, y0, x1, y1`. */
type Edge = readonly [number, number, number, number]

/**
 * The signed distance to a set of rings, as a function of a point — built once, asked many times.
 * **Asked inside the grid**, `0..1` on both axes — every caller asks over a box held within it. Outside it,
 * the edges filed are only those the grid's queries can reach, so a far point may miss an edge and read
 * `±reachKm` (SEC-001).
 * @param u - the point, west→east, `0..1`
 * @param v - the point, north→south, `0..1`
 * @returns kilometres on the ground, negative inside, clamped to `[-reachKm, reachKm]`
 */
export type SignedDistance = (u: number, v: number) => number

/**
 * Kilometres on the ground per unit of projected distance, at a grid row.
 * @param v - the row, north→south, `0..1`
 * @param bounds - the grid's geographic bounds
 * @returns the scale
 */
function kmPerProjectedUnit(v: number, bounds: GeoBounds): number {
  return EARTH_RADIUS_KM * Math.cos(verticalToLatitude(v, bounds) * DEG2RAD)
}

/**
 * The squared distance from a point to a segment, in the segment's own units — squared, so a query takes
 * one square root for its nearest edge rather than one per edge it reads.
 * @param x - the point's x
 * @param y - the point's y
 * @param edge - the segment
 * @returns the squared distance
 */
function squaredDistanceToEdge(x: number, y: number, edge: Edge): number {
  const [x0, y0, x1, y1] = edge
  const dx = x1 - x0
  const dy = y1 - y0
  const length2 = dx * dx + dy * dy
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / length2))
  const ex = x - (x0 + t * dx)
  const ey = y - (y0 + t * dy)
  return ex * ex + ey * ey
}

/**
 * Whether an edge crosses the ray going east from a point — the step of the even-odd test.
 * @param x - the point's x
 * @param y - the point's y
 * @param edge - the edge
 * @returns `true` when it crosses
 */
function crossesRay(x: number, y: number, edge: Edge): boolean {
  const [xi, yi, xj, yj] = edge
  return yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
}

/**
 * Every edge of a set of rings, in projected space; a ring closes on itself whether or not it repeats
 * its first point.
 * @param rings - the rings, in normalized grid coordinates
 * @param scaleX - projected units per unit of `u`
 * @param scaleY - projected units per unit of `v`
 * @returns the edges
 */
function projectedEdges(
  rings: readonly (readonly GridPoint[])[],
  scaleX: number,
  scaleY: number
): Edge[] {
  const edges: Edge[] = []
  for (const ring of rings) {
    if (ring.length < 2) continue
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j]
      const b = ring[i]
      if (a === undefined || b === undefined || (a.u === b.u && a.v === b.v)) continue
      edges.push([a.u * scaleX, a.v * scaleY, b.u * scaleX, b.v * scaleY])
    }
  }
  return edges
}

/** Buckets per row of the key: far more than a grid of a few hundred buckets across could use. */
const KEY_STRIDE = 1 << 20

/**
 * The key of a bucket — a number, not a string: a query reads up to a dozen buckets and runs once per vertex
 * or pixel, and building a string per bucket was most of its cost (measured 2026-10-18).
 * @param col - the bucket's column
 * @param row - its row
 * @returns the key
 */
function bucketKey(col: number, row: number): number {
  return row * KEY_STRIDE + col
}

/** Edges filed by bucket, and the bucket's size, in projected units. */
interface EdgeBuckets {
  /** The edges whose box touches each bucket, by {@link bucketKey}. */
  cells: Map<number, Edge[]>
  /** The edges spanning each row of buckets, for the even-odd ray. */
  rows: Map<number, Edge[]>
  /** A bucket's side. */
  size: number
}

/** The buckets a query can read, inclusive on both ends — the grid's extent grown by the reach. */
interface BucketRange {
  /** The westernmost column. */
  c0: number
  /** The easternmost column. */
  c1: number
  /** The northernmost row. */
  r0: number
  /** The southernmost row. */
  r1: number
}

/**
 * The buckets a query inside the grid can read: its own, and every bucket within the widest radius any row
 * looks over (the reach converted at the grid's edge farthest from the equator, where a kilometre spans the
 * most of it).
 *
 * **What makes filing bounded** (SEC-001, 2026-10-18): an edge is filed only under the buckets of this
 * range, so one anchor at a longitude of 1e9 files an edge under a few hundred buckets rather than looping
 * a billion times — and hangs no page. An edge crossing the map is still filed wherever it crosses, so every
 * query inside the grid reads exactly the edges it read before.
 * @param scaleX - projected units per unit of `u`
 * @param scaleY - projected units per unit of `v`
 * @param size - a bucket's side, in projected units
 * @param radius - the widest radius a query looks over, in projected units
 * @returns the range, inclusive
 */
function reachableBuckets(
  scaleX: number,
  scaleY: number,
  size: number,
  radius: number
): BucketRange {
  return {
    c0: Math.floor(-radius / size),
    c1: Math.floor((scaleX + radius) / size),
    r0: Math.floor(-radius / size),
    r1: Math.floor((scaleY + radius) / size),
  }
}

/**
 * File every edge under each bucket its box touches, and under each row of buckets it spans — within the
 * buckets a query can reach, never beyond.
 * @param edges - the edges
 * @param size - a bucket's side, in projected units, above zero
 * @param range - the buckets a query can read ({@link reachableBuckets})
 * @returns the buckets
 */
function fileEdges(edges: readonly Edge[], size: number, range: BucketRange): EdgeBuckets {
  const cells = new Map<number, Edge[]>()
  const rows = new Map<number, Edge[]>()
  for (const edge of edges) {
    const [x0, y0, x1, y1] = edge
    // `Math.max`/`Math.min` also hold an infinite end to the range; a NaN end runs no loop at all.
    const c0 = Math.max(range.c0, Math.floor(Math.min(x0, x1) / size))
    const c1 = Math.min(range.c1, Math.floor(Math.max(x0, x1) / size))
    const r0 = Math.max(range.r0, Math.floor(Math.min(y0, y1) / size))
    const r1 = Math.min(range.r1, Math.floor(Math.max(y0, y1) / size))
    for (let row = r0; row <= r1; row++) {
      const filedRow = rows.get(row) ?? []
      filedRow.push(edge)
      rows.set(row, filedRow)
      for (let col = c0; col <= c1; col++) {
        const key = bucketKey(col, row)
        const filed = cells.get(key) ?? []
        filed.push(edge)
        cells.set(key, filed)
      }
    }
  }
  return { cells, rows, size }
}

/**
 * The nearest edge's distance within a radius, or `Infinity` when none is that close.
 * @param buckets - the filed edges
 * @param x - the point's x
 * @param y - the point's y
 * @param radius - how far to look, in projected units
 * @returns the distance, in projected units
 */
function nearestWithin(buckets: EdgeBuckets, x: number, y: number, radius: number): number {
  const { cells, size } = buckets
  let nearest2 = Infinity
  const c0 = Math.floor((x - radius) / size)
  const c1 = Math.floor((x + radius) / size)
  const r0 = Math.floor((y - radius) / size)
  const r1 = Math.floor((y + radius) / size)
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      for (const edge of cells.get(bucketKey(col, row)) ?? [])
        nearest2 = Math.min(nearest2, squaredDistanceToEdge(x, y, edge))
    }
  }
  return Math.sqrt(nearest2)
}

/**
 * The northernmost row any ring reaches.
 * @param rings - the rings
 * @returns the smallest `v`, clamped to the grid; `0` for no point
 */
function northernmost(rings: readonly (readonly GridPoint[])[]): number {
  let v = 1
  for (const ring of rings) for (const point of ring) v = Math.min(v, point.v)
  return Math.max(0, v)
}

/**
 * Build the signed distance to a set of rings.
 *
 * **No rings, or rings with no edge, answer `+reachKm` everywhere**: nothing encloses the point, and
 * nothing is near it — the true answer, not a substitute.
 * @param rings - the rings, in the grid's normalized coordinates, outer and holes alike
 * @param bounds - the grid's geographic bounds, which the rings were projected against
 * @param reachKm - beyond this from every edge, the answer is `±reachKm`; above zero
 * @returns the signed distance, in kilometres on the ground
 * @throws when the reach is not a positive finite number — a bucket of no size, or of infinite size, would
 *   either never end or read every edge, and neither is a reach anyone chose
 */
export function signedDistanceField(
  rings: readonly (readonly GridPoint[])[],
  bounds: GeoBounds,
  reachKm: number
): SignedDistance {
  if (!(reachKm > 0) || !Number.isFinite(reachKm))
    throw new Error(
      `signed distance: the reach must be a positive number of km, got ${String(reachKm)}`
    )
  const scaleX = (bounds.east - bounds.west) * DEG2RAD
  const scaleY = latitudeToMercatorY(bounds.north) - latitudeToMercatorY(bounds.south)
  const edges = projectedEdges(rings, scaleX, scaleY)
  // A bucket the size of the reach at the rings' northernmost point, so a query near them reads three
  // buckets on a side; one farther north looks wider, over more buckets, and is still exact.
  const size = reachKm / kmPerProjectedUnit(northernmost(rings), bounds)
  // The widest radius any row of the grid looks over: where a kilometre spans the most of it, at whichever
  // edge lies farther from the equator.
  const widest = reachKm / Math.min(kmPerProjectedUnit(0, bounds), kmPerProjectedUnit(1, bounds))
  const buckets = fileEdges(edges, size, reachableBuckets(scaleX, scaleY, size, widest))
  // The scale of the last row asked: a raster asks row by row, so one latitude per row rather than per point.
  let lastV = Number.NaN
  let lastScale = Number.NaN
  return (u: number, v: number): number => {
    // A position that is not a number stays one: read as "far outside" it would be a plausible answer,
    // the silent substitution `rules/error-handling.md` refuses — a NaN shows at once on screen.
    if (!Number.isFinite(u) || !Number.isFinite(v)) return Number.NaN
    const x = u * scaleX
    const y = v * scaleY
    if (v !== lastV) {
      lastV = v
      lastScale = kmPerProjectedUnit(v, bounds)
    }
    const kmPerUnit = lastScale
    const nearestKm = nearestWithin(buckets, x, y, reachKm / kmPerUnit) * kmPerUnit
    let inside = false
    for (const edge of buckets.rows.get(Math.floor(y / size)) ?? [])
      if (crossesRay(x, y, edge)) inside = !inside
    const km = Math.min(reachKm, nearestKm)
    return inside ? -km : km
  }
}

/** A box in a grid's normalized coordinates. */
export interface GridBox {
  /** Western edge, `0..1`. */
  u0: number
  /** Northern edge, `0..1`. */
  v0: number
  /** Eastern edge, `0..1`. */
  u1: number
  /** Southern edge, `0..1`. */
  v1: number
}

/**
 * The box of a set of rings, grown by a margin on the ground on every side and held within the grid — the
 * ground a fade reaching `marginKm` past the outline can touch.
 *
 * The margin is converted at the grown box's northern edge, where a kilometre spans the most of the grid,
 * so the box is never short of the margin anywhere along its height.
 * @param rings - the rings, in the grid's normalized coordinates
 * @param bounds - the grid's geographic bounds
 * @param marginKm - how far to grow it, in kilometres; zero or more
 * @returns the box, or `null` for rings with no point
 */
export function paddedBox(
  rings: readonly (readonly GridPoint[])[],
  bounds: GeoBounds,
  marginKm: number
): GridBox | null {
  let u0 = Infinity
  let v0 = Infinity
  let u1 = -Infinity
  let v1 = -Infinity
  for (const ring of rings) {
    for (const { u, v } of ring) {
      u0 = Math.min(u0, u)
      v0 = Math.min(v0, v)
      u1 = Math.max(u1, u)
      v1 = Math.max(v1, v)
    }
  }
  if (u0 > u1 || v0 > v1) return null
  const scaleX = (bounds.east - bounds.west) * DEG2RAD
  const scaleY = latitudeToMercatorY(bounds.north) - latitudeToMercatorY(bounds.south)
  // Grown once at the rings' own northern edge, then measured again at the grown edge, which is farther
  // north and so needs a little more: two steps leave it short by far less than a DEM cell.
  let north = v0
  for (let step = 0; step < 2; step++)
    north = v0 - marginKm / kmPerProjectedUnit(Math.max(0, north), bounds) / scaleY
  const projected = marginKm / kmPerProjectedUnit(Math.max(0, north), bounds)
  const du = projected / scaleX
  const dv = projected / scaleY
  return {
    u0: Math.max(0, u0 - du),
    v0: Math.max(0, v0 - dv),
    u1: Math.min(1, u1 + du),
    v1: Math.min(1, v1 + dv),
  }
}

/**
 * Whether two boxes share any ground, edges included.
 * @param a - one box
 * @param b - the other
 * @returns `true` when they overlap
 */
export function boxesOverlap(a: GridBox, b: GridBox): boolean {
  return a.u0 <= b.u1 && b.u0 <= a.u1 && a.v0 <= b.v1 && b.v0 <= a.v1
}

/**
 * The signed distance to the union of several sets of rings — several polities' ground: negative inside any
 * of them. The smallest of their own signed distances, which is exact outside them all and has the right sign
 * everywhere; each set keeps its own even-odd rule, so two polities that overlap are not read as a hole.
 *
 * **Only the sets near `within` are kept**: a set whose box, grown by the reach, misses it can only answer
 * `+reachKm` there.
 * @param sets - each polity's rings, in the grid's normalized coordinates
 * @param bounds - the grid's geographic bounds
 * @param reachKm - the clamp, as {@link signedDistanceField}'s
 * @param within - the box the distance will be asked over
 * @returns the signed distance; `+reachKm` everywhere when no set is near
 */
export function unionDistanceField(
  sets: readonly (readonly (readonly GridPoint[])[])[],
  bounds: GeoBounds,
  reachKm: number,
  within: GridBox
): SignedDistance {
  const fields = sets.flatMap((rings) => {
    const box = paddedBox(rings, bounds, reachKm)
    return box !== null && boxesOverlap(box, within)
      ? [signedDistanceField(rings, bounds, reachKm)]
      : []
  })
  // Asked for its reach even with no set near, so a bad reach is refused the same way either way.
  const nobody = signedDistanceField([], bounds, reachKm)
  return (u: number, v: number): number =>
    fields.reduce((nearest, field) => Math.min(nearest, field(u, v)), nobody(u, v))
}
