import { Box3 } from 'three'
import { describe, expect, it } from 'vitest'

import { swordParts } from './swords'

/**
 * How far one part of the first sword reaches along it: its geometry turned back upright, its extent on Y.
 * @param index - the part, from the blade (0) to the pommel (3)
 * @returns its lowest and highest point along the sword
 */
function alongSword(index: number): { min: number; max: number } {
  const part = swordParts()[index]
  if (part === undefined) throw new Error(`no part ${String(index)}`)
  const geometry = part.geometry.clone().rotateZ(-Math.PI / 4)
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (box === null) throw new Error('no box')
  return { min: box.min.y, max: box.max.y }
}

describe('swordParts', () => {
  // L1: one shape, its size is swept in iconModel.test and eventIcons.test
  // L3: N/A — nothing is refused
  // L4: N/A — no async work, nothing external

  describe('variants', () => {
    it('stands the blade at about twice the hilt, shorter than the flat drawing', () => {
      // Shortened on sight past the flat sword's 35 to 16 (the dev, 2026-10-27).
      const [blade, guard, pommel] = [alongSword(0), alongSword(1), alongSword(3)]
      const ratio = (blade.max - guard.max) / (guard.max - pommel.min)
      expect(ratio).toBeCloseTo(2, 1)
      expect(ratio).toBeLessThan(35 / 16)
    })
  })

  describe('edge cases', () => {
    it('passes one blade in front of the other where they cross, never through it', () => {
      // A sword is four parts, the blade first; the guards and pommels are thicker than the gap, but they stand apart
      // sideways and never meet — only the blades cross.
      const parts = swordParts()
      const [front, back] = [parts[0], parts[4]]
      if (front === undefined || back === undefined) throw new Error('no blades')
      const boxOf = (geometry: typeof front.geometry): Box3 => {
        geometry.computeBoundingBox()
        if (geometry.boundingBox === null) throw new Error('no box')
        return geometry.boundingBox
      }
      expect(boxOf(back.geometry).max.z).toBeLessThan(boxOf(front.geometry).min.z)
      // And they do cross: seen from the front, the two blades share ground on X and Y.
      const [a, b] = [boxOf(front.geometry), boxOf(back.geometry)]
      expect(Math.min(a.max.x, b.max.x)).toBeGreaterThan(Math.max(a.min.x, b.min.x))
      expect(Math.min(a.max.y, b.max.y)).toBeGreaterThan(Math.max(a.min.y, b.min.y))
    })
  })
})
