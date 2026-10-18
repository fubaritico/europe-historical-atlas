/**
 * The worker's side of the compute: turn incoming commands into calls on a {@link MapCompute} and post
 * the answers back.
 *
 * Separate from the worker entry file on purpose — an entry point runs on import and cannot be called,
 * so any logic inside it is logic no test can reach. Here the scope is a parameter, which makes the whole
 * exchange exercisable against a literal.
 */

import type { ComputeCommand, ComputeEvent, ComputePayload, WorkerScope } from './computeProtocol'
import type { MapCompute, ProgressReport } from './mapCompute'

/**
 * A typed array's buffer, when it is one that may be handed over rather than copied.
 * @param view - the typed array about to be posted
 * @param view.buffer - the memory behind it; only a plain `ArrayBuffer` can be transferred, a shared one
 * cannot
 * @returns a single-entry transfer list, or an empty one for a buffer that cannot be transferred
 */
function transferable(view: { buffer: ArrayBufferLike }): Transferable[] {
  return view.buffer instanceof ArrayBuffer ? [view.buffer] : []
}

/**
 * Serve compute commands on a worker scope until it is torn down.
 * @param scope - the worker global scope, or a stand-in for it
 * @param compute - the implementation doing the actual work
 */
export function serveCompute(scope: WorkerScope, compute: MapCompute): void {
  scope.addEventListener('message', (event: MessageEvent<ComputeCommand>) => {
    const command = event.data
    // Captured before the switch narrows it away: in the unreachable tail below, `command` is `never`,
    // which is precisely the type that has nothing left to name in an error message.
    const kind: string = command.kind
    const onProgress: ProgressReport = (fraction, phase) => {
      scope.postMessage({ kind: 'progress', id: command.id, fraction, phase })
    }

    const run = async (): Promise<{ payload: ComputePayload; transfer: Transferable[] }> => {
      switch (command.kind) {
        case 'setSources':
          await compute.setSources(command.sources)
          return { payload: { kind: 'ack' }, transfer: [] }
        case 'clearPolitical':
          await compute.clearPolitical()
          return { payload: { kind: 'ack' }, transfer: [] }
        case 'computePolitical': {
          // Only the colours and the lines come back; the grid stays here, where the next bake reads it.
          const result = await compute.computePolitical(command.request, onProgress)
          return { payload: { kind: 'political', result }, transfer: [] }
        }
        case 'deriveBorders': {
          const borders = await compute.deriveBorders(command.smoothing)
          return { payload: { kind: 'borders', borders }, transfer: [] }
        }
        case 'bakeTerrain': {
          const result = await compute.bakeTerrain(command.options, onProgress)
          // The pixels are nobody's afterwards: hand the buffer over rather than copy megabytes.
          return { payload: { kind: 'bake', result }, transfer: transferable(result.rgba) }
        }
        case 'dispose':
          compute.dispose()
          return { payload: { kind: 'ack' }, transfer: [] }
      }
      // Unreachable while both sides share `computeProtocol`. A worker bundle that had drifted out of
      // step would land here, and falling off the end of the switch is the worst of the three possible
      // outcomes: `run()` would resolve to `undefined`, the destructuring below would throw *inside* the
      // success handler where the rejection handler cannot see it, and the caller's promise would stay
      // pending for the life of the page. Failing loudly is what makes that a caught error instead.
      throw new Error(`map compute: unknown command ${kind}`)
    }

    void run().then(
      ({ payload, transfer }) => {
        scope.postMessage({ kind: 'done', id: command.id, payload }, transfer)
      },
      (error: unknown) => {
        // A thrown compute must reach the caller as a rejected promise, not die inside the worker where
        // the only trace would be a console line nobody is reading.
        const message = error instanceof Error ? error.message : String(error)
        const failed: ComputeEvent = { kind: 'failed', id: command.id, message }
        scope.postMessage(failed)
      }
    )
  })
}
