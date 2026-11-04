import { useEffect, useRef } from 'react'

import type { RefObject } from 'react'

/**
 * Close the open menu on a press anywhere outside the bar, as a system's menu closes.
 *
 * **The latest close is read through a ref**: the caller passes a fresh closure on every render, and an effect keyed on
 * it would detach and attach the listener at each one.
 * @param bar - the bar's element
 * @param open - whether a menu is open: the listener lives only while one is
 * @param close - how it closes
 */
export function useCloseOutside(
  bar: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void
): void {
  // Refs
  const latest = useRef(close)

  // Effects
  useEffect(() => {
    latest.current = close
  }, [close])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !bar.current?.contains(event.target)) latest.current()
    }
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
    }
  }, [bar, open])
}
