import { describe, expect, it } from 'vitest'

import { withoutSaved } from './usePendingLinks'

import type { PendingLine } from './usePendingLinks'

/**
 * A line of the block.
 * @param key - its key
 * @param suzerain - its suzerain
 * @returns the line
 */
function line(key: string, suzerain: number | null): PendingLine {
  return { key, suzerain, source: null, status: { kind: 'filling' }, sovereign: false }
}

// Review ARCH-002 (2026-11-16): a line saved leaves the block, and the line above keeps its vassal.
describe('withoutSaved', () => {
  describe('happy path', () => {
    it('removes the line saved and hands its suzerain to the line above as vassal', () => {
      const saved = line('a', 20)
      expect(withoutSaved([saved, line('b', 40), line('c', null)], saved)).toEqual([
        { ...line('b', 40), vassal: 20 },
        line('c', null),
      ])
    })
  })

  describe('variants', () => {
    it('hands the vassal on from a line saved in the middle — its own above, not the one below', () => {
      const saved = line('b', 40)
      expect(withoutSaved([line('a', 20), saved, line('c', 60)], saved)).toEqual([
        line('a', 20),
        { ...line('c', 60), vassal: 40 },
      ])
    })
  })

  describe('edge cases', () => {
    it('changes nothing for a line already gone — closed before its answer came', () => {
      const lines = [line('a', 20)]
      expect(withoutSaved(lines, line('z', 9))).toBe(lines)
    })

    it('removes the last line with nothing to hand on', () => {
      const saved = line('a', 20)
      expect(withoutSaved([saved], saved)).toEqual([])
    })
  })

  // L3, L4: N/A — pure arithmetic of the block's lines; the saves are HolderChain's tests.
})
