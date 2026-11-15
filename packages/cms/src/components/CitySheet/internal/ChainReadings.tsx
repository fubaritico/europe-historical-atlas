import { AddLinkDrawer } from './AddLinkDrawer'
import { ChainReadingLine } from './ChainReadingLine'

import type { ChainReading } from '../utils/readVassalChain'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * The title a reading stops at — the last of it; `core` never gives a reading without its holder's title.
 * @param reading - the reading
 * @returns its top title
 * @throws {Error} when the reading holds no title, which `chainPaths` never gives
 */
function topOf(reading: ChainReading): RecordChoice {
  const top = reading.titles.at(-1)
  if (top === undefined) throw new Error('[CMS] a reading of the chain came with no title')
  return top
}

/**
 * The chain once read (CMS-422 step 2c): its year, how many readings when the sources diverge, and each reading — the
 * ones that stop for want of a link followed by « Ajouter son suzerain ».
 * @param props - the readings, their year, what to do once a link is added, the translator
 * @param props.readings - the readings
 * @param props.year - the year they were read at
 * @param props.onAdded - called once a link is saved from the sheet
 * @param props.say - the translator
 * @returns the readings
 */
export function ChainReadings({
  readings,
  year,
  onAdded,
  say,
}: {
  readings: ChainReading[]
  year: number
  onAdded: () => void
  say: Say
}) {
  return (
    <>
      {/* A year as text: as a number, ICU groups it — « 1 100 » */}
      <p className="city-sheet__chain-title">{say('chain', { year: String(year) })}</p>
      {readings.length > 1 && (
        <p className="city-sheet__help">{say('chainReadings', { count: readings.length })}</p>
      )}
      <ul className="city-sheet__chain-readings">
        {readings.map((reading) => (
          <ChainReadingLine
            key={`${reading.titles.map((title) => title.id).join('>')}|${reading.end}`}
            reading={reading}
            say={say}
          >
            {reading.end === 'unknown' && (
              <AddLinkDrawer vassal={topOf(reading)} year={year} onAdded={onAdded} say={say} />
            )}
          </ChainReadingLine>
        ))}
      </ul>
    </>
  )
}
