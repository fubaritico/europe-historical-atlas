/**
 * The map's compute: a worker when the browser allows one, this thread otherwise — and the switch to this thread when a
 * worker dies mid-session.
 */

import { createInlineMapCompute } from '@europe-historical-atlas/core/pipeline/inlineCompute'
import { createWorkerMapCompute } from '@europe-historical-atlas/core/pipeline/workerCompute'

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
 * @param restore - how the pipeline sets the new compute up again — its business, not the compute's
 * @returns nothing
 */
function failoverToInline(
  context: PipelineContext,
  error: Error,
  restore: () => Promise<void>
): void {
  console.warn('map compute worker died — continuing on the main thread', error)
  if (context.isDisposed()) return
  // Replace the dead worker with the inline compute, which yields a frame between its phases.
  context.box.compute = createInlineMapCompute({ yieldControl: nextFrame })
  // It starts empty: the pipeline sets it up again.
  restore().catch((failure: unknown) => {
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
 * Build the names' compute: a worker of its own, so placing a year's names never holds up a bake (review ARCH-001,
 * 2026-10-28). It keeps no state between calls, so a dead worker is replaced on this thread with nothing to restore;
 * the call it was serving fails, and the next year's names are asked of the replacement.
 * @param context - the pipeline's world
 * @returns the compute
 */
export function createNameCompute(context: PipelineContext): MapCompute {
  try {
    return createWorkerMapCompute({
      spawn: context.spawn,
      onFatal: (error: Error) => {
        console.warn('names worker died — placing names on the main thread', error)
        if (!context.isDisposed())
          context.box.names = createInlineMapCompute({ yieldControl: nextFrame })
      },
    })
  } catch (error: unknown) {
    console.warn('names worker unavailable — placing names on the main thread instead', error)
    return createInlineMapCompute({ yieldControl: nextFrame })
  }
}

/**
 * Build the compute, preferring a worker and falling back to this thread.
 * @param context - the pipeline's world
 * @param restore - how the pipeline sets a fresh compute up again, should the worker die mid-session
 * @returns the compute
 */
export function createCompute(context: PipelineContext, restore: () => Promise<void>): MapCompute {
  try {
    // A worker, whose death mid-session hands over to the inline compute.
    return createWorkerMapCompute({
      spawn: context.spawn,
      onFatal: (error: Error) => {
        failoverToInline(context, error, restore)
      },
    })
  } catch (error: unknown) {
    console.warn('map compute worker unavailable — computing on the main thread instead', error)
    // No worker could be made at all: compute on this thread from the start.
    return createInlineMapCompute({ yieldControl: nextFrame })
  }
}
