import { kmBetween, toKm } from './geo.mjs'
import {
  FLAT_EDGE_DEGREES,
  LEFTOVER_MAX_KM2,
  LEFTOVER_MAX_POINTS,
  PIXEL_EDGE_KM,
  STAIR_MIN_TREADS,
} from './thresholds.mjs'
import { holdersAt, ringPoints } from './yearMap.mjs'

/**
 * What the conversion from Cliopatria leaves in a map, measured (the dev, 2026-11-09 — `references/decide.md`):
 *
 * - **leftovers**: rings of three or four points, usually a suzerain's piece the import matched to nothing; they
 *   overflow onto a neighbour;
 * - **pixels**: Cliopatria's grid come through the reprojection — rings made only of short edges, one at least flat on a
 *   latitude;
 * - **stairs**: the same grid inside a long path — short edges whose every other one lies flat on a latitude.
 *
 * Most of the time all three are removed. Pure functions over a {@link YearMap}: no file, no state.
 */

/**
 * @typedef {import('./geo.mjs').LonLat} LonLat
 * @typedef {import('./yearMap.mjs').YearMap} YearMap
 */

/**
 * Whether a segment is a pixel's flat edge: short, and on one latitude.
 * @param {LonLat} a - one end
 * @param {LonLat} b - the other
 * @returns {boolean} `true` for a grid row's edge
 */
export function isFlatPixelEdge(a, b) {
  return Math.abs(a[1] - b[1]) < FLAT_EDGE_DEGREES && kmBetween(a, b) <= PIXEL_EDGE_KM
}

/**
 * A ring's area.
 * @param {readonly LonLat[]} points - the ring, the closing segment implied
 * @returns {number} the area in square kilometres
 */
export function ringAreaKm2(points) {
  if (points.length < 3) return 0
  const ref = points.reduce((sum, p) => sum + p[1], 0) / points.length
  const km = points.map((p) => toKm(p, ref))
  let twice = 0
  km.forEach(([x, y], k) => {
    const [nx, ny] = km[(k + 1) % km.length]
    twice += x * ny - nx * y
  })
  return Math.abs(twice) / 2
}

/**
 * The mean of a ring's points — inside any triangle, and inside the small convex rings measured here.
 * @param {readonly LonLat[]} points - the ring
 * @returns {LonLat} the mean point
 */
export function meanPoint(points) {
  const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0])
  return [sum[0] / points.length, sum[1] / points.length]
}

/**
 * Whether a ring is a pixel crumb: every edge short, one at least flat.
 * @param {readonly LonLat[]} points - the ring
 * @returns {boolean} `true` for a ring the grid made
 */
export function isPixelRing(points) {
  const edges = points.map((p, k) => [p, points[(k + 1) % points.length]])
  return (
    edges.every(([a, b]) => kmBetween(a, b) <= PIXEL_EDGE_KM) &&
    edges.some(([a, b]) => isFlatPixelEdge(a, b))
  )
}

/**
 * Every suzerain above a polity and every vassal under it — the ground they share is vassalage, not an overflow.
 * @param {YearMap} map - the map
 * @param {string} polity - the polity
 * @returns {Set<string>} the related polities
 */
function relatives(map, polity) {
  /** @type {Map<string, string | null>} */
  const suzerain = new Map(
    map.registry.map((p) => [p.id, /** @type {{ suzerain?: string | null }} */ (p).suzerain ?? null])
  )
  const related = new Set()
  for (let next = suzerain.get(polity) ?? null; next !== null && !related.has(next); ) {
    related.add(next)
    next = suzerain.get(next) ?? null
  }
  for (const id of suzerain.keys()) {
    for (let up = suzerain.get(id) ?? null, seen = new Set(); up !== null && !seen.has(up); up = suzerain.get(up) ?? null) {
      seen.add(up)
      if (up === polity) related.add(id)
    }
  }
  return related
}

/**
 * Whether a point lies in a box.
 * @param {LonLat} p - the point
 * @param {readonly number[] | undefined} box - west, south, east, north; every point when omitted
 * @returns {boolean} `true` inside
 */
function inBox(p, box) {
  return box === undefined || (p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3])
}

