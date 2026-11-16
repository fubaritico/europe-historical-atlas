import { toast } from '@payloadcms/ui'
import { useFormikContext } from 'formik'
import { useState } from 'react'

import { useLastRead } from '../hooks/useLastRead'
import { useOnChange } from '../hooks/useOnChange'
import { usePendingLinks } from '../hooks/usePendingLinks'
import { useVassalChain } from '../hooks/useVassalChain'
import { sheetYear } from '../utils/sheetYear'

import { ChainReadings, topOf } from './ChainReadings'

import type { ChainReading } from '../utils/readVassalChain'
import type { SaveSovereign } from '../utils/saveSovereign'
import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/** What the chain writes to the base. */
export interface ChainWriters {
  /** Saves a link of vassalage. */
  readonly saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
  /** Ticks or unticks « souverain » on a title. */
  readonly saveSovereign: SaveSovereign
}

/**
 * The chain of vassalage under the holder (CMS-422, the dev's mock-up), read at the sheet's year from the links the
 * base holds: one line « Vassal de » per link already entered, then the repeating block — « Vassal de ⊕ » lines,
 * each saved on its own, until the top is ticked « Souverain » — and the chain in one line below (the dev, 2026-11-16).
 * The block's lines live here, above the reading, so a line saved — the chain read again — leaves the others as they
 * were; and while it is read again, the last reading stays on screen. Where the sources diverge, every reading is listed
 * (`files/plans/contribution/vassal-chain.md`, layer 3).
 * @param props - the chain's reader, its writers and the translator
 * @param props.read - the chain of a title at a year, from the base
 * @param props.writers - what the chain writes to the base
 * @param props.say - the translator
 * @returns the chain, or nothing while no title is chosen
 */
export function HolderChain({
  read,
  writers,
  say,
}: {
  read: (title: number | string, year: number) => Promise<ChainReading[]>
  writers: ChainWriters
  say: Say
}) {
  const { values } = useFormikContext<SheetValues>()
  const year = sheetYear(values.date.start.year)
  const [generation, setGeneration] = useState(0)
  const state = useVassalChain(values.holderTitle, year, read, generation)
  const shown = useLastRead(state)
  const reread = () => {
    setGeneration((current) => current + 1)
  }
  const top = shown?.readings[0] === undefined ? null : topOf(shown.readings[0]).id
  const pending = usePendingLinks(top, year, {
    saveLink: writers.saveLink,
    onSaved: reread,
    onFailed: () => toast.error(say('linkFailed')),
  })

  // Another holder chosen: the lines entered under the last one are not its chain
  useOnChange(values.holderTitle, pending.clear)

  // Render — the live region stays mounted, empty while no title is chosen: a reader announces only the changes
  // inside a region already there
  return (
    <div aria-live="polite">
      {state.kind !== 'none' && (
        <div className="city-sheet__chain">
          {state.kind === 'no-year' && <p className="city-sheet__help">{say('chainNoYear')}</p>}
          {state.kind === 'loading' && <p className="city-sheet__help">{say('chainLoading')}</p>}
          {state.kind === 'failed' && (
            <p className="city-sheet__help city-sheet__help--error">{say('chainFailed')}</p>
          )}
          {shown !== null && state.kind !== 'failed' && state.kind !== 'no-year' && (
            <ChainReadings
              readings={shown.readings}
              year={shown.year}
              pending={pending}
              saveSovereign={writers.saveSovereign}
              onReread={reread}
              say={say}
            />
          )}
        </div>
      )}
    </div>
  )
}
