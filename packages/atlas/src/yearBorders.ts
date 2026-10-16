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
 * Kept apart from the pipeline because it takes data and returns data: the composition root only wires it.
 */

import { exactBordersOf } from '@europe-historical-atlas/core/editor/atlasBorders'
import { polityColours } from '@europe-historical-atlas/core/editor/polityColours'
import { tribeIds } from '@europe-historical-atlas/core/editor/tribes'
import { openYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import type { MapSources } from './mapSources'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
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
    'derivedBorders' | 'borderPatterns' | 'landMask' | 'regionTints' | 'tribeOutlines'
  >,
  loaded: RegionSet,
  computed: ComputedYear,
  palette: readonly [string, ...string[]]
): void {
  if (loaded.authored === undefined) {
    sources.regionTints = computed.tints
    sources.derivedBorders = computed.borders
    sources.borderPatterns = null
    sources.tribeOutlines = []
    return
  }
  const { year, bbox } = loaded.authored
  const exact = exactBordersOf(year, bbox, sources.landMask)
  const tribes = tribeIds(year.registry.polities)
  sources.regionTints = computed.tints.map((tint, index) => {
    const polity = loaded.regions[index]?.polityId
    return polity !== undefined && tribes.has(polity) ? null : tint
  })
  sources.derivedBorders = exact.borders
  sources.borderPatterns = exact.patterns
  if (exact.tribeOutlines.length === 0) {
    sources.tribeOutlines = []
    return
  }
  const colours = polityColours(openYearDocument(year), palette)
  sources.tribeOutlines = exact.tribeOutlines.flatMap(({ polity, rings }) => {
    const colour = colours.get(polity)
    if (colour !== undefined) return [{ colour, rings }]
    // polityColours colours every polity of the year, and the reader refused a claim naming none.
    console.error(`[atlas] tribe "${polity}" has no colour; its outline is not drawn.`)
    return []
  })
}
