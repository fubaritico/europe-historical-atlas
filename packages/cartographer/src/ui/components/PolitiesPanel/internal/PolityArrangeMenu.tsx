import { useEffect } from 'react'

import { availableMoves } from '@europe-historical-atlas/core/editor/stacking'

import { KnownPolityMenu } from './KnownPolityMenu'

import type { CartographerStoreHook } from '../../../../state/store'
import type { ViewportPoint } from '../../../../viewport/viewport'

/** Which row's menu is open, and where. */
export interface ArrangeRequest {
  /** The polity it acts on. */
  id: string
  /** Where it opens, in viewport pixels. */
  at: ViewportPoint
}

/** What the wiring needs: the store, the request, and how to close. */
export interface PolityArrangeMenuProps {
  /** The store the move is recorded in. */
  store: CartographerStoreHook
  /** The open request. */
  request: ArrangeRequest
  /** Close the menu — after a command, ‹escape›, or a press outside. */
  onClose: () => void
  /** Say what the command did — the focus goes back to the list, so the move would pass in silence. */
  onResult: (message: string | null) => void
  /** Open the polity's dialogue — *Edit properties…*. */
  onEdit: (id: string) => void
}

/**
 * The stacking menu wired to the document: the enabled moves read from it, the chosen one recorded as
 * one step named as `s16` names it — *"bring to front — Duchy of Normandy"*.
 *
 * **Resolved on every render**: an undo can take the polity away while its menu is open, and then
 * there is nothing to arrange — the menu closes, and says so.
 * @param props - the store, the request and the close
 * @param props.store - the store the polity is read from and the move recorded in
 * @param props.request - which polity's menu is open, and where
 * @param props.onClose - closes the menu, after a command, ‹escape› or a press outside, or when the polity is gone
 * @param props.onResult - says what the command did
 * @param props.onEdit - opens the polity's dialogue, given its id
 * @returns the menu, or nothing when the polity is gone
 */
export function PolityArrangeMenu({
  store,
  request,
  onClose,
  onResult,
  onEdit,
}: PolityArrangeMenuProps) {
  // Store
  // The document is mutated in place: the version is what changes when the order does.
  store((state) => state.version)

  // Store actions
  const restackPolity = store((state) => state.restackPolity)

  // Derived
  const { document } = store.getState()
  const polity = document.polities.find((held) => held.id === request.id)
  const gone = polity === undefined

  // Effects
  // An undo took the polity away: the menu closes — said once, and the focus handed back — rather
  // than staying open on nothing, to reappear if a redo brings the polity back (ARCH-002).
  useEffect(() => {
    if (!gone) return
    console.warn(`[Cartographer] the polity "${request.id}" is gone; its menu was closed.`)
    onClose()
  }, [gone, request.id, onClose])

  // Render
  if (polity === undefined) return null
  return (
    <KnownPolityMenu
      polity={polity}
      at={request.at}
      moves={availableMoves(document, polity.id)}
      restack={restackPolity}
      onResult={onResult}
      onEdit={onEdit}
      onClose={onClose}
    />
  )
}
