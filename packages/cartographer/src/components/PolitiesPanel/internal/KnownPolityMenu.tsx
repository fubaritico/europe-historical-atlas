import { useLocale } from '../../../hooks/useLocale'
import { arrangePolity, arrangeWords } from '../../../utils/arrange'
import { ErrorBoundary } from '../../ErrorBoundary'
import { PolityStackMenu } from '../../PolityStackMenu'

import type { Restack } from '../../../utils/arrange'
import type { ViewportPoint } from '../../../viewport/viewport'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

/** What the menu of a polity known to exist needs. */
interface KnownPolityMenuProps {
  /** The polity, resolved by the binding: it exists for as long as this menu does. */
  polity: YearPolity
  /** Where the menu opens, in viewport pixels. */
  at: ViewportPoint
  /** Which moves change something, read from the document. */
  moves: Record<StackingMove, boolean>
  /** Record a move as one step; `false` when the document refuses it. */
  restack: Restack
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
 * @param props.polity - the polity the menu acts on, already resolved by the binding
 * @param props.at - where the menu opens, in viewport pixels
 * @param props.moves - which stacking moves change something, so which are enabled
 * @param props.restack - records a move as one step, `false` when the document refuses it
 * @param props.onResult - says what the command did
 * @param props.onEdit - opens the polity's dialogue, given its id
 * @param props.onClose - closes the menu
 * @returns the menu
 */
export function KnownPolityMenu({
  polity,
  at,
  moves,
  restack,
  onResult,
  onEdit,
  onClose,
}: KnownPolityMenuProps) {
  // Context
  const locale = useLocale()

  // Derived
  const words = arrangeWords(locale)

  // Handlers
  const handleChoose = (move: StackingMove) => {
    // The menu offers only the moves that change something; `arrangePolity` says a refusal loudly.
    arrangePolity(restack, polity, move, onResult, words)
  }
  const handleEdit = () => {
    onEdit(polity.id)
  }

  // Render
  return (
    <ErrorBoundary zone="the stacking menu" onDismiss={onClose}>
      <PolityStackMenu
        name={polity.name}
        at={at}
        moves={moves}
        onChoose={handleChoose}
        onEdit={handleEdit}
        onClose={onClose}
      />
    </ErrorBoundary>
  )
}
