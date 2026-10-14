import { modeLabel } from '../state/toolSlice'

import type { SnapLayer } from './toolSession'
import type { CartographerStoreHook } from '../state/store'

/*
 * The Pen's switch to a coast or a river and back (`s02`, *"The Pen finds the coast and the rivers by
 * itself"*, the dev, 2026-10-12): the click decides, never the hover, and every switch is said where ‹P›
 * says a mode.
 */

/** What the switch needs of a gesture: the store the mode lives in, and the result zone. */
export interface LayerSwitchContext {
  /** The store holding the Pen's mode. */
  store: CartographerStoreHook
  /** Say what a gesture did, in the status bar's result zone. */
  report: (message: string) => void
}

/**
 * The Pen reached a coast or a river on its own: it follows it from now on, and says so where ‹P› would.
 * @param context - the store and the result zone
 * @param layer - what was reached
 */
export function reachLayer(context: LayerSwitchContext, layer: SnapLayer): void {
  context.store.getState().reachLayer(layer)
  context.report(modeLabel(context.store.getState().tool, layer))
}

/**
 * Following a coast or a river, a click neither takes gives the Pen back the mode it came from, and says
 * which; under any other mode it changes nothing.
 * @param context - the store and the result zone
 */
export function leaveLayer(context: LayerSwitchContext): void {
  const back = context.store.getState().leaveLayer()
  if (back !== null) context.report(modeLabel(context.store.getState().tool, back))
}
