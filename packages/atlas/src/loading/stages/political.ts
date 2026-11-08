/**
 * A change of year: its polities fetched, computed into tints and lines, baked into the texture, laid on the relief.
 */

import { authoredRegionColours } from '@europe-historical-atlas/core/data/polityColours'
import { scaleProgress } from '@europe-historical-atlas/core/pipeline/inlineCompute'
import { hexToRgb } from '@europe-historical-atlas/core/utils/color'

import { paintsExactFills, yearPaintsExactFills } from '../../scene/political/paintsExactFills'
import { tribeCutSettings } from '../../scene/political/tribes/mapTribeLayer'
import { meshVertexGrid } from '../../scene/relief/reliefMesh'
import { politicalPalette } from '../../tunables/params'
import { COMPUTE_PHASE_MESSAGES } from '../computeLabels'
import { settleYearBorders, yearTribes } from '../yearBorders'
import { startStep, timedStep } from '../yearTiming'

import { rebuildYearNames } from './names'
import { rebuildTexture } from './texture'

import type { AuthoredSet } from '../../scene/political/paintsExactFills'
import type { MeasuredTribes } from '../../scene/political/tribes/mapTribeLayer'
import type { DevState } from '../../tunables/devState'
import type { PipelineContext } from '../pipelineContext'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'
import type { FillGrid } from '@europe-historical-atlas/core/pipeline/fillTriangles'
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
 * The same for a year the fills paint — no grid, no bake: read, cut in the worker, laid here. Measured in Chrome on the
 * built site, 2026-11-08, on 1100 at the startup: read 0.3–0.4 s, cut 0.7 s, settled and laid 0.15 s.
 */
const EXACT_SPLIT = { fetch: 0.29, cut: 0.87 }

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
): Promise<DrawnYear | null> {
  const asked = centuryOf(context)
  const { clock } = context
  // 0. A year set aside under the settings of now comes back whole, in a frame (ATLAS-333).
  const endRestore = startStep(clock, asked, 'restore')
  const restored = restoreYear(context, asked)
  if (restored !== null) {
    endRestore()
    return { loaded: restored, restored: true }
  }
  // 1. Fetch the year's polities; drop out if torn down or overtaken by a newer year.
  const loaded = await timedStep(clock, asked, 'fetch', () => context.assets.regions.load(asked))
  if (context.isDisposed() || !isCurrent()) return null
  // 2. The year's tints and traced lines: from the compute's grid, or — for a year the fills paint — straight from it,
  //    its polities then cut in the worker (said on the bar before the wait).
  const exact = yearPaintsExactFills(context.dev, loaded)
  if (exact) report(EXACT_SPLIT.fetch, 'cut')
  const result = exact
    ? await exactYearResult(context, loaded)
    : await gridYearResult(
        context,
        loaded,
        scaleProgress(report, POLITICAL_SPLIT.fetch, POLITICAL_SPLIT.compute)
      )
  if (context.isDisposed() || !isCurrent()) return null
  return installYear(context, { asked, loaded, result }, isCurrent, report)
}

/**
 * Put a year read and computed on screen: the one shown set aside, the year's lines settled, the terrain baked when it
 * must be, the fills, borders and events laid.
 * @param context - the pipeline's world
 * @param year - the year asked, its polities and what the compute settled
 * @param year.asked - the year asked for
 * @param year.loaded - its polities
 * @param year.result - its tints and traced lines
 * @param isCurrent - whether this year is still the newest asked for
 * @param report - where its progress goes
 * @returns the year drawn; `null` when torn down or overtaken during the bake
 */
