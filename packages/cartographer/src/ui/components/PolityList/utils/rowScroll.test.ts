import { describe, expect, it } from 'vitest'

import { scrollTopToShow } from './rowScroll'

describe('scrollTopToShow', () => {
  describe('happy path', () => {
    it('centres a row below the view', () => {
      expect(scrollTopToShow({ rowTop: 2000, rowHeight: 20, scrollTop: 0, viewHeight: 480 })).toBe(
        1770
      )
    })
  })

  describe('variants', () => {
    it('centres a row above the view', () => {
      expect(scrollTopToShow({ rowTop: 100, rowHeight: 20, scrollTop: 900, viewHeight: 480 })).toBe(
        -130
      )
    })

    it('leaves a row wholly in view where it is', () => {
      expect(
        scrollTopToShow({ rowTop: 200, rowHeight: 20, scrollTop: 100, viewHeight: 480 })
      ).toBeNull()
    })
  })

  // L3: N/A — arithmetic, nothing refused. L4: N/A — no optional input.

  describe('edge cases', () => {
    it('moves a row cut by the bottom edge', () => {
      expect(
        scrollTopToShow({ rowTop: 470, rowHeight: 20, scrollTop: 0, viewHeight: 480 })
      ).not.toBeNull()
    })

    it('leaves a row flush with both edges of a view its own height', () => {
      expect(
        scrollTopToShow({ rowTop: 40, rowHeight: 20, scrollTop: 40, viewHeight: 20 })
      ).toBeNull()
    })
  })
})