/**
 * The crumbs: rings of {@link LEFTOVER_MAX_POINTS} points or fewer and {@link LEFTOVER_MAX_KM2} or less, and the rings
 * the grid made.
 * @param {YearMap} map - the map
 * @param {{ polity?: string, box?: readonly number[], skip?: Set<number[]> }} [only] - one polity; a box their middle
 *   lies in; rings to leave out (an island or a lake drawn on its contour)
 * @returns {{ polity: string, ring: number, points: number, km2: number, at: LonLat, pixel: boolean,
 *   overflows: string[], whole: boolean }[]} each crumb, the ones overflowing a neighbour first, then the smallest;
 *   `overflows` names the polities also holding its middle (suzerains and vassals left out); `whole` says the ring is
 *   the polity's largest — removing it would remove the polity, so it is redrawn, never removed
 */
export function crumbs(map, only = {}) {
  const found = []
  for (const claim of map.claims) {
    if (only.polity !== undefined && claim.polity !== only.polity) continue
    claim.rings.forEach((ring, index) => {
      if (only.skip?.has(ring)) return
      const points = ringPoints(map, ring)
      const pixel = isPixelRing(points)
      const few = points.length <= LEFTOVER_MAX_POINTS && ringAreaKm2(points) <= LEFTOVER_MAX_KM2
      if (!few && !pixel) return
      const at = meanPoint(points)
      if (!inBox(at, only.box)) return
      const related = relatives(map, claim.polity)
      const overflows = holdersAt(map, at).filter((id) => id !== claim.polity && !related.has(id))
      const km2 = ringAreaKm2(points)
      const whole = map.claims
        .filter((other) => other.polity === claim.polity)
        .every((other) => other.rings.every((r) => r === ring || ringAreaKm2(ringPoints(map, r)) <= km2))
      found.push({ polity: claim.polity, ring: index, points: points.length, km2, at, pixel, overflows, whole })
    })
  }
  return found.sort((a, b) => b.overflows.length - a.overflows.length || a.km2 - b.km2)
}

/**
 * The stairs: in rings that are not crumbs, runs of short edges where of any two in a row one at least lies flat — the
 * grid's steps — with {@link STAIR_MIN_TREADS} flat treads or more. A run on a shared border is listed once, with every
 * polity holding it.
 * @param {YearMap} map - the map
 * @param {{ polity?: string, box?: readonly number[], skip?: Set<number[]> }} [only] - one polity; a box the run's
 *   first point lies in; rings to leave out (an island or a lake drawn on its contour)
 * @returns {{ polities: string[], from: number, to: number, treads: number, anchors: number, km: number, at: LonLat }[]}
 *   each run from its first anchor to its last, the longest first; `anchors` counts the points between them
 */
export function stairs(map, only = {}) {
  /** @type {Map<string, { polities: string[], from: number, to: number, treads: number, anchors: number, km: number, at: LonLat }>} */
  const runs = new Map()
  for (const claim of map.claims) {
    if (only.polity !== undefined && claim.polity !== only.polity) continue
    for (const ring of claim.rings) {
      if (only.skip?.has(ring)) continue
      const points = ringPoints(map, ring)
      if (points.length <= LEFTOVER_MAX_POINTS || isPixelRing(points)) continue
      const n = ring.length
      const short = (k) => kmBetween(points[k % n], points[(k + 1) % n]) <= PIXEL_EDGE_KM
      const flat = (k) => isFlatPixelEdge(points[k % n], points[(k + 1) % n])
      const inRun = (k) => short(k) && (flat(k) || flat(k - 1 + n) || flat(k + 1))
      const start = [...Array(n).keys()].find((k) => !inRun(k))
      if (start === undefined) continue
      for (let k = start + 1; k <= start + n; ) {
        if (!inRun(k)) {
          k++
          continue
        }
        const first = k
        let treads = 0
        let km = 0
        while (k < start + n && inRun(k)) {
          if (flat(k)) treads++
          km += kmBetween(points[k % n], points[(k + 1) % n])
          k++
        }
        if (treads < STAIR_MIN_TREADS) continue
        const from = ring[first % n]
        const to = ring[k % n]
        const at = points[first % n]
        if (!inBox(at, only.box)) continue
        const key = from < to ? `${from}-${to}` : `${to}-${from}`
        const known = runs.get(key)
        if (known !== undefined) known.polities.push(claim.polity)
        else runs.set(key, { polities: [claim.polity], from, to, treads, anchors: k - first - 1, km, at })
      }
    }
  }
  return [...runs.values()].sort((a, b) => b.km - a.km)
}
