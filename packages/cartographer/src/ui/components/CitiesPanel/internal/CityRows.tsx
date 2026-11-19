import { useTranslation } from '../../../hooks/useTranslation'
import { useRowWindow } from '../hooks/useRowWindow'
import { useShowChosenCity } from '../hooks/useShowChosenCity'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { CityRow } from './CityRow'

import type { CityListProps } from '../cityListProps'

/**
 * The browser's own scroll anchoring, turned off on the list: the two gaps already account for the rows not drawn, and
 * a browser correcting the scroll as they change would fight them. Set here, beside the gaps it goes with.
 */
const WINDOWED_LIST = { overflowAnchor: 'none' } as const

/** What the rows are handed: the cities listed, which are shown, chosen and opened, their verdicts and dots. */
type CityRowsProps = Pick<
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
>

/**
 * The rows of `{Cities}`' list — each handed the values of its own city only (CARTO-485), so a row is drawn again
 * only when one of them changes. **Only the rows in view are in the page** (`useRowWindow`): the list holds thirteen
 * thousand cities, and two gaps stand for the rows above and below, so it keeps its whole height and its scrollbar.
 * **The city chosen is scrolled to** (CARTO-384, `useShowChosenCity`).
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
}: CityRowsProps) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // State
  const { listRef, rows, show } = useRowWindow(cities.length)

  // Effects
  useShowChosenCity(cities, selected, show)

  // Render
  return (
    <ul
      ref={listRef}
      className="layer-list city-list"
      aria-label={t('title')}
      style={WINDOWED_LIST}
    >
      {rows.before > 0 && <li role="presentation" style={{ height: rows.before }} />}
      {cities.slice(rows.first, rows.end).map((city) => (
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
      {rows.after > 0 && <li role="presentation" style={{ height: rows.after }} />}
    </ul>
  )
}
