import { useLayoutEffect, useRef } from 'react'

import { placeMenu } from '../../shared/menuPlacement'

import type { ViewportPoint } from '../../../viewport/viewport'
import type { RefObject } from 'react'

/**
 * Fold the menu back inside the window (`placeMenu`), once it can be measured. Written on the element
 * before the first paint — no state, so no second render — so it never shows half off-screen and jumps.
 * @param at - where it was asked for
 * @returns the ref the menu's element takes
 */
export function useInsideWindow(at: ViewportPoint): RefObject<HTMLDivElement | null> {
  // Refs
  const shell = useRef<HTMLDivElement | null>(null)

  // Effects
  useLayoutEffect(() => {
    const node = shell.current
    if (node === null) return
    const box = node.getBoundingClientRect()
    const place = placeMenu(
      at,
      { width: box.width, height: box.height },
      { width: globalThis.innerWidth, height: globalThis.innerHeight }
    )
    node.style.left = `${String(place.x)}px`
    node.style.top = `${String(place.y)}px`
  }, [at])

  // Return
  return shell
}
