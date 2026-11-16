import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'
import { CHAIN_END_TEXT } from '../utils/verdictText'

import type { ContentChainReading } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * A city's chain of vassalage as the CMS gives it (the dev's screen of 2026-11-16): each reading a list, one title per
 * line from the holder's up, the last one saying how the chain ends — « souverain », or why it stops.
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
      {reading.titles.map((title, index) => (
        <li key={`${String(index)}|${title.name}`}>
          {index === reading.titles.length - 1
            ? t('chainTop', { title: title.name, end: t(CHAIN_END_TEXT[reading.end]) })
            : title.name}
        </li>
      ))}
    </ul>
  ))
}
