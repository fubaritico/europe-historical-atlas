import { outranks } from '@europe-historical-atlas/core/data/ranks'

import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'
import { CHAIN_END_TEXT } from '../utils/verdictText'

import { ChainTitle } from './ChainTitle'

import type {
  ContentChainReading,
  ContentChainTitle,
} from '@europe-historical-atlas/core/data/contentFormat'

/** A step of a reading where the vassal's rank scores higher than its suzerain's. */
interface OutrankedStep {
  /** The title below. */
  vassal: ContentChainTitle
  /** The title it answers to. */
  suzerain: ContentChainTitle
}

/**
 * The steps of a reading that the ranks contradict (CARTO-491): each title whose territory's kind scores higher than
 * that of the title above it.
 * @param titles - the reading's titles, the holder's first
 * @returns the steps at fault, from the holder's up
 */
function outrankedSteps(titles: readonly ContentChainTitle[]): OutrankedStep[] {
  return titles.flatMap((vassal, index) => {
    // The last title answers to no one of the reading.
    const suzerain = titles[index + 1]
    if (suzerain === undefined) return []
    return outranks(vassal.kind ?? null, suzerain.kind ?? null) ? [{ vassal, suzerain }] : []
  })
}

/**
 * A city's hierarchical chain as the dev laid it on 2026-11-17, after Carcassonne's four readings read as one list:
 * each reading whole, from the holder up — numbered when there are several, set apart from the next —, one title per
 * line, each climbing behind an arrow, the last saying how the reading ends: « souverain », or why it stops. Nothing
 * shared between readings is written once: each reads alone (the dev: _"once it is this chain, once that one"_).
 * Under a reading, **each step where the vassal's rank scores higher than its suzerain's** (CARTO-491, the dev,
 * 2026-11-20) — the two titles named; said, never refused. A title whose territory's kind the export does not carry,
 * or that is no scored rank, is passed over.
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
      {outrankedSteps(reading.titles).map(({ vassal, suzerain }) => (
        <p key={`${vassal.name}>${suzerain.name}`}>
          {t('chainRankInversion', { vassal: vassal.name, suzerain: suzerain.name })}
        </p>
      ))}
    </div>
  ))
}
