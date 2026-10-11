import { ListboxItem, ListboxList } from '@fubaritico/react/Listbox'
import { useEffect, useState } from 'react'

import { listKeyAction } from './listKeys'

import type { PolityRow } from './polityRows'
import type { KeyboardEvent } from 'react'

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
}: {
  row: PolityRow
  selected: boolean
  active: boolean
  id: string
  onChoose: (id: string) => void
}) {
  return (
    <ListboxItem
      id={id}
      variant="dark"
      className="polity-row"
      isSelected={selected}
      isActive={active}
      onClick={() => {
        onChoose(row.id)
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
export function PolityList({ year, rows, targetId, onChoose }: PolityListProps) {
  // The keys' cursor holds a polity's id, not a position: a row inserted or undone above it must not
  // move the cursor onto another polity (QUAL-003).
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = rows.findIndex((row) => row.id === activeId)
  useEffect(() => {
    // Keep the row the keys are on in view: focus stays on the list, so nothing scrolls by itself.
    if (activeId !== null)
      document.getElementById(optionId(activeId))?.scrollIntoView({ block: 'nearest' })
  }, [activeId])
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const action = listKeyAction(active, event.key, rows.length)
    if (action === null) return
    event.preventDefault()
    const row = rows['move' in action ? action.move : action.choose]
    if (row === undefined) return
    if ('move' in action) setActiveId(row.id)
    else onChoose(row.id)
  }
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
            />
          ))}
        </ListboxList>
      )}
    </>
  )
}
