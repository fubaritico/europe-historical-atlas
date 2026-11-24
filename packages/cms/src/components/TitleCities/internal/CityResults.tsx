import { resultSentence } from '../utils/resultSentence'

import type { AttachResult } from '../../../titles/attachCities'

/**
 * What became of each city at the last attachment, one sentence a city (CMS-507).
 * @param props - the results
 * @param props.results - what the operation answered for each city
 * @returns the region, holding the list once there is one
 */
export function CityResults({ results }: { results: readonly AttachResult[] }) {
  // A region present before the results arrive, so a screen reader says them when they do (review A11Y-001)
  return (
    <div role="status">
      {results.length > 0 && (
        <ul className="title-cities__results" aria-label="Ce qu’est devenue chaque ville">
          {results.map((result) => (
            <li key={String(result.place)}>{resultSentence(result)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
