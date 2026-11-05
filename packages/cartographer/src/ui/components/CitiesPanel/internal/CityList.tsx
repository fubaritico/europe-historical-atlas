import { useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { matchesFilter } from '../../../utils/matchesFilter'
import { ListFilter } from '../../ListFilter'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { CityRow } from './CityRow'

import type { CityListProps } from '../cityListProps'

/**
 * The cities of the year, each with its eye, under one eye for them all — **for all those listed**: under the filter
 * at its head (CARTO-360), the cities whose name holds what is typed, and the eye says so (« Les 2 villes trouvées »).
 * What is typed is the list's own — one writer, one reader, no slice.
 * @param props - the cities, which are shown and opened, and the callbacks
 * @param props.year - the year open, named on the eye for them all
 * @param props.cities - the cities of the year, before the filter
 * @returns the filter and the list, or the filter and a line saying that no city answers
 */
export function CityList({ year, cities, ...props }: CityListProps & { year: number }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // State
  const [query, setQuery] = useState('')

  // Derived
  const found = cities.filter(({ name }) => matchesFilter(name, query))
  const filtered = found.length < cities.length
  const allShown = found.length > 0 && found.every(({ id }) => props.shown.has(id))
  const show = filtered ? 'showFound' : 'showAll'
  const eye = t(allShown ? (filtered ? 'hideFound' : 'hideAll') : show)

  // Handlers
  const handleAll = () => {
    props.onAllShown(
      found.map(({ id }) => id),
      !allShown
    )
  }

  // Render
  return (
    <>
      <ListFilter value={query} onChange={setQuery} label={t('filter')} />
      {found.length === 0 ? (
        <p className="panel__hint">{t('noMatch', { query: query.trim() })}</p>
      ) : (
        <>
          <div className="layer-row city-row city-row--all" data-visible={allShown}>
            <button
              type="button"
              className="layer-row__eye"
              aria-pressed={allShown}
              aria-label={eye}
              title={eye}
              onClick={handleAll}
            >
              <span aria-hidden="true">{allShown ? '◉' : '○'}</span>
            </button>
            <span className="layer-row__name">
              {filtered
                ? t('foundCities', { count: found.length })
                : t('allCities', { year: String(year) })}
            </span>
          </div>
          <ul className="layer-list city-list" aria-label={t('title')}>
            {found.map((city) => (
              <CityRow key={city.id} city={city} {...props} />
            ))}
          </ul>
        </>
      )}
    </>
  )
}
