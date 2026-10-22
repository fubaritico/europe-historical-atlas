import type { KeyboardEvent } from 'react'

/**
 * Move the focus among the rows on ↑ and ↓, wrapping — the WAI-ARIA menu pattern, which keeps a
 * disabled row reachable so it can be discovered, but never chosen (A11Y-003).
 * @param event - the key event, on the menu
 */
export function moveFocus(event: KeyboardEvent<HTMLUListElement>): void {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
  const at = items.findIndex((item) => item === document.activeElement)
  const step = event.key === 'ArrowDown' ? 1 : -1
  items[(at + step + items.length) % items.length]?.focus()
}
