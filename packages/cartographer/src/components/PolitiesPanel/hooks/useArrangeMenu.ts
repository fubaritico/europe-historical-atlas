import { useCallback, useRef, useState } from 'react'

import type { ViewportPoint } from '../../../viewport/viewport'
import type { ArrangeRequest } from '../internal/PolityArrangeMenu'

/**
 * The open stacking menu of `{Polities}`: which row, where, and how it closes — the focus going back to
 * this panel's list, where the menu was asked for, so the keys carry on there.
 * @returns the request, its open and close, and the panel's ref
 */
export function useArrangeMenu() {
  // Refs
  const panel = useRef<HTMLElement | null>(null)

  // State
  const [arranging, setArranging] = useState<ArrangeRequest | null>(null)

  // Handlers
  const openMenu = useCallback((id: string, at: ViewportPoint) => {
    setArranging({ id, at })
  }, [])
  const closeMenu = useCallback(() => {
    setArranging(null)
    panel.current?.querySelector<HTMLElement>('.polities__list')?.focus()
  }, [])

  // Return
  return { arranging, openMenu, closeMenu, panel }
}
