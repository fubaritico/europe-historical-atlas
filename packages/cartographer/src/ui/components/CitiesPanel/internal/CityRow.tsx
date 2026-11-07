import { cityRowId } from '../utils/cityRowId'

import { CityEye } from './CityEye'
import { CityHolderDot } from './CityHolderDot'
import { CityName } from './CityName'

import type { CityMark } from '../../../../state/citiesSlice'
import type { CityListProps } from '../cityListProps'

/**
 * One city: its eye, its holder's dot and its name; a click on the name chooses it, a double-click, or ‹enter› on
 * it, opens its information box (CARTO-384).
 * @param props - the city, whether it is shown, chosen and opened, its dot, and the callbacks
 * @param props.city - the city
 * @param props.shown - the ids of the cities shown
 * @param props.selected - the city chosen
 * @param props.opened - the city whose information box is open
 * @param props.verdicts - each city's verdict, by id
 * @param props.dotOf - a city's dot
 * @param props.onShown - the eye was toggled
 * @param props.onSelect - the name was clicked
 * @param props.onOpen - the name was double-clicked, or ‹enter› pressed on it
 * @returns the row
 */
export function CityRow({
  city,
  shown,
  selected,
  opened,
  verdicts,
  dotOf,
  onShown,
  onSelect,
  onOpen,
}: Omit<CityListProps, 'cities' | 'onAllShown'> & { city: CityMark }) {
  // Derived
  const visible = shown.has(city.id)
  const chosen = selected === city.id

  // Render
  return (
    <li
      id={cityRowId(city.id)}
      className="layer-row city-row"
      data-visible={visible}
      data-selected={chosen}
      data-opened={opened === city.id}
      data-verdict={verdicts.get(city.id)?.kind}
    >
      <CityEye city={city} visible={visible} onShown={onShown} />
      <CityHolderDot dot={dotOf(city)} />
      <CityName id={city.id} name={city.name} chosen={chosen} onSelect={onSelect} onOpen={onOpen} />
    </li>
  )
}
