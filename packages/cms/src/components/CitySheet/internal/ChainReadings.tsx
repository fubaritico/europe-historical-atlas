import { ChainLinks } from './ChainLinks'
import { ChainReadingLine } from './ChainReadingLine'
import { PendingBlock } from './PendingBlock'

import type { PendingLinks } from '../hooks/usePendingLinks'
import type { ChainReading } from '../utils/readVassalChain'
import type { SaveSovereign } from '../utils/saveSovereign'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * The holder's title of a reading — its first; `core` never gives a reading without it.
 * @param reading - the reading
 * @returns the holder's title
 * @throws {Error} when the reading holds no title, which `chainPaths` never gives
 */
function holderOf(reading: ChainReading): RecordChoice {
  const holder = reading.titles[0]
  if (holder === undefined) throw new Error('[CMS] a reading of the chain came with no title')
  return holder
}

/**
 * The title a reading stops at — the last of it; `core` never gives a reading without its holder's title.
 * @param reading - the reading
 * @returns its top title
 * @throws {Error} when the reading holds no title, which `chainPaths` never gives
 */
export function topOf(reading: ChainReading): RecordChoice {
  const top = reading.titles.at(-1)
  if (top === undefined) throw new Error('[CMS] a reading of the chain came with no title')
  return top
}

/**
 * The chain once read (the dev's mock-up, CMS-422): for each reading, one line « Vassal de » per link entered —
 * entered once, it shows on every city under that title — then, on the first reading, the repeating block: « Vassal
 * de ⊕ » until its top is ticked « Souverain »; then the reading in one line, how it ends included. A heading names
 * the year; a sentence says how many readings when the sources diverge.
 * @param props - the readings, their year, the block's lines, the box's save, the re-read, the translator
 * @param props.readings - the readings
 * @param props.year - the year they were read at
 * @param props.pending - the lines being entered at the top of the first reading
 * @param props.saveSovereign - ticks or unticks « souverain » on a title
 * @param props.onReread - reads the chain again
 * @param props.say - the translator
 * @returns the readings
 */
export function ChainReadings({
  readings,
  year,
  pending,
  saveSovereign,
  onReread,
  say,
}: {
  readings: ChainReading[]
  year: number
  pending: PendingLinks
  saveSovereign: SaveSovereign
  onReread: () => void
  say: Say
}) {
  return (
    <>
      {/* A year as text: as a number, ICU groups it — « 1 100 » */}
      <p className="city-sheet__chain-title">{say('chain', { year: String(year) })}</p>
      {readings.length > 1 && (
        <p className="city-sheet__help">{say('chainReadings', { count: readings.length })}</p>
      )}
      {readings.map((reading, index) => (
        <div
          // By its rank: read again after a line is saved, the first reading keeps its block and the lines in it
          key={index}
          className="city-sheet__chain-reading-block"
        >
          {/* The first reading's links are the block's lines, to change; another reading's, read only */}
          {index > 0 && <ChainLinks reading={reading} say={say} />}
          {index === 0 && reading.end !== 'loop' && (
            <PendingBlock
              pending={pending}
              top={holderOf(reading)}
              topSovereign={reading.end === 'sovereign' && reading.titles.length === 1}
              saveSovereign={saveSovereign}
              onReread={onReread}
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
