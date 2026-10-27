/**
 * A change of year: its polities fetched, computed into tints and lines, baked into the texture, laid on the relief.
 */

import { authoredRegionColours } from '@europe-historical-atlas/core/editor/polityColours'
import { scaleProgress } from '@europe-historical-atlas/core/pipeline/inlineCompute'
import { hexToRgb } from '@europe-historical-atlas/core/utils/color'

import { politicalPalette } from '../../tunables/params'
import { COMPUTE_PHASE_MESSAGES } from '../computeLabels'
import { settleYearBorders } from '../yearBorders'

import { rebuildTexture } from './texture'

import type { DevState } from '../../tunables/devState'
import type { PipelineContext } from '../pipelineContext'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { MapCompute, ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'

/**
 * How a change of year divides the progress bar. Measured rather than chosen: the fetch is a local file,
 * the compute costs hundreds of milliseconds and the bake longer still. What is left above `bake` is the
 * border geometry, which is this thread's own work and quick.
 */
const POLITICAL_SPLIT = { fetch: 0.1, compute: 0.65, bake: 0.95 }

/**
 * A change of year, end to end.
 *
 * Every await below is a place a second rebuild can start — the palette pickers fire continuously, and a
 * year fetched from cache can overtake one still in flight. Checked before *every* side effect, not only
 * before the state write: a stale call whose raster was correctly suppressed would otherwise still go on
 * to overwrite the live texture and the border layer underneath the newer one.
 * @param context - the pipeline's world
 * @returns once the year is on screen
 */
export async function rebuildPolitical(context: PipelineContext): Promise<void> {
  const { dev, sources, layers, ui } = context
  if (!sources.heightmap) return
  const isCurrent = context.politicalGate.begin()
  // Snap the chosen year to its century, and open the progress bar on it.
  const year = Math.round(dev.political.year / 100) * 100
  ui.progress.begin(context.translate('loadingYear', { year: String(year) }))
  try {
    // 1. Fetch the year's polities; drop out if torn down or overtaken by a newer year.
    const loaded = await context.assets.regions.load(year)
    if (context.isDisposed() || !isCurrent()) return

    // The bar spans two jobs, so each reports into its own slice rather than being told where it sits
    // in a sequence it knows nothing about.
    const report: ProgressReport = (fraction, phase) => {
      ui.progress.report(fraction, context.translate(COMPUTE_PHASE_MESSAGES[phase]))
    }
    // 2. Ask the compute for the year's tints and traced lines, in the bar's compute slice.
    const result = await context.box.compute.computePolitical(
      politicalRequest(dev, loaded),
      scaleProgress(report, POLITICAL_SPLIT.fetch, POLITICAL_SPLIT.compute)
    )
    if (context.isDisposed() || !isCurrent()) return
    // The year and its lines change together: a redraw between the two would read one year's pairs
    // against the other's polities, or one kind of year's patterns against the other kind's lines.
    sources.regionSet = loaded
    settleYearBorders(sources, loaded, result, politicalPalette(dev.political))

    // 3. Re-bake the terrain with the year's colours, in the bar's bake slice.
    await rebuildTexture(
      context,
      scaleProgress(report, POLITICAL_SPLIT.compute, POLITICAL_SPLIT.bake)
    )
    if (context.isDisposed() || !isCurrent()) return

    // 4. Lay the fills and the border lines, then fill the bar.
    layers.rebuildFills()
    layers.rebuildBorders()
    ui.progress.report(1)
  } catch (error: unknown) {
    // A failed fetch or compute is told as a failure of the year's file.
    ui.reportAssetFailure('regions', error)
  } finally {
    // The bar closes whether the year landed, failed or was overtaken.
    ui.progress.end()
  }
}

/**
 * What the compute is asked for, gathered from the live tunables.
 *
 * **An authored year's claims are never grown toward the coast.** The growth exists for the per-century
 * payloads, whose schematic outlines miss the shore; an authored outline already runs along it, so the
 * growth only spreads each polity over the unclaimed land beside it — ~20 km past the line its author drew
 * and the atlas now draws exactly (seen 2026-10-13: Burgundy over the Alps, France over Lorraine).
 * @param dev - the live tunables
 * @param loaded - the year's polities
 * @returns the request
 */
export function politicalRequest(
  dev: DevState,
  loaded: RegionSet
): Parameters<MapCompute['computePolitical']>[0] {
  // One reading of the palette for both uses: the automatic tints and the editor's colours agree on it.
  const palette = politicalPalette(dev.political)
  return {
    regions: loaded.regions,
    rasterScale: dev.political.rasterScale,
    snapToCoast: loaded.authored === undefined ? dev.political.snapToCoast : 0,
    colorBySuzerain: dev.political.colorBySuzerain,
    palette: palette.map(hexToRgb),
    borderSmoothing: dev.political.borderSmoothing,
    // An authored year is painted in the Cartographer's colours, polity by polity: the editor shows what
    // the atlas publishes, or it is not an editor. `settleYearBorders` derives the same colours again after
    // the compute, for the tint levels and the tribes: a per-year cache across that await would cost more
    // than the second walk of the neighbour graph (ARCH-013).
    ...(loaded.authored === undefined
      ? {}
      : {
          colours: authoredRegionColours(loaded.authored.year, loaded.regions, palette),
        }),
  }
}
