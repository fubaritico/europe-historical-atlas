import { useRef } from 'react'

import { useFlyoutFocus } from '../hooks/useFlyoutFocus'

import { FlyoutItem } from './FlyoutItem'

import type { ToolVariant } from './FlyoutItem'
import type { KeyboardEvent } from 'react'

/** What the flyout needs. */
export interface ToolFlyoutProps {
  /** Its accessible name — the group's. */
  label: string
  /** The rows, in order. */
  variants: readonly ToolVariant[]
  /** The variant in use, marked by the square. */
  current: string
  /** A row was chosen. */
  onChoose: (id: string) => void
  /** Escape, or a click outside: close without choosing. */
  onDismiss: () => void
}

/**
 * Move the focus among the rows on ↑ and ↓, wrapping — the WAI-ARIA menu pattern, which keeps a
 * disabled row reachable so it can be discovered, but never chosen (A11Y-003).
 * @param event - the key event, on the menu
 */
function moveFocus(event: KeyboardEvent<HTMLUListElement>): void {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
  const at = items.findIndex((item) => item === document.activeElement)
  const step = event.key === 'ArrowDown' ? 1 : -1
  items[(at + step + items.length) % items.length]?.focus()
}

/**
 * A tool group's flyout — Illustrator's hidden tools, opened beside the button.
 *
 * **A menu of radio items**, because choosing one replaces the others in the group: `role="menu"`,
 * `menuitemradio` with `aria-checked`. Focus lands on the current row when it opens; ↑ ↓ move, Enter
 * or Space choose, Escape closes. A click outside closes it too, which is what any flyout does.
 *
 * **Ours rather than the design system's Popover**, for one reason: the Popover opens on a click of its
 * trigger, and here a click *selects the tool* — the flyout answers a long press, a right click or →. The
 * day the Popover takes a trigger it does not own, this becomes a change of import.
 * @param props - the rows, the current one and the two callbacks
 * @returns the menu
 */
export function ToolFlyout({ label, variants, current, onChoose, onDismiss }: ToolFlyoutProps) {
  // Refs
  const menu = useRef<HTMLUListElement | null>(null)

  // Handlers
  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(event)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onDismiss()
    } else if (event.key === 'Tab') {
      // Tab leaves the menu, so the menu goes; the focus returns to its tool and Tab moves on.
      onDismiss()
    }
  }

  // Effects
  useFlyoutFocus(menu, onDismiss)

  // Render
  return (
    <ul
      ref={menu}
      role="menu"
      aria-label={label}
      className="tool-rail__flyout"
      onKeyDown={handleKeyDown}
    >
      {variants.map((variant) => (
        <FlyoutItem
          key={variant.id}
          variant={variant}
          checked={variant.id === current}
          onChoose={onChoose}
        />
      ))}
    </ul>
  )
}
