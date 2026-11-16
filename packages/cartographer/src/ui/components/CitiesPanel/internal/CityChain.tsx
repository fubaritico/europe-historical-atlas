import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'
import { parseTitle } from '../utils/titleFormat'
import { CHAIN_END_TEXT } from '../utils/verdictText'

import type { ContentChainReading } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * A city's chain of vassalage as the CMS gives it (the dev's screen of 2026-11-16): each reading a list, one title per
 * line from the holder's up — the person's name in italics —, the last one saying how the chain ends: « souverain », or
 * why it stops.
 * @param props - the readings
 * @param props.readings - the chain's readings
 * @returns the lists
 */
export function CityChain({ readings }: { readings: readonly ContentChainReading[] }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Render
  return readings.map((reading) => (
    <ul
      key={`${reading.titles.map((title) => title.name).join('>')}|${reading.end}`}
      className="city-detail__chain"
    >
      {reading.titles.map((title, index) => {
        const { person } = parseTitle(title.name)
        const rest = person === null ? title.name : title.name.slice(person.length)
        return (
          <li key={`${String(index)}|${title.name}`}>
            {person !== null && <em className="city-detail__person">{person}</em>}
            {rest}
            {index === reading.titles.length - 1 &&
              t('chainEnd', { end: t(CHAIN_END_TEXT[reading.end]) })}
          </li>
        )
      })}
    </ul>
  ))
}
