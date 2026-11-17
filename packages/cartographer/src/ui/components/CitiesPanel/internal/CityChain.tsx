import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'
import { CHAIN_END_TEXT } from '../utils/verdictText'

import { ChainTitle } from './ChainTitle'

import type { ContentChainReading } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * A city's chain of vassalage as the dev laid it on 2026-11-17, after Carcassonne's four readings read as one list:
 * each reading whole, from the holder up — numbered when there are several, set apart from the next —, one title per
 * line, each climbing behind an arrow, the last saying how the reading ends: « souverain », or why it stops. Nothing
 * shared between readings is written once: each reads alone (the dev: _"once it is this chain, once that one"_).
 * @param props - the readings
 * @param props.readings - the chain's readings
 * @returns the chain
 */
export function CityChain({ readings }: { readings: readonly ContentChainReading[] }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const several = readings.length > 1

  // Render
  return readings.map((reading, number) => (
    <div
      key={`${reading.titles.map((title) => title.name).join('>')}|${reading.end}`}
      className={several ? 'city-detail__reading' : undefined}
    >
      {several && (
        <p className="city-detail__reading-label">{t('chainReading', { number: number + 1 })}</p>
      )}
      <ul className="city-detail__chain">
        {reading.titles.map((title, index) => (
          <li key={`${String(index)}|${title.name}`}>
            <ChainTitle
              title={title}
              arrow={index > 0}
              end={index === reading.titles.length - 1 ? t(CHAIN_END_TEXT[reading.end]) : null}
            />
          </li>
        ))}
      </ul>
    </div>
  ))
}
