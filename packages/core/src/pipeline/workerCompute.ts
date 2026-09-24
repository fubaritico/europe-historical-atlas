/**
 * The main thread's side of the compute worker: a {@link MapCompute} whose calls cross a `postMessage`.
 *
 * It spawns nothing itself. The worker is **injected**, because the only portable way to name a worker
 * module is a bundler-specific import (`?worker` under Vite), and a module that carries one can neither
 * be unit-tested nor moved to another bundler. The composition root does the naming; this does the
 * talking.
 */

import type { ComputeCommand, ComputeEvent } from './computeProtocol'
import type {
  ComputeSources,
  MapCompute,
  PoliticalRequest,
  PoliticalResult,
  ProgressReport,
  TerrainBakeResult,
} from './mapCompute'
import type { TerrainTextureOptions } from './terrainCompose'
import type { RegionBorders } from '../data/regionRaster'

/**
 * The slice of a `Worker` this client touches — narrow enough for a test to stand one up literally.
 *
 * Declared rather than `Pick`ed off `Worker`: the DOM's handler types carry a `this: Worker`, which makes
 * them uncallable on anything that is not a full `Worker` — including every stand-in a test could build.
 * A real `Worker` satisfies this shape, which is the direction that matters.
 */
export interface ComputeWorkerHandle {
  /**
   * Post a command. No transfer list: the sources are copied on purpose, since the main thread keeps
   * drawing the relief from the very same buffers.
   * @param message - the command
   */
  postMessage(message: ComputeCommand): void
  /** The worker's answers. Assigned once, when the compute is built. */
  onmessage: ((event: MessageEvent<ComputeEvent>) => void) | null
  /** The worker dying. */
  onerror: ((event: ErrorEvent) => void) | null
  /** Stop the worker, whatever it is in the middle of. */
  terminate(): void
}

/** What a worker-backed compute needs from its host. */
export interface WorkerComputeOptions {
  /**
   * Create the worker. Called once, when the compute is built.
   * @returns the worker
   */
  spawn: () => ComputeWorkerHandle
  /**
   * Called when the worker dies — every call in flight has already been rejected by then. A host that
   * wants to keep working should fall back to an inline compute from here.
   * @param error - what went wrong
   */
  onFatal?: (error: Error) => void
}

/** A call waiting on the worker. */
interface PendingCall {
  /** Hand the worker's answer to the caller. */
  settle: (event: ComputeEvent) => void
  /** Fail the caller. */
  fail: (error: Error) => void
  /** Where to forward the phases this call announces. */
  onProgress: ProgressReport | undefined
}

/**
 * Post a command and wait for its answer — all a {@link mapComputeOver} facade needs from a transport.
 */
export type SendCommand = (
  build: (id: number) => ComputeCommand,
  onProgress?: ProgressReport
) => Promise<ComputeEvent>

/**
 * Unwrap a finished event, turning a worker-side failure back into a rejection.
 * @param event - whatever came back for this call
 * @returns the same event, narrowed to a completion
 */
export function unwrapDone(event: ComputeEvent): ComputeEvent & { kind: 'done' } {
  if (event.kind === 'failed') throw new Error(event.message)
  if (event.kind !== 'done') throw new Error(`map compute: unexpected ${event.kind} event`)
  return event
}

/**
 * The typed {@link MapCompute} surface, over any transport that can send a command and answer it.
 *
 * Separated from the worker wiring because the two fail for unrelated reasons and are read for
 * unrelated questions: this is where "a bake request came back as borders" is caught, and it needs no
 * worker, no `postMessage` and no lifecycle to be exercised — a function returning a literal is enough.
 * @param send - post a command and wait for its answer
 * @param dispose - stop the transport, whatever it is in the middle of
 * @returns the compute
 */
