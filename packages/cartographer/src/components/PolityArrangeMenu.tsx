import { useEffect } from 'react'

import { availableMoves } from '@europe-historical-atlas/core/editor/stacking'

import { PolityStackMenu } from './PolityStackMenu'
import { STACKING_LABELS } from './stackingLabels'

import type { CartographerStoreHook } from '../state/store'
import type { ViewportPoint } from '../view/viewport'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

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

/** What the menu of a polity known to exist needs. */
interface KnownPolityMenuProps {
  /** The polity, resolved by the binding: it exists for as long as this menu does. */
  polity: YearPolity
  /** Where the menu opens, in viewport pixels. */
  at: ViewportPoint
  /** Which moves change something, read from the document. */
  moves: Record<StackingMove, boolean>
  /** Record a move as one step; `false` when the document refuses it. */
  restack: (
    polityId: string,
    move: StackingMove,
    step: { kind: 'restack'; label: string }
  ) => boolean
  /** Say what the command did. */
  onResult: (message: string | null) => void
  /** Open the polity's dialogue. */
  onEdit: (id: string) => void
  /** Close the menu. */
  onClose: () => void
}

/**
 * The menu of a polity that exists — split from the binding so its handlers are declared in its body,
 * with the polity already resolved: the binding returns nothing when an undo has taken it away.
 * @param props - the polity, the moves, and what each command does
 * @returns the menu
 */
function KnownPolityMenu({
  polity,
  at,
  moves,
  restack,
  onResult,
  onEdit,
  onClose,
}: KnownPolityMenuProps) {
  // Handlers
  const handleChoose = (move: StackingMove) => {
    const label = `${STACKING_LABELS[move].toLowerCase()} — ${polity.name}`
    // The menu offers only the moves that change something: a refusal here is a defect.
    if (restack(polity.id, move, { kind: 'restack', label })) {
      onResult(`${STACKING_LABELS[move]} — ${polity.name}`)
    } else console.error(`[Cartographer] the document refused to ${label}.`)
  }
  const handleEdit = () => {
    onEdit(polity.id)
  }

  // Render
  return (
    <PolityStackMenu
      name={polity.name}
      at={at}
      moves={moves}
      onChoose={handleChoose}
      onEdit={handleEdit}
      onClose={onClose}
    />
  )
}

/**
 * The stacking menu wired to the document: the enabled moves read from it, the chosen one recorded as
 * one step named as `s16` names it — *"bring to front — Duchy of Normandy"*.
 *
 * **Resolved on every render**: an undo can take the polity away while its menu is open, and then
 * there is nothing to arrange — the menu closes, and says so.
 * @param props - the store, the request and the close
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
