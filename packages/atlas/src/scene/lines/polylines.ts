/**
 * The geometry of a chain of points on the map's grid: whether it closes on itself, how it is shifted sideways
 * (the doubled border), and how it is cut into the pairs of points a line layer draws.
 */

import type { UvSegment } from './lineLayer'
import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'

/**
 * How far a mitred corner may be pushed out, as a multiple of the offset distance.
 *
 * Offsetting a chain moves each vertex along the bisector of its two edges, and the sharper the corner
 * the further out that lands — at the limit, a hairpin sends it to infinity. Clamping trades an exact
 * offset at sharp corners, where nobody can see it, for a line that cannot spike off the map.
 */
const MAX_MITER = 4

/**
 * The perpendicular of a segment, unit length, or a zero vector when the two points coincide.
 * @param from - the segment's start
 * @param to - the segment's end
 * @returns the left-hand normal
 */
function normalOf(from: UvPoint, to: UvPoint): UvPoint {
  const du = to.u - from.u
  const dv = to.v - from.v
  const length = Math.hypot(du, dv)
  if (length < 1e-12) return { u: 0, v: 0 }
  return { u: -dv / length, v: du / length }
}

/**
 * Whether a chain closes on itself — its last point repeating its first.
 *
 * Three points cannot enclose anything once the repeat is discounted, so a ring needs more than that.
 * @param points - the chain
 * @returns `true` when it is a ring
 */
export function isClosedChain(points: readonly UvPoint[]): boolean {
  const head = points[0]
  const tail = points[points.length - 1]
  return points.length > 3 && !!head && !!tail && head.u === tail.u && head.v === tail.v
}

/**
 * The two points either side of a vertex — wrapping around a ring, clamped at the end of an open chain.
 * @param ring - the chain, without its repeated closing point
 * @param index - the vertex
 * @param closed - whether the chain wraps
 * @returns the neighbours, or `null` where the chain is too short to have them
 */
export function ringNeighbours(
  ring: readonly UvPoint[],
  index: number,
  closed: boolean
): { previous: UvPoint; next: UvPoint } | null {
  const count = ring.length
  const previous = ring[closed ? (index - 1 + count) % count : Math.max(0, index - 1)]
  const next = ring[closed ? (index + 1) % count : Math.min(count - 1, index + 1)]
  return previous && next ? { previous, next } : null
}

/**
 * The direction and reach of the mitre at one vertex.
 *
 * The vertex moves along the bisector of its two edges, scaled so the offset line stays parallel to the
 * original through the corner, and clamped by {@link MAX_MITER} so a hairpin cannot throw the vertex
 * across the map. At the end of an open chain one normal is zero, so the other one decides alone.
 * @param previous - the point before
 * @param here - the vertex
 * @param next - the point after
 * @returns the unit bisector and the mitre scale
 */
export function mitreAt(
  previous: UvPoint,
  here: UvPoint,
  next: UvPoint
): { u: number; v: number; scale: number } {
  // The normals of the two edges meeting here; their sum points along the corner's bisector.
  const before = normalOf(previous, here)
  const after = normalOf(here, next)
  let mu = before.u + after.u
  let mv = before.v + after.v
  const length = Math.hypot(mu, mv)
  const flat = after.u === 0 && after.v === 0
  if (length < 1e-9) {
    // An end of an open chain (one normal is zero), or a reversal: take whichever normal exists.
    const only = flat ? before : after
    mu = only.u
    mv = only.v
  } else {
    mu /= length
    mv /= length
  }
  // How far along the bisector keeps the offset parallel: 1 / cos of its angle to an edge normal, capped.
  const reference = flat ? before : after
  const cosine = mu * reference.u + mv * reference.v
  return { u: mu, v: mv, scale: cosine > 1e-6 ? Math.min(MAX_MITER, 1 / cosine) : MAX_MITER }
}

/**
 * Shift a chain of points sideways by a fixed distance — the geometry behind a doubled border.
 *
 * Endpoints of an open chain use their single edge's normal; a closed chain is offset cyclically, or its
 * seam would show.
 * @param points - the chain
 * @param distance - how far to shift, in normalized grid units; negative shifts the other way
 * @returns the shifted chain
 */
export function offsetPolyline(points: readonly UvPoint[], distance: number): UvPoint[] {
  if (points.length < 2 || distance === 0) return [...points]
  // A ring is walked without its repeated closing point, so the seam is a corner like any other.
  const closed = isClosedChain(points)
  const ring = closed ? points.slice(0, -1) : points
  // Each vertex pushed out along its mitre by the distance.
  const out: UvPoint[] = []
  for (let i = 0; i < ring.length; i++) {
    const here = ring[i]
    const pair = ringNeighbours(ring, i, closed)
    if (!here || !pair) continue
    const mitre = mitreAt(pair.previous, here, pair.next)
    out.push({
      u: here.u + mitre.u * distance * mitre.scale,
      v: here.v + mitre.v * distance * mitre.scale,
    })
  }
  // A ring closed again by repeating its first shifted point.
  const first = out[0]
  if (closed && first) out.push(first)
  return out
}

/**
 * Explode chains into the pairs of points a line layer draws, run by run so a dash pattern keeps flowing
 * along each one.
 * @param lines - the chains
 * @returns the stretches
 */
export function polylinesToSegments(lines: readonly (readonly UvPoint[])[]): UvSegment[] {
  const segments: UvSegment[] = []
  for (const line of lines)
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i]
      const b = line[i + 1]
      if (a && b) segments.push([a, b])
    }
  return segments
}
