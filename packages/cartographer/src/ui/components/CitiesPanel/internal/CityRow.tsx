import { memo } from 'react'

import { cityRowId } from '../utils/cityRowId'
import { sameCityRow } from '../utils/sameCityRow'

import { CityEye } from './CityEye'
import { CityHolderDot } from './CityHolderDot'
import { CityName } from './CityName'

import type { CityRowProps } from '../cityListProps'

/**
 * One city: its eye, its holder's dot and its name; a click on the name chooses it, a double-click, or ‹enter› on
 * it, opens its information box (CARTO-384).
 * **Drawn again only when something of its own changes** (CARTO-485, `sameCityRow`): the list holds thirteen thousand
 * rows, and an eye ticked, a city chosen or a border moved touches a handful of them.
 * @param props - the city, whether it is shown, chosen and opened, its verdict, its dot, and the callbacks
 * @param props.city - the city
 * @param props.visible - whether it is shown on the canvas
 * @param props.chosen - whether it is the city chosen
 * @param props.opened - whether its information box is open
 * @param props.verdict - its verdict's kind
 * @param props.dot - its dot
 * @param props.onShown - the eye was toggled
 * @param props.onSelect - the name was clicked
 * @param props.onOpen - the name was double-clicked, or ‹enter› pressed on it
 * @returns the row
 */
export const CityRow = memo(function CityRow({
  city,
  visible,
  chosen,
  opened,
  verdict,
  dot,
  onShown,
  onSelect,
  onOpen,
}: CityRowProps) {
  // Render
  return (
    <li
      id={cityRowId(city.id)}
      className="layer-row city-row"
      data-visible={visible}
      data-selected={chosen}
      data-opened={opened}
      data-verdict={verdict}
    >
      <CityEye city={city} visible={visible} onShown={onShown} />
      <CityHolderDot dot={dot} />
      <CityName id={city.id} name={city.name} chosen={chosen} onSelect={onSelect} onOpen={onOpen} />
    </li>
  )
}, sameCityRow)
