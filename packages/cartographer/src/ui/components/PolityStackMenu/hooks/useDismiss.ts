import { useEffect, useRef } from 'react'

import type { RefObject } from 'react'

/**
 * Focus the menu on opening, and close it on a press outside or when ‹Tab› takes the focus out — the
 * design system's Menu answers ‹escape› only (A11Y-006).
 *
 * **The latest close is read through a ref**: the caller passes a fresh closure on every render, and an
 * effect keyed on it would re-run — and re-take the focus — each time the panel re-renders (QUAL-002).
 * @param shell - the menu's element
 * @param onClose - how it closes
 */
export function useDismiss(shell: RefObject<HTMLDivElement | null>, onClose: () => void): void {
  // Refs
  const close = useRef(onClose)

  // Effects
  useEffect(() => {
    close.current = onClose
  }, [onClose])
  useEffect(() => {
    const node = shell.current
    node?.querySelector<HTMLElement>('[role="listbox"]')?.focus()
    const away = (to: EventTarget | null) => !(to instanceof Node) || !node?.contains(to)
    const outside = (event: PointerEvent) => {
      if (away(event.target)) close.current()
    }
    const left = (event: FocusEvent) => {
      if (away(event.relatedTarget)) close.current()
    }
    document.addEventListener('pointerdown', outside)
    node?.addEventListener('focusout', left)
    return () => {
      document.removeEventListener('pointerdown', outside)
      node?.removeEventListener('focusout', left)
    }
  }, [shell])
}
