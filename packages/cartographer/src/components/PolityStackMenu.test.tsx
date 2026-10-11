import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PolityStackMenu } from './PolityStackMenu'

const ALL = { front: true, forward: true, backward: true, back: true }

/**
 * Mount the menu at a point, its box measured at 180×100 in an 800×600 window.
 * @param at - where it is asked for
 * @returns its element
 */
function mountAt(at: { x: number; y: number }): HTMLElement {
  vi.stubGlobal('innerWidth', 800)
  vi.stubGlobal('innerHeight', 600)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(at.x, at.y, 180, 100)
  )
  const { container } = render(
    <PolityStackMenu name="France" at={at} moves={ALL} onChoose={vi.fn()} onClose={vi.fn()} />
  )
  const shell = container.querySelector<HTMLElement>('.polity-stack-menu')
  if (shell === null) throw new Error('no menu')
  return shell
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PolityStackMenu', () => {
  describe('happy path', () => {
    it('opens at the point when it fits', () => {
      const shell = mountAt({ x: 100, y: 100 })
      expect([shell.style.left, shell.style.top]).toEqual(['100px', '100px'])
    })
  })

  describe('variants', () => {
    // ARCH-004 / A11Y-007: folded back inside the window rather than cut by its edge.
    it('flips above and to the left of a point in the window’s corner', () => {
      const shell = mountAt({ x: 790, y: 590 })
      expect([shell.style.left, shell.style.top]).toEqual(['610px', '490px'])
    })
  })

  // L3/L4: N/A — the arithmetic is placeMenu's, tested there; this is the wiring.
  // L5: the menu larger than the window is placeMenu's edge case.
})
