import { useEffect, useRef } from 'react'

import type { RefObject } from 'react'

/**
 * The keyboard follows the block's lines (CMS-422): a line added by ⊕ takes it — the button moved below it; a line
 * closed or saved while the keyboard was in it gives it back to ⊕, never to the page's body. A line saved while another
 * is typed in leaves the keyboard there.
 * @param count - how many lines the block holds
 * @param added - whether the last line is a new one, added by ⊕
 * @returns the box holding the block
 */
export function useLineFocus(count: number, added: boolean): RefObject<HTMLDivElement | null> {
  const box = useRef<HTMLDivElement>(null)
  const before = useRef(count)
  useEffect(() => {
    // One line added by ⊕ — not the chain's links loaded into the block when the sheet opens
    if (count === before.current + 1 && added) {
      const groups = box.current?.querySelectorAll<HTMLElement>('[role="group"]')
      // `item` answers `null` past the end, whatever its type says
      groups?.[groups.length - 1]?.focus()
    } else if (count < before.current && document.activeElement === document.body) {
      box.current?.querySelector<HTMLElement>('.city-sheet__chain-add button')?.focus()
    }
    before.current = count
  }, [count, added])
  return box
}
