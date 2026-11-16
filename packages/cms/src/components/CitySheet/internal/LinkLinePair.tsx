import { IconButton } from '@fubaritico/react/IconButton'

import { RelationField } from './RelationField'

import type { PendingLine } from '../utils/pendingLine'
import type { Say } from '../utils/say'

/**
 * A line's fields (CMS-422, the dev's mock-up): the suzerain, **required**, the ✕ closing the line at its right, and the
 * source under it, **facultative** (the dev, 2026-11-16) — each Payload's own field with its « + », held while the
 * line is saved.
 * @param props - the line, its vassal's name, its gestures, the translator
 * @param props.line - the line
 * @param props.vassalName - the name of the title it is the suzerain of
 * @param props.onChoose - chooses its suzerain or its source
 * @param props.onClose - closes it unsaved
 * @param props.say - the translator
 * @returns the fields
 */
export function LinkLinePair({
  line,
  vassalName,
  onChoose,
  onClose,
  say,
}: {
  line: PendingLine
  vassalName: string
  onChoose: (field: 'suzerain' | 'source', id: number | string | null) => void
  onClose: () => void
  say: Say
}) {
  const saving = line.status.kind === 'saving'
  return (
    <div className="city-sheet__chain-new-fields">
      <RelationField
        path={`link-${line.key}-suzerain`}
        collection="titles"
        label={say('vassalOf')}
        description={say('linkSuzerainHelp', { name: vassalName })}
        value={line.suzerain}
        onChange={(id) => {
          onChoose('suzerain', id)
        }}
        readOnly={saving}
        required
      />
      <RelationField
        path={`link-${line.key}-source`}
        collection="sources"
        label={say('linkSource')}
        description={say('linkSourceHelp')}
        value={line.source}
        onChange={(id) => {
          onChoose('source', id)
        }}
        readOnly={saving}
      />
      <IconButton
        type="button"
        size="sm"
        icon="XMark"
        aria-label={say('linkClose')}
        onClick={onClose}
      />
    </div>
  )
}
