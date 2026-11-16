import { useEffect, useRef } from 'react'

import type { RefObject } from 'react'

/**
 * The keyboard follows the block's lines (CMS-422): a line added by ⊕ takes it — the button moved below it; a line
 * closed or saved while the keyboard was in it gives it back to ⊕, never to the page's body. A line saved while another
 * is typed in leaves the keyboard there.
 * @param count - how many lines the block holds
 * @returns the box holding the block
 */
export function useLineFocus(count: number): RefObject<HTMLDivElement | null> {
  const box = useRef<HTMLDivElement>(null)
  const before = useRef(count)
  useEffect(() => {
    if (count > before.current) {
      const groups = box.current?.querySelectorAll<HTMLElement>('[role="group"]')
      groups?.item(groups.length - 1).focus()
    } else if (count < before.current && document.activeElement === document.body) {
      box.current?.querySelector<HTMLElement>('.city-sheet__chain-add button')?.focus()
    }
    before.current = count
  }, [count])
  return box
}
