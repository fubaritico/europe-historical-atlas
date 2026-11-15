import type { ChainReading } from '../utils/readVassalChain'
import type { Say } from '../utils/say'
import type { ChainEnd } from '@europe-historical-atlas/core/data/vassalChain'
import type { ReactNode } from 'react'

/**
 * How a reading ends, in words.
 * @param end - why it stops
 * @param say - the translator
 * @returns the words
 */
function endText(end: ChainEnd, say: Say): string {
  switch (end) {
    case 'sovereign':
      return say('chainSovereign')
    case 'unknown':
      return say('chainUnknown')
    case 'loop':
      return say('chainLoop')
  }
}

/**
 * One reading of the chain of vassalage: the titles from the holder's up, then how it ends — a sovereign, « beyond,
 * we do not know », or links that contradict one another.
 * @param props - the reading, the translator and what follows it
 * @param props.reading - the reading
 * @param props.say - the translator
 * @param props.children - what follows its end: the button adding the next link, where it stops
 * @returns its line
 */
export function ChainReadingLine({
  reading,
  say,
  children,
}: {
  reading: ChainReading
  say: Say
  children?: ReactNode
}) {
  return (
    <li className="city-sheet__chain-reading">
      {reading.titles.map((title) => title.name).join(' → ')}
      <span className={`city-sheet__chain-end city-sheet__chain-end--${reading.end}`}>
        {' — '}
        {endText(reading.end, say)}
      </span>
      {children}
    </li>
  )
}
