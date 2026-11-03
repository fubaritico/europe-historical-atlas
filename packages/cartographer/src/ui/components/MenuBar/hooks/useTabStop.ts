import { useState } from 'react'

import type { MenuDefinition } from '../menuBarProps'
import type { FocusEvent } from 'react'

/** The bar's one ‹Tab› stop, and what moves it. */
export interface TabStop {
  /** The title the stop sits on — the last one focused. */
  stop: string
  /** A title focused: the stop moves onto it. */
  handleTitleFocus: (event: FocusEvent<HTMLButtonElement>) => void
}

/**
 * The bar's one ‹Tab› stop, on the title last focused — the APG's roving tab stop: ‹Tab› reaches the bar once, the
 * arrows walk its titles (A11Y-002). On the first title until one is focused.
 * @param menus - the bar's menus
 * @returns the stop and its handler
 */
export function useTabStop(menus: readonly MenuDefinition[]): TabStop {
  // State
  const [stop, setStop] = useState(menus[0]?.id ?? '')

  // Handlers
  const handleTitleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    setStop(event.currentTarget.dataset.menu ?? stop)
  }

  // Return
  return { stop, handleTitleFocus }
}
