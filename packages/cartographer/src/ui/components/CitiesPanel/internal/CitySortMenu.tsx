import { Dropdown } from '@fubaritico/react/Dropdown'

import { CITY_SORTS } from '../../../../state/citiesSlice'
import { useTranslation } from '../../../hooks/useTranslation'
import { ListIcon } from '../../../icons/listIcons'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import type { CitySort } from '../../../../state/citiesSlice'
import type { CitiesPanelMessageKey } from '../i18n'

/** Each order's name in the menu. */
const SORT_LABEL: Readonly<Record<CitySort, CitiesPanelMessageKey>> = {
  export: 'sortExport',
  name: 'sortName',
  verification: 'sortVerification',
  holder: 'sortHolder',
}

const renderTrigger = () => <ListIcon name="sort" />

/**
 * The sort beside the funnel (CARTO-382, the dev's icon, 2026-11-07: *"l'icône du tri est le bouton qui ouvre un menu
 * déroulant"*): the design system's `Dropdown`, the dev's glyph as its trigger, the order in use ticked, the menu on
 * the right edge; arrows, ‹enter› and ‹esc› are the Dropdown's. In the accent while the list is not in the export's
 * order, as the funnel is while a filter is on.
 * @param props - the order in use and the callback
 * @param props.sort - the order in use
 * @param props.onSort - an order was chosen
 * @returns the menu
 */
export function CitySortMenu({
  sort,
  onSort,
}: {
  sort: CitySort
  onSort: (sort: CitySort) => void
}) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const options = CITY_SORTS.map((value) => ({ value, label: t(SORT_LABEL[value]) }))
  const name = t('sortOn', { order: t(SORT_LABEL[sort]) })

  // Handlers
  const handleSelect = (value: string) => {
    // The Dropdown hands back the value of one of the options above, built from CITY_SORTS: always an order.
    onSort(value as CitySort)
  }

  // Render
  return (
    // The name on hover, as the funnel has it (review A11Y-001): the Dropdown takes no `title` of its own.
    <span className="city-sort" data-active={sort !== 'export'} title={name}>
      <Dropdown
        options={options}
        selectedValue={sort}
        onSelect={handleSelect}
        trigger={renderTrigger}
        aria-label={name}
        menuAriaLabel={t('sortBy')}
        buttonVariant="ghost"
        buttonSize="sm"
        buttonClassName="list-filter__action"
        buttonFullWidth={false}
        position="right"
      />
    </span>
  )
}
