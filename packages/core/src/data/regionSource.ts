import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'

import type { UvPoint } from './coastlineSource'
import type { AuthoredYear } from './yearFormat'
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
   * The id of the polity it was adapted from, whose colours are the Cartographer's and are looked up by it. Absent
   * from a region built by hand, in a test or a bench.
   */
  polityId?: string
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
  /**
   * The year as the Cartographer authored it, and the frame its anchors project against — present only
   * when the year was read from `years/<year>/`. Kept past the lossy adapter so the atlas can draw the
   * borders **exact**, from the shared anchors, with their hands and overrides (D1, 2026-10-13); the
   * worker never sees it, only `regions` cross.
   */
  authored?: { year: AuthoredYear; bbox: GeoBounds }
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

/**
 * A year's polities as lon/lat rings, before projection — what an authored year is adapted to (`toRegionPayload`). The
 * per-century files it was first read from, under the GPL, are no longer read by anything (ATLAS-373).
 */
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
    /** The authored polity's id. */
    polityId?: string
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
      ...(region.polityId === undefined ? {} : { polityId: region.polityId }),
      rings,
    })
  }
  return { year: payload.year, regions }
}
