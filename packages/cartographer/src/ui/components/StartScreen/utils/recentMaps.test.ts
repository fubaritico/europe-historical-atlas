import { describe, expect, it } from 'vitest'

import { RECENT_COUNT, recentMaps } from './recentMaps'

describe('recentMaps', () => {
  describe('happy path', () => {
    it('lists the most recently written first', () => {
      expect(
        recentMaps([
          { name: '1100', changedAt: 10 },
          { name: '1200', changedAt: 30 },
          { name: '1100-essai', changedAt: 20 },
        ]).map((map) => map.name)
      ).toEqual(['1200', '1100-essai', '1100'])
    })
  })

  describe('variants', () => {
    it('leaves the automatic saves to Open…, and keeps the copies', () => {
      expect(
        recentMaps([
          { name: '1100.autosave.2026-11-25T19-05-12', changedAt: 50 },
          { name: '1100.copy.2026-11-25T18-30-12', changedAt: 40 },
          { name: '1100', changedAt: 30 },
        ]).map((map) => map.name)
      ).toEqual(['1100.copy.2026-11-25T18-30-12', '1100'])
    })
  })

  // L3, L4: N/A — a sort of what the archive already read and checked.

  describe('edge cases', () => {
    it('keeps the newest thirty', () => {
      const maps = Array.from({ length: 40 }, (_, at) => ({
        name: `m${String(at)}`,
        changedAt: at,
      }))
      const kept = recentMaps(maps)
      expect([kept.length, kept[0]?.name, kept.at(-1)?.name]).toEqual([RECENT_COUNT, 'm39', 'm10'])
    })

    it('orders maps written at the same time by name, numbers read as numbers', () => {
      expect(
        recentMaps([
          { name: '1200', changedAt: 5 },
          { name: '900', changedAt: 5 },
        ]).map((map) => map.name)
      ).toEqual(['900', '1200'])
    })

    it('lists nothing when there is no map, or only automatic saves', () => {
      expect([
        recentMaps([]),
        recentMaps([{ name: '1100.autosave.2026-11-25T19-05-12', changedAt: 1 }]),
      ]).toEqual([[], []])
    })
  })
})
