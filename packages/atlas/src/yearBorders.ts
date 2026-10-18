/**
 * Which border lines the atlas draws for the year on screen.
 *
 * **An authored year draws its own, exact** — from the anchors the Cartographer shares, in their hands and
 * with their overrides (D1 of `files/plans/borders/plan.md`, the dev's call of 2026-10-13). A year still
 * read from the per-century payloads keeps the lines the compute traced from the raster of its fills: it
 * has no anchors to draw from.
 *
 * **A tribe is drawn as in the Cartographer** (`core/editor/tribes`): no fill, no borders, its outline
 * dashed in its colour. Its tint is dropped here, beside the lines that replace it — for the exact fills.
 * The grid path the dev panel keeps for comparison (`exactFills` off) bakes the compute's own tints and
 * still fills a tribe; left so by decision, that path no longer ships (`known-issues-atlas.md`).
 *
 * **Homage as a level of detail** (ATLAS-253): an authored year's tints come by level — a vassal in its
 * suzerain's colour from afar — and its border groups carry their split level. The homage is read once
 * here and handed to both, so a loop in a hand-edited file is said once per year. The deepest level is the
 * compute's own tints, so fully zoomed in the map is the one it was before levels; a tribe stays unfilled
 * at every level.
 *
 * Kept apart from the pipeline because it takes data and returns data: the composition root only wires it.
 */

import { exactBordersOf } from '@europe-historical-atlas/core/editor/atlasBorders'
import { homageLevels } from '@europe-historical-atlas/core/editor/homageLevels'
import {
  authoredTintLevels,
  polityColours,
} from '@europe-historical-atlas/core/editor/polityColours'
import { tribeIds } from '@europe-historical-atlas/core/editor/tribes'
import { openYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import type { MapSources } from './mapSources'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { AuthoredYear } from '@europe-historical-atlas/core/data/yearFormat'
import type { HomageLevels } from '@europe-historical-atlas/core/editor/homageLevels'
import type { RgbColor } from '@europe-historical-atlas/core/utils/color'

/** What the compute settled for the year: its traced lines and each region's tint. */
export interface ComputedYear {
  /** The lines traced from the raster of the fills. */
  borders: RegionBorders
  /** Each region's tint, in the regions' order. */
  tints: RgbColor[]
}

/**
 * Settle the year's tints, border lines and tribe outlines into the sources.
 * @param sources - the sources, written in place
 * @param loaded - the year on screen
 * @param computed - what the compute settled for it
 * @param palette - the automatic palette, the one the year's colours were chosen from
 * @returns nothing
 */
export function settleYearBorders(
  sources: Pick<
    MapSources,
    | 'derivedBorders'
    | 'borderPatterns'
    | 'borderLevels'
    | 'landMask'
    | 'regionTints'
    | 'tintLevels'
    | 'homageDepth'
    | 'tribeOutlines'
  >,
  loaded: RegionSet,
  computed: ComputedYear,
  palette: readonly [string, ...string[]]
): void {
  if (loaded.authored === undefined) {
    sources.regionTints = computed.tints
    sources.tintLevels = [computed.tints]
    sources.homageDepth = 0
    sources.derivedBorders = computed.borders
    sources.borderPatterns = null
    sources.borderLevels = null
    sources.tribeOutlines = []
    return
  }
  const { year, bbox } = loaded.authored
  const homage = homageLevels(year.registry.polities)
  const exact = exactBordersOf(year, bbox, sources.landMask, undefined, homage)
  // Derived once here, for the tint levels and the tribe outlines alike. The pipeline derived the same map
  // a step earlier (`authoredRegionColours`, for the compute's request); a per-year cache to share it
  // across that await would cost more state than one more walk of the neighbour graph per year opened.
  const colours = polityColours(openYearDocument(year), palette)
  const { deepest, levels } = authoredTintsByLevel(
    year,
    loaded.regions,
    computed.tints,
    colours,
    homage
  )
  sources.regionTints = deepest
  sources.tintLevels = levels
  sources.homageDepth = homage.deepest
  sources.derivedBorders = exact.borders
  sources.borderPatterns = exact.patterns
  sources.borderLevels = exact.levels
  sources.tribeOutlines = colouredTribeOutlines(exact.tribeOutlines, colours)
}

/**
 * Each tribe's outline in its colour.
 * @param outlines - each tribe's rings, by polity id
 * @param colours - every polity's colour, by id — `polityColours` of the year
 * @returns the outlines, each in its tribe's colour; empty for a year with no tribe
 */
function colouredTribeOutlines(
  outlines: ReturnType<typeof exactBordersOf>['tribeOutlines'],
  colours: ReadonlyMap<string, string>
): MapSources['tribeOutlines'] {
  return outlines.flatMap(({ polity, rings }) => {
    const colour = colours.get(polity)
    if (colour !== undefined) return [{ colour, rings }]
    // polityColours colours every polity of the year, and the reader refused a claim naming none.
    console.error(`[atlas] tribe "${polity}" has no colour; its outline is not drawn.`)
    return []
  })
}

/**
 * An authored year's tints at every level of homage, a tribe unfilled at each.
 *
 * The levels below the deepest come from the editor's colours (`authoredTintLevels`); the deepest is the
 * compute's own tints, which the pipeline asked for in those same colours (`politicalRequest`) — so fully
 * zoomed in, the map is the one it was before levels.
 * @param year - the year's three files
 * @param regions - its regions, each carrying the id of its polity
 * @param computed - each region's tint as the compute settled it
 * @param colours - every polity's colour, by id — `polityColours` of the year
 * @param homage - the year's homage read as levels
 * @returns the deepest level's tints, and every level's, level 0 first — each one tint per region
 */
function authoredTintsByLevel(
  year: AuthoredYear,
  regions: RegionSet['regions'],
  computed: readonly RgbColor[],
  colours: ReadonlyMap<string, string>,
  homage: HomageLevels
): { deepest: (RgbColor | null)[]; levels: (RgbColor | null)[][] } {
  const tribes = tribeIds(year.registry.polities)
  const unlessTribe = (tint: RgbColor, index: number): RgbColor | null => {
    const polity = regions[index]?.polityId
    return polity !== undefined && tribes.has(polity) ? null : tint
  }
  const below = authoredTintLevels(colours, regions, homage).slice(0, -1)
  const deepest = computed.map(unlessTribe)
  return { deepest, levels: [...below.map((level) => level.map(unlessTribe)), deepest] }
}
