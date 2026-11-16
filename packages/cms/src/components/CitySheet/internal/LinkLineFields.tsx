import { LinkLinePair } from './LinkLinePair'
import { LinkLineStatus } from './LinkLineStatus'

import type { PendingLine } from '../hooks/usePendingLinks'
import type { Say } from '../utils/say'
import type { ReactNode } from 'react'

/**
 * One line « Vassal de » of the repeating block (CMS-422, the dev's mock-up): the suzerain, Payload's own field with its
 * « + », held while its link is saved, and the ✕ closing the line unsaved — then
 * where the line stands, and, on the last line, « Souverain » under its suzerain. Focusable, for the keyboard to land
 * on it when ⊕ adds it.
 * @param props - the line, its vassal's name, its gestures, what follows its fields, the translator
 * @param props.line - the line
 * @param props.vassalName - the name of the title it is the suzerain of, for its label
 * @param props.onChoose - chooses its suzerain or its source
 * @param props.onClose - closes it unsaved
 * @param props.children - what follows its fields: « Souverain », on the last line
 * @param props.say - the translator
 * @returns the line
 */
export function LinkLineFields({
  line,
  vassalName,
  onChoose,
  onClose,
  children,
  say,
}: {
  line: PendingLine
  vassalName: string
  onChoose: (field: 'suzerain' | 'source', id: number | string | null) => void
  onClose: () => void
  children?: ReactNode
  say: Say
}) {
  return (
    <div
      className="city-sheet__chain-new"
      role="group"
      aria-label={say('linkLineOf', { name: vassalName })}
      tabIndex={-1}
    >
      <LinkLinePair
        line={line}
        vassalName={vassalName}
        onChoose={onChoose}
        onClose={onClose}
        say={say}
      />
      {children}
      <LinkLineStatus status={line.status} say={say} />
    </div>
  )
}
