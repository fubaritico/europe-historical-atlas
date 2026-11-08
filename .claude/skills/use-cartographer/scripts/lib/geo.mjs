/**
 * Plane geometry on longitude/latitude, at the scale of a border — pure functions, no file, no state.
 *
 * Distances are computed on a local equirectangular projection (longitude shrunk by the cosine of the latitude).
 * Between two points a few hundred kilometres apart the error stays under a percent — far below what a border drawn
 * from witness cities can claim — and it keeps every function a few lines long.
 */

/** Kilometres in one degree of latitude (and of longitude at the equator). */
export const KM_PER_DEGREE = 111.32

/**
 * A point as the year files and the CMS write it.
 * @typedef {readonly [number, number]} LonLat
 */

/**
 * Project a point to kilometres on a plane tangent at a reference latitude.
 * @param {LonLat} point - the point, in degrees
 * @param {number} refLat - the latitude where the plane touches, in degrees
 * @returns {[number, number]} x and y in kilometres
 */
export function toKm(point, refLat) {
  return [point[0] * KM_PER_DEGREE * Math.cos((refLat * Math.PI) / 180), point[1] * KM_PER_DEGREE]
}

/**
 * The distance between two points.
 * @param {LonLat} a - one point
 * @param {LonLat} b - the other
 * @returns {number} the distance in kilometres
 */
export function kmBetween(a, b) {
  const ref = (a[1] + b[1]) / 2
  const [ax, ay] = toKm(a, ref)
  const [bx, by] = toKm(b, ref)
  return Math.hypot(bx - ax, by - ay)
}

/**
 * The distance from a point to a segment.
 * @param {LonLat} p - the point
 * @param {LonLat} a - one end of the segment
 * @param {LonLat} b - the other end
 * @returns {number} the shortest distance in kilometres
 */
export function kmToSegment(p, a, b) {
  const ref = p[1]
  const [px, py] = toKm(p, ref)
  const [ax, ay] = toKm(a, ref)
  const [bx, by] = toKm(b, ref)
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

/**
 * Whether a point lies inside a closed ring, by the even-odd rule.
 * @param {LonLat} p - the point
 * @param {readonly LonLat[]} ring - the ring's points, the closing segment implied
 * @returns {boolean} `true` inside
 */
export function insideRing(p, ring) {
  const [x, y] = p
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * The angle a line makes at a vertex — 180° straight on, near 0° a spike.
 * @param {LonLat} previous - the vertex before
 * @param {LonLat} at - the vertex
 * @param {LonLat} next - the vertex after
 * @returns {number} the angle in degrees, or `NaN` when a leg has no length
 */
export function angleAt(previous, at, next) {
  const [ax, ay] = toKm(previous, at[1])
  const [ox, oy] = toKm(at, at[1])
  const [bx, by] = toKm(next, at[1])
  const u = [ax - ox, ay - oy]
  const v = [bx - ox, by - oy]
  const lengths = Math.hypot(...u) * Math.hypot(...v)
  if (lengths === 0) return Number.NaN
  const cosine = Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / lengths))
  return (Math.acos(cosine) * 180) / Math.PI
}

/**
 * Points every `stepKm` along a segment, both ends included.
 * @param {LonLat} a - the start
 * @param {LonLat} b - the end
 * @param {number} stepKm - the spacing wanted
 * @returns {LonLat[]} at least the two ends
 */
export function sampleSegment(a, b, stepKm) {
  const count = Math.max(1, Math.ceil(kmBetween(a, b) / stepKm))
  return Array.from({ length: count + 1 }, (_, k) => {
    const t = k / count
    return /** @type {LonLat} */ ([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
  })
}
