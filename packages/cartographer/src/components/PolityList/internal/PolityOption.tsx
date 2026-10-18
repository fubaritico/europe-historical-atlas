import { ListboxItem } from '@fubaritico/react/Listbox'

import type { ViewportPoint } from '../../../view/viewport'
import type { PolityRow } from '../../shared/polityRows'
import type { CSSProperties, MouseEvent } from 'react'

/**
 * A row's three pointer gestures: a click aims at its polity, a double-click opens its dialogue (`s07`),
 * a right-click its menu (`s16`).
 * @param id - the row's polity
 * @param onChoose - aim at it
 * @param onMenu - open its menu at the pointer
 * @param onEdit - open its dialogue
 * @returns the row's handlers
 */
function rowGestures(
  id: string,
  onChoose: (id: string) => void,
  onMenu: (id: string, at: ViewportPoint) => void,
  onEdit: (id: string) => void
) {
  return {
    onClick: () => {
      onChoose(id)
    },
    onDoubleClick: () => {
      onEdit(id)
    },
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault()
      onMenu(id, { x: event.clientX, y: event.clientY })
    },
  }
}

/**
 * One row: the swatch, the name, the *"no territory"* chip and the rank and dates — `design/01`'s row.
 * @param props - the row, and whether it is the target or the one the keys are on
 * @returns the option
 */
export function PolityOption({
  row,
  selected,
  active,
  id,
  onChoose,
  onMenu,
  onEdit,
}: {
  row: PolityRow
  selected: boolean
  active: boolean
  id: string
  onChoose: (id: string) => void
  onMenu: (id: string, at: ViewportPoint) => void
  onEdit: (id: string) => void
}) {
  // Render
  return (
    <ListboxItem
      id={id}
      variant="dark"
      className="polity-row"
      isSelected={selected}
      isActive={active}
      // The tree's depth, for the indent and the separators (s16). Not `aria-level`, which ARIA 1.2 does
      // not support on an option: the hierarchy is announced by the hidden suzerain below instead.
      data-depth={row.depth}
      // The tree's indent, one step per level of homage — the width is the stylesheet's.
      style={{ '--polity-depth': row.depth } as CSSProperties}
      {...rowGestures(row.id, onChoose, onMenu, onEdit)}
    >
      <span
        className="polity-row__swatch"
        data-empty={row.colour === null}
        style={row.colour === null ? undefined : { background: row.colour }}
        aria-hidden="true"
      />
      <span className="polity-row__name">{row.name}</span>
      {row.suzerainName === null ? null : (
        // The tree's hierarchy for assistive tech, which the indent does not reach (A11Y-002).
        <span className="visually-hidden">, vassal of {row.suzerainName}</span>
      )}
      <span className="polity-row__tags">
        {row.hasTerritory ? null : <span className="polity-row__chip">no territory</span>}
        <span>{row.rank}</span>
        <span className="polity-row__dates">{row.dates}</span>
      </span>
    </ListboxItem>
  )
}
