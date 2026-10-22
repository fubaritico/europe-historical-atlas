import { zoomLabel } from '../../../viewport/zoomLabel'

import type { CartographerStoreHook } from '../../../state/store'

/**
 * Write the zoom into its node and keep it written, outside React: subscribed to the viewport, which a
 * wheel changes on every notch.
 * @param store - the store
 * @param node - the zoom's node, or `null` on detach
 * @returns the unsubscription, or nothing on detach
 */
export function followZoom(store: CartographerStoreHook, node: HTMLSpanElement | null) {
  if (node === null) return undefined
  return store.subscribe(
    (state) => state.viewport,
    (viewport) => {
      node.textContent = zoomLabel(viewport, window.devicePixelRatio)
    },
    { fireImmediately: true }
  )
}
