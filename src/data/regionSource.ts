import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'

import type { UvPoint } from './coastlineSource'
import type { GeoBounds } from '../geo/mercator'

/**
 * One polity at a given date, as closed rings in normalized grid coordinates.
 */
export interface Region {
  /** The polity's name, where the dataset has one. */
  name: string | null
  /** The power it answers to (`SUBJECTO`) — useful for colouring by empire rather than by polity. */
  subjectTo: string | null
  /** A wider cultural grouping (`PARTOF`). */
  partOf: string | null
  /**
   * Every ring of the polity, outer and holes alike, in one flat list. An even-odd fill then handles
   * the holes without the consumer having to know which ring is which.
   */
  rings: UvPoint[][]
}

/** A dated set of polities. */
export interface RegionSet {
  /** The year the map depicts (negative for BCE). */
  year: number
  /** The polities. */
  regions: Region[]
}

/**
 * A pluggable source of dated political geometry (fetch, mock, generated…).
 */
export interface RegionSource {
  /**
   * Load one year.
   * @param year - the year to load
   * @returns the polities at that date
   */
  load(year: number): Promise<RegionSet>
}

/** The on-disk payload emitted by `files/spikes/fetch-borders` (lon/lat rings). */
export interface RegionPayload {
  /** Where the data came from, and under what terms. */
  source: string
  /** The year depicted. */
  year: number
  /** The geographic box the rings were cropped to. */
  bbox: GeoBounds
  /** Douglas-Peucker tolerance applied, in degrees. */
  tolerance: number
  /** The polities, as rings of `[longitude, latitude]` pairs. */
  regions: {
    name: string | null
    subjectTo: string | null
    partOf: string | null
    rings: [number, number][][]
  }[]
}

/**
 * Reproject a payload's lon/lat rings onto normalized grid coordinates.
 *
 * As everywhere else, `v` goes through the Mercator projection rather than a linear degree ramp — on
 * this bounding box the two disagree by about twelve degrees mid-frame, which would slide every border
 * north or south of the terrain it belongs to.
 * @param payload - the loaded payload
 * @returns the polities in normalized grid coordinates
 */
export function projectRegions(payload: RegionPayload): RegionSet {
  const regions: Region[] = []
  for (const region of payload.regions) {
    const rings = region.rings
      .map((ring) =>
        ring.map(([longitude, latitude]) => ({
          u: longitudeToHorizontal(longitude, payload.bbox),
          v: latitudeToVertical(latitude, payload.bbox),
        }))
      )
      .filter((ring) => ring.length >= 4) // fewer vertices cannot enclose an area
    if (rings.length === 0) continue
    regions.push({
      name: region.name,
      subjectTo: region.subjectTo,
      partOf: region.partOf,
      rings,
    })
  }
  return { year: payload.year, regions }
}

/**
 * Create a {@link RegionSource} that fetches one pre-cropped year and reprojects it.
 * @param pathForYear - builds the payload URL for a year, e.g. `` (year) => `/borders/europe-${year}.json` ``
 * @returns a fetch-backed region source
 */
export function createFetchRegionSource(pathForYear: (year: number) => string): RegionSource {
  return {
    async load(year: number): Promise<RegionSet> {
      const path = pathForYear(year)
      const response = await fetch(path)
      if (!response.ok) throw new Error(`regions ${path} → HTTP ${String(response.status)}`)
      const payload = (await response.json()) as RegionPayload
      return projectRegions(payload)
    },
  }
}
