import { type GeoBounds, latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'

import {
  assetError,
  expectArray,
  expectBounds,
  expectLonLat,
  expectNullableString,
  expectNumber,
  expectString,
  field,
  parseAsset,
} from './assetError'

import type { UvPoint } from './coastlineSource'
import type { LandMask } from './landMask'

/**
 * One river centreline, already reprojected onto the grid the relief is sampled on.
 */
export interface River {
  /**
   * Natural Earth `scalerank`, 1 (major) to 9 (minor). The dataset's own generalisation ranking — the
   * level of detail lever, so the reveal-by-zoom does not need an invented heuristic.
   */
  rank: number
  /** Feature class: `River`, or `Lake Centerline` for the path traced through a lake. */
  kind: string
  /** The river's name where the dataset has one, else `null`. */
  name: string | null
  /** The polyline in normalized grid coordinates (`u` west→east, `v` north→south). */
  points: UvPoint[]
}

/**
 * A pluggable source of river centrelines (fetch, mock, generated…).
 */
export interface RiverSource {
  /**
   * Load the rivers.
   * @returns the reprojected centrelines
   */
  load(): Promise<River[]>
}

/** The on-disk payload emitted by `files/spikes/fetch-rivers` (lon/lat, cropped to the DEM bbox). */
export interface RiverPayload {
  /** Where the data came from, and under what terms. */
  source: string
  /** The geographic box the centrelines were cropped to. */
  bbox: GeoBounds
  /** Decimal places of longitude/latitude kept. */
  precision: number
  /** Douglas-Peucker tolerance applied, in degrees. */
  tolerance: number
  /** The centrelines, as `[longitude, latitude]` pairs. */
  rivers: { rank: number; kind: string; name: string | null; points: [number, number][] }[]
}

/**
 * Reproject a payload's lon/lat centrelines onto normalized grid coordinates.
 *
 * Web Mercator is linear in longitude but not in latitude, so `v` goes through the projection rather
 * than a plain degree lerp — on this bounding box the two disagree by about twelve degrees mid-frame.
 * @param payload - the loaded payload
 * @returns the rivers in normalized grid coordinates, shortest polylines dropped
 */
export function projectRivers(payload: RiverPayload): River[] {
  const out: River[] = []
  for (const river of payload.rivers) {
    const points: UvPoint[] = river.points.map(([longitude, latitude]) => ({
      u: longitudeToHorizontal(longitude, payload.bbox),
      v: latitudeToVertical(latitude, payload.bbox),
    }))
    if (points.length < 2) continue
    out.push({ rank: river.rank, kind: river.kind, name: river.name, points })
  }
  return out
}

/**
 * Create a {@link RiverSource} that fetches the pre-cropped payload and reprojects it.
 * @param path - the payload URL, e.g. `/rivers/europe-rivers.json`
 * @returns a fetch-backed river source
 */
export function createFetchRiverSource(path: string): RiverSource {
  return {
    async load(): Promise<River[]> {
      const response = await fetch(path)
      if (!response.ok)
        throw assetError('rivers', 'transport', path, `HTTP ${String(response.status)}`)
      return projectRivers(parseRiverPayload(await response.json(), path))
    },
  }
}

/**
 * How far, and how finely, to look for the sea when closing the gap at a river mouth.
 */
export interface RiverExtensionOptions {
  /** Furthest the search will reach, in normalized grid units (~0.01 ≈ 95 km at European latitudes). */
  maxDistance: number
  /** March step, in normalized grid units. */
  step: number
  /** Half-angle (degrees) of the arc of headings tried around the river's final direction. */
  searchArcDeg: number
  /** How many headings to try across that arc. */
  arcSamples: number
  /**
   * How close, in normalized grid units, another river must pass for an endpoint to count as a
   * confluence rather than a mouth (~0.0003 ≈ 3 km at European latitudes).
   */
  junctionRadius: number
}

/** Sensible defaults: reach far enough for the Gironde (~75 km) without inventing long stubs. */
export const DEFAULT_RIVER_EXTENSION: RiverExtensionOptions = {
  maxDistance: 0.01,
  step: 0.0005,
  searchArcDeg: 60,
  arcSamples: 9,
  junctionRadius: 0.0003,
}

/**
 * March from `tip` along `heading` until the terrain drops to sea level.
 * @param mask - the land/water mask
 * @param tip - the endpoint to march from
 * @param heading - the direction as a unit `(du, dv)` pair
 * @param options - the search bounds
 * @returns the points added, ending on the first sea sample, or `null` if the sea was never reached
 */
function marchToSea(
  mask: LandMask,
  tip: UvPoint,
  heading: readonly [number, number],
  options: RiverExtensionOptions
): UvPoint[] | null {
  const added: UvPoint[] = []
  const steps = Math.max(1, Math.floor(options.maxDistance / options.step))
  for (let i = 1; i <= steps; i++) {
    const u = tip.u + heading[0] * options.step * i
    const v = tip.v + heading[1] * options.step * i
    if (u < 0 || u > 1 || v < 0 || v > 1) return null // walked out of the frame, not into the sea
    added.push({ u, v })
    if (!mask.isLand(u, v)) return added
  }
  return null
}

/**
 * Close the gap at river mouths by extending each endpoint that still sits on land until it meets the
 * sea.
 *
 * Natural Earth stops a centreline where the estuary begins — the Loire at Cordemais, the Garonne at
 * the Bec d'Ambès — because an estuary belongs to its water-body layer, not its river layer. We draw no
 * estuaries, and our shoreline is the DEM's own 0 m contour rather than Natural Earth's, so those
 * rivers visibly stop short of the coast. Rather than synthesise a plausible course, this walks the
 * river's own final heading (trying an arc around it, since a meander can leave the last segment
 * pointing anywhere) and stops at the first sea sample. Only *free* endpoints qualify: a tip shared
 * with another polyline is a confluence, and extending those would give every near-coastal tributary an
 * invented channel of its own. If no heading reaches water within `maxDistance`, the river is returned
 * untouched — a source in the mountains is never extended.
 * @param rivers - the reprojected centrelines
 * @param mask - the land/water mask whose shoreline the rivers must meet
 * @param options - the search bounds
 * @returns the rivers, with mouths extended where a short walk found the sea
 */
export function extendRiversToSea(
  rivers: readonly River[],
  mask: LandMask,
  options: RiverExtensionOptions
): River[] {
  const arc = (options.searchArcDeg * Math.PI) / 180
  const samples = Math.max(1, Math.floor(options.arcSamples))

  // Natural Earth splits its polylines at confluences, so an endpoint another river runs past is a
  // junction, not a mouth. Without this, every tributary ending within `maxDistance` of the coast is
  // handed its own invented channel to the sea.
  //
  // Proximity, not equality: a tributary does not always end exactly on a vertex of the river it joins,
  // so an exact match under-detects junctions, while a plain bucket lookup misses the pair that
  // straddles a bucket edge. Hence a spatial hash searched over its 3×3 neighbourhood.
  const radius = Math.max(1e-9, options.junctionRadius)
  const buckets = new Map<string, number[]>()
  rivers.forEach((river, index) => {
    for (const point of river.points) {
      const cell = `${String(Math.floor(point.u / radius))}:${String(Math.floor(point.v / radius))}`
      const bucket = buckets.get(cell)
      if (bucket) bucket.push(index)
      else buckets.set(cell, [index])
    }
  })
  const isJunction = (tip: UvPoint, owner: number): boolean => {
    const cu = Math.floor(tip.u / radius)
    const cv = Math.floor(tip.v / radius)
    for (let du = -1; du <= 1; du++)
      for (let dv = -1; dv <= 1; dv++)
        for (const index of buckets.get(`${String(cu + du)}:${String(cv + dv)}`) ?? [])
          // Its own vertices always sit within the radius; only another polyline marks a junction.
          if (index !== owner) return true
    return false
  }

  const extend = (points: UvPoint[], owner: number): UvPoint[] => {
    const tip = points[points.length - 1]
    const previous = points[points.length - 2]
    if (!tip || !previous) return points
    if (!mask.isLand(tip.u, tip.v)) return points // already in the water
    if (isJunction(tip, owner)) return points // another river runs past: a confluence, not a mouth

    const du = tip.u - previous.u
    const dv = tip.v - previous.v
    const length = Math.hypot(du, dv)
    if (length === 0) return points
    const base = Math.atan2(dv, du)

    let best: UvPoint[] | null = null
    for (let i = 0; i < samples; i++) {
      // Sweep the arc symmetrically around the river's own heading; the shortest hit wins, which keeps
      // the stub close to the natural course instead of cutting across a headland.
      const offset = samples === 1 ? 0 : -arc + (2 * arc * i) / (samples - 1)
      const angle = base + offset
      const found = marchToSea(mask, tip, [Math.cos(angle), Math.sin(angle)], options)
      if (found && (!best || found.length < best.length)) best = found
    }
    return best ? [...points, ...best] : points
  }

  return rivers.map((river, index) => {
    // Either end can be the mouth: the dataset does not guarantee an upstream-to-downstream order, and
    // a headwater simply never finds the sea within the cap, so trying both is self-selecting.
    const forward = extend([...river.points], index)
    const both = extend([...forward].reverse(), index)
    return { ...river, points: both.reverse() }
  })
}

/**
 * Read a fetched value as a {@link RiverPayload}, or fail naming the field that is wrong.
 * @param value - the parsed JSON, of no known shape
 * @param source - where it came from, for the message
 * @returns the payload
 */
export function parseRiverPayload(value: unknown, source: string): RiverPayload {
  return parseAsset('rivers', source, () => {
    const at = field(value, 'payload')
    const rivers = expectArray(at('rivers'), 'payload.rivers').map((river, index) => {
      const path = `payload.rivers[${String(index)}]`
      const on = field(river, path)
      return {
        rank: expectNumber(on('rank'), `${path}.rank`),
        kind: expectString(on('kind'), `${path}.kind`),
        name: expectNullableString(on('name'), `${path}.name`),
        points: expectArray(on('points'), `${path}.points`).map((point, p) =>
          expectLonLat(point, `${path}.points[${String(p)}]`)
        ),
      }
    })
    return {
      source: expectString(at('source'), 'payload.source'),
      bbox: expectBounds(at('bbox'), 'payload.bbox'),
      precision: expectNumber(at('precision'), 'payload.precision'),
      tolerance: expectNumber(at('tolerance'), 'payload.tolerance'),
      rivers,
    }
  })
}
