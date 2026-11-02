/**
 * A change of year: its polities fetched, computed into tints and lines, baked into the texture, laid on the relief.
 */

import { authoredRegionColours } from '@europe-historical-atlas/core/editor/polityColours'
import { scaleProgress } from '@europe-historical-atlas/core/pipeline/inlineCompute'
import { hexToRgb } from '@europe-historical-atlas/core/utils/color'

import { yearPaintsExactFills } from '../../scene/political/paintsExactFills'
import { politicalPalette } from '../../tunables/params'
import { COMPUTE_PHASE_MESSAGES } from '../computeLabels'
import { settleYearBorders } from '../yearBorders'

import { rebuildYearNames } from './names'
import { rebuildTexture } from './texture'

import type { AuthoredSet } from '../../scene/political/paintsExactFills'
import type { DevState } from '../../tunables/devState'
import type { PipelineContext } from '../pipelineContext'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type {
  MapCompute,
  PoliticalResult,
  ProgressReport,
} from '@europe-historical-atlas/core/pipeline/mapCompute'

/**
 * How drawing a year divides the share of the bar it is given. Measured rather than chosen: the fetch is a local file,
 * the compute costs hundreds of milliseconds and the bake longer still. What is left above `bake` is the fills and the
 * borders, built on this thread.
 */
const POLITICAL_SPLIT = { fetch: 0.1, compute: 0.65, bake: 0.95 }

/**
 * The year chosen in the panel, snapped to its century.
 * @param context - the pipeline's world
 * @returns the year
 */
export function centuryOf(context: PipelineContext): number {
  return Math.round(context.dev.political.year / 100) * 100
}

/**
 * Draw a year: its polities fetched, computed into tints and lines, baked into the texture, the fills and the borders
 * laid on the relief — reporting from nought to one of the share of the bar it is given.
 *
 * Every await below is a place a second rebuild can start — the palette pickers fire continuously, and a year fetched
 * from cache can overtake one still in flight. Checked before *every* side effect, not only before the state write: a
 * stale call whose raster was correctly suppressed would otherwise still go on to overwrite the live texture and the
 * border layer underneath the newer one.
 * @param context - the pipeline's world
 * @param isCurrent - whether this year is still the newest asked for
 * @param report - where its progress goes, `0..1` of its share, with the step running
 * @returns the year drawn; `null` when torn down or overtaken
 * @throws what the fetch or the compute throws — the caller tells it as the year's failure
 */
async function drawYear(
  context: PipelineContext,
  isCurrent: () => boolean,
  report: ProgressReport
): Promise<RegionSet | null> {
  const { dev, sources, layers } = context
  const asked = centuryOf(context)
  // 1. Fetch the year's polities; drop out if torn down or overtaken by a newer year.
  const loaded = await context.assets.regions.load(asked)
  if (context.isDisposed() || !isCurrent()) return null
  // 2. The year's tints and traced lines: from the compute's grid, or — for a year the fills paint — straight from it.
  const exact = yearPaintsExactFills(dev, loaded)
  const result = exact
    ? await exactYearResult(context, loaded)
    : await gridYearResult(
        context,
        loaded,
        scaleProgress(report, POLITICAL_SPLIT.fetch, POLITICAL_SPLIT.compute)
      )
  if (context.isDisposed() || !isCurrent()) return null
  // The year and its lines change together: a redraw between the two would read one year's pairs against the
  // other's polities, or one kind of year's patterns against the other kind's lines.
  sources.regionSet = loaded
  settleYearBorders(sources, loaded, result, politicalPalette(dev.political))
  // 3. Re-bake the terrain with the year's colours, in the share's bake slice — unless the fills paint the year and
  //    the bare terrain they lie on is already on the relief: that bake would give it back pixel for pixel.
  if (!(exact && context.held.bareTexture)) {
    await rebuildTexture(
      context,
      scaleProgress(report, POLITICAL_SPLIT.compute, POLITICAL_SPLIT.bake)
    )
    if (context.isDisposed() || !isCurrent()) return null
  }
  // 4. Lay the fills and the border lines — this thread's own work, said before it holds the page still.
  report(POLITICAL_SPLIT.bake, 'borders')
  layers.rebuildFills()
  layers.rebuildBorders()
  // 5. The events of this year only, once its map is on screen: a change of year that fails leaves the map, and its
  //    events, as they were (review QUAL-004). A no-op at startup, which pins them itself once the map is drawn.
  sources.askedYear = asked
  layers.rebuildEvents()
  return loaded
}

