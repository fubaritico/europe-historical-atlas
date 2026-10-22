import { useEffect, useState } from 'react'

import { listKeyAction } from '../utils/listKeys'
import { optionId } from '../utils/optionId'

import type { ViewportPoint } from '../../../../viewport/viewport'
import type { PolityRow } from '../../../utils/polityRows'
import type { KeyboardEvent } from 'react'

/**
 * Whether a key asks for the context menu — the platform's two ways.
 * @param event - the key event
 * @returns `true` for the menu key and ‹shift+F10›
 */
function asksForMenu(event: KeyboardEvent<HTMLUListElement>): boolean {
  return event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
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
export function useListCursor(
  rows: readonly PolityRow[],
  targetId: string | null,
  onChoose: (id: string) => void,
  onMenu: (id: string, at: ViewportPoint) => void
) {
  // State
  const [activeId, setActiveId] = useState<string | null>(null)

  // Derived
  const active = rows.findIndex((row) => row.id === activeId)

  // Handlers
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (asksForMenu(event)) {
      event.preventDefault()
      menuFromKeys(activeId ?? targetId, onMenu)
      return
    }
    // ‹cmd+↑› and its kin restack the selected polity (`stackingShortcut`); the cursor stays where it is.
    if (event.metaKey || event.ctrlKey) return
    const action = listKeyAction(active, event.key, rows.length)
    if (action === null) return
    event.preventDefault()
    const row = rows['move' in action ? action.move : action.choose]
    if (row === undefined) return
    if ('move' in action) setActiveId(row.id)
    else onChoose(row.id)
  }

  // Effects
  useEffect(() => {
    // Keep the row the keys are on in view: focus stays on the list, so nothing scrolls by itself.
    if (activeId !== null)
      document.getElementById(optionId(activeId))?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  // Return
  return { activeId, active, onKeyDown }
}
