/**
 * The wire between the main thread and the compute worker.
 *
 * Stated once, in a module both sides import, so the two cannot drift: a worker answering a shape its
 * caller no longer expects fails at runtime, in a place neither the type-checker nor a test would look.
 * Everything here has to survive a structured clone — plain objects and typed arrays only, never a
 * closure, a `Map`, or anything carrying a method.
 */

import type {
  ComputePhase,
  ComputeSources,
  PoliticalRequest,
  PoliticalResult,
  TerrainBakeResult,
} from './mapCompute'
import type { TerrainTextureOptions } from './terrainCompose'

/** What the main thread asks the worker to do. `id` pairs an answer back to its question. */
export type ComputeCommand =
  | { kind: 'setSources'; id: number; sources: ComputeSources }
  | { kind: 'clearPolitical'; id: number }
  | { kind: 'computePolitical'; id: number; request: PoliticalRequest }
  | { kind: 'bakeTerrain'; id: number; options: TerrainTextureOptions }
  | { kind: 'dispose'; id: number }

/**
 * What a finished command produces. Tagged rather than bare so an answer to the wrong question is a
 * caught mismatch instead of a value silently read as something it is not.
 */
export type ComputePayload =
  | { kind: 'ack' }
  | { kind: 'political'; result: PoliticalResult }
  | { kind: 'bake'; result: TerrainBakeResult }

/** What the worker sends back. */
export type ComputeEvent =
  | { kind: 'progress'; id: number; fraction: number; phase: ComputePhase }
  | { kind: 'done'; id: number; payload: ComputePayload }
  | { kind: 'failed'; id: number; message: string }

/**
 * The slice of a dedicated worker's global scope this protocol uses.
 *
 * Declared locally rather than pulled from `lib.webworker`: that lib redefines `self`, `postMessage` and
 * a dozen other globals incompatibly with the `DOM` lib the rest of the app needs, and a project cannot
 * hold both at once. Naming the four members actually used costs less than splitting the tsconfig.
 */
export interface WorkerScope {
  /**
   * Listen for commands from the main thread.
   * @param type - always `message`
   * @param listener - receives the command
   */
  addEventListener(type: 'message', listener: (event: MessageEvent<ComputeCommand>) => void): void
  /**
   * Send an event back to the main thread.
   * @param message - the event
   * @param transfer - buffers to hand over rather than copy
   */
  postMessage(message: ComputeEvent, transfer?: Transferable[]): void
}
