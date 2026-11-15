import { useFormikContext } from 'formik'

import { useVassalChain } from '../hooks/useVassalChain'
import { sheetYear } from '../utils/sheetYear'

import { ChainReadingLine } from './ChainReadingLine'

import type { ChainReading } from '../utils/readVassalChain'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/**
 * The chain of vassalage under the holder (CMS-422 step 2c), computed — never entered here: from the holder's title
 * up to a sovereign, read at the sheet's year. Where it stops for want of a link, it says *beyond, we do not know*;
 * where the sources diverge, every reading is listed (`files/plans/contribution/vassal-chain.md`, layer 3).
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
  const state = useVassalChain(values.holderTitle?.id ?? null, year, read)

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
          {state.kind === 'read' && (
            <>
              {/* A year as text: as a number, ICU groups it — « 1 100 » */}
              <p className="city-sheet__chain-title">
                {say('chain', { year: String(state.year) })}
              </p>
              {state.readings.length > 1 && (
                <p className="city-sheet__help">
                  {say('chainReadings', { count: state.readings.length })}
                </p>
              )}
              <ul className="city-sheet__chain-readings">
                {state.readings.map((reading) => (
                  <ChainReadingLine
                    key={`${reading.titles.map((title) => title.id).join('>')}|${reading.end}`}
                    reading={reading}
                    say={say}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
