/**
 * Bringing the map up in its deliberate stages: the relief first; then, under one bar, the year, its names and the
 * events, faded in together once all are in.
 */

import { refreshReliefSource } from '../../sources/mapSources'

import { rebuildYearNames } from './names'
import { barReport, centuryOf, startYear } from './political'
import { settleRivers } from './rivers'
import { loadTerrain } from './terrain'
import { pushSources, rebuildTexture } from './texture'

import type { PipelineContext } from '../pipelineContext'

/**
 * How the startup's one bar is shared: the year — its fetch, compute, bake, fills and borders — then its names, then
 * the events. **Claude's estimate, not a measure of the dev's browser**: the year about 3 s with its 2.2 s of fills
 * and borders (`files/plans/atlas/performance.md`), the names about 3 s in their worker under Node; the events are a
 * file already loading. To retune once timed on the dev's screen.
 */
const STARTUP_SPLIT = { year: 0.6, names: 0.95 }

/**
 * Bring the map up in deliberate stages: **the relief first, alone**; then, under one bar that tells every step, the
 * countries and their borders, their names and the events — **all faded in together** once the bar has told them all
 * (the dev, 2026-10-29: *« la carte en relief, c'est bien qu'on l'ait d'abord. Et ensuite, tout apparaît d'un seul coup
 * en fondu, avec la barre de chargement qui indique bien tout ce qui se passe »*).
 *
 * Two bakes and not one is the dev's call, made on screen: Europe appearing early reads better than a blank parchment
 * for the whole load. The cost is real — **it bakes twice**.
 * @param context - the pipeline's world
 * @param content - the events loading beside the startup, settled once they are pinned or told failed
 * @returns once the map is on screen, the year's layers whole
 */
export async function startup(context: PipelineContext, content: Promise<void>): Promise<void> {
  const { dev, sources, layers, ui } = context
  // Load the relief and the mask; without a relief there is nothing to draw.
  await loadTerrain(context)
  if (context.isDisposed() || !sources.heightmap) return
  refreshReliefSource(sources, dev.relief, dev.texture.seaLevel) // draping is correct from here on, mesh or no mesh
  settleRivers(context) // when the rivers came first, they waited for the relief to drape on
  // Hand the compute its own copy of the elevation and the mask.
  await pushSources(context)
  if (context.isDisposed()) return

  // Stage one: the terrain alone. Awaited before the mesh is built, never fired and forgotten — a relief
  // built while the texture is still in the worker takes no map at all and shows as bare material
  // colour, which is exactly the flash this sequencing exists to remove.
  await rebuildTexture(context)
  if (context.isDisposed()) return

  layers.rebuildFrame() // the sheet first: everything else is printed on it
  layers.rebuildRelief()
  layers.rebuildCoastline()
  layers.rebuildRhumb()
  layers.rebuildRivers() // no-op until the river payload lands; whichever finishes last draws them
  layers.rebuildRose()
  // There is a map to look at now, so the silhouette has done its job; the bar tells the rest.
  ui.dismissSplash()

  // Stage two, hidden until it is all in: the year, its names, the events — each told on the one bar.
  layers.setReveal(0)
  ui.progress.begin(context.translate('loadingYear', { year: String(centuryOf(context)) }))
  try {
    await bringTheYear(context, content)
  } finally {
    ui.progress.end()
  }
  if (context.isDisposed()) return
  // Stage three: all of it at once, faded in over the relief.
  await context.fadeIn((share) => {
    layers.setReveal(share)
  })
}

/**
 * The year, its names and the events, each reporting into its share of the startup's bar.
 * @param context - the pipeline's world
 * @param content - the events loading beside the startup
 * @returns once all three are in — or told failed
 */
async function bringTheYear(context: PipelineContext, content: Promise<void>): Promise<void> {
  const { sources, layers, ui } = context
  const report = barReport(context)
  const year = await startYear(context, (fraction, phase) => {
    report(fraction * STARTUP_SPLIT.year, phase)
  })
  if (context.isDisposed()) return
  if (year !== null) {
    report(STARTUP_SPLIT.year, 'names')
    await rebuildYearNames(context, year)
    if (context.isDisposed()) return
  }
  // The events, once the map is drawn (the dev, 2026-10-26) — on a failed year too, whose failure is on screen: valid
  // events are not hidden because another file did not come.
  ui.progress.report(STARTUP_SPLIT.names, context.translate('phaseEvents'))
  await content
  if (context.isDisposed()) return
  sources.mapDrawn = true
  layers.rebuildEvents()
  ui.progress.report(1)
}
