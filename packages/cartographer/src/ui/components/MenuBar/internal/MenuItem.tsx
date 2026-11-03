import type { MenuCommand } from '../menuBarProps'
import type { MouseEvent } from 'react'

/** What a command's line shows and reports. */
export interface MenuItemProps {
  /** The command. */
  command: MenuCommand
  /** Pressed — the menu reads the command from `data-entry`. */
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

/**
 * One command of an open menu: its name, and its keys at the row's end — announced through `aria-keyshortcuts`, the
 * glyphs hidden from a screen reader, which would spell them out. Greyed with `aria-disabled`, so it is still read.
 * Reached by the arrows only, as a menu's items are (`tabIndex` −1).
 * @param props - the command and the press
 * @param props.command - the command
 * @param props.onClick - its press
 * @returns the line
 */
export function MenuItem({ command, onClick }: MenuItemProps) {
  // Render
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      data-entry={command.id}
      aria-disabled={!command.enabled}
      {...(command.keys === null ? {} : { 'aria-keyshortcuts': command.keys.aria })}
      className="menu-bar__item"
      onClick={onClick}
    >
      <span className="menu-bar__label">{command.label}</span>
      {command.keys !== null && (
        <kbd className="menu-bar__keys" aria-hidden="true">
          {command.keys.shown}
        </kbd>
      )}
    </button>
  )
}
