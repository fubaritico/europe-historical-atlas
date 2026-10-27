import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import type { UvSegment } from '../../lines/lineLayer'
import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'
import type { Heightmap } from '@europe-historical-atlas/core/data/heightmap'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'

/** Floor for the sampling step — guards against an absurdly slow (or non-terminating) walk if `step` ≈ 0. */
const MIN_WALK_STEP = 0.0005

/**
 * Options for the portolan rhumb-line network: a ring of compass centres, each radiating straight lines
 * in every wind direction, clipped to the sea.
 */
export interface RhumbNetworkOptions {
  /** The primary rose centre in normalized grid coordinates (`u` west→east, `v` north→south). */
  center: UvPoint
  /** Radius (in normalized units) of the ring of secondary centres around the primary rose. */
  circleRadius: number
  /** Number of secondary centres evenly spaced on the ring (the classic portolan uses 16). */
  nodeCount: number
  /** Also radiate lines from the primary centre itself. */
  includeCenter: boolean
  /** Compass directions per centre (e.g. 32); only the `directions / 2` unique orientations are drawn. */
  directions: number
  /** Elevation (metres) at/below which a sample is sea — lines are kept only over water. */
  seaLevel: number
  /** Sampling step along each line in normalized units (smaller = finer clip at the coast). */
  step: number
}

/**
 * Clip the infinite line `p + t·d` to the unit square, returning the `[t0, t1]` range or `null`.
 * @param pu - a point on the line, horizontal, in normalized `[0, 1]` map units
 * @param pv - the same point, vertical
 * @param du - the line's direction, horizontal component
 * @param dv - its direction, vertical component
 * @returns the parameter range of `t` inside the square, or `null` when the line misses it
 */
function clipToUnitSquare(pu: number, pv: number, du: number, dv: number): [number, number] | null {
  let t0 = -Infinity
  let t1 = Infinity
  // Slab test: each axis narrows [t0, t1] to the stretch where the line is between 0 and 1 on it.
  const slab = (p: number, d: number): boolean => {
    if (d === 0) return p >= 0 && p <= 1 // parallel to this axis → only the position matters
    const ta = (0 - p) / d
    const tb = (1 - p) / d
    t0 = Math.max(t0, Math.min(ta, tb))
    t1 = Math.min(t1, Math.max(ta, tb))
    return true
  }
  // Both axes applied; an empty range means the line passes outside the square.
  if (!slab(pu, du) || !slab(pv, dv)) return null
  return t0 < t1 ? [t0, t1] : null
}

/**
 * The compass centres a portolan web radiates from: a ring around a point, and optionally the point.
 * @param center - the ring's centre in normalized grid coordinates
 * @param circleRadius - the ring's radius
 * @param nodeCount - how many centres sit on the ring
 * @param includeCenter - whether the centre itself is also one
 * @returns the centres
 */
export function rhumbCentres(
  center: UvPoint,
  circleRadius: number,
  nodeCount: number,
  includeCenter: boolean
): UvPoint[] {
  const nodes: UvPoint[] = []
  // Evenly spaced on the circle, the first one due north of the centre (v grows southward).
  for (let i = 0; i < nodeCount; i++) {
    const phi = (i / nodeCount) * Math.PI * 2
    nodes.push({
      u: center.u + circleRadius * Math.sin(phi),
      v: center.v - circleRadius * Math.cos(phi),
    })
  }
  if (includeCenter) nodes.push({ u: center.u, v: center.v })
  return nodes
}

/**
 * Walk a chord and emit a segment for each contiguous run of water.
 *
 * This is what makes the web read as a sea chart rather than as a grid drawn over Europe: a rhumb stops
 * at the coastline and picks up again on the far side of the landmass.
 * @param from - where the chord starts
 * @param du - the chord's direction on u
 * @param dv - the chord's direction on v
 * @param t0 - the chord's entry parameter
 * @param t1 - its exit parameter
 * @param walk - the sampling step along it
 * @param isWater - whether a normalized coordinate is water
 * @returns the underwater stretches
 */
export function waterRunsAlong(
  from: UvPoint,
  du: number,
  dv: number,
  t0: number,
  t1: number,
  walk: number,
  isWater: (u: number, v: number) => boolean
): UvSegment[] {
  const runs: UvSegment[] = []
  let runStart: UvPoint | null = null
  let prev: UvPoint = { u: from.u + t0 * du, v: from.v + t0 * dv }
  // Step along the chord, the last step clamped onto its exit so the end is always sampled.
  // A run opens at the last point before water and closes at the last point still in it.
  for (let t = t0; t <= t1 + walk * 0.5; t += walk) {
    const tc = Math.min(t, t1)
    const p: UvPoint = { u: from.u + tc * du, v: from.v + tc * dv }
    if (isWater(clamp01(p.u), clamp01(p.v))) {
      runStart ??= prev
    } else if (runStart) {
      runs.push([runStart, prev])
      runStart = null
    }
    prev = p
  }
  // A run still open at the end reaches the chord's exit.
  if (runStart) runs.push([runStart, prev])
  return runs
}

/**
 * Generate the portolan rhumb network as sea-only line segments in normalized grid coordinates. From each
 * centre (a ring of `nodeCount` around `center`, plus `center` itself when `includeCenter`), a straight
 * line is cast in every unique compass orientation, clipped to the map, then walked over the heightmap so
 * only the stretches over water (elevation ≤ `seaLevel`) are emitted — the lines stop at the coastline.
 * @param heightmap - the elevation source (same DEM as the coastline → aligned by construction)
 * @param options - the network layout + sea clip
 * @param mask - which cells are land, when it is known
 * @returns the sea-clipped rhumb segments
 */
export function generateRhumbSegments(
  heightmap: Heightmap,
  options: RhumbNetworkOptions,
  mask?: LandMask
): UvSegment[] {
  const { center, circleRadius, nodeCount, includeCenter, directions, seaLevel, step } = options
  // A polder is dry land below sea level and a lake is water above it, so where a mask is available it
  // decides; thresholding elevation is the degraded fallback.
  const isWater = (u: number, v: number): boolean =>
    mask ? !mask.isLand(u, v) : heightmap.sample(u, v) <= seaLevel

  // The step floored; and a line through a centre covers two opposite directions, so half of them suffice.
  const walk = Math.max(MIN_WALK_STEP, step)
  const orientations = Math.max(1, Math.floor(directions / 2))
  const segments: UvSegment[] = []

  // From every centre, each orientation cast as a line, cut to the map, then kept only over water.
  for (const node of rhumbCentres(center, circleRadius, nodeCount, includeCenter)) {
    for (let o = 0; o < orientations; o++) {
      const a = (o / orientations) * Math.PI // unique orientations over [0, π)
      const du = Math.sin(a)
      const dv = -Math.cos(a)
      const range = clipToUnitSquare(node.u, node.v, du, dv)
      if (!range) continue
      segments.push(...waterRunsAlong(node, du, dv, range[0], range[1], walk, isWater))
    }
  }
  return segments
}
