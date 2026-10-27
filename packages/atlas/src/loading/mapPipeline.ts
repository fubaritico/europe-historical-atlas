/**
 * What the map costs, and the order it is paid in.
 *
 * The compute runs off this thread when the browser allows it, because the texture bake is one
 * indivisible synchronous block — no amount of yielding between phases could keep the tab alive through
 * it. The inline implementation stays as the fallback, and needs the frame wait the worker has no use
 * for: on the main thread, a flag raised before a synchronous block is a flag nobody sees.
 *
 * It owns the sequence too. The relief, the mask and the political layer used to land independently,
 * each triggering its own bake, so the map arrived in three visible instalments each throwing away the
 * last. Deliberate stages replace them (`stages/startup`): the terrain, then the same map with its countries,
 * then the events. The steps live in `stages/`, the compute in `compute`; this file is their façade.
 */

import { createLatestOnly } from '@europe-historical-atlas/core/utils/latestOnly'

import { createFetchAssets } from './assets'
import { createCompute } from './compute'
import { loadContent } from './mapContent'
import { rebuildPolitical } from './stages/political'
import { loadRivers } from './stages/rivers'
import { startup } from './stages/startup'
import { pushSources, rebuildTexture } from './stages/texture'

import type { MapPipelineDeps, PipelineContext } from './pipelineContext'
import type { MapCompute, ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'

/** The map's compute, sequenced. */
export interface MapPipeline {
  /**
   * Bring the map up: the terrain first, then the same map with its countries.
   * @returns once the year is on screen
   */
  start: () => Promise<void>
  /**
   * Re-bake the terrain texture and hang it on the relief.
   * @param onProgress - where to announce the bake, when a caller is showing a panel
   * @returns once the new texture is on screen, or once a newer bake has superseded this one
   */
  rebuildTexture: (onProgress?: ProgressReport) => Promise<void>
  /**
   * A change of year, end to end: fetch the polities, hand them to the compute, hang the result up.
   * @returns once the year is on screen
   */
  rebuildPolitical: () => Promise<void>
  /**
   * Re-trace the border lines from the grid the compute already holds, then redraw them.
   *
   * The one border tunable that changes geometry rather than paint. It costs a trace, not a year.
   * @returns once the lines are back on screen
   */
  rebuildBorderGeometry: () => Promise<void>
  /** Stop the worker and release what it holds. */
  dispose: () => void
}

/**
 * Build the pipeline. Nothing is fetched until {@link MapPipeline.start} is called.
 * @param deps - the tunables, the sources, the layers, the interface and the worker factory
 * @returns the pipeline
 */
export function createMapPipeline(deps: MapPipelineDeps): MapPipeline {
  // The pipeline's world: the host's deps, with the default ports under any the host replaced.
  const context: PipelineContext = {
    ...deps,
    assets: { ...createFetchAssets(), ...deps.assets },
    // Two gates, because two independent results race: a dev-panel slider fires a bake per change, and a
    // change of year fires a whole political rebuild. Sharing one would have a bake cancel a year.
    bakeGate: createLatestOnly(),
    politicalGate: createLatestOnly(),
    box: { compute: null as unknown as MapCompute },
    pendingRivers: { set: null },
  }
  // Built once the context exists, since the worker's failover writes back into it.
  // Should the worker die, the compute on this thread starts empty: hand it the sources again, then recompute the
  // year on screen — the pipeline's steps, passed in so the compute knows none of them.
  context.box.compute = createCompute(context, () =>
    pushSources(context).then(() => rebuildPolitical(context))
  )

  return {
    async start(): Promise<void> {
      // The rivers and the events load on their own, beside the startup, never awaited.
      loadRivers(context)
      void loadContent(context, context.assets.content)
      await startup(context).catch((error: unknown) => {
        // Anything escaping `startup` got past the mask's own catch, so it is the relief — the one asset
        // the map cannot do without. The splash stays up underneath the message.
        deps.ui.reportAssetFailure('heightmap', error)
      })
    },
    rebuildTexture(onProgress?: ProgressReport): Promise<void> {
      return rebuildTexture(context, onProgress)
    },
    rebuildPolitical(): Promise<void> {
      return rebuildPolitical(context)
    },
    async rebuildBorderGeometry(): Promise<void> {
      if (!deps.sources.regionSet) return
      // An authored year's lines go through its anchors (D3): there is no raster trace to smooth, and
      // re-tracing one here would replace the exact lines with the raster's.
      if (deps.sources.regionSet.authored !== undefined) {
        console.warn(
          '[atlas] border smoothing does not apply to an authored year: its lines are exact.'
        )
        return
      }
      // Re-trace a payload year's lines at the new smoothing, then redraw them.
      try {
        const traced = await context.box.compute.deriveBorders(deps.dev.political.borderSmoothing)
        if (deps.isDisposed()) return
        deps.sources.derivedBorders = traced
        deps.layers.rebuildBorders()
      } catch (error: unknown) {
        console.error('border derivation failed', error)
      }
    },
    dispose(): void {
      // Terminate before anything else: the worker is the only part of this that outlives the page's own
      // teardown if left alone, and a bake in flight has nothing left to hand its pixels to.
      context.box.compute.dispose()
    },
  }
}