async function installYear(
  context: PipelineContext,
  year: { asked: number; loaded: RegionSet; result: PoliticalResult },
  isCurrent: () => boolean,
  report: ProgressReport
): Promise<DrawnYear | null> {
  const { dev, sources, layers } = context
  const { asked, loaded, result } = year
  // 3. The bake and the fills' cut, both off this thread, side by side — the last wait: neither reads the year on
  //    screen, so nothing of it is touched before them.
  const cut = await timedStep(context.clock, asked, 'prepare', () =>
    prepareYear(context, loaded, report)
  )
  if (context.isDisposed() || !isCurrent()) return null
  // 4. Lay the year — this thread's own work, held in one block: its step is said and painted first (ATLAS-333).
  report(yearPaintsExactFills(dev, loaded) ? EXACT_SPLIT.cut : POLITICAL_SPLIT.bake, 'borders')
  await context.afterPaint()
  if (context.isDisposed() || !isCurrent()) return null
  // From here to the end, no wait: the year on screen is set aside and the new one laid in one go, so a year overtaken
  // or failing leaves the map — and the years set aside — as they were (reviews QUAL-001, ARCH-001).
  if (asked !== sources.askedYear) setShownYearAside(context)
  // The year and its lines change together: a redraw between the two would read one year's pairs against the
  // other's polities, or one kind of year's patterns against the other kind's lines.
  sources.regionSet = loaded
  const endSettle = startStep(context.clock, asked, 'settle')
  settleYearBorders(sources, loaded, result, politicalPalette(dev.political))
  endSettle()
  // The worker's cuts, once the sources hold the year they were cut for: laying the fills and the tribes cuts nothing.
  if (cut !== null) {
    layers.primeFillCut(loaded.regions, cut.grid, cut.fills)
    if (cut.tribes !== null) layers.primeTribeCut(cut.grid, cut.tribes)
  }
  // The fills and the border lines.
  const endFills = startStep(context.clock, asked, 'fills')
  layers.rebuildFills()
  endFills()
  const endBorders = startStep(context.clock, asked, 'borders')
  layers.rebuildBorders()
  endBorders()
  // 5. The events of this year only, once its map is on screen: a change of year that fails leaves the map, and its
  //    events, as they were (review QUAL-004). A no-op at startup, which pins them itself once the map is drawn.
  sources.askedYear = asked
  const endEvents = startStep(context.clock, asked, 'events')
  layers.rebuildEvents()
  endEvents()
  return { loaded, restored: false }
}

/** The fills of a year cut in the worker, and the grid they were cut on. */
interface WorkerCut {
  /** The relief's subdivision. */
  readonly grid: FillGrid
  /** One triangle list per polity. */
  readonly fills: Float32Array[]
  /** The tribes' patches, measured in the worker too, with their settings; `null` for a year with no tribe. */
  readonly tribes: MeasuredTribes | null
}

/**
 * What a year needs before it can be laid in one go, both off this thread and side by side (ATLAS-333): the terrain
 * re-baked with its colours, in the share's bake slice — unless the fills paint the year and the bare terrain they lie
 * on is already on the relief, which that bake would give back pixel for pixel — and, for a year the fills paint, its
 * polities cut on the relief's grid in the worker, so laying them cuts nothing here.
 * @param context - the pipeline's world
 * @param loaded - the year's polities
 * @param report - where the bake's progress goes
 * @returns the worker's cut, or `null` when the texture carries the year or no relief is in yet — the fills then cut,
 *   or say what they wait for, as they always did
 * @throws what the bake or the cut throws — the caller tells it as the year's failure
 */
async function prepareYear(
  context: PipelineContext,
  loaded: RegionSet,
  report: ProgressReport
): Promise<WorkerCut | null> {
  const { dev, sources } = context
  const exact = yearPaintsExactFills(dev, loaded)
  const heightmap = sources.heightmap
  const bake =
    exact && context.held.bareTexture
      ? Promise.resolve()
      : rebuildTexture(
          context,
          scaleProgress(report, POLITICAL_SPLIT.compute, POLITICAL_SPLIT.bake)
        )
  const bounds = loaded.authored?.bbox
  if (!exact || heightmap === null || bounds === undefined) {
    await bake
    return null
  }
  const grid = meshVertexGrid(heightmap.meta, dev.relief.segments)
  const [, fills, tribes] = await Promise.all([
    bake,
    timedStep(context.clock, loaded.year, 'cut', () =>
      context.box.compute.cutFills(loaded.regions, grid)
    ),
    measureTribes(context, loaded, { bounds, grid }),
  ])
  return { grid, fills, tribes }
}

