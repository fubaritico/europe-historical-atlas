import { LinkLineFields } from './LinkLineFields'
import { SovereignBox } from './SovereignBox'

import type { PendingLinks } from '../hooks/usePendingLinks'
import type { SaveSovereign } from '../utils/saveSovereign'
import type { Say } from '../utils/say'

/**
 * The block's lines being entered (CMS-422), from the lowest up — the first the suzerain of the title the chain stops
 * at, each next one the suzerain of the line below; the last, once its suzerain is chosen, has « Souverain » under it.
 * @param props - the lines, the title the chain stops at, the box's save, the translator
 * @param props.pending - the lines and their gestures
 * @param props.topName - the name of the title the chain stops at
 * @param props.saveSovereign - ticks or unticks « souverain » on a title
 * @param props.say - the translator
 * @returns the lines
 */
export function PendingLines({
  pending,
  topName,
  saveSovereign,
  say,
}: {
  pending: PendingLinks
  topName: string
  saveSovereign: SaveSovereign
  say: Say
}) {
  const last = pending.lines.at(-1)
  return pending.lines.map((line, index) => (
    <LinkLineFields
      key={line.key}
      line={line}
      vassalName={index === 0 ? topName : say('linkAbove')}
      onChoose={(field, id) => {
        pending.choose(line.key, field, id)
      }}
      onClose={() => {
        pending.remove(line.key)
      }}
      say={say}
    >
      {line === last && line.suzerain !== null && (
        <SovereignBox
          // A new box for a new suzerain: its save's state is the title's, not the line's
          key={String(line.suzerain)}
          title={line.suzerain}
          checked={line.sovereign}
          save={saveSovereign}
          onSaved={(sovereign) => {
            if (line.suzerain !== null) pending.markSovereign(line.key, line.suzerain, sovereign)
          }}
          say={say}
        />
      )}
    </LinkLineFields>
  ))
}
