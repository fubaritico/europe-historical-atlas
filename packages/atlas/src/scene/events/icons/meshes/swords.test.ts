import { Box3 } from 'three'
import { describe, expect, it } from 'vitest'

import { swordParts } from './swords'

describe('swordParts', () => {
  // L1–L2: one shape, its proportions are swept in iconModel.test and eventIcons.test
  // L3: N/A — nothing is refused
  // L4: N/A — no async work, nothing external

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
