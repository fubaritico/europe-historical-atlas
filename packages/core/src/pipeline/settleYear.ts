/**
 * An authored year settled for the atlas: its colours, its tints at every level of homage, its exact border lines and
 * its tribes — all data in, data out, so it runs in the worker beside the cuts (ATLAS-333: 60 to 385 ms of the page in
 * Chrome on a change of year, before it moved). Moved whole from the atlas's `loading/yearBorders`; the atlas writes
 * what it returns into its sources.
 *
 * **A tribe is drawn as in the Cartographer** (`editor/tribes`): no fill, no borders, its colour fading at its limit.
 * Its tint is dropped at every level, and its ground returned apart, in its colour, for the tribe layer.
 *
 * **Homage as a level of detail** (ATLAS-253): the tints come by level — a vassal in its suzerain's colour from afar —
 * and the border groups carry their split level. The homage is read once and handed to both. The deepest level is
 * the editor's own colours, so fully zoomed in the map is the one it was before levels.
 *
 * **A vassal's band** (ATLAS-398): each region's depth of homage when it wears the band, read off the same homage — what
 * the fill shader reveals the band by, as it reveals the vassal's colour.
 *
 * **The overlaps** (ATLAS-399): the common ground of polities whose outlines overlap, in their colours, for the hatching
 * — the Cartographer's computation, ~1.3 s a year, here off the page.
 */

import { exactBordersOf } from '../data/atlasBorders'
import { homageLevels } from '../data/homageLevels'
import { overlapHatches } from '../data/overlapHatches'
import { authoredTintLevels, polityColours } from '../data/polityColours'
import { isOutlinedTribe, tribeIds } from '../data/tribes'
import { bandDepthOf, bandedVassalIds, regionBandDepths } from '../data/vassalBand'
import { openYearDocument } from '../data/yearDocument'
import { yearOverlaps } from '../data/yearOverlaps'

import { overlapsKey } from './bakedOverlaps'

import type { BakedOverlaps } from './bakedOverlaps'
import type { BorderPattern } from '../data/borderStyles'
import type { UvPoint } from '../data/coastlineSource'
import type { HomageLevels } from '../data/homageLevels'
import type { LandMask } from '../data/landMask'
import type { OverlapHatch } from '../data/overlapHatches'
import type { RegionBorders } from '../data/regionBorders'
import type { Region } from '../data/regionSource'
import type { AuthoredYear } from '../data/yearFormat'
import type { OverlapRefusal } from '../data/yearOverlaps'
import type { GeoBounds } from '../geo/mercator'
import type { RgbColor } from '../utils/color'

/** A region as the settling reads it: whose it is, and its rings. */
export type SettleRegion = Pick<Region, 'polityId' | 'rings'>

/** What an authored year is settled from. */
export interface SettleRequest {
  /** The year's three files. */
  readonly year: AuthoredYear
  /** The frame its anchors are projected against. */
  readonly bbox: GeoBounds
  /** Its regions, in the order the fills are laid, each with the id of its polity. */
  readonly regions: readonly SettleRegion[]
  /** The automatic palette the year's colours are chosen from. */
  readonly palette: readonly [string, ...string[]]
  /**
   * The year's overlaps computed at the build, when the site holds a file for it (`bakedOverlaps`): taken when its key
   * is this year's — checked here, off the page (~13 ms a year) — computed here otherwise (~1.3 s); absent, computed
   * too: the dev server, a year added since the build (ATLAS-399).
   */
  readonly baked?: BakedOverlaps
}

/** A tribe's ground, in its colour. */
export interface SettledTribe {
  /** The tribe's id. */
  polity: string
  /** The `#rrggbb` it would have been filled in. */
  colour: string
  /** Its rings, outer and holes alike, in grid coordinates. */
  rings: UvPoint[][]
  /** Drawn by its rim rather than its heart — an outlined tribe (CARTO-439); absent for every other tribe. */
  outlined?: true
}

/** An authored year settled: what the atlas's layers read for it. */
export interface SettledYear {
  /** Each region's tint at the deepest level, a tribe's `null`. */
  readonly tints: (RgbColor | null)[]
  /** Each level's tints, level 0 first, one per region. */
  readonly tintLevels: (RgbColor | null)[][]
  /** The deepest level of homage. */
  readonly homageDepth: number
  /** The exact border lines, drawn from the anchors. */
  readonly borders: RegionBorders
  /** The pattern of each border group, keyed by its pair as `"a:b"`. */
  readonly patterns: ReadonlyMap<string, BorderPattern>
  /** The split level of each border group, keyed by its pair as `"a:b"`. */
  readonly levels: ReadonlyMap<string, number>
  /** Each tribe's ground, in its colour; empty for a year with no tribe. */
  readonly tribes: SettledTribe[]
  /**
   * Each region's band depth (ATLAS-398, `data/vassalBand`): its polity's depth of homage when it wears the vassals'
   * band, `0` for a sovereign or a tribe — one per region, in the fills' order.
   */
  readonly bandDepths: number[]
  /** The pieces of ground two polities or more cover, to hatch in their colours (ATLAS-399); empty when none. */
  readonly hatches: OverlapHatch[]
  /** The overlaps the geometry refused, left unhatched — said by the page, which reads them. */
  readonly hatchRefusals: OverlapRefusal[]
  /** Where the overlaps came from: the build's file, or computed here — the page warns when a file was stale. */
  readonly overlapsFrom: 'build' | 'computed'
}