export function mapComputeOver(send: SendCommand, dispose: () => void): MapCompute {
  return {
    async setSources(sources: ComputeSources): Promise<void> {
      unwrapDone(await send((id) => ({ kind: 'setSources', id, sources })))
    },

    async clearPolitical(): Promise<void> {
      unwrapDone(await send((id) => ({ kind: 'clearPolitical', id })))
    },

    async computePolitical(
      request: PoliticalRequest,
      onProgress?: ProgressReport
    ): Promise<PoliticalResult> {
      const done = unwrapDone(
        await send((id) => ({ kind: 'computePolitical', id, request }), onProgress)
      )
      if (done.payload.kind !== 'political') {
        throw new Error(`map compute: answered a political request with ${done.payload.kind}`)
      }
      return done.payload.result
    },

    async deriveBorders(smoothing: number): Promise<RegionBorders> {
      const done = unwrapDone(await send((id) => ({ kind: 'deriveBorders', id, smoothing })))
      if (done.payload.kind !== 'borders') {
        throw new Error(`map compute: answered a border request with ${done.payload.kind}`)
      }
      return done.payload.borders
    },

    async bakeTerrain(
      textureOptions: TerrainTextureOptions,
      onProgress?: ProgressReport
    ): Promise<TerrainBakeResult> {
      const done = unwrapDone(
        await send((id) => ({ kind: 'bakeTerrain', id, options: textureOptions }), onProgress)
      )
      if (done.payload.kind !== 'bake') {
        throw new Error(`map compute: answered a bake request with ${done.payload.kind}`)
      }
      return done.payload.result
    },

    dispose,
  }
}

/**
 * Build a {@link MapCompute} backed by a worker.
 *
 * Sources are **copied** across, never transferred: the main thread keeps drawing the relief from the
 * same elevation data and draping overlays on it, so handing the buffer over would leave the map without
 * its terrain. Results come back the other way as transfers, since nobody in the worker needs them again
 * — except the political raster, which the worker keeps and therefore copies.
 * @param options - the worker to talk to, and what to do if it dies
 * @returns the compute
 */
export function createWorkerMapCompute(options: WorkerComputeOptions): MapCompute {
  const worker = options.spawn()
  const pending = new Map<number, PendingCall>()
  let nextId = 1
  let dead = false

  worker.onmessage = (message): void => {
    // The wire is untyped by nature: what arrives is whatever the other side posted. This is the one
    // place that says so, so nothing downstream has to.
    const event = message.data
    const call = pending.get(event.id)
    if (!call) return
    if (event.kind === 'progress') {
      call.onProgress?.(event.fraction, event.phase)
      return
    }
    pending.delete(event.id)
    call.settle(event)
  }

  /**
   * Fail every call in flight and refuse the next one. `notify` separates a worker that died from one
   * that was torn down: only the first is news the host has to react to.
   */
  const die = (error: Error, notify: boolean): void => {
    dead = true
    for (const call of pending.values()) call.fail(error)
    pending.clear()
    if (notify) options.onFatal?.(error)
  }

  worker.onerror = (event): void => {
    die(new Error(`map compute worker failed: ${event.message}`), true)
  }

  /**
   * Post a command and wait for its answer.
   * @param build - the command, given the id it has been assigned
   * @param onProgress - where to forward the phases it announces
   * @returns the finished event
   */
  const send = (
    build: (id: number) => ComputeCommand,
    onProgress?: ProgressReport
  ): Promise<ComputeEvent> =>
    new Promise<ComputeEvent>((resolve, reject) => {
      if (dead) {
        reject(new Error('map compute worker is gone'))
        return
      }
      const id = nextId++
      pending.set(id, { settle: resolve, fail: reject, onProgress })
      worker.postMessage(build(id))
    })

  return mapComputeOver(send, () => {
    // Terminate outright rather than waiting on a courteous `dispose` command: a worker mid-bake is
    // exactly the one that will not answer, and teardown cannot be made to wait for it.
    worker.terminate()
    die(new Error('map compute disposed'), false)
  })
}
