import { startCanvasController } from '../../../../canvas/controller'

import { trackFocusOrigin } from './focusOrigin'

import type { CanvasControllerDeps } from '../../../../canvas/controller'

/**
 * Start the surface's controller once both canvases exist, and hand back its teardown.
 *
 * **A missing overlay throws rather than leaving the map inert.** The overlay comes first in the tree, so
 * its ref is attached before this runs; finding it `null` means that order was broken, a wiring fault.
 * Returning quietly would leave a canvas that never paints and never answers, with nothing said — the
 * same reasoning as the controller's own throw on a missing 2D context.
 * @param node - the drawing surface
 * @param overlay - the overlay canvas, or `null` if the tree order was broken
 * @param deps - everything the controller needs but the overlay
 * @returns the teardown
 */
export function startSurface(
  node: HTMLCanvasElement,
  overlay: HTMLCanvasElement | null,
  deps: Omit<CanvasControllerDeps, 'overlay'>
): () => void {
  if (overlay === null) {
    throw new Error('Cartographer: the overlay canvas was not mounted before the drawing surface.')
  }
  const forgetFocusOrigin = trackFocusOrigin(node)
  const stopController = startCanvasController(node, { ...deps, overlay })
  return () => {
    stopController()
    forgetFocusOrigin()
  }
}
