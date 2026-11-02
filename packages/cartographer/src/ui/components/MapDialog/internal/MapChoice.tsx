import { ListboxItem } from '@fubaritico/react/Listbox'

import { isAutosaveName } from '@europe-historical-atlas/core/data/mapName'

import { useTranslation } from '../../../hooks/useTranslation'
import { MapIcon } from '../../../icons/mapIcons'
import { MAP_DIALOG_MESSAGES } from '../i18n'

/** One map of the list. */
export interface MapChoiceProps {
  /** The map it stands for — its folder's name. */
  map: string
  /** The option's id, for the list's `aria-activedescendant`. */
  id: string
  /** Whether it is the map open — written, greyed, never selectable. */
  isOpen: boolean
  /** Whether it is the one selected. */
  isSelected: boolean
  /**
   * Select it.
   * @param map - the map
   */
  select: (map: string) => void
  /**
   * Open it — a double click, as in a file dialogue.
   * @param map - the map
   */
  open: (map: string) => void
}

/**
 * One row of *Open…*'s list: the map's icon — a map, or an automatic save — and its name; a click selects it, a double
 * click opens it. The open map is greyed and marked « open ».
 * @param props - the map, its id, its state, what selecting and opening do
 * @param props.map - the map
 * @param props.id - the option's id
 * @param props.isOpen - whether it is the map open
 * @param props.isSelected - whether it is selected
 * @param props.select - select it
 * @param props.open - open it
 * @returns the row
 */
export function MapChoice({ map, id, isOpen, isSelected, select, open }: MapChoiceProps) {
  // Context
  const t = useTranslation(MAP_DIALOG_MESSAGES)

  // Derived
  const autosave = isAutosaveName(map)

  // Handlers
  // The open map is no choice: the skin's `pointer-events: none` is a look, not a rule, so the row refuses it too.
  const handleClick = (): void => {
    if (!isOpen) select(map)
  }
  const handleDoubleClick = (): void => {
    if (!isOpen) open(map)
  }

  // Render
  return (
    <ListboxItem
      id={id}
      role="option"
      aria-selected={isSelected}
      aria-disabled={isOpen}
      disabled={isOpen}
      isSelected={isSelected}
      className="map-list__row"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <MapIcon kind={autosave ? 'autosave' : 'map'} />
      <span className="map-list__name">{map}</span>
      {autosave ? <span className="map-list__hidden">{t('autosave')}</span> : null}
      {isOpen ? <span className="map-list__open">{t('isOpen')}</span> : null}
    </ListboxItem>
  )
}