/**
 * Settle an authored year: its homage, its exact lines, its colours, its tints by level, its tribes, its vassals' band
 * depths and its overlaps to hatch — the overlaps the costliest, ~1.3 s a year (ATLAS-399).
 * @param request - the year, its frame, its regions and the palette
 * @param mask - the land mask the coastline borders are cut against, or `null` when it failed
 * @param warn - where a border the atlas cannot draw yet is said — the console of the thread it runs on
 * @returns the year settled, the overlaps the geometry refused among it
 */
export function settleAuthoredYear(
  request: SettleRequest,
  mask: LandMask | null,
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): SettledYear {
  const { year, bbox, regions, palette } = request
  const homage = homageLevels(year.registry.polities)
  const exact = exactBordersOf(year, bbox, mask, warn, homage)
  const document = openYearDocument(year)
  const colours = polityColours(document, palette)
  const fromBuild = request.baked?.key === overlapsKey(year) ? request.baked.overlaps : null
  const banded = bandedVassalIds(year.registry.polities)
  const overlaps = overlapHatches(fromBuild ?? yearOverlaps(document), bbox, colours, (polity) =>
    bandDepthOf(polity, banded, homage)
  )
  const { deepest, levels } = tintsByLevel(year, regions, colours, homage)
  return {
    tints: deepest,
    tintLevels: levels,
    homageDepth: homage.deepest,
    borders: exact.borders,
    patterns: exact.patterns,
    levels: exact.levels,
    tribes: colouredTribes(year, regions, colours),
    bandDepths: regionBandDepths(regions, banded, homage),
    hatches: overlaps.hatches,
    hatchRefusals: overlaps.refused,
    overlapsFrom: fromBuild === null ? 'computed' : 'build',
  }
}

/**
 * Each tribe's ground in its colour, from the regions the fills are cut from — so the tribe fades from the very
 * outline the borders and the fills are drawn on.
 * @param year - the year's three files, whose registry says who is a tribe
 * @param regions - its regions, each carrying the id of its polity
 * @param colours - every polity's colour, by id
 * @returns one area per region of a tribe; empty for a year with no tribe
 */
function colouredTribes(
  year: AuthoredYear,
  regions: readonly SettleRegion[],
  colours: ReadonlyMap<string, string>
): SettledTribe[] {
  const tribes = tribeIds(year.registry.polities)
  const outlined = new Set(
    year.registry.polities.filter(isOutlinedTribe).map((polity) => polity.id)
  )
  // One area per region of a tribe, in the tribe's colour; any other region gives none.
  return regions.flatMap(({ polityId, rings }) => {
    if (polityId === undefined || !tribes.has(polityId)) return []
    const colour = colours.get(polityId)
    if (colour !== undefined) {
      return [
        {
          polity: polityId,
          colour,
          rings,
          ...(outlined.has(polityId) ? { outlined: true as const } : {}),
        },
      ]
    }
    // polityColours colours every polity of the year, and the reader refused a claim naming none.
    console.error(`[atlas] tribe "${polityId}" has no colour; it is not drawn.`)
    return []
  })
}

/**
 * An authored year's tints at every level of homage, a tribe unfilled at each. The levels below the deepest come
 * from the homage (`authoredTintLevels`); the deepest is each region's own colour.
 * @param year - the year's three files
 * @param regions - its regions, each carrying the id of its polity
 * @param colours - every polity's colour, by id
 * @param homage - the year's homage read as levels
 * @returns the deepest level's tints, and every level's, level 0 first — each one tint per region
 * @throws when the homage gives no level at all — a defect, never a year with no tint
 */
function tintsByLevel(
  year: AuthoredYear,
  regions: readonly SettleRegion[],
  colours: ReadonlyMap<string, string>,
  homage: HomageLevels
): { deepest: (RgbColor | null)[]; levels: (RgbColor | null)[][] } {
  const tribes = tribeIds(year.registry.polities)
  // A tribe's region gets no tint, at any level.
  const unlessTribe = (tint: RgbColor, index: number): RgbColor | null => {
    const polity = regions[index]?.polityId
    return polity !== undefined && tribes.has(polity) ? null : tint
  }
  // The last level is each region's own colour (`authoredTintLevels` says so): the deepest.
  const levels = authoredTintLevels(colours, regions, homage).map((level) => level.map(unlessTribe))
  const deepest = levels.at(-1)
  // The homage always gives a level 0: none at all is a defect, said — never a year settled with no tint (review
  // ARCH-014).
  if (deepest === undefined)
    throw new Error(`[atlas] the homage of ${String(year.year)} gave no level of tints`)
  return { deepest, levels }
}
