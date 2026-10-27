import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCompute } from './compute'

import type { PipelineContext } from './pipelineContext'
import type { MapCompute } from '@europe-historical-atlas/core/pipeline/mapCompute'
import type { ComputeWorkerHandle } from '@europe-historical-atlas/core/pipeline/workerCompute'

/** A worker that never answers, and that the test can kill. */
function fakeWorker(): ComputeWorkerHandle & { die: () => void } {
  const worker = {
    postMessage: vi.fn(),
    onmessage: null,
    onerror: null as ComputeWorkerHandle['onerror'],
    terminate: vi.fn(),
    die(): void {
      worker.onerror?.({ message: 'out of memory' } as ErrorEvent)
    },
  }
  return worker
}

/**
 * The slice of the pipeline's world the compute reads.
 * @param spawn - how the worker is made
 * @param disposed - whether the app has been torn down
 * @returns the context
 */
function contextWith(spawn: () => ComputeWorkerHandle, disposed = false): PipelineContext {
  return {
    spawn,
    isDisposed: () => disposed,
    box: { compute: null as unknown as MapCompute },
  } as unknown as PipelineContext
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createCompute', () => {
  describe('happy path', () => {
    it('computes in the worker while it lives, and restores nothing', () => {
      const worker = fakeWorker()
      const restore = vi.fn(() => Promise.resolve())
      const context = contextWith(() => worker)
      context.box.compute = createCompute(context, restore)
      expect(restore).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('carries on on this thread when the worker dies, and has the pipeline set it up again', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const worker = fakeWorker()
      const restore = vi.fn(() => Promise.resolve())
      const context = contextWith(() => worker)
      const first = createCompute(context, restore)
      context.box.compute = first
      worker.die()
      expect(context.box.compute).not.toBe(first)
      expect(restore).toHaveBeenCalledTimes(1)
    })

    it('computes on this thread from the start when no worker can be made', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const restore = vi.fn(() => Promise.resolve())
      const compute = createCompute(
        contextWith(() => {
          throw new Error('no worker here')
        }),
        restore
      )
      expect(typeof compute.bakeTerrain).toBe('function')
      expect(restore).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('says so when setting the new compute up fails', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const said = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const worker = fakeWorker()
      const context = contextWith(() => worker)
      context.box.compute = createCompute(context, () => Promise.reject(new Error('fetch failed')))
      worker.die()
      await vi.waitFor(() => {
        expect(said).toHaveBeenCalled()
      })
    })
  })

  describe('edge cases', () => {
    it('restores nothing when the worker dies after the app was torn down', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const worker = fakeWorker()
      const restore = vi.fn(() => Promise.resolve())
      const context = contextWith(() => worker, true)
      const first = createCompute(context, restore)
      context.box.compute = first
      worker.die()
      expect(context.box.compute).toBe(first)
      expect(restore).not.toHaveBeenCalled()
    })
  })
})
