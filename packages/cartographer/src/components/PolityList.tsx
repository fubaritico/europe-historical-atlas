import { ListboxItem, ListboxList } from '@fubaritico/react/Listbox'
import { useEffect, useState } from 'react'

import { listKeyAction } from './listKeys'

import type { PolityRow } from './polityRows'
import type { ViewportPoint } from './PolityStackMenu'
import type { CSSProperties, KeyboardEvent } from 'react'

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
}

/**
 * Whether a key asks for the context menu — the platform's two ways.
 * @param event - the key event
 * @returns `true` for the menu key and ‹shift+F10›
 */
function asksForMenu(event: KeyboardEvent<HTMLUListElement>): boolean {
  return event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
}

/**
 * The list's subhead — `design/01`'s *"Drawn at 1100"* and the count.
 * @param props - the year and how many polities it holds
 * @returns the subhead
 */
function PolitiesSubhead({ year, count }: { year: number; count: number }) {
  return (
    <div className="polities__subhead">
      <span>Drawn at {year}</span>
      <span className="polities__count">{count}</span>
    </div>
  )
}

/**
 * Open a row's menu from the keyboard, under the row the keys are on — or the target's, when the keys
 * have not moved yet. With neither, there is no row to arrange, and it says so.
 * @param id - the row's polity, or `null`
 * @param onMenu - where to ask for the menu
 */
function menuFromKeys(id: string | null, onMenu: (id: string, at: ViewportPoint) => void): void {
  const option = id === null ? null : document.getElementById(optionId(id))
  if (id === null || option === null) {
    console.warn('[Cartographer] no polity to arrange: move to a row first.')
    return
  }
  const box = option.getBoundingClientRect()
  onMenu(id, { x: box.left, y: box.bottom })
}

/**
 * The DOM id of a row's option — what `aria-activedescendant` points at.
 * @param id - the polity's id
 * @returns the option's id
 */
function optionId(id: string): string {
  return `polity-option-${id}`
}

/**
 * One row: the swatch, the name, the *"no territory"* chip and the rank and dates — `design/01`'s row.
 * @param props - the row, and whether it is the target or the one the keys are on
 * @returns the option
 */
function PolityOption({
  row,
  selected,
  active,
  id,
  onChoose,
  onMenu,
}: {
  row: PolityRow
  selected: boolean
  active: boolean
  id: string
  onChoose: (id: string) => void
  onMenu: (id: string, at: ViewportPoint) => void
}) {
  return (
    <ListboxItem
      id={id}
      variant="dark"
      className="polity-row"
      isSelected={selected}
      isActive={active}
      // The tree's level for assistive tech, which the indent alone does not reach (A11Y-001).
      aria-level={row.depth + 1}
      // The tree's indent, one step per level of homage — the width is the stylesheet's.
      style={{ '--polity-depth': row.depth } as CSSProperties}
      onClick={() => {
        onChoose(row.id)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        onMenu(row.id, { x: event.clientX, y: event.clientY })
      }}
    >
      <span
        className="polity-row__swatch"
        data-empty={row.colour === null}
        style={row.colour === null ? undefined : { background: row.colour }}
        aria-hidden="true"
      />
      <span className="polity-row__name">{row.name}</span>
      <span className="polity-row__tags">
        {row.hasTerritory ? null : <span className="polity-row__chip">no territory</span>}
        <span>{row.rank}</span>
        <span className="polity-row__dates">{row.dates}</span>
      </span>
    </ListboxItem>
  )
}

/**
 * The keys' cursor over the rows: which row it is on, kept in view, and what each key does — ↑ ↓ Home
 * End move it, ‹enter› or ‹space› choose, ‹shift+F10› or the menu key open the row's menu.
 *
 * **It holds a polity's id, not a position**: a row inserted or undone above it must not move the
 * cursor onto another polity (QUAL-003).
 * @param rows - the rows, in the list's order
 * @param targetId - the target, where the menu opens before the keys have moved
 * @param onChoose - a row chosen
 * @param onMenu - a row's menu asked for
 * @returns the active id, its position, and the key handler
 */
function useListCursor(
  rows: readonly PolityRow[],
  targetId: string | null,
  onChoose: (id: string) => void,
  onMenu: (id: string, at: ViewportPoint) => void
) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = rows.findIndex((row) => row.id === activeId)
  useEffect(() => {
    // Keep the row the keys are on in view: focus stays on the list, so nothing scrolls by itself.
    if (activeId !== null)
      document.getElementById(optionId(activeId))?.scrollIntoView({ block: 'nearest' })
  }, [activeId])
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (asksForMenu(event)) {
      event.preventDefault()
      menuFromKeys(activeId ?? targetId, onMenu)
      return
    }
    const action = listKeyAction(active, event.key, rows.length)
    if (action === null) return
    event.preventDefault()
    const row = rows['move' in action ? action.move : action.choose]
    if (row === undefined) return
    if ('move' in action) setActiveId(row.id)
    else onChoose(row.id)
  }
  return { activeId, active, onKeyDown }
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
 * @returns the subhead and the list, or the subhead and a line saying the year is empty
 */
export function PolityList({ year, rows, targetId, onChoose, onMenu }: PolityListProps) {
  const { activeId, active, onKeyDown } = useListCursor(rows, targetId, onChoose, onMenu)
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
            />
          ))}
        </ListboxList>
      )}
    </>
  )
}