/**
 * A year through the compute's grid: rasterised, grown, coloured and traced — a per-century payload, or an authored
 * year with the panel's *exact fills* off. The grid it installs tints the next bake.
 * @param context - the pipeline's world
 * @param loaded - the year
 * @param report - where the compute's progress goes, when a bar is shown
 * @returns the tints and the traced lines
 */
async function gridYearResult(
  context: PipelineContext,
  loaded: RegionSet,
  report: ProgressReport | undefined
): Promise<PoliticalResult> {
  context.held.grid = true
  return context.box.compute.computePolitical(politicalRequest(context.dev, loaded), report)
}

/**
 * A year the fills paint, with no grid (ATLAS-333): its tints are the Cartographer's colours — what the compute would
 * have handed back from the request (`politicalRequest`) — and its lines are drawn from its anchors by
 * `settleYearBorders`, so none are traced. Measured on 1100, 02/11: 1.6 s of rasterising saved per change of year. The
 * grid a previous year left in the compute is taken off, so no later bake tints the terrain with it.
 * @param context - the pipeline's world
 * @param loaded - the authored year
 * @returns the tints, and no traced lines
 */
async function exactYearResult(
  context: PipelineContext,
  loaded: AuthoredSet
): Promise<PoliticalResult> {
  if (context.held.grid) {
    // Written before the await, in the order the messages go to the compute: a newer year that sends its grid while
    // this clear is on its way sets the flag back after this line, as the compute will hold its grid after the clear.
    context.held.grid = false
    try {
      await context.box.compute.clearPolitical()
    } catch (error: unknown) {
      // Not cleared: the grid may still be there, so no later bake may believe the terrain bare. Told as the year's
      // failure by the caller.
      context.held.grid = true
      throw error
    }
  }
  const palette = politicalPalette(context.dev.political)
  const tints = authoredRegionColours(loaded.authored.year, loaded.regions, palette)
  return { tints, borders: { between: [], frontier: [] } }
}

/**
 * A step's progress told on the bar, in the reader's language.
 * @param context - the pipeline's world
 * @returns the report
 */
export function barReport(context: PipelineContext): ProgressReport {
  return (fraction, phase) => {
    context.ui.progress.report(fraction, context.translate(COMPUTE_PHASE_MESSAGES[phase]))
  }
}

/**
 * A change of year, end to end, under its own bar; the names after it, outside the bar — the map stays on screen and
 * does not wait for them.
 * @param context - the pipeline's world
 * @returns once the year is on screen
 */
export async function rebuildPolitical(context: PipelineContext): Promise<void> {
  const { sources, ui } = context
  if (!sources.heightmap) return
  const isCurrent = context.politicalGate.begin()
  ui.progress.begin(context.translate('loadingYear', { year: String(centuryOf(context)) }))
  try {
    const loaded = await drawYear(context, isCurrent, barReport(context))
    if (loaded === null) return
    ui.progress.report(1)
    void rebuildYearNames(context, loaded)
  } catch (error: unknown) {
    // A failed fetch or compute is told as a failure of the year's file.
    ui.reportAssetFailure('regions', error)
  } finally {
    // The bar closes whether the year landed, failed or was overtaken.
    ui.progress.end()
  }
}

/**
 * The year drawn at startup, reporting into the share of the startup's bar it is given; the bar is the startup's to
 * open and close.
 * @param context - the pipeline's world
 * @param report - where its progress goes, `0..1` of its share
 * @returns the year drawn; `null` when torn down, overtaken, or failed — a failure is told as the year's
 */
export async function startYear(
  context: PipelineContext,
  report: ProgressReport
): Promise<RegionSet | null> {
  if (!context.sources.heightmap) return null
  const isCurrent = context.politicalGate.begin()
  try {
    return await drawYear(context, isCurrent, report)
  } catch (error: unknown) {
    // The first year failed: its events still stand, under its failure (the dev, 2026-10-26) — they are dated, and no
    // other year's map is on screen to contradict them.
    context.sources.askedYear = centuryOf(context)
    context.ui.reportAssetFailure('regions', error)
    return null
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
