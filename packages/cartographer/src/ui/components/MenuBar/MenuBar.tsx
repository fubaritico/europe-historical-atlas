import { useId } from 'react'

import { useMenuBar } from './hooks/useMenuBar'
import { useTabStop } from './hooks/useTabStop'
import { MenuList } from './internal/MenuList'

import type { MenuDefinition } from './menuBarProps'

/** What the bar shows. Never the store: a binding builds the menus and hands them over. */
export interface MenuBarProps {
  /** The bar's accessible name. */
  label: string
  /** Its menus, left to right — *Fichier*, *Édition* (CARTO-345). */
  menus: readonly MenuDefinition[]
}

/**
 * The menu bar of the Cartographer (CARTO-239, entered in CARTO-345): menus as in any software, each command with its
 * shortcut as this system writes it, a greyed command shown rather than hidden. Inside the page, as on Windows — a
 * page cannot reach a Mac's system bar. Its look follows the dev's reference, Illustrator's menus (2026-11-03).
 *
 * `role="menubar"` with a `menuitem` per title, `aria-haspopup` and `aria-expanded`; ‹enter›, ‹space› or ‹↓› on a title
 * opens its menu, the pointer over another title while one is open opens that one.
 * @param props - the bar's name and its menus
 * @param props.label - the bar's accessible name
 * @param props.menus - its menus, left to right
 * @returns the bar
 */
export function MenuBar({ label, menus }: MenuBarProps) {
  // Ids
  const id = useId()

  // State
  const menuBar = useMenuBar(menus)
  const { stop, handleTitleFocus } = useTabStop(menus)

  // Derived
  const { bar, open, start } = menuBar

  // Render
  return (
    <div ref={bar} role="menubar" aria-label={label} className="menu-bar">
      {menus.map((menu) => (
        <div key={menu.id} className="menu-bar__menu">
          <button
            id={`${id}-${menu.id}`}
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === menu.id}
            tabIndex={stop === menu.id ? 0 : -1}
            data-menu={menu.id}
            className="menu-bar__title"
            onClick={menuBar.handleTitle}
            onPointerEnter={menuBar.handleHover}
            onFocus={handleTitleFocus}
            onKeyDown={menuBar.handleTitleKey}
          >
            {menu.label}
          </button>
          {open === menu.id && (
            <MenuList
              entries={menu.entries}
              labelledBy={`${id}-${menu.id}`}
              start={start}
              onChoose={menuBar.choose}
              onLeave={menuBar.leave}
              onBeside={menuBar.beside}
            />
          )}
        </div>
      ))}
    </div>
  )
}
