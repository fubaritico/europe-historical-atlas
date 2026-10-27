/**
 * The map's compute: a worker when the browser allows one, this thread otherwise — and the switch to this thread when a
 * worker dies mid-session.
 */

import { createInlineMapCompute } from '@europe-historical-atlas/core/pipeline/inlineCompute'
import { createWorkerMapCompute } from '@europe-historical-atlas/core/pipeline/workerCompute'

import { rebuildPolitical } from './stages/political'
import { pushSources } from './stages/texture'

import type { PipelineContext } from './pipelineContext'
import type { MapCompute } from '@europe-historical-atlas/core/pipeline/mapCompute'

/**
 * Carry on after the worker dies, on this thread.
 *
 * The fallback starts empty — it holds neither the sources nor the year the dead worker was holding — so
 * recovering means redoing the setup, not just retrying the call that failed. A frozen map with one
 * console line is the outcome this exists to avoid.
 * @param context - the pipeline's world
 * @param error - what killed the worker
 * @returns nothing
 */
function failoverToInline(context: PipelineContext, error: Error): void {
  console.warn('map compute worker died — continuing on the main thread', error)
  if (context.isDisposed()) return
  // Replace the dead worker with the inline compute, which yields a frame between its phases.
  context.box.compute = createInlineMapCompute({ yieldControl: nextFrame })
  // It starts empty: hand it the sources again, then recompute the year on screen.
  void pushSources(context)
    .then(() => rebuildPolitical(context))
    .catch((failure: unknown) => {
      console.error('main-thread fallback could not restore the map', failure)
    })
}

/**
 * Hand control back to the browser for one frame.
 * @returns once a frame has been painted
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve()
    })
  })
}

/**
 * Build the compute, preferring a worker and falling back to this thread.
 * @param context - the pipeline's world
 * @returns the compute
 */
export function createCompute(context: PipelineContext): MapCompute {
  try {
    // A worker, whose death mid-session hands over to the inline compute.
    return createWorkerMapCompute({
      spawn: context.spawn,
      onFatal: (error: Error) => {
        failoverToInline(context, error)
      },
    })
  } catch (error: unknown) {
    console.warn('map compute worker unavailable — computing on the main thread instead', error)
    // No worker could be made at all: compute on this thread from the start.
    return createInlineMapCompute({ yieldControl: nextFrame })
  }
}
