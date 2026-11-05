/**
 * Distances on the ground between `[longitude, latitude]` points, over the few kilometres a weld spans.
 *
 * **A local flat approximation**: around two points, a degree of latitude is `R · π/180` and a degree of longitude
 * that times the cosine of their mean latitude. Over a few kilometres the error is far below the precision any map
 * of this atlas is drawn with — the same order the tribe's feather accepts (`signedDistance.ts`). Not for a distance
 * across a continent.
 */

import { EARTH_RADIUS_KM } from './signedDistance'

/** Kilometres per degree of latitude on Web Mercator's sphere. */
const KM_PER_DEGREE = (EARTH_RADIUS_KM * Math.PI) / 180

/** A point's nearest place on a segment. */
export interface SegmentFoot {
  /** That place, `[longitude, latitude]`. */
  at: [number, number]
  /** How far along the segment, `0` at its start, `1` at its end. */
  along: number
  /** Its distance from the point, in kilometres. */
  km: number
}

/**
 * Kilometres per degree of latitude, the same everywhere on the sphere.
 * @returns the scale
 */
export function kmPerDegreeOfLatitude(): number {
  return KM_PER_DEGREE
}

/**
 * Kilometres per degree of longitude at a latitude.
 * @param latitude - in degrees
 * @returns the scale
 */
export function kmPerDegreeOfLongitude(latitude: number): number {
  return KM_PER_DEGREE * Math.cos((latitude * Math.PI) / 180)
}

/**
 * The distance between two points on the ground.
 * @param a - `[longitude, latitude]`
 * @param b - `[longitude, latitude]`
 * @returns kilometres
 */
export function groundKm(a: readonly [number, number], b: readonly [number, number]): number {
  const x = (b[0] - a[0]) * kmPerDegreeOfLongitude((a[1] + b[1]) / 2)
  const y = (b[1] - a[1]) * KM_PER_DEGREE
  return Math.hypot(x, y)
}

/**
 * The nearest place to a point on a segment, ends included.
 * @param point - `[longitude, latitude]`
 * @param a - the segment's start
 * @param b - its end
 * @returns that place, how far along, and how far from the point
 */
export function footOnSegment(
  point: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number]
): SegmentFoot {
  const scale = kmPerDegreeOfLongitude(point[1])
  const ax = (a[0] - point[0]) * scale
  const ay = (a[1] - point[1]) * KM_PER_DEGREE
  const dx = (b[0] - a[0]) * scale
  const dy = (b[1] - a[1]) * KM_PER_DEGREE
  const squared = dx * dx + dy * dy
  const along = squared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / squared))
  return {
    at: [a[0] + along * (b[0] - a[0]), a[1] + along * (b[1] - a[1])],
    along,
    km: Math.hypot(ax + along * dx, ay + along * dy),
  }
}
