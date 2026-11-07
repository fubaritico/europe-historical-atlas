import { describe, expect, it } from 'vitest'

import { tickedHolders } from './tickedHolders'

// CARTO-370, `s20`: a holder ticked that no box of the map open stands for filters nothing.
describe('tickedHolders', () => {
  describe('happy path', () => {
    it('keeps the Empire ticked when a box stands for it', () => {
      expect([...tickedHolders(new Set(['wd:Q12548']), new Set(['wd:Q12548', 'none']))]).toEqual([
        'wd:Q12548',
      ])
    })
  })

  describe('variants', () => {
    it('drops Venice, ticked on another map, when no box of this one stands for it', () => {
      expect([
        ...tickedHolders(new Set(['wd:Q12548', 'wd:Q4948']), new Set(['wd:Q12548', 'none'])),
      ]).toEqual(['wd:Q12548'])
    })
  })

  // L3–L4: N/A — a pure intersection.

  describe('edge cases', () => {
    it('gives nothing when nothing is ticked', () => {
      expect(tickedHolders(new Set(), new Set(['none'])).size).toBe(0)
    })
  })
})
