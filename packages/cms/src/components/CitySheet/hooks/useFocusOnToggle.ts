import { useEffect, useRef } from 'react'

import type { RefObject } from 'react'

/** Where the keyboard goes when a part is swapped for its other, and the call that says a swap was asked. */
export interface FocusOnToggle {
  /** The box holding both parts. */
  readonly box: RefObject<HTMLDivElement | null>
  /** Marks the next change of `open` as the user's, so the keyboard follows it — not the first draw. */
  readonly toggled: () => void
}

/**
 * The keyboard follows a part swapped for its other — ⊕ for the line it opens, ✕ for ⊕ again (review A11Y-001,
 * 2026-11-16): the button pressed leaves with the tree it belongs to, and the keyboard would land on the page's body.
 * Once the other is drawn, it lands on `opened` when open, on the box's first button when closed.
 * @param open - whether the line is open
 * @param opened - the selector of what takes the keyboard once open
 * @returns the box to hold both parts, and the call marking a swap
 */
export function useFocusOnToggle(open: boolean, opened: string): FocusOnToggle {
  const box = useRef<HTMLDivElement>(null)
  const asked = useRef(false)

  useEffect(() => {
    if (!asked.current) return
    asked.current = false
    const target = box.current?.querySelector<HTMLElement>(open ? opened : 'button')
    target?.focus()
  }, [open, opened])

  return {
    box,
    toggled: () => {
      asked.current = true
    },
  }
}
