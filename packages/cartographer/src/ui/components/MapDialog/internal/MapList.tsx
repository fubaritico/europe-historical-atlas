import { ListboxList } from '@fubaritico/react/Listbox'
import { useEffect } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_DIALOG_MESSAGES } from '../i18n'
import { movedSelection } from '../utils/movedSelection'
import { optionId } from '../utils/optionId'

import { MapChoice } from './MapChoice'
import { MapListNote } from './MapListNote'

import type { KeyboardEvent } from 'react'

/** The list of maps, as it is being read. */
export type MapListing =
  { state: 'reading' } | { state: 'failed' } | { state: 'read'; maps: readonly string[] }

/** What the list shows and does. */
export interface MapListProps {
  /** The maps, or where their reading stands. */
  listing: MapListing
  /** The map open. */
  map: string
  /** The map selected, or `null`. */
  selected: string | null
  /**
   * Select a map.
   * @param map - the map
   */
  select: (map: string) => void
  /**
   * Open a map.
   * @param map - the map chosen
   */
  open: (map: string) => void
}

/**
 * *Open…*'s list, as in a file dialogue (the dev, 2026-11-02): the maps in a framed box, one a row with its icon; a
 * click selects, a double click or ‹enter› opens, the arrows move the selection. Or the line that says why there is
 * none.
 * @param props - the listing, the map open, the selection, what selecting and opening do
 * @param props.listing - the maps, or where their reading stands
 * @param props.map - the map open
 * @param props.selected - the map selected
 * @param props.select - select a map
 * @param props.open - open a map
 * @returns the list, or a line of text
 */
export function MapList({ listing, map, selected, select, open }: MapListProps) {
  // Context
  const t = useTranslation(MAP_DIALOG_MESSAGES)

  // Derived
  const maps = listing.state === 'read' ? listing.maps : []
  const choices = maps.filter((listed) => listed !== map)

  // Handlers
  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    if (event.key === 'Enter' && selected !== null) {
      event.preventDefault()
      open(selected)
      return
    }
    const next = movedSelection(choices, selected, event.key)
    if (next === null) return
    event.preventDefault()
    select(next)
  }

  // Effects
  // The row the keys moved to stays in sight — the focus is on the list, so the browser scrolls to nothing by itself
  // (review A11Y-001). `nearest`: a row already in view does not move.
  useEffect(() => {
    if (selected === null) return
    document.getElementById(optionId(selected))?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  // Render
  if (listing.state !== 'read') return <MapListNote kind={listing.state} />
  if (maps.length === 0) return <MapListNote kind="empty" />
  return (
    <ListboxList
      role="listbox"
      aria-label={t('legend')}
      aria-activedescendant={selected === null ? undefined : optionId(selected)}
      tabIndex={0}
      className="map-list"
      onKeyDown={handleKeyDown}
    >
      {maps.map((listed) => (
        <MapChoice
          key={listed}
          map={listed}
          id={optionId(listed)}
          isOpen={listed === map}
          isSelected={listed === selected}
          select={select}
          open={open}
        />
      ))}
    </ListboxList>
  )
}
