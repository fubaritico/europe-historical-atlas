import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { CityRow } from './CityRow'

import type { CityListProps } from '../cityListProps'

/**
 * The rows of `{Cities}`' list, one per city listed — each handed the values of its own city only (CARTO-485), so a
 * row is drawn again only when one of them changes.
 * @param props - the cities listed, which are shown, chosen and opened, their verdicts and dots, and the callbacks
 * @param props.cities - the cities listed, filtered and sorted
 * @param props.shown - the ids of the cities shown
 * @param props.selected - the city chosen
 * @param props.opened - the city whose information box is open
 * @param props.verdicts - each city's verdict, by id
 * @param props.dotOf - a city's dot
 * @param props.onShown - a city's eye was toggled
 * @param props.onSelect - a city's name was clicked
 * @param props.onOpen - a city's name was double-clicked, or ‹enter› pressed on it
 * @returns the list
 */
export function CityRows({
  cities,
  shown,
  selected,
  opened,
  verdicts,
  dotOf,
  onShown,
  onSelect,
  onOpen,
}: Pick<
  CityListProps,
  | 'cities'
  | 'shown'
  | 'selected'
  | 'opened'
  | 'verdicts'
  | 'dotOf'
  | 'onShown'
  | 'onSelect'
  | 'onOpen'
>) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Render
  return (
    <ul className="layer-list city-list" aria-label={t('title')}>
      {cities.map((city) => (
        <CityRow
          key={city.id}
          city={city}
          visible={shown.has(city.id)}
          chosen={selected === city.id}
          opened={opened === city.id}
          verdict={verdicts.get(city.id)?.kind}
          dot={dotOf(city)}
          onShown={onShown}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      ))}
    </ul>
  )
}
