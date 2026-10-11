import { describe, expect, it } from 'vitest'

import { placeMenu } from './menuPlacement'

const SCREEN = { width: 800, height: 600 }
const MENU = { width: 180, height: 100 }

describe('placeMenu', () => {
  describe('happy path', () => {
    it('opens below and to the right of the point when it fits', () => {
      expect(placeMenu({ x: 100, y: 100 }, MENU, SCREEN)).toEqual({ x: 100, y: 100 })
    })
  })

  describe('variants', () => {
    it('flips above the point near the bottom edge', () => {
      expect(placeMenu({ x: 100, y: 550 }, MENU, SCREEN)).toEqual({ x: 100, y: 450 })
    })

    it('flips to the left of the point near the right edge', () => {
      expect(placeMenu({ x: 700, y: 100 }, MENU, SCREEN)).toEqual({ x: 520, y: 100 })
    })
  })

  // L3: N/A — arithmetic on sizes the caller measured.

  describe('unmanaged errors', () => {
    it('holds a menu taller than the room above and below at the top', () => {
      expect(placeMenu({ x: 100, y: 50 }, { width: 180, height: 590 }, SCREEN).y).toBe(10)
    })
  })

  describe('edge cases', () => {
    it('keeps a menu that fits exactly where it was asked for', () => {
      expect(placeMenu({ x: 620, y: 500 }, MENU, SCREEN)).toEqual({ x: 620, y: 500 })
    })

    it('starts at 0 when the menu is larger than the window', () => {
      expect(placeMenu({ x: 10, y: 10 }, { width: 900, height: 700 }, SCREEN)).toEqual({
        x: 0,
        y: 0,
      })
    })
  })
})
