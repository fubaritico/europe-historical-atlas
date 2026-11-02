import { describe, expect, it } from 'vitest'

import {
  DOCK_MAGNET_PX,
  MIN_PANEL_SIZE,
  dropTarget,
  insertionY,
  movedRect,
  resizedRect,
} from './panelGeometry'

/** The column: 280 px wide at the right of a 1200 × 800 window, under 60 px of bars. */
const DOCK = { left: 920, top: 60, right: 1200, bottom: 800 }
/** Two docked panels in it. */
const SLOTS = [
  { left: 920, top: 60, right: 1200, bottom: 300 },
  { left: 920, top: 300, right: 1200, bottom: 420 },
]
const FLOAT = { x: 400, y: 200, width: 280, height: 200 }

const at = (x: number) =>
  dropTarget({
    pointer: { x, y: 100 },
    dock: DOCK,
    slots: SLOTS,
    windowWidth: 1200,
    floatRect: FLOAT,
  }).kind

const index = (y: number) => {
  const target = dropTarget({
    pointer: { x: 1000, y },
    dock: DOCK,
    slots: SLOTS,
    windowWidth: 1200,
    floatRect: FLOAT,
  })
  return target.kind === 'dock' ? target.index : null
}

// CARTO-342: a panel dropped near the column docks there, magnetised; anywhere else it floats.
describe('panelGeometry', () => {
  describe('happy path', () => {
    it('docks a panel dropped over the column between the two docked ones', () => {
      expect(
        dropTarget({
          pointer: { x: 1000, y: 310 },
          dock: DOCK,
          slots: SLOTS,
          windowWidth: 1200,
          floatRect: FLOAT,
        })
      ).toEqual({
        kind: 'dock',
        index: 1,
      })
    })

    it('floats a panel dropped over the canvas, at its rectangle', () => {
      expect(
        dropTarget({
          pointer: { x: 500, y: 300 },
          dock: DOCK,
          slots: SLOTS,
          windowWidth: 1200,
          floatRect: FLOAT,
        })
      ).toEqual({
        kind: 'float',
        rect: FLOAT,
      })
    })
  })

  describe('variants', () => {
    it('catches a panel within the magnet’s reach left of the column, and lets one just past it float', () => {
      expect([at(DOCK.left - DOCK_MAGNET_PX), at(DOCK.left - DOCK_MAGNET_PX - 1)]).toEqual([
        'dock',
        'float',
      ])
    })

    it('docks at the top above the first panel’s middle, at the bottom below the last', () => {
      expect([index(100), index(700)]).toEqual([0, 2])
    })

    it('catches a panel at the window’s right edge when the column is hidden', () => {
      expect(
        dropTarget({
          pointer: { x: 1190, y: 100 },
          dock: null,
          slots: [],
          windowWidth: 1200,
          floatRect: FLOAT,
        })
      ).toEqual({
        kind: 'dock',
        index: 0,
      })
    })

    it('draws the insertion line between two panels, above the first and below the last', () => {
      expect([
        insertionY(SLOTS, 0, DOCK),
        insertionY(SLOTS, 1, DOCK),
        insertionY(SLOTS, 2, DOCK),
      ]).toEqual([60, 300, 420])
      expect(insertionY([], 0, DOCK)).toBe(60)
    })
  })

  // L3, L4: N/A — arithmetic on literals.

  describe('edge cases', () => {
    it('keeps a moved panel’s head inside the window', () => {
      const window = { width: 1200, height: 800 }
      expect(movedRect(FLOAT, 5000, 5000, window)).toEqual({ ...FLOAT, x: 1152, y: 752 })
      expect(movedRect(FLOAT, -5000, -5000, window)).toEqual({ ...FLOAT, x: -232, y: 0 })
    })

    it('resizes from the right and the bottom, never under the smallest size', () => {
      expect(resizedRect(FLOAT, { right: true, bottom: true }, 40, 30)).toEqual({
        x: 400,
        y: 200,
        width: 320,
        height: 230,
      })
      expect(resizedRect(FLOAT, { right: true, bottom: true }, -500, -500)).toEqual({
        x: 400,
        y: 200,
        width: MIN_PANEL_SIZE.width,
        height: MIN_PANEL_SIZE.height,
      })
    })

    it('resizes from the left without moving the right edge, and stops at the smallest size', () => {
      expect(resizedRect(FLOAT, { left: true }, -50, 0)).toEqual({
        x: 350,
        y: 200,
        width: 330,
        height: 200,
      })
      const tight = resizedRect(FLOAT, { left: true }, 500, 0)
      expect([tight.x + tight.width, tight.width]).toEqual([680, MIN_PANEL_SIZE.width])
    })
  })
})
