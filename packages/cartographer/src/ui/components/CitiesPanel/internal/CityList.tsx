import { useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { matchesFilter } from '../../../utils/matchesFilter'
import { ListFilter } from '../../ListFilter'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { CityBoxes } from './CityBoxes'
import { CityRow } from './CityRow'

import type { CityListProps } from '../cityListProps'
import type { ChangeEvent } from 'react'

/**
 * The cities of the year, each with its eye, under two boxes (the dev, 2026-11-05): « Afficher toutes les villes » —
 * **all those listed**: under the filter at its head (CARTO-360), the cities whose name holds what is typed, and the box
 * says so (« Afficher les 2 villes trouvées ») — and « Afficher comme des points », in their holder's colour.
 * What is typed is the list's own — one writer, one reader, no slice.
 * @param props - the cities, which are shown and opened, and the callbacks
 * @param props.year - the year open, named on the box for them all
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

  // Handlers
  const handleAll = () => {
    props.onAllShown(
      found.map(({ id }) => id),
      !allShown
    )
  }
  const handleAsPoints = (event: ChangeEvent<HTMLInputElement>) => {
    props.onAsPoints(event.target.checked)
  }

  // Render
  return (
    <>
      <ListFilter value={query} onChange={setQuery} label={t('filter')} />
      {found.length === 0 ? (
        <p className="panel__hint">{t('noMatch', { query: query.trim() })}</p>
      ) : (
        <>
          <CityBoxes
            found={filtered ? found.length : null}
            year={year}
            allShown={allShown}
            onAll={handleAll}
            asPoints={props.asPoints}
            onAsPoints={handleAsPoints}
          />
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
