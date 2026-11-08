/**
 * Bringing the map up behind the splash, under one bar that tells every step, until the first map is wholly laid.
 */

import { refreshReliefSource } from '../../sources/mapSources'
import { COMPUTE_PHASE_MESSAGES } from '../computeLabels'
import { createStartupBar } from '../startupBar'
import { startStep, timedStep } from '../yearTiming'

import { rebuildYearNames } from './names'
import { centuryOf, startYear } from './political'
import { settleRivers } from './rivers'
import { loadTerrain } from './terrain'
import { pushSources, rebuildTexture } from './texture'

import type { PipelineContext } from '../pipelineContext'
import type { StartupBar } from '../startupBar'

/**
 * Bring the map up **behind the splash, which stays until the first map is wholly laid** (the dev, 2026-11-08: *"as long
 * as the first map is not loaded, 1100 by default, the splash stays, with the bar taking stock of the progress"* — the
 * screens of Claude Design): the relief, the texture, the sheet and its decor, then the year, its names and the events,
 * each told on the one bar before it runs; then the splash goes, on the whole map. The bare relief never shows alone.
 *
 * Two bakes and not one stays the dev's call of 2026-10-29: the bare terrain first, the year's fills laid over it.
 * @param context - the pipeline's world
 * @param content - the events loading beside the startup, settled once they are pinned or told failed
 * @returns once the map is on screen and the splash gone — or once a failure is told, the splash kept over it
 */
export async function startup(context: PipelineContext, content: Promise<void>): Promise<void> {
  const { ui, translate } = context
  const year = centuryOf(context)
  const bar = createStartupBar((fraction, label) => {
    ui.progress.report(fraction, label)
  })
  ui.progress.begin(translate('phaseTerrain'))
  bar.step('terrain', 0, translate('phaseTerrain'))
  try {
    if (!(await bringTheRelief(context, bar, year))) return
    await bringTheYear(context, content, bar)
    if (context.isDisposed()) return
    // The bar full on screen, then the splash goes on the whole map.
    await context.afterPaint()
  } finally {
    ui.progress.end()
  }
  if (context.isDisposed()) return
  ui.dismissSplash()
}

/**
 * The relief, the mask, the bare terrain and the sheet with its decor — the map's ground, built behind the splash.
 * @param context - the pipeline's world
 * @param bar - the startup's bar
 * @param year - the year asked, for the measures' names
 * @returns whether the ground is in; `false` when torn down or when the relief failed — told, the splash kept
 */
async function bringTheRelief(
  context: PipelineContext,
  bar: StartupBar,
  year: number
): Promise<boolean> {
  const { dev, sources, layers, translate } = context
  // Load the relief and the mask, their bytes counted on the bar; without a relief there is nothing to draw.
  const loading = translate('phaseTerrain')
  await timedStep(context.clock, year, 'terrain', () =>
    loadTerrain(context, (fraction) => {
      bar.step('terrain', fraction, loading)
    })
  )
  if (context.isDisposed() || !sources.heightmap) return false
  refreshReliefSource(sources, dev.relief, dev.texture.seaLevel) // draping is correct from here on, mesh or no mesh
  settleRivers(context) // when the rivers came first, they waited for the relief to drape on
  // Hand the compute its own copy of the elevation and the mask.
  await pushSources(context)
  if (context.isDisposed()) return false

  // The bare terrain, row by row on the bar. Awaited before the mesh is built, never fired and forgotten — a relief
  // built while the texture is still in the worker takes no map at all and shows as bare material colour.
  const composing = translate(COMPUTE_PHASE_MESSAGES.bake)
  bar.step('texture', 0, composing)
  await timedStep(context.clock, year, 'texture', () =>
    rebuildTexture(context, (fraction) => {
      bar.step('texture', fraction, composing)
    })
  )
  if (context.isDisposed()) return false

  // The sheet, the relief and the decor hold the page in one block: their step is painted first.
  bar.step('scene', 0, translate('phaseRelief'))
  await context.afterPaint()
  if (context.isDisposed()) return false
  const endScene = startStep(context.clock, year, 'scene')
  layers.rebuildFrame() // the sheet first: everything else is printed on it
  layers.rebuildRelief()
  layers.rebuildCoastline()
  layers.rebuildRhumb()
  layers.rebuildRivers() // no-op until the river payload lands; whichever finishes last draws them
  layers.rebuildRose()
  endScene()
  return true
}

/**
 * The year, its names and the events, each told on its share of the startup's bar.
 * @param context - the pipeline's world
 * @param content - the events loading beside the startup
 * @param bar - the startup's bar
 * @returns once all three are in — or told failed
 */
async function bringTheYear(
  context: PipelineContext,
  content: Promise<void>,
  bar: StartupBar
): Promise<void> {
  const { sources, layers, translate } = context
  bar.step('year', 0, translate('loadingYear', { year: String(centuryOf(context)) }))
  const year = await startYear(context, (fraction, phase) => {
    bar.step('year', fraction, translate(COMPUTE_PHASE_MESSAGES[phase]))
  })
  if (context.isDisposed()) return
  if (year !== null) {
    bar.step('names', 0, translate('phaseNames'))
    await timedStep(context.clock, year.year, 'names', () => rebuildYearNames(context, year))
    if (context.isDisposed()) return
  }
  // The events, once the map is drawn (the dev, 2026-10-26) — on a failed year too, whose failure is on screen: valid
  // events are not hidden because another file did not come.
  const pinning = translate('phaseEvents')
  bar.step('events', 0, pinning)
  const endEvents = startStep(context.clock, centuryOf(context), 'events')
  await content
  endEvents()
  if (context.isDisposed()) return
  sources.mapDrawn = true
  layers.rebuildEvents()
  // Full once the events are pinned, never while they are awaited (review ARCH-004, QUAL-003).
  bar.step('events', 1, pinning)
}
