import { afterEach, describe, expect, it, vi } from 'vitest'

import { DOCK_WIDTH_RANGE } from '../../../../state/panelsSlice'

import { beginEdgeDrag, endEdgeDrag, followEdgeDrag } from './dockEdgeDrag'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * A shell body whose `--dock-w` the store set to 280 px.
 * @returns the body
 */
function body(): HTMLElement {
  const element = document.createElement('div')
  element.style.setProperty('--dock-w', '280px')
  return element
}

// CARTO-342: the column widened by its left edge.
describe('dockEdgeDrag', () => {
  describe('happy path', () => {
    it('widens the column by 40 px when its edge moves 40 px left, and puts the body’s own value back', () => {
      const drag = beginEdgeDrag(body(), 1000, 280)
      followEdgeDrag(drag, 960)
      expect(drag.body.style.getPropertyValue('--dock-w')).toBe('320px')
      expect(endEdgeDrag(drag, true)).toBe(320)
      expect(drag.body.style.getPropertyValue('--dock-w')).toBe('280px')
    })
  })

  describe('variants', () => {
    it('keeps the column within its range while the edge is dragged', () => {
      const drag = beginEdgeDrag(body(), 1000, 280)
      followEdgeDrag(drag, -2000)
      expect(drag.now).toBe(DOCK_WIDTH_RANGE.max)
      followEdgeDrag(drag, 3000)
      expect(drag.now).toBe(DOCK_WIDTH_RANGE.min)
    })
  })

  describe('managed errors', () => {
    it('keeps nothing from a drag the browser cancels, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const drag = beginEdgeDrag(body(), 1000, 280)
      followEdgeDrag(drag, 900)
      expect(endEdgeDrag(drag, false)).toBeNull()
      expect([drag.body.style.getPropertyValue('--dock-w'), warn.mock.calls.length]).toEqual([
        '280px',
        1,
      ])
    })
  })

  // L4: N/A — arithmetic and a style.

  describe('edge cases', () => {
    it('keeps nothing from a click on the edge', () => {
      expect(endEdgeDrag(beginEdgeDrag(body(), 1000, 280), true)).toBeNull()
    })
  })
})
