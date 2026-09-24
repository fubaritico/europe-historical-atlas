import { describe, expect, it } from 'vitest'

import { edgeScrollDrive, keyboardDrive } from './mapControls'

describe('keyboardDrive', () => {
  describe('happy path', () => {
    it('drives north on the up arrow, which is -Z', () => {
      expect(keyboardDrive(new Set(['ArrowUp']), 10)).toEqual({ x: 0, z: -10 })
    })
  })

  describe('variants', () => {
    it('drives each of the four directions', () => {
      expect(keyboardDrive(new Set(['ArrowDown']), 10).z).toBe(10)
      expect(keyboardDrive(new Set(['ArrowLeft']), 10).x).toBe(-10)
      expect(keyboardDrive(new Set(['ArrowRight']), 10).x).toBe(10)
    })

    it('adds two directions into a diagonal', () => {
      expect(keyboardDrive(new Set(['ArrowUp', 'ArrowRight']), 10)).toEqual({ x: 10, z: -10 })
    })

    it('scales with the pan speed it is given', () => {
      expect(keyboardDrive(new Set(['ArrowUp']), 3).z).toBe(-3)
    })
  })

  describe('managed errors', () => {
    it('cancels two opposite keys rather than picking one', () => {
      expect(keyboardDrive(new Set(['ArrowUp', 'ArrowDown']), 10)).toEqual({ x: 0, z: 0 })
    })
  })

  describe('unmanaged errors', () => {
    it('ignores keys that are not pan keys', () => {
      expect(keyboardDrive(new Set(['a', 'Shift', 'F5']), 10)).toEqual({ x: 0, z: 0 })
    })
  })

  describe('edge cases', () => {
    it('drives nothing with nothing held', () => {
      expect(keyboardDrive(new Set(), 10)).toEqual({ x: 0, z: 0 })
    })
  })
})

describe('edgeScrollDrive', () => {
  const vw = 1000
  const vh = 800
  const margin = 24

  describe('happy path', () => {
    it('drives west when the pointer is at the left edge', () => {
      expect(edgeScrollDrive(5, 400, vw, vh, margin, 7)).toEqual({ x: -7, z: 0 })
    })
  })

  describe('variants', () => {
    it('drives east, north and south at the other three edges', () => {
      expect(edgeScrollDrive(995, 400, vw, vh, margin, 7).x).toBe(7)
      expect(edgeScrollDrive(500, 5, vw, vh, margin, 7).z).toBe(-7)
      expect(edgeScrollDrive(500, 795, vw, vh, margin, 7).z).toBe(7)
    })

    it('drives diagonally in a corner', () => {
      expect(edgeScrollDrive(5, 5, vw, vh, margin, 7)).toEqual({ x: -7, z: -7 })
    })

    it('drives nothing from the middle', () => {
      expect(edgeScrollDrive(500, 400, vw, vh, margin, 7)).toEqual({ x: 0, z: 0 })
    })
  })

  describe('managed errors', () => {
    it('stops entirely once the pointer has left the window', () => {
      // Without this the map would scroll on forever after the cursor leaves — the reader has stopped
      // asking for anything, and a negative coordinate is not a request to go faster.
      expect(edgeScrollDrive(-40, 400, vw, vh, margin, 7)).toEqual({ x: 0, z: 0 })
      expect(edgeScrollDrive(500, 900, vw, vh, margin, 7)).toEqual({ x: 0, z: 0 })
    })
  })

  describe('unmanaged errors', () => {
    it('drives nothing for a pointer that has never moved', () => {
      expect(edgeScrollDrive(Number.NaN, Number.NaN, vw, vh, margin, 7)).toEqual({ x: 0, z: 0 })
    })
  })

  describe('edge cases', () => {
    it('drives nothing at a zero margin, the pointer never being within it', () => {
      expect(edgeScrollDrive(0, 0, vw, vh, 0, 7)).toEqual({ x: 0, z: 0 })
    })

    it('drives both ways at once when the margins overlap on a tiny viewport', () => {
      // A window narrower than twice the margin: every pixel is both near the left and near the right,
      // so the two cancel rather than one winning arbitrarily.
      expect(edgeScrollDrive(10, 10, 20, 20, margin, 7)).toEqual({ x: -7, z: -7 })
    })
  })
})
