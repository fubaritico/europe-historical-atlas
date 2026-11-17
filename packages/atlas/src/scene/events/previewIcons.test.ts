import { describe, expect, it, vi } from 'vitest'

import { placePreviewIcons } from './previewIcons'

import type { WorldPoint } from '../relief/drapeProjection'

/** A frame of ten degrees each way about the origin — narrow enough for the latitudes to map nearly evenly. */
const FRAME = { west: -10, east: 10, south: -10, north: 10 }

/** The grid's point itself as the world's, so a test reads where an icon landed. */
const draped = (u: number, v: number): WorldPoint => [u, 0, v]

describe('placePreviewIcons', () => {
  describe('happy path', () => {
    it('stands an icon at its place on the map’s grid, west to east and north to south', () => {
      const [placed] = placePreviewIcons([{ lon: 5, lat: 10, kind: 'cathedral' }], FRAME, draped)

      expect(placed?.kind).toBe('cathedral')
      expect(placed?.ground[0]).toBeCloseTo(0.75)
      expect(placed?.ground[2]).toBeCloseTo(0)
    })
  })

  describe('variants', () => {
    it('keeps the order asked', () => {
      const placed = placePreviewIcons(
        [
          { lon: -5, lat: 0, kind: 'cathedral' },
          { lon: 5, lat: 0, kind: 'swords' },
        ],
        FRAME,
        draped
      )

      expect(placed.map(({ kind }) => kind)).toEqual(['cathedral', 'swords'])
    })
  })

  describe('edge cases', () => {
    it('places nothing when nothing is asked', () => {
      expect(placePreviewIcons([], FRAME, draped)).toEqual([])
    })
  })

  describe('errors', () => {
    it('leaves out an icon outside the map’s frame, and says so', () => {
      const warn = vi.fn()

      const placed = placePreviewIcons(
        [{ lon: 40, lat: 0, kind: 'cathedral' }],
        FRAME,
        draped,
        warn
      )

      expect(placed).toEqual([])
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('outside the map’s frame'.replace('’', "'"))
      )
    })
  })

  // L4: N/A — no async work, nothing external
})
