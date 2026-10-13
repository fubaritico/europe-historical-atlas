import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { overrideRows } from './overrideRows'

// France holds the ring 0 1 2 3, the Empire 1 4 5 2: the segment 1–2 is their shared limit.

describe('overrideRows', () => {
  describe('happy path', () => {
    it('lists a dressed stretch with its hand, its length and whom it separates', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ run: [1, 2], hand: 'dotted', source: null, note: null })
      expect(overrideRows(doc)).toEqual([
        {
          kind: 'run',
          index: 0,
          hand: 'dotted',
          label: '1 segment · Reaume de France – Sacrum Imperium',
          orphaned: false,
        },
      ])
    })
  })

  describe('variants', () => {
    it('lists a dressed pair as the whole border', () => {
      const doc = sharedBorderDocument()
      doc.pairs.push({
        between: ['fr-couronne', 'hre'],
        type: 'indefinite',
        hand: 'double',
        source: null,
        note: null,
      })
      expect(overrideRows(doc)[0]?.label).toBe('whole border · Reaume de France – Sacrum Imperium')
    })

    it('lists the stretches before the pairs', () => {
      const doc = sharedBorderDocument()
      doc.pairs.push({
        between: ['fr-couronne', 'hre'],
        type: 'indefinite',
        hand: 'double',
        source: null,
        note: null,
      })
      doc.runs.push({ run: [0, 1], hand: 'dotted', source: null, note: null })
      expect(overrideRows(doc).map((row) => row.kind)).toEqual(['run', 'pair'])
    })
  })

  describe('managed errors', () => {
    it('lists a stretch no ring holds any more as orphaned, rather than dropping it', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ run: [0, 5], hand: 'dotted', source: null, note: null })
      const [row] = overrideRows(doc)
      expect(row?.orphaned).toBe(true)
      expect(row?.label).toBe('1 segment · orphaned')
    })
  })

  describe('unmanaged errors', () => {
    it('names a polity the registry lacks by its id', () => {
      const doc = sharedBorderDocument()
      doc.pairs.push({
        between: ['fr-couronne', 'ghost'],
        type: 'indefinite',
        hand: 'double',
        source: null,
        note: null,
      })
      expect(overrideRows(doc)[0]?.label).toBe('whole border · Reaume de France – ghost')
    })
  })

  describe('edge cases', () => {
    it('lists nothing for a document no one has dressed', () => {
      expect(overrideRows(sharedBorderDocument())).toEqual([])
    })
  })
})
