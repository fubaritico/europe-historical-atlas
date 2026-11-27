import { outranks } from '@europe-historical-atlas/core/data/ranks'

import type { ChainReading, ChainTitle } from '../utils/readHierarchyChain'
import type { Say } from '../utils/say'
import type { ChainEnd } from '@europe-historical-atlas/core/data/hierarchyChain'

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

/** A step of a reading where the vassal's rank scores higher than its suzerain's. */
interface OutrankedStep {
  /** The title below. */
  vassal: ChainTitle
  /** The title it answers to. */
  suzerain: ChainTitle
}

/**
 * The steps of a reading that the ranks contradict (CORE-489): each title whose territory's kind scores higher than
 * that of the title above it. A title whose kind was not read, or is no scored rank, is passed over.
 * @param titles - the reading's titles, the holder's first
 * @returns the steps at fault, from the holder's up
 */
function outrankedSteps(titles: readonly ChainTitle[]): OutrankedStep[] {
  return titles.flatMap((vassal, index) => {
    // The last title answers to no one of the reading.
    const suzerain = titles[index + 1]
    if (suzerain === undefined) return []
    return outranks(vassal.kind ?? null, suzerain.kind ?? null) ? [{ vassal, suzerain }] : []
  })
}

/**
 * One reading of the hierarchical chain in one line, under its « Vassal de » lines (the dev, 2026-11-16: the summary
 * stays, renewed at each link added): the titles from the holder's up, then how it ends — a sovereign, « beyond, we
 * do not know », or links that contradict one another. Under it, **each step where the vassal's rank scores higher than
 * its suzerain's** (CORE-489, the dev, 2026-11-20) — the two titles named; a warning, nothing is refused.
 * @param props - the reading and the translator
 * @param props.reading - the reading
 * @param props.say - the translator
 * @returns its line
 */
export function ChainReadingLine({ reading, say }: { reading: ChainReading; say: Say }) {
  return (
    <li className="city-sheet__chain-reading">
      {reading.titles.map((title) => title.name).join(' → ')}
      <span className={`city-sheet__chain-end city-sheet__chain-end--${reading.end}`}>
        {' — '}
        {endText(reading.end, say)}
      </span>
      {outrankedSteps(reading.titles).map(({ vassal, suzerain }) => (
        // No role of its own: the chain's live region, around it, says it (review A11Y-001).
        <span key={String(vassal.id)} className="city-sheet__chain-rank">
          {say('chainRankInversion', { vassal: vassal.name, suzerain: suzerain.name })}
        </span>
      ))}
    </li>
  )
}
