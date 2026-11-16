import { ListboxItem } from '@fubaritico/react/Listbox'

import { POLITY_MESSAGES } from '../../../../i18n/polity'
import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_LIST_MESSAGES } from '../i18n'
import { rowGestures } from '../utils/rowGestures'

import type { ViewportPoint } from '../../../../viewport/viewport'
import type { PolityRow } from '../../../utils/polityRows'
import type { StackingSide } from '@europe-historical-atlas/core/editor/stacking'
import type { CSSProperties, PointerEvent } from 'react'

/** What a row shows and reports — its values, and the list's three callbacks. */
interface PolityOptionProps {
  /** The polity's row. */
  row: PolityRow
  /** Whether it is the target. */
  selected: boolean
  /** Whether the keyboard's cursor is on it. */
  active: boolean
  /** Whether it is listed only to hold the tree under a filter — greyed (CARTO-360). */
  dimmed: boolean
  /** The option's element id. */
  id: string
  /** Aims at its polity. */
  onChoose: (id: string) => void
  /** Opens its menu. */
  onMenu: (id: string, at: ViewportPoint) => void
  /** Opens its polity's dialogue. */
  onEdit: (id: string) => void
  /** The side a row dragged over it would land on, or `null` when none is (CARTO-457). */
  dropSide: StackingSide | null
  /** A press on it, which may begin a drag. */
  onPointerDown: (id: string, event: PointerEvent) => void
}

/**
 * One row: the swatch, the name, the *"no territory"* chip and the rank and dates — `design/01`'s row.
 * @param props - the row, and whether it is the target or the one the keys are on
 * @param props.row - the polity's row: its name, colour, depth, suzerain, rank and dates
 * @param props.selected - whether it is the target
 * @param props.active - whether the keyboard's cursor is on it
 * @param props.dimmed - whether it is listed only to hold the tree under a filter — a suzerain whose own name does
 *   not answer (CARTO-360): greyed
 * @param props.id - the option's element id, which `aria-activedescendant` points at
 * @param props.onChoose - aims at its polity, given the polity's id
 * @param props.onMenu - opens its menu, given the polity's id and the pointer in viewport pixels
 * @param props.onEdit - opens its polity's dialogue, given the polity's id
 * @param props.dropSide - the side a dragged row would land on, marked by a line; `null` for none
 * @param props.onPointerDown - a press on it, given the polity's id — the start of a drag (CARTO-457)
 * @returns the option
 */
export function PolityOption({
  row,
  selected,
  active,
  dimmed,
  id,
  onChoose,
  onMenu,
  onEdit,
  dropSide,
  onPointerDown,
}: PolityOptionProps) {
  // Context
  const t = useTranslation(POLITY_LIST_MESSAGES)
  const polity = useTranslation(POLITY_MESSAGES)

  // Handlers
  const handlePointerDown = (event: PointerEvent) => {
    onPointerDown(row.id, event)
  }

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
      data-dimmed={dimmed}
      data-polity-id={row.id}
      data-drop={dropSide ?? undefined}
      onPointerDown={handlePointerDown}
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
        <span className="visually-hidden">{t('vassalOf', { name: row.suzerainName })}</span>
      )}
      <span className="polity-row__tags">
        {row.hasTerritory ? null : <span className="polity-row__chip">{t('noTerritory')}</span>}
        <span>{row.rank === '' ? '' : polity('rankName', { rank: row.rank })}</span>
        <span className="polity-row__dates">{row.dates}</span>
      </span>
    </ListboxItem>
  )
}
