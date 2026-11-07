import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { FilterBox } from './FilterBox'

import type { CityFiltersProps } from '../cityFiltersProps'
import type { CitiesPanelMessageKey } from '../i18n'
import type { StateChoice } from '../utils/stateChoices'

/** Each state's label, its count in it. */
const STATE_LABEL: Readonly<Record<StateChoice['kind'], CitiesPanelMessageKey>> = {
  misplaced: 'stateMisplaced',
  toDeclare: 'stateToDeclare',
  cannotCompare: 'stateCannotCompare',
  agrees: 'stateAgrees',
}

/**
 * « Par vérification » (CARTO-369, the dev, 2026-11-07): a box per state of a city, its count beside it — ticking one keeps the
 * cities in it, two keep the cities of either. At the head of the dialogue: a few boxes, the ones a correction starts
 * from. The dialogue's filter does not narrow it — it filters the countries.
 * @param props - the states, the states ticked and the callback
 * @param props.states - the states offered, with their counts
 * @param props.tickedStates - the states ticked
 * @param props.onTickState - a box was ticked or unticked
 * @returns the section
 */
export function CityStates({
  states,
  tickedStates,
  onTickState,
}: Pick<CityFiltersProps, 'states' | 'tickedStates' | 'onTickState'>) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Render
  return (
    <section className="city-filters__section" aria-label={t('byState')}>
      <h3 className="city-filters__heading">{t('byState')}</h3>
      <p className="short-dialogue__text">{t('byStateHint')}</p>
      <ul className="city-filters__list">
        {states.map(({ kind, count }) => (
          <li key={kind} className="city-filters__box">
            <FilterBox
              boxKey={kind}
              label={t(STATE_LABEL[kind], { count: String(count) })}
              ticked={tickedStates}
              onTick={onTickState}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
