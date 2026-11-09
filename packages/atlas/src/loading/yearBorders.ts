/**
 * Which border lines, tints and tribes the atlas draws for the year on screen — written into its sources.
 *
 * **An authored year draws its own, exact** — from the anchors the Cartographer shares, in their hands and
 * with their overrides (D1 of `files/plans/borders/plan.md`, the dev's call of 2026-10-13); its colours, its tints by
 * level of homage and its tribes are settled with them. **The settling is core's** (`core/pipeline/settleYear`,
 * ATLAS-333): run in the worker for a year the fills paint, handed here ready (`installSettledYear`); run on this
 * thread only for the grid path the dev panel keeps for comparison (`exactFills` off). A year still read from the
 * per-century payloads keeps the lines the compute traced from the raster of its fills: it has no anchors to draw
 * from.
 *
 * The grid path bakes the compute's own tints and still fills a tribe; left so by decision, that path no longer ships
 * (`known-issues-atlas.md`).
 *
 * Kept apart from the pipeline because it takes data and returns data: the composition root only wires it.
 */

import { settleAuthoredYear } from '@europe-historical-atlas/core/pipeline/settleYear'

import type { MapSources } from '../sources/mapSources'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { SettledYear } from '@europe-historical-atlas/core/pipeline/settleYear'
import type { RgbColor } from '@europe-historical-atlas/core/utils/color'

/** The sources a year's settling writes. */
type SettledSources = Pick<
  MapSources,
  | 'derivedBorders'
  | 'borderPatterns'
  | 'borderLevels'
  | 'landMask'
  | 'regionTints'
  | 'tintLevels'
  | 'homageDepth'
  | 'bandDepths'
  | 'tribes'
  | 'hatches'
>

/** What the compute settled for the year: its traced lines and each region's tint. */
export interface ComputedYear {
  /** The lines traced from the raster of the fills. */
  borders: RegionBorders
  /** Each region's tint, in the regions' order. */
  tints: RgbColor[]
}

/**
 * Settle the year's tints, border lines and tribes into the sources, on this thread — a payload year from what the
 * compute traced, an authored one by core's settling against the land mask the sources hold.
 * @param sources - the sources, written in place
 * @param loaded - the year on screen
 * @param computed - what the compute settled for it; an authored year reads only a payload's
 * @param palette - the automatic palette, the one the year's colours are chosen from
 * @returns nothing
 */
export function settleYearBorders(
  sources: SettledSources,
  loaded: RegionSet,
  computed: ComputedYear,
  palette: readonly [string, ...string[]]
): void {
  // A payload year: the compute's tints and traced lines, one level, no patterns, no tribes.
  if (loaded.authored === undefined) {
    sources.regionTints = computed.tints
    sources.tintLevels = [computed.tints]
    sources.homageDepth = 0
    sources.bandDepths = null
    sources.derivedBorders = computed.borders
    sources.borderPatterns = null
    sources.borderLevels = null
    sources.tribes = []
    sources.hatches = []
    return
  }
  const { year, bbox } = loaded.authored
  installSettledYear(
    sources,
    settleAuthoredYear({ year, bbox, regions: loaded.regions, palette }, sources.landMask)
  )
}

/**
 * Write an authored year settled — in the worker, or here — into the sources, everything the layers read for it
 * together.
 * @param sources - the sources, written in place
 * @param settled - the year settled
 * @returns nothing
 */
export function installSettledYear(sources: SettledSources, settled: SettledYear): void {
  sources.regionTints = settled.tints
  sources.tintLevels = settled.tintLevels
  sources.homageDepth = settled.homageDepth
  sources.bandDepths = settled.bandDepths
  sources.derivedBorders = settled.borders
  sources.borderPatterns = settled.patterns
  sources.borderLevels = settled.levels
  sources.tribes = settled.tribes
  sources.hatches = settled.hatches
  // An overlap the geometry refused goes unhatched — the Cartographer's rule (the dev, 2026-11-06) — and is said here,
  // once per year installed: the settling ran in the worker, whose console nobody reads.
  for (const { a, b, reason } of settled.hatchRefusals)
    console.error(
      b === null
        ? `[atlas] the shape of "${a}" could not be computed, so its overlaps are not hatched: ${reason}`
        : `[atlas] the overlap of "${a}" and "${b}" could not be computed, so it is not hatched: ${reason}`
    )
}
