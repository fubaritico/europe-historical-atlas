import { ListboxList } from '@fubaritico/react/Listbox'
import { useEffect } from 'react'

import { useListCursor } from './hooks/useListCursor'
import { PolitiesSubhead } from './internal/PolitiesSubhead'
import { PolityOption } from './internal/PolityOption'
import { optionId } from './optionId'
import { scrollTopToShow } from './rowScroll'

import type { ViewportPoint } from '../../viewport/viewport'
import type { PolityRow } from '../shared/polityRows'

/** What the list shows and reports. Never the store: `PolitiesPanel` reads it and hands rows. */
export interface PolityListProps {
  /** The year being drawn, for the subhead — `design/01`'s *"Drawn at 1100"*. */
  year: number
  /** The rows, already sorted. */
  rows: readonly PolityRow[]
  /** The id of the polity the tools act on, or `null`. */
  targetId: string | null
  /** A row was chosen — a click, or ‹enter› on the one the keys are on. */
  onChoose: (id: string) => void
  /**
   * A row's menu was asked for — a right-click, or ‹shift+F10› / the menu key on the row the keys are
   * on (or the target) — with where to open it, in viewport pixels (`s16`).
   */
  onMenu: (id: string, at: ViewportPoint) => void
  /** A row was double-clicked — its polity's dialogue, as a layer's options in Illustrator (`s07`). */
  onEdit: (id: string) => void
}

/**
 * Scroll the list, smoothly, to the target's row — centred, unless it is already wholly in view
 * (`scrollTopToShow`). Only the list scrolls, never the page; and at once when the system asks for less
 * motion.
 * @param targetId - the polity aimed at
 */
function showRow(targetId: string): void {
  const row = document.getElementById(optionId(targetId))
  const list = row?.parentElement
  // A target that no longer resolves — an undo took its polity away — has no row. Ordinary, and said
  // where it matters: the status bar no longer names it, and the Pen refuses.
  if (row === null || list === null || list === undefined) return
  const top = scrollTopToShow({
    rowTop: row.offsetTop,
    rowHeight: row.offsetHeight,
    scrollTop: list.scrollTop,
    viewHeight: list.clientHeight,
  })
  if (top === null) return
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  list.scrollTo({ top, behavior: still ? 'auto' : 'smooth' })
}

/**
 * `{Polities}`' list: every polity of the year, the target marked, a click or ‹enter› aiming at one —
 * `s02`'s *"selecting the target is a gesture of `{Polities}`"*.
 *
 * **A listbox, focus on the list**, the design system's own shape: ↑ ↓ Home End move the keyboard's
 * cursor through `aria-activedescendant`, ‹enter› or ‹space› chooses. The target is the selected option
 * — the persistent state — and the keys' cursor is the active one, two states kept apart as the design
 * system keeps them.
 * @param props - the rows, the target and the choice
 * @param props.year - the year being drawn, written in the subhead
 * @param props.rows - the rows to show, already sorted
 * @param props.targetId - the id of the polity the tools act on, marked as selected, or `null`
 * @param props.onChoose - aims at a polity, given its id — a click, or ‹enter› on the active row
 * @param props.onMenu - opens a row's menu, given its id and where to open it in viewport pixels
 * @param props.onEdit - opens a polity's dialogue, given its id — a double-click
 * @returns the subhead and the list, or the subhead and a line saying the year is empty
 */
export function PolityList({ year, rows, targetId, onChoose, onMenu, onEdit }: PolityListProps) {
  // State
  const { activeId, active, onKeyDown } = useListCursor(rows, targetId, onChoose, onMenu)

  // Effects
  useEffect(() => {
    if (targetId !== null) showRow(targetId)
  }, [targetId])

  // Render
  return (
    <>
      <PolitiesSubhead year={year} count={rows.length} />
      {rows.length === 0 ? (
        <p className="polities__empty">No polity in this year yet.</p>
      ) : (
        <ListboxList
          variant="dark"
          className="polities__list"
          // The design system's list is a bare <ul>: the role is the consumer's to declare, and options
          // with no listbox around them are not read as a list at all.
          role="listbox"
          aria-label="Polities"
          tabIndex={0}
          {...(activeId === null || active < 0
            ? {}
            : { 'aria-activedescendant': optionId(activeId) })}
          onKeyDown={onKeyDown}
        >
          {rows.map((row) => (
            <PolityOption
              key={row.id}
              row={row}
              id={optionId(row.id)}
              selected={row.id === targetId}
              active={row.id === activeId}
              onChoose={onChoose}
              onMenu={onMenu}
              onEdit={onEdit}
            />
          ))}
        </ListboxList>
      )}
    </>
  )
}
