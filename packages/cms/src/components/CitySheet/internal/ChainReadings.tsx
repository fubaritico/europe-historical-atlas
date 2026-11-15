import { ChainReadingLine } from './ChainReadingLine'
import { NewLinkLine } from './NewLinkLine'

import type { ChainReading } from '../utils/readVassalChain'
import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'
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
 * The chain once read (the dev's mock-up, CMS-422): for each reading, one line « Vassal de » per link entered —
 * entered once, it shows on every city under that title — then « Vassal de ⊕ » where it stops for want of a link,
 * then the reading in one line, how it ends included. A heading names the year; a sentence says how many readings
 * when the sources diverge.
 * @param props - the readings, their year, the link's writer, what to do once a link is added, the translator
 * @param props.readings - the readings
 * @param props.year - the year they were read at
 * @param props.saveLink - saves a link of vassalage
 * @param props.onAdded - called once a link is saved from the sheet
 * @param props.say - the translator
 * @returns the readings
 */
export function ChainReadings({
  readings,
  year,
  saveLink,
  onAdded,
  say,
}: {
  readings: ChainReading[]
  year: number
  saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
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
      {readings.map((reading) => (
        <div
          key={`${reading.titles.map((title) => title.id).join('>')}|${reading.end}`}
          className="city-sheet__chain-reading-block"
        >
          <ul className="city-sheet__chain-links">
            {reading.titles.slice(1).map((suzerain) => (
              <li key={String(suzerain.id)} className="city-sheet__chain-link">
                <span className="city-sheet__label">{say('vassalOf')}</span>
                <span className="city-sheet__chain-suzerain">{suzerain.name}</span>
              </li>
            ))}
          </ul>
          {reading.end === 'unknown' && (
            <NewLinkLine
              vassal={topOf(reading)}
              year={year}
              saveLink={saveLink}
              onAdded={onAdded}
              say={say}
            />
          )}
          <ul className="city-sheet__chain-readings">
            <ChainReadingLine reading={reading} say={say} />
          </ul>
        </div>
      ))}
    </>
  )
}
