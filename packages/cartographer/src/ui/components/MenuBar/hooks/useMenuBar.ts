import { useRef, useState } from 'react'

import { answerTitleKey } from '../utils/answerTitleKey'
import { commandToRun } from '../utils/commandToRun'
import { focusMarked } from '../utils/focusMarked'
import { menuAlong } from '../utils/menuAlong'

import { useCloseOutside } from './useCloseOutside'

import type { MenuDefinition } from '../menuBarProps'
import type { KeyboardEvent, MouseEvent, RefObject } from 'react'

/** Where the focus goes in a menu as it opens: its first command, or its last (‹↑› on its title). */
export type MenuStart = 'first' | 'last'

/** What the bar's state and gestures are, for {@link useMenuBar}'s caller. */
export interface MenuBarControl {
  /** The bar's element, for a press outside to close the open menu. */
  bar: RefObject<HTMLDivElement | null>
  /** The menu open, or `null`. */
  open: string | null
  /** Where the focus goes in the menu as it opens. */
  start: MenuStart
  /** A title pressed: its menu opens, or closes when it was the one open. */
  handleTitle: (event: MouseEvent<HTMLButtonElement>) => void
  /** The pointer over a title while a menu is open: that menu opens in its place, as a system's bar does. */
  handleHover: (event: MouseEvent<HTMLButtonElement>) => void
  /** A key on a title: ‹↓› / ‹↑› open its menu, ‹←› ‹→› ‹Début› ‹Fin› move along the titles, ‹escape› closes. */
  handleTitleKey: (event: KeyboardEvent<HTMLButtonElement>) => void
  /** A command of the open menu chosen. */
  choose: (id: string) => void
  /** ‹escape› or ‹Tab› in the open menu: closed, the focus back on its title. */
  leave: () => void
  /** ‹←› or ‹→› in the open menu: the menu beside, round the ends. */
  beside: (side: -1 | 1) => void
}

/**
 * The menu a title stands for.
 * @param event - an event on the title
 * @param event.currentTarget
 * @returns its menu's id, or `null`
 */
function titleOf(event: { currentTarget: HTMLElement }): string | null {
  return event.currentTarget.dataset.menu ?? null
}

/**
 * The bar's open menu and what moves it — opening, hovering, the arrows along the titles, choosing,
 * leaving by ‹escape›, ‹Tab› or a press outside (`useCloseOutside`).
 *
 * **The focus is put back on the title before a command runs** (A11Y-001): its list goes with the menu, and a command
 * that opens a dialogue or reaches the canvas then takes the focus from there. A greyed command runs nothing
 * (`utils/commandToRun`).
 * @param menus - the bar's menus
 * @returns the state and the gestures
 */
export function useMenuBar(menus: readonly MenuDefinition[]): MenuBarControl {
  // Refs
  const bar = useRef<HTMLDivElement | null>(null)

  // State
  const [open, setOpen] = useState<string | null>(null)
  const [start, setStart] = useState<MenuStart>('first')

  // Handlers
  const openMenu = (id: string | null, from: MenuStart) => {
    setStart(from)
    setOpen(id)
  }
  const handleTitle = (event: MouseEvent<HTMLButtonElement>) => {
    openMenu(open === titleOf(event) ? null : titleOf(event), 'first')
  }
  const handleHover = (event: MouseEvent<HTMLButtonElement>) => {
    if (open !== null) openMenu(titleOf(event), 'first')
  }
  const handleTitleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    answerTitleKey(event, { menus, open, root: bar.current, openMenu, close: leave })
  }
  const leave = () => {
    focusMarked(bar.current, 'menu', open)
    setOpen(null)
  }
  const choose = (id: string) => {
    const command = commandToRun(menus, open, id)
    if (command === null) return
    leave()
    command.onChoose()
  }
  const beside = (side: -1 | 1) => {
    const next = menuAlong(menus, open, side)
    focusMarked(bar.current, 'menu', next)
    openMenu(next, 'first')
  }

  // Effects
  useCloseOutside(bar, open !== null, () => {
    setOpen(null)
  })

  // Return
  return {
    bar,
    open,
    start,
    handleTitle,
    handleHover,
    handleTitleKey,
    choose,
    leave,
    beside,
  }
}
