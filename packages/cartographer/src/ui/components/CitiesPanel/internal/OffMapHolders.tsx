import { NO_HOLDER } from '../../../../state/citiesSlice'
import { useTranslation } from '../../../hooks/useTranslation'
import { matchesFilter } from '../../../utils/matchesFilter'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { FilterBox } from './FilterBox'

import type { CityFiltersProps } from '../cityFiltersProps'

/**
 * « Pas encore sur la carte » (CARTO-370, the dev, 2026-11-07): the holders the sources give that no polity of the map
 * carries, by name, then « Sans détenteur » — so that the cities in red, « pays à déclarer », can be reached too. Under
 * the dialogue's filter, only the boxes whose label answers it.
 * @param props - the choices, what is typed, the holders ticked and the callback
 * @param props.choices - what the dialogue offers
 * @param props.query - what is typed in the dialogue's filter
 * @param props.ticked - the holders ticked
 * @param props.onTick - a box was ticked or unticked
 * @returns the section
 */
export function OffMapHolders({
  choices,
  query,
  ticked,
  onTick,
}: Pick<CityFiltersProps, 'choices' | 'ticked' | 'onTick'> & { query: string }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const noHolder = t('noHolder', { count: String(choices.noHolder) })
  const boxes = [
    ...choices.offMap.map(({ key, name, count }) => ({
      key,
      name,
      label: t('holderCount', { name, count: String(count) }),
    })),
    // « Sans détenteur » answers the filter by its own words.
    { key: NO_HOLDER, name: noHolder, label: noHolder },
  ].filter(({ name }) => matchesFilter(name, query))

  // Render
  return (
    <section className="city-filters__section" aria-label={t('offMap')}>
      <h3 className="city-filters__heading">{t('offMap')}</h3>
      <p className="short-dialogue__text">{t('offMapHint')}</p>
      {boxes.length === 0 ? (
        <p className="short-dialogue__text">{t('noHolderMatch', { query: query.trim() })}</p>
      ) : (
        <ul className="city-filters__list">
          {boxes.map(({ key, label }) => (
            <li key={key} className="city-filters__box">
              <FilterBox boxKey={key} label={label} ticked={ticked} onTick={onTick} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
