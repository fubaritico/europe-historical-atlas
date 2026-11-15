import { IconButton } from '@fubaritico/react/IconButton'

import { LinkLineStatus } from './LinkLineStatus'
import { RelationField } from './RelationField'

import type { NewLink } from '../hooks/useNewLink'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * A line « Vassal de » once opened by ⊕ (CMS-422, the dev's mock-up): the suzerain, the ✕ closing the line unsaved,
 * and the source under it, each Payload's own field with its « + », held while their link is saved — then where the
 * line stands: being saved, refused in the server's words, or failed. Named by the title it is for, since several
 * readings may each have one; focusable, for the keyboard to land on it when ⊕ opens it.
 * @param props - the line, the title it is for, what closes it, the translator
 * @param props.line - what is chosen on the line, where it stands, and how to choose
 * @param props.vassal - the title the chain stops at
 * @param props.onClose - closes the line unsaved
 * @param props.say - the translator
 * @returns the line
 */
export function LinkLineFields({
  line,
  vassal,
  onClose,
  say,
}: {
  line: NewLink
  vassal: RecordChoice
  onClose: () => void
  say: Say
}) {
  const prefix = `link-${String(vassal.id)}`
  return (
    <div
      className="city-sheet__chain-new"
      role="group"
      aria-label={say('linkLineOf', { name: vassal.name })}
      tabIndex={-1}
    >
      <div className="city-sheet__chain-new-fields">
        <RelationField
          path={`${prefix}-suzerain`}
          collection="titles"
          label={say('vassalOf')}
          description={say('linkSuzerainHelp', { name: vassal.name })}
          value={line.suzerain}
          onChange={line.chooseSuzerain}
          readOnly={line.status.kind === 'saving'}
        />
        <RelationField
          path={`${prefix}-source`}
          collection="sources"
          label={say('linkSource')}
          description={say('linkSourceHelp')}
          value={line.source}
          onChange={line.chooseSource}
          readOnly={line.status.kind === 'saving'}
        />
        <IconButton
          type="button"
          size="sm"
          icon="XMark"
          aria-label={say('linkClose')}
          onClick={onClose}
        />
      </div>
      <LinkLineStatus status={line.status} say={say} />
    </div>
  )
}
