/**
 * A year's overlaps as the atlas hatches them (ATLAS-399): each piece of common ground in the map's `(u, v)`, with the
 * colours of the polities covering it, one stripe each in turn — as the Cartographer paints them (CARTO-364).
 *
 * The ground is the one `yearOverlaps` computes, in longitude and latitude, projected on the year's frame like the
 * outlines the fills are cut from (`toRegionPayload`), so a hatched piece lies exactly where the fills overlapped.
 */

import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'
import { hexToRgb } from '../utils/color'

import type { UvPoint } from './coastlineSource'
import type { OverlapRefusal, YearOverlaps } from './yearOverlaps'
import type { GeoBounds } from '../geo/mercator'
import type { RgbColor } from '../utils/color'

/** One piece of common ground, ready to be cut and hatched. */
export interface OverlapHatch {
  /** The polities covering it, two at least, in the order their stripes take turns. */
  readonly polities: readonly string[]
  /** One colour per polity, in the same order. */
  readonly colours: readonly RgbColor[]
  /** Its rings in `(u, v)`, even-odd — outer rings and holes alike, as a fill's. */
  readonly rings: UvPoint[][]
  /**
   * The depth of homage of the first of its polities that wears the vassals' band (ATLAS-398), `0` when none does — a
   * piece of sovereigns, banded as sovereigns since the trial of 2026-11-09 — the
   * dev, 2026-11-09: a contested vassal keeps its band at the zoom, as any vassal.
   */
  readonly bandDepth: number
}

/** A year's hatches, and what the geometry refused on the way. */
export interface YearHatches {
  /** The pieces to hatch. */
  readonly hatches: OverlapHatch[]
  /** The shapes and pairs left unhatched because the geometry refused them — the caller says them. */
  readonly refused: OverlapRefusal[]
}

/**
 * A year's overlaps, projected on its frame and given their polities' colours.
 * @param overlaps - the year's overlaps — computed now (`yearOverlaps`) or at the build (`bakedOverlaps`)
 * @param bbox - the frame its anchors are projected against — the DEM's
 * @param colours - every polity's colour, by id (`polityColours`)
 * @param bandDepthOf - a polity's depth of homage when it wears the vassals' band, `0` otherwise
 * @returns the pieces to hatch, and the refusals
 * @throws when a polity covering a piece has no colour — every polity is coloured by `polityColours`, so a defect
 */
export function overlapHatches(
  overlaps: YearOverlaps,
  bbox: GeoBounds,
  colours: ReadonlyMap<string, string>,
  bandDepthOf: (polity: string) => number
): YearHatches {
  const { pieces, refused } = overlaps
  const hatches = pieces.map(({ polities, area }) => ({
    polities,
    colours: polities.map((polity) => {
      const hex = colours.get(polity)
      if (hex === undefined)
        throw new Error(`[atlas] the overlap's polity "${polity}" has no colour`)
      return hexToRgb(hex)
    }),
    bandDepth: polities.map(bandDepthOf).find((depth) => depth > 0) ?? 0,
    // Every ring of every polygon in one list: the cut's even-odd rule makes the holes holes.
    rings: area.flatMap((polygon) =>
      polygon.map((ring) =>
        ring.map(([longitude, latitude]) => ({
          u: longitudeToHorizontal(longitude, bbox),
          v: latitudeToVertical(latitude, bbox),
        }))
      )
    ),
  }))
  return { hatches, refused }
}
