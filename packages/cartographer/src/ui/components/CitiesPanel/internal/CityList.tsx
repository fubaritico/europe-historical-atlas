import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { CityRow } from './CityRow'

import type { CityListProps } from '../cityListProps'

/**
 * The cities of the year, each with its eye, under one eye for them all.
 * @param props - the cities, which are shown and opened, and the callbacks
 * @param props.year - the year open, named on the eye for them all
 * @returns the list
 */
export function CityList({ year, ...props }: CityListProps & { year: number }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const allShown = props.cities.length > 0 && props.cities.every(({ id }) => props.shown.has(id))
  const eye = t(allShown ? 'hideAll' : 'showAll')

  // Handlers
  const handleAll = () => {
    props.onAllShown(
      props.cities.map(({ id }) => id),
      !allShown
    )
  }

  // Render
  return (
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
        <span className="layer-row__name">{t('allCities', { year: String(year) })}</span>
      </div>
      <ul className="layer-list city-list" aria-label={t('title')}>
        {props.cities.map((city) => (
          <CityRow key={city.id} city={city} {...props} />
        ))}
      </ul>
    </>
  )
}
