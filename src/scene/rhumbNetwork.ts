import { clamp01 } from '../utils/math'

import type { UvSegment } from './lineLayer'
import type { UvPoint } from '../data/coastlineSource'
import type { Heightmap } from '../data/heightmap'

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

/** Clip the infinite line `p + t·d` to the unit square, returning the `[t0, t1]` range or `null`. */
function clipToUnitSquare(pu: number, pv: number, du: number, dv: number): [number, number] | null {
  let t0 = -Infinity
  let t1 = Infinity
  const slab = (p: number, d: number): boolean => {
    if (d === 0) return p >= 0 && p <= 1 // parallel to this axis → only the position matters
    const ta = (0 - p) / d
    const tb = (1 - p) / d
    t0 = Math.max(t0, Math.min(ta, tb))
    t1 = Math.min(t1, Math.max(ta, tb))
    return true
  }
  if (!slab(pu, du) || !slab(pv, dv)) return null
  return t0 < t1 ? [t0, t1] : null
}

/**
 * Generate the portolan rhumb network as sea-only line segments in normalized grid coordinates. From each
 * centre (a ring of `nodeCount` around `center`, plus `center` itself when `includeCenter`), a straight
 * line is cast in every unique compass orientation, clipped to the map, then walked over the heightmap so
 * only the stretches over water (elevation ≤ `seaLevel`) are emitted — the lines stop at the coastline.
 * @param heightmap - the elevation source (same DEM as the coastline → aligned by construction)
 * @param options - the network layout + sea clip
 * @returns the sea-clipped rhumb segments
 */
export function generateRhumbSegments(
  heightmap: Heightmap,
  options: RhumbNetworkOptions
): UvSegment[] {
  const { center, circleRadius, nodeCount, includeCenter, directions, seaLevel, step } = options
  const nodes: UvPoint[] = []
  for (let i = 0; i < nodeCount; i++) {
    const phi = (i / nodeCount) * Math.PI * 2
    nodes.push({
      u: center.u + circleRadius * Math.sin(phi),
      v: center.v - circleRadius * Math.cos(phi),
    })
  }
  if (includeCenter) nodes.push({ u: center.u, v: center.v })

  const walk = Math.max(MIN_WALK_STEP, step)
  const orientations = Math.max(1, Math.floor(directions / 2))
  const segments: UvSegment[] = []

  for (const node of nodes) {
    for (let o = 0; o < orientations; o++) {
      const a = (o / orientations) * Math.PI // unique orientations over [0, π)
      const du = Math.sin(a)
      const dv = -Math.cos(a)
      const range = clipToUnitSquare(node.u, node.v, du, dv)
      if (!range) continue
      const [t0, t1] = range

      // Walk the chord, emitting a segment for each contiguous run of underwater samples.
      let runStart: UvPoint | null = null
      let prev: UvPoint = { u: node.u + t0 * du, v: node.v + t0 * dv }
      for (let t = t0; t <= t1 + walk * 0.5; t += walk) {
        const tc = Math.min(t, t1)
        const p: UvPoint = { u: node.u + tc * du, v: node.v + tc * dv }
        const underwater = heightmap.sample(clamp01(p.u), clamp01(p.v)) <= seaLevel
        if (underwater) {
          runStart ??= prev
        } else if (runStart) {
          segments.push([runStart, prev])
          runStart = null
        }
        prev = p
      }
      if (runStart) segments.push([runStart, prev])
    }
  }
  return segments
}
