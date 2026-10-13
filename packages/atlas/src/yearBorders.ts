/**
 * Which border lines the atlas draws for the year on screen.
 *
 * **An authored year draws its own, exact** — from the anchors the Cartographer shares, in their hands and
 * with their overrides (D1 of `files/plans/borders/plan.md`, the dev's call of 2026-10-13). A year still
 * read from the per-century payloads keeps the lines the compute traced from the raster of its fills: it
 * has no anchors to draw from.
 *
 * Kept apart from the pipeline because it takes data and returns data: the composition root only wires it.
 */

import { exactBordersOf } from '@europe-historical-atlas/core/editor/atlasBorders'

import type { MapSources } from './mapSources'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'

/**
 * Settle the year's border lines and their patterns into the sources.
 * @param sources - the sources, written in place: `derivedBorders` and `borderPatterns`
 * @param loaded - the year on screen
 * @param traced - the lines the compute traced from the raster
 * @returns nothing
 */
export function settleYearBorders(
  sources: Pick<MapSources, 'derivedBorders' | 'borderPatterns' | 'landMask'>,
  loaded: RegionSet,
  traced: RegionBorders
): void {
  if (loaded.authored === undefined) {
    sources.derivedBorders = traced
    sources.borderPatterns = null
    return
  }
  const exact = exactBordersOf(loaded.authored.year, loaded.authored.bbox, sources.landMask)
  sources.derivedBorders = exact.borders
  sources.borderPatterns = exact.patterns
}
