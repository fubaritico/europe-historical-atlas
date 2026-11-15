import { IconButton } from '@fubaritico/react/IconButton'
import { toast } from '@payloadcms/ui'
import { useState } from 'react'

import { useFocusOnToggle } from '../hooks/useFocusOnToggle'
import { useNewLink } from '../hooks/useNewLink'

import { LinkLineFields } from './LinkLineFields'

import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * « Vassal de ⊕ » where the chain stops (CMS-422, the dev's mock-up): ⊕ opens a line — the suzerain, chosen among
 * « Titres » or created by its « + », and the source that says it, the same way (a link is refused without one). The
 * link is saved once both are chosen, and the chain is read again; ✕ closes the line unsaved.
 * @param props - the title the chain stops at, the sheet's year, the link's writer, what to do once saved, the translator
 * @param props.vassal - the title at the top of the reading
 * @param props.year - the sheet's year
 * @param props.saveLink - saves a link of vassalage
 * @param props.onAdded - called once the link is saved, for the chain to be read again
 * @param props.say - the translator
 * @returns the line
 */
export function NewLinkLine({
  vassal,
  year,
  saveLink,
  onAdded,
  say,
}: {
  vassal: RecordChoice
  year: number
  saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
  onAdded: () => void
  say: Say
}) {
  const [open, setOpen] = useState(false)
  const { box, toggled } = useFocusOnToggle(open, '[role="group"]')

  // Handlers
  const handleFailed = () => {
    toast.error(say('linkFailed'))
  }
  const line = useNewLink(saveLink, vassal.id, year, onAdded, handleFailed)

  // Render
  return (
    <div ref={box}>
      {open ? (
        <LinkLineFields
          line={line}
          vassal={vassal}
          onClose={() => {
            // Closed unsaved, the line is forgotten: ⊕ opens it again empty
            line.reset()
            toggled()
            setOpen(false)
          }}
          say={say}
        />
      ) : (
        <div className="city-sheet__chain-add">
          <span className="city-sheet__label">{say('vassalOf')}</span>
          <IconButton
            type="button"
            size="sm"
            icon="Plus"
            aria-label={say('addSuzerainOf', { name: vassal.name })}
            onClick={() => {
              toggled()
              setOpen(true)
            }}
          />
        </div>
      )}
    </div>
  )
}
