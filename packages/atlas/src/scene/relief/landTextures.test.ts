import { RedFormat } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createLandMask } from '@europe-historical-atlas/core/data/landMask'

import { createLandTextures } from './landTextures'

/** A mask five cells wide and two high: the columns a predicate names are land. */
const maskWhere = (isLand: (col: number, row: number) => boolean) =>
  createLandMask(
    {
      width: 5,
      height: 2,
      scale: 1,
      bbox: { west: 0, south: 0, east: 1, north: 1 },
      source: 'test',
    },
    isLand
  )

describe('createLandTextures', () => {
  describe('happy path', () => {
    it('splits the mask in two halves side by side, one byte a cell, 255 over land', () => {
      const land = createLandTextures(maskWhere((col) => col < 2))
      expect(land.west.image.width).toBe(3)
      expect(land.east.image.width).toBe(2)
      expect(land.split).toBeCloseTo(3 / 5)
      expect(Array.from(land.west.image.data as Uint8Array)).toEqual([255, 255, 0, 255, 255, 0])
      expect(Array.from(land.east.image.data as Uint8Array)).toEqual([0, 0, 0, 0])
    })
  })

  describe('variants', () => {
    it('keeps the rows north first and flips them as the terrain does, so the relief’s uv reads them alike', () => {
      const land = createLandTextures(maskWhere((_col, row) => row === 0))
      expect(Array.from(land.west.image.data as Uint8Array)).toEqual([255, 255, 255, 0, 0, 0])
      expect(land.west.flipY).toBe(true)
      expect(land.west.format).toBe(RedFormat)
    })
  })

  // L3, L4: N/A — a mask is always whole once read; its reader refuses a malformed one.

  describe('edge cases', () => {
    it('frees both halves at teardown', () => {
      const land = createLandTextures(maskWhere(() => true))
      const west = vi.spyOn(land.west, 'dispose')
      const east = vi.spyOn(land.east, 'dispose')
      land.dispose()
      expect(west).toHaveBeenCalledOnce()
      expect(east).toHaveBeenCalledOnce()
    })
  })
})
