import { useFormikContext } from 'formik'
import { useEffect, useRef, useState } from 'react'

import { useVassalChain } from '../hooks/useVassalChain'
import { sheetYear } from '../utils/sheetYear'

import { ChainReadings } from './ChainReadings'

import type { ChainReading } from '../utils/readVassalChain'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/**
 * The chain of vassalage under the holder (CMS-422 step 2c), computed — never entered here: from the holder's title
 * up to a sovereign, read at the sheet's year. Where it stops for want of a link, it says *beyond, we do not know*;
 * where the sources diverge, every reading is listed (`files/plans/contribution/vassal-chain.md`, layer 3). Where a
 * reading stops for want of a link, « Ajouter son suzerain » enters it, in Payload's drawer, and the chain is read
 * again.
 * @param props - the chain's reader and the translator
 * @param props.read - the chain of a title at a year, from the base
 * @param props.say - the translator
 * @returns the chain, or nothing while no title is chosen
 */
export function HolderChain({
  read,
  say,
}: {
  read: (title: number | string, year: number) => Promise<ChainReading[]>
  say: Say
}) {
  const { values } = useFormikContext<SheetValues>()
  const year = sheetYear(values.date.start.year)
  const [generation, setGeneration] = useState(0)
  const state = useVassalChain(values.holderTitle?.id ?? null, year, read, generation)
  const region = useRef<HTMLDivElement>(null)
  const refocus = useRef(false)

  // Payload's drawer does not hand the focus back on closing, and the button that opened it is gone with the
  // reading it ended: once the chain is read again, the keyboard lands on it rather than on nothing
  useEffect(() => {
    if (!refocus.current || state.kind === 'loading') return
    refocus.current = false
    region.current?.focus()
  }, [state])

  // Handlers
  const handleAdded = () => {
    refocus.current = true
    setGeneration((current) => current + 1)
  }

  // Render — the live region stays mounted, empty while no title is chosen: a reader announces only the changes
  // inside a region already there
  return (
    <div ref={region} tabIndex={-1} aria-live="polite">
      {state.kind !== 'none' && (
        <div className="city-sheet__chain">
          {state.kind === 'no-year' && <p className="city-sheet__help">{say('chainNoYear')}</p>}
          {state.kind === 'loading' && <p className="city-sheet__help">{say('chainLoading')}</p>}
          {state.kind === 'failed' && (
            <p className="city-sheet__help city-sheet__help--error">{say('chainFailed')}</p>
          )}
          {state.kind === 'read' && (
            <ChainReadings
              readings={state.readings}
              year={state.year}
              onAdded={handleAdded}
              say={say}
            />
          )}
        </div>
      )}
    </div>
  )
}
