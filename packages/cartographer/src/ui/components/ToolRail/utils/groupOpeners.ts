import type { KeyboardEvent } from 'react'

/**
 * A group head's popup state, and the two other ways into its group: a right click, and → for the
 * keyboard.
 * @param enabled - whether the button heads a group
 * @param expanded - whether the group is open
 * @param open - open the group
 * @returns the attributes and handlers to spread on the button
 */
export function groupOpeners(enabled: boolean, expanded: boolean, open: () => void) {
  if (!enabled) return {}
  return {
    'aria-haspopup': 'menu' as const,
    'aria-expanded': expanded,
    onContextMenu: (event: { preventDefault: () => void }) => {
      event.preventDefault()
      open()
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowRight') return
      event.preventDefault()
      open()
    },
  }
}
