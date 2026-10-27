/**
 * Bringing the map up in its deliberate stages: the terrain, then the year, then the events.
 */

import { refreshReliefSource } from '../../sources/mapSources'

import { rebuildPolitical } from './political'
import { settleRivers } from './rivers'
import { loadTerrain } from './terrain'
import { pushSources, rebuildTexture } from './texture'

import type { PipelineContext } from '../pipelineContext'

/**
 * Bring the map up in deliberate stages: the terrain, then the same map with its countries, then the
 * events once the map is drawn.
 *
 * Two bakes and not one is the dev's call, made on screen: waiting for everything meant a blank parchment for
 * the whole load, and Europe appearing at once late reads worse than Europe appearing early and then
 * being coloured in. The cost is real — **it bakes twice** — and what was removed is only the waste.
 * @param context - the pipeline's world
 * @returns once the map is on screen
 */
export async function startup(context: PipelineContext): Promise<void> {
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
  // There is a map to look at now, so the silhouette has done its job. The countries arriving later is
  // the progress panel's business, not the splash's.
  ui.dismissSplash()

  // Stage two: the same map with the countries painted in and their borders drawn over it.
  await rebuildPolitical(context)
  if (context.isDisposed()) return

  // Stage three: the events, once the map is drawn (the dev, 2026-10-26) — on a failed year too, whose failure
  // is on screen: valid events are not hidden because another file did not come. A no-op until they land; if
  // they land later, `loadContent` draws them.
  sources.mapDrawn = true
  layers.rebuildEvents()
}
