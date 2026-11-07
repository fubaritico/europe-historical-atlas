import { useEffect, useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { showRow } from '../../../utils/showRow'
import { ListFilter } from '../../ListFilter'
import { CITIES_PANEL_MESSAGES } from '../i18n'
import { citiesFound } from '../utils/citiesFound'
import { cityRowId } from '../utils/cityRowId'

import { CityBoxes } from './CityBoxes'
import { CityFilters } from './CityFilters'
import { CityRow } from './CityRow'

import type { CityFiltersProps } from '../cityFiltersProps'
import type { CityListProps } from '../cityListProps'
import type { ChangeEvent } from 'react'

/** What the list is handed: the cities and their callbacks, the year open, and the advanced filters. */
type CityListWithFiltersProps = CityListProps & { year: number; filters: CityFiltersProps }

/**
 * The cities of the year, each with its eye, under two boxes (the dev, 2026-11-05): « Afficher toutes les villes » —
 * **all those listed**: under the filter at its head (CARTO-360), the cities whose name holds what is typed, and the box
 * says so (« Afficher les 2 villes trouvées ») — and « Afficher comme des points », in their holder's colour.
 * What is typed is the list's own — one writer, one reader, no slice. The holders ticked in the advanced filters
 * (CARTO-370) are the store's, so they outlive the panel docked or floated; they narrow the list together with the name.
 * **The city chosen is scrolled to** (CARTO-384) — on the map with the white arrow, as `{Polities}` scrolls to the
 * polity chosen there; a city the filters hide has no row, and nothing scrolls.
 * @param props - the cities, which are shown and opened, the advanced filters, and the callbacks
 * @param props.year - the year open, named on the box for them all
 * @param props.cities - the cities of the year, before the filters
 * @param props.filters - the advanced filters: what they offer, the holders ticked, and their callbacks
 * @returns the filter and the list, or the filter and a line saying that no city answers
 */
export function CityList({ year, cities, filters, ...props }: CityListWithFiltersProps) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // State
  const [query, setQuery] = useState('')

  // Derived
  const found = citiesFound(cities, query, filters.ticked)
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

  // Effects
  useEffect(() => {
    if (props.selected !== null) showRow(cityRowId(props.selected))
  }, [props.selected])

  // Render
  return (
    <>
      <ListFilter
        value={query}
        onChange={setQuery}
        label={t('filter')}
        actions={<CityFilters {...filters} />}
      />
      {found.length === 0 ? (
        <p className="panel__hint">
          {query.trim() === '' ? t('noMatchFilters') : t('noMatch', { query: query.trim() })}
        </p>
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
