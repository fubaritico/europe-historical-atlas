import { LinkLineFields } from './LinkLineFields'
import { SovereignBox } from './SovereignBox'

import type { PendingLinks } from '../hooks/usePendingLinks'
import type { Say } from '../utils/say'

/**
 * The block's lines being entered (CMS-422), from the lowest up — the first the suzerain of the holder's title, each
 * next one the suzerain of the line below; the last, once its suzerain is chosen, has « Souverain » under it, saved at
 * « Enregistrer » with the rest.
 * @param props - the lines, the holder's name, the translator
 * @param props.pending - the lines and their gestures
 * @param props.topName - the name of the holder's title, the vassal of the first line
 * @param props.say - the translator
 * @returns the lines
 */
export function PendingLines({
  pending,
  topName,
  say,
}: {
  pending: PendingLinks
  topName: string
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
          name={`sovereign-${line.key}`}
          checked={line.sovereign}
          onChange={(sovereign) => {
            if (line.suzerain !== null) pending.markSovereign(line.key, line.suzerain, sovereign)
          }}
          help={say('sovereignHelp')}
          say={say}
        />
      )}
    </LinkLineFields>
  ))
}
