import { describe, expect, it } from 'vitest'

import { countTwoDownloads } from './terrain'

// ATLAS-333: the relief's and the mask's downloads move the bar as one. The sidecars' sizes are checked against their
// files in bake/terrainSidecars.test.ts.
describe('countTwoDownloads', () => {
  describe('happy path', () => {
    it('tells the bytes of both over their sizes together', () => {
      const told: number[] = []
      const count = countTwoDownloads((fraction) => told.push(fraction))
      count.relief(0, 600)
      count.mask(100, 400)
      count.relief(300, 600)
      expect(told).toEqual([0.1, 0.4])
    })
  })

  describe('edge cases', () => {
    it('is whole once both are in', () => {
      const told: number[] = []
      const count = countTwoDownloads((fraction) => told.push(fraction))
      count.relief(0, 600)
      count.mask(400, 400)
      count.relief(600, 600)
      expect(told.at(-1)).toBe(1)
    })

    // Review ARCH-002: a mask in before the relief's size is known would fill the step and hold the bar still.
    it('tells nothing until both sizes are known, so a mask in first does not fill the step', () => {
      const told: number[] = []
      const count = countTwoDownloads((fraction) => told.push(fraction))
      count.mask(0, 400)
      count.mask(400, 400)
      count.relief(0, 600)
      expect(told).toEqual([0.4])
    })
  })

  // L2, L3, L4: N/A — two counters summed; a download's failure is the loader's to say.
})
