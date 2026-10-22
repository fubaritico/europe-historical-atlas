import type { KeyboardEvent } from 'react'

/**
 * Move the focus along the toolbar on ↑ and ↓ — the WAI-ARIA toolbar pattern, vertical.
 * @param event - the key event, on the toolbar
 */
export function moveAlongToolbar(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('.tool-rail__tool')]
  const at = buttons.findIndex((button) => button === document.activeElement)
  if (at < 0) return
  event.preventDefault()
  const step = event.key === 'ArrowDown' ? 1 : -1
  buttons[(at + step + buttons.length) % buttons.length]?.focus()
}
