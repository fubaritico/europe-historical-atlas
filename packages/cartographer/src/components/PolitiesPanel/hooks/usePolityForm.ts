import { useEffect } from 'react'

import type { CartographerStoreHook } from '../../../state/store'

/**
 * The polity whose form is open, and the two gestures on it — from the store (CARTO-246), so the map's
 * double-click opens it as the list's does. Resolved each render: an undo can take the polity away while
 * its form is open, and then there is nothing to edit — the form is not shown.
 * @param store - the store
 * @returns the polity edited or `null`, and how to open and close its form
 */
export function usePolityForm(store: CartographerStoreHook) {
  // Store
  const polityForm = store((state) => state.polityForm)
  // Read so an undo or a redo that takes the polity away, or brings it back, re-renders the hook itself.
  store((state) => state.version)

  // Store actions
  const open = store((state) => state.openPolityForm)
  const close = store((state) => state.closePolityForm)

  // Derived
  const edited =
    store.getState().document.polities.find((polity) => polity.id === polityForm) ?? null

  // Effects
  // A form whose polity no longer resolves is closed, not kept: a redo bringing the polity back must not
  // reopen a form nobody asked for (review ARCH-102).
  useEffect(() => {
    if (polityForm !== null && edited === null) close()
  }, [polityForm, edited, close])

  // Return
  return { edited, open, close }
}
