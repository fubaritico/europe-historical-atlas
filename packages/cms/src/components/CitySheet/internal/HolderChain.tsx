import { toast } from '@payloadcms/ui'
import { useFormikContext } from 'formik'
import { useState } from 'react'

import { useBlockWiring } from '../hooks/useBlockWiring'
import { usePendingLinks } from '../hooks/usePendingLinks'
import { useVassalChain } from '../hooks/useVassalChain'
import { removalSentence } from '../utils/removalSentence'
import { sheetYear } from '../utils/sheetYear'

import { SovereignOrChain } from './SovereignOrChain'

import type { ChainSaver } from '../hooks/useChainSaver'
import type { ChainReading } from '../utils/readVassalChain'
import type { SaveSovereign } from '../utils/saveSovereign'
import type { ChangedVassalLink, LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/** What the chain writes to the base. */
export interface ChainWriters {
  /** Saves a link of vassalage. */
  readonly saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
  /** Changes a link of vassalage. */
  readonly updateLink: (change: ChangedVassalLink) => Promise<LinkAnswer>
  /** Removes a link of vassalage. */
  readonly deleteLink: (link: string) => Promise<LinkAnswer>
  /** Ticks or unticks « souverain » on a title — at « Enregistrer », with the lines. */
  readonly saveSovereign: SaveSovereign
  /** The sheet's « Enregistrer », which saves the lines being entered before the sheet. */
  readonly saver: ChainSaver
}

/**
 * The chain of vassalage under the holder (CMS-422, the dev's mock-up), read at the sheet's year from the links the
 * base holds: one line « Vassal de » per link already entered, then the repeating block — « Vassal de ⊕ » lines,
 * saved at the sheet's « Enregistrer », until the top is ticked « Souverain » — and the chain in one line below (the
 * dev, 2026-11-16). **The holder's own « Souverain » comes first**: ticked, the city is a sovereign state — a
 * sovereignty of one link —, no chain is entered, and the holder's links are removed at « Enregistrer », said before.
 *
 * The block's lines live here, above the reading; the sheet's « Enregistrer » is handed how to save them, and told how
 * many wait. While the chain is read again, the reading the block was loaded from stays on screen. Where the sources
 * diverge, every reading is listed (`files/plans/contribution/vassals/vassal-chain.md`, layer 3).
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
  const reread = () => {
    setGeneration((current) => current + 1)
  }
  const pending = usePendingLinks(values.holderTitle, year, {
    saveLink: writers.saveLink,
    updateLink: writers.updateLink,
    deleteLink: writers.deleteLink,
    saveSovereign: writers.saveSovereign,
    onSaved: reread,
    onFailed: () => toast.error(say('linkFailed')),
    // Its line already gone from the screen, a link the server kept is said in a toast (the dev, 2026-11-16)
    onRemovalStopped: (names, message) => toast.error(removalSentence(names, message, say)),
  })

  // Each chain read is loaded into the block; the sheet's « Enregistrer » saves it first
  useBlockWiring(state, pending, writers.saver)

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
          {/* The chain the block was loaded from — box, lines and reading always from one read — kept while read again */}
          {pending.loaded !== null && state.kind !== 'failed' && state.kind !== 'no-year' && (
            <SovereignOrChain
              readings={pending.loaded.readings}
              year={pending.loaded.year}
              pending={pending}
              say={say}
            />
          )}
        </div>
      )}
    </div>
  )
}
