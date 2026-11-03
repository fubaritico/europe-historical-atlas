import { useEffect, useRef } from 'react'

import { focusMarked } from '../utils/focusMarked'
import { listKey } from '../utils/listKey'
import { nextCommand } from '../utils/nextCommand'

import { MenuItem } from './MenuItem'

import type { MenuStart } from '../hooks/useMenuBar'
import type { MenuEntry } from '../menuBarProps'
import type { KeyboardEvent, MouseEvent } from 'react'

/** What an open menu shows and reports. */
export interface MenuListProps {
  /** Its lines. */
  entries: readonly MenuEntry[]
  /** The id of its title on the bar, which names it. */
  labelledBy: string
  /** Where the focus goes as it opens: its first command, or its last (‹↑› on its title). */
  start: MenuStart
  /** A command was chosen: the bar closes the menu, then the command runs. */
  onChoose: (id: string) => void
  /** ‹escape› or ‹Tab›: closed, the focus back on its title — ‹Tab› then goes on from there. */
  onLeave: () => void
  /** ‹←› or ‹→›: the menu beside it opens in its place. */
  onBeside: (side: -1 | 1) => void
}

/**
 * An open menu of the bar — `role="menu"`, one `menuitem` per command, a `separator` between groups; each command's
 * keys at its row's end, announced through `aria-keyshortcuts` and hidden from the screen reader's reading of the row,
 * which would spell the glyphs out. A greyed command is shown and skipped by the arrows.
 *
 * The focus goes to its first command on opening — its last, opened by ‹↑› — so the keyboard works at once; to the
 * menu itself when none of its commands can act, so ‹escape› still closes it (A11Y-003).
 * @param props - the lines, where the focus starts, and the three ways out
 * @param props.entries - the menu's lines
 * @param props.labelledBy - the id of the title that names it
 * @param props.start - where the focus goes as it opens
 * @param props.onChoose - a command chosen
 * @param props.onLeave - the menu closed by ‹escape› or ‹Tab›
 * @param props.onBeside - the menu beside asked for, by ‹←› or ‹→›
 * @returns the menu
 */
export function MenuList({
  entries,
  labelledBy,
  start,
  onChoose,
  onLeave,
  onBeside,
}: MenuListProps) {
  // Refs
  const list = useRef<HTMLDivElement | null>(null)
  // The lines and the start as the menu opened: the focus goes there once, and a re-render with fresh entries must
  // not take it back.
  const opening = useRef({ entries, start })

  // Handlers
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = listKey(event.key)
    if (action === null) return
    // ‹Tab› goes on from the title once the menu has closed, as the APG's menubar does: never held back here.
    if (!(action.kind === 'leave' && action.onward)) event.preventDefault()
    const focused = (event.target as HTMLElement).dataset.entry ?? null
    if (action.kind === 'step')
      focusMarked(list.current, 'entry', nextCommand(entries, focused, action.step))
    else if (action.kind === 'beside') onBeside(action.side)
    else onLeave()
  }
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.dataset.entry
    if (id !== undefined) onChoose(id)
  }

  // Effects
  useEffect(() => {
    const first = nextCommand(opening.current.entries, null, opening.current.start)
    if (first === null) list.current?.focus()
    else focusMarked(list.current, 'entry', first)
  }, [])

  // Render
  return (
    <div
      ref={list}
      role="menu"
      tabIndex={-1}
      aria-labelledby={labelledBy}
      className="menu-bar__list"
      onKeyDown={handleKeyDown}
    >
      {entries.map((entry) =>
        entry.kind === 'separator' ? (
          <div key={entry.id} role="separator" className="menu-bar__separator" />
        ) : (
          <MenuItem key={entry.id} command={entry} onClick={handleClick} />
        )
      )}
    </div>
  )
}