/**
 * A year's tribes measured in the worker, as `rebuildTribes` would measure them here (ATLAS-333).
 * @param context - the pipeline's world
 * @param loaded - the authored year
 * @param ground - its frame and the relief's grid
 * @param ground.bounds - the frame
 * @param ground.grid - the relief's subdivision
 * @returns the patches and the settings read for them; `null` for a year with no tribe, which draws none
 */
async function measureTribes(
  context: PipelineContext,
  loaded: RegionSet,
  ground: { bounds: GeoBounds; grid: FillGrid }
): Promise<MeasuredTribes | null> {
  const { dev } = context
  const tribes = yearTribes(loaded, politicalPalette(dev.political))
  if (tribes.length === 0) return null
  // Read once, before the wait: the patches are kept under these, not under what the settings are when they land.
  const settings = tribeCutSettings(dev)
  const patches = await timedStep(context.clock, loaded.year, 'tribes', () =>
    context.box.compute.cutTribes(tribes, {
      claims: loaded.regions,
      bounds: ground.bounds,
      grid: ground.grid,
      ...settings,
    })
  )
  return { patches, settings }
}

/** A year on screen, and whether it came back from the years set aside rather than being built. */
interface DrawnYear {
  /** The year's polities. */
  readonly loaded: RegionSet
  /** Whether it was put back whole — its names with it, when they had come before it was left. */
  readonly restored: boolean
}

/**
 * Whether the year on screen can be set aside: a year whose countries are geometry (an authored year, exact fills on).
 * A year the texture carries is baked into it, so there is nothing to keep apart.
 * @param context - the pipeline's world
 * @returns the year on screen, or `null` when there is none to set aside
 */
function shownYearToShelve(context: PipelineContext): number | null {
  const { sources, dev } = context
  if (sources.askedYear === null || sources.regionSet === null) return null
  return paintsExactFills(dev, sources) ? sources.askedYear : null
}

/**
 * Set the year on screen aside, when it can be. Its names still being placed would land on the next year: given up
 * here — the placement is kept in the names' cache all the same (`placeNames`), and laid when the year comes back.
 * @param context - the pipeline's world
 */
function setShownYearAside(context: PipelineContext): void {
  const shown = shownYearToShelve(context)
  if (shown === null) return
  context.namesGate.begin()
  context.layers.shelveYear(shown)
}

/**
 * Put a year set aside back on screen, in place of the one shown — when it was set aside under the settings of now and
 * the year on screen can be set aside in turn. Otherwise nothing moves, and the year is built.
 * @param context - the pipeline's world
 * @param asked - the year asked for
 * @returns its polities when it came back; `null` when it must be built
 */
function restoreYear(context: PipelineContext, asked: number): RegionSet | null {
  const { sources, layers } = context
  if (asked === sources.askedYear || !layers.holdsYear(asked)) return null
  if (shownYearToShelve(context) === null) return null
  setShownYearAside(context)
  // The year asked is the one shown before its layers come back: its events came back with it, built for this very
  // year — or are pinned by the layers when it was left before they landed, and those read the year asked.
  sources.askedYear = asked
  if (!layers.restoreYear(asked) || sources.regionSet === null) {
    // `holdsYear` said yes a moment ago, with nothing between: a defect, said, never a blank map passed off as a year.
    throw new Error(
      `[atlas] ${String(asked)} was set aside under these settings, yet did not come back`
    )
  }
  return sources.regionSet
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
  const asked = centuryOf(context)
  try {
    const drawn = await timedStep(context.clock, asked, 'total', () =>
      drawYear(context, isCurrent, barReport(context))
    )
    if (drawn === null) return
    ui.progress.report(1)
    // A year put back with its names needs none placed; one left before they came gets them now, from their cache.
    if (!drawn.restored || sources.yearNames === null) {
      void timedStep(context.clock, asked, 'names', () => rebuildYearNames(context, drawn.loaded))
    }
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
    // Nothing is set aside before the first year: the startup always builds it.
    return (await drawYear(context, isCurrent, report))?.loaded ?? null
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
