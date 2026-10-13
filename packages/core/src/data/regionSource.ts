import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'

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
   * The id of the polity it was adapted from — only for an authored year, whose colours are the
   * Cartographer's and are looked up by it. The per-century payloads have no ids.
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
    /** The authored polity's id; absent from the per-century payloads. */
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
      if (!response.ok)
        throw assetError('regions', 'transport', path, `HTTP ${String(response.status)}`)
      return projectRegions(parseRegionPayload(await response.json(), path))
    },
  }
}

/**
 * Read a fetched value as a {@link RegionPayload}, or fail naming the field that is wrong.
 *
 * Rings are checked pair by pair rather than trusted wholesale: a single string where a longitude should
 * be turns into `NaN` on projection, and a `NaN` coordinate rasterises as a polity that claims nothing
 * anywhere — a country silently missing from the map, which is precisely the failure nobody notices.
 * @param value - the parsed JSON, of no known shape
 * @param source - where it came from, for the message
 * @returns the payload
 */
export function parseRegionPayload(value: unknown, source: string): RegionPayload {
  return parseAsset('regions', source, () => {
    const at = field(value, 'payload')
    const regions = expectArray(at('regions'), 'payload.regions').map((region, index) => {
      const path = `payload.regions[${String(index)}]`
      const on = field(region, path)
      return {
        name: expectNullableString(on('name'), `${path}.name`),
        subjectTo: expectNullableString(on('subjectTo'), `${path}.subjectTo`),
        partOf: expectNullableString(on('partOf'), `${path}.partOf`),
        rings: expectArray(on('rings'), `${path}.rings`).map((ring, r) =>
          expectArray(ring, `${path}.rings[${String(r)}]`).map((point, p) =>
            expectLonLat(point, `${path}.rings[${String(r)}][${String(p)}]`)
          )
        ),
      }
    })
    return {
      source: expectString(at('source'), 'payload.source'),
      year: expectNumber(at('year'), 'payload.year'),
      bbox: expectBounds(at('bbox'), 'payload.bbox'),
      tolerance: expectNumber(at('tolerance'), 'payload.tolerance'),
      regions,
    }
  })
}
