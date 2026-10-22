import { useEffect, useEffectEvent } from 'react'

import type { RefObject } from 'react'

/**
 * The menu items a key may land on: the enabled rows, in order.
 * @param menu - the menu element
 * @returns its enabled items
 */
function enabledItems(menu: HTMLElement): HTMLElement[] {
  return [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]:not([aria-disabled="true"])'),
  ]
}

/**
 * Focus the current row when the flyout opens, and close it on a press anywhere outside.
 * @param menu - the menu element
 * @param onDismiss - close without choosing
 */
export function useFlyoutFocus(
  menu: RefObject<HTMLUListElement | null>,
  onDismiss: () => void
): void {
  // Effects
  // An effect event, so a parent re-render — a new `onDismiss` each time — does not re-run the effect
  // and pull the focus back to the checked row while the author is moving through the list.
  const dismiss = useEffectEvent(onDismiss)
  useEffect(() => {
    const node = menu.current
    if (node === null) return undefined
    const checked = node.querySelector<HTMLElement>('[aria-checked="true"]')
    ;(checked ?? enabledItems(node)[0])?.focus()
    const outside = (event: PointerEvent): void => {
      if (!(event.target instanceof Node) || !node.contains(event.target)) dismiss()
    }
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
    }
  }, [menu])
}
