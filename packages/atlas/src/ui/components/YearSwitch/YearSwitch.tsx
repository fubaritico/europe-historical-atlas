import { useStore } from 'zustand'

import type { InterfaceSide } from '../../../state/atlasStore'
import type { MouseEvent } from 'react'

/** What the year switch needs. */
export interface YearSwitchProps {
  /** The store, read for the years, the year shown and whether one is being drawn; written by the year asked. */
  side: InterfaceSide
  /** The row's accessible name, in the reader's language. */
  label: string
}

/**
 * **Temporary** — a row of buttons, one per year that has a map, top centre over the map (ATLAS-333, the dev,
 * 2026-11-02: *"a temporary element in the interface to go from one year to the other"*), the atlas's first element in
 * React (ATLAS-519), to be replaced by the century's selector (ATLAS-522).
 *
 * It reads the atlas's store and asks it for a year; the map draws it (`app/yearBridge`). While a year is drawn — asked
 * here or by the dev panel — every button refuses its click (`aria-disabled`), so two changes of year never overlap:
 * refused rather than disabled, so the button the keyboard pressed keeps the focus (review A11Y-001 of ATLAS-333).
 * @param props - the store's interface side and the row's name
 * @param props.side - the store, read and asked
 * @param props.label - the row's accessible name
 * @returns the row; empty until the map has said which years it has
 */
export function YearSwitch({ side, label }: YearSwitchProps) {
  // Store
  const years = useStore(side.facts, (state) => state.years)
  const shown = useStore(side.facts, (state) => state.shownYear)
  const busy = useStore(side.facts, (state) => state.requested !== null)

  // Handlers
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const year = Number(event.currentTarget.dataset.year)
    if (busy) {
      console.warn(`[atlas] a year is loading: the click on ${String(year)} is refused`)
      return
    }
    side.requestYear(year)
  }

  // Render
  return (
    <div role="group" aria-label={label} aria-busy={busy} className="atlas-year-switch">
      {years.map((year) => (
        <button
          key={year}
          type="button"
          className="atlas-year-switch__year"
          data-year={year}
          aria-pressed={year === shown}
          aria-disabled={busy}
          onClick={handleClick}
        >
          {year}
        </button>
      ))}
    </div>
  )
}
