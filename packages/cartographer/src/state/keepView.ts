import { carryView } from '../persistence/carriedView'

import type { CartographerStoreHook } from './store'
import type { ViewStorage } from '../persistence/carriedView'

/**
 * Keep the view at every change (CARTO-427, the dev, 2026-11-13: *"when I reload the Cartographer, it remembers the
 * zoom, the position"*): written to the tab's storage as it changes, so a reload — or the next map — opens on it. The
 * opening's unframed view is never written: it is no view a page could open on (`takeCarriedView` reads only one).
 * @param store - the store the view lives in
 * @param storage - the tab's storage
 * @returns the unsubscription
 */
export function keepView(store: CartographerStoreHook, storage: ViewStorage): () => void {
  return store.subscribe(
    (state) => state.viewport,
    (view) => {
      if (Number.isFinite(view.scale) && view.scale > 0) carryView(storage, view)
    }
  )
}
