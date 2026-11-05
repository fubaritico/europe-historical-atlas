import { describe, expect, it } from 'vitest'

import { groundKm } from './groundDistance'
import { SpatialCells, inGeoBox, paddedBox } from './spatialCells'

describe('spatialCells', () => {
  describe('happy path', () => {
    it('finds a point filed within the cell side of the one asked about', () => {
      const cells = new SpatialCells<string>(paddedBox([[10, 45]], 2), 2)
      cells.addPoint('near', [10.02, 45])

      expect(groundKm([10, 45], [10.02, 45])).toBeLessThan(2)
      expect(cells.near([10, 45])).toEqual(['near'])
    })

    it('finds a long segment from a point beside its middle, its two ends far away', () => {
      const cells = new SpatialCells<string>(paddedBox([[10, 45]], 2), 2)
      cells.addSegment('long', [8, 45.01], [12, 45.01])

      expect(cells.near([10, 45])).toContain('long')
    })
  })

  describe('variants', () => {
    it('finds a diagonal segment from a point within the cell side of it', () => {
      const cells = new SpatialCells<string>(paddedBox([[10, 45]], 2), 2)
      cells.addSegment('diagonal', [9, 44], [11, 46.02])

      expect(cells.near([10, 45])).toContain('diagonal')
    })

    it('keeps a cell at least the side asked for at the box’s latitude farthest from the equator', () => {
      const box = paddedBox(
        [
          [10, 40],
          [10, 70],
        ],
        2
      )
      const cells = new SpatialCells<string>(box, 2)
      cells.addPoint('north', [10.05, 70])

      expect(groundKm([10, 70], [10.05, 70])).toBeLessThan(2)
      expect(cells.near([10, 70])).toEqual(['north'])
    })

    it('pads a box by the distance on the ground', () => {
      const box = paddedBox([[10, 45]], 2)

      expect(groundKm([box[0], 45], [10, 45])).toBeCloseTo(2, 1)
      expect(groundKm([10, box[1]], [10, 45])).toBeCloseTo(2, 2)
    })

    it('tells a point inside a box from one outside', () => {
      expect(inGeoBox([10, 45], [9, 44, 11, 46])).toBe(true)
      expect(inGeoBox([12, 45], [9, 44, 11, 46])).toBe(false)
    })
  })

  // L3, L4: N/A — buckets of whatever is filed; nothing is refused and nothing can fail.

  describe('edge cases', () => {
    it('finds nothing far from everything filed', () => {
      const cells = new SpatialCells<string>(paddedBox([[10, 45]], 2), 2)
      cells.addPoint('far', [11, 45])

      expect(cells.near([10, 45])).toEqual([])
    })

    it('files a segment of no length as its point', () => {
      const cells = new SpatialCells<string>(paddedBox([[10, 45]], 2), 2)
      cells.addSegment('dot', [10, 45], [10, 45])

      expect(cells.near([10, 45])).toEqual(['dot'])
    })

    it('files a long diagonal under a band of cells, not the rectangle of its box', () => {
      const cells = new SpatialCells<string>(paddedBox([[10, 45]], 2), 2)
      cells.addSegment('diagonal', [8, 43], [12, 47])

      expect(cells.near([8, 47])).toEqual([])
    })
  })
})
