import { CityEye } from './CityEye'
import { CityHolderDot } from './CityHolderDot'

import type { CityMark } from '../../../../state/citiesSlice'
import type { CityListProps } from '../cityListProps'
import type { KeyboardEvent } from 'react'

/**
 * One city: its eye, its holder's dot and its name; a double-click on the name, or ‹enter› on it, opens its detail.
 * @param props - the city, whether it is shown and opened, its dot, and the two callbacks
 * @param props.city - the city
 * @param props.shown - the ids of the cities shown
 * @param props.opened - the city whose detail is open
 * @param props.verdicts - each city's verdict, by id
 * @param props.dotOf - a city's dot
 * @param props.onShown - the eye was toggled
 * @param props.onOpen - the name was double-clicked
 * @returns the row
 */
export function CityRow({
  city,
  shown,
  opened,
  verdicts,
  dotOf,
  onShown,
  onOpen,
}: Omit<CityListProps, 'cities' | 'onAllShown'> & { city: CityMark }) {
  // Derived
  const visible = shown.has(city.id)

  // Handlers
  const handleOpen = () => {
    onOpen(city.id)
  }
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter') onOpen(city.id)
  }

  // Render
  return (
    <li
      className="layer-row city-row"
      data-visible={visible}
      data-opened={opened === city.id}
      data-verdict={verdicts.get(city.id)?.kind}
    >
      <CityEye city={city} visible={visible} onShown={onShown} />
      <CityHolderDot dot={dotOf(city)} />
      {/* A button, so ‹enter› opens the detail as the double-click does (review A11Y-003); a single click does not. */}
      <button
        type="button"
        className="layer-row__name city-row__name"
        onDoubleClick={handleOpen}
        onKeyDown={handleKey}
      >
        {city.name}
      </button>
    </li>
  )
}
