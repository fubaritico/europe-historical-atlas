import { describe, expect, it } from 'vitest'

import { citySheetCandidate } from './citySheetCandidate'

/** Rome in 1100, with bare ids, as the server hook reads it before a save. */
const bare = {
  place: 5,
  date: {
    start: { year: 1100, month: null, day: null, circa: true, margin: null, calendar: 'julian' },
  },
  importance: 'capital',
  reasons: [3, 4],
  testimonies: [
    { id: 'r1', source: 4, subject: 'reason', reason: 3, population: null, where: null },
    { id: 'r2', source: 4, subject: 'community', confession: 9, where: null },
  ],
  communities: [{ id: 'c1', confession: 9, weight: 'present', weightAttested: false }],
}

/** The same sheet, its relations populated, as the export reads it. */
const populated = {
  ...bare,
  place: { id: 5, name: { fr: 'Rome' } },
  reasons: [{ id: 3 }, { id: 4 }],
  testimonies: [
    { ...bare.testimonies[0], source: { id: 4, title: 'Buringh 2021' }, reason: { id: 3 } },
    { ...bare.testimonies[1], source: { id: 4, title: 'Buringh 2021' }, confession: { id: 9 } },
  ],
  communities: [{ ...bare.communities[0], confession: { id: 9, name: { fr: 'juive' } } }],
}

describe('citySheetCandidate', () => {
  describe('happy path', () => {
    it('reads a sheet with bare ids, its date as core holds it', () => {
      expect(citySheetCandidate(bare)).toMatchObject({
        place: 5,
        date: { kind: 'instant', at: { year: 1100, circa: true } },
        importance: 'capital',
        reasons: [3, 4],
        testimonies: [
          { source: 4, subject: 'reason', reason: 3 },
          { source: 4, subject: 'community', confession: 9 },
        ],
        communities: [{ confession: 9, weight: 'present', weightAttested: false }],
      })
    })
  })

  describe('variants', () => {
    // The export reads populated relations, the server bare ids: both must come out the same.
    it('reads the same sheet, populated, as the same candidate', () => {
      expect(citySheetCandidate(populated)).toEqual(citySheetCandidate(bare))
    })
  })

  describe('managed errors', () => {
    it('answers null for a date that does not read — the date field says why', () => {
      expect(citySheetCandidate({ ...bare, date: { start: { year: 0 } } })).toBeNull()
    })
  })

  // L4: N/A — a missing field is passed through for the schema to refuse, by name.

  describe('edge cases', () => {
    it('reads no reasons and no lines as empty lists', () => {
      expect(citySheetCandidate({ ...bare, reasons: null, testimonies: undefined })).toMatchObject({
        reasons: [],
        testimonies: [],
      })
    })

    it('reads a sheet saved before the communities existed as one with none', () => {
      const { communities: _none, ...older } = bare
      expect(citySheetCandidate(older)).toMatchObject({ communities: [] })
    })
  })
})
