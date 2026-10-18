import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { readLineSelection, selectedSegments } from './lineSelection'

// France holds the ring 0 1 2 3, the Empire 1 4 5 2: the segment 1–2 is their shared limit.

describe('readLineSelection', () => {
  describe('happy path', () => {
    it('reads the shared segment between two selected anchors, and the neighbour it is shared with', () => {
      expect(readLineSelection(sharedBorderDocument(), 'fr-couronne', [1, 2])).toEqual({
        segments: [[1, 2]],
        neighbour: 'hre',
        hand: null,
        mixed: false,
      })
    })
  })

  describe('variants', () => {
    it('names no neighbour for a segment against nobody', () => {
      expect(readLineSelection(sharedBorderDocument(), 'fr-couronne', [0, 1]).neighbour).toBeNull()
    })

    it('names no single neighbour when the segments run against several', () => {
      expect(
        readLineSelection(sharedBorderDocument(), 'fr-couronne', [0, 1, 2]).neighbour
      ).toBeNull()
    })

    it('reads the hand the segments carry, or that they differ', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ run: [0, 1], hand: 'dotted', source: null, note: null })
      expect(readLineSelection(doc, 'fr-couronne', [0, 1]).hand).toBe('dotted')
      expect(readLineSelection(doc, 'fr-couronne', [0, 1, 2]).mixed).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('reads nothing with nobody aimed at', () => {
      expect(readLineSelection(sharedBorderDocument(), null, [1, 2]).segments).toEqual([])
    })

    it('reads no segment from a single anchor', () => {
      expect(readLineSelection(sharedBorderDocument(), 'fr-couronne', [1]).segments).toEqual([])
    })
  })

  // L4: N/A — pure; the selection comes from the canvas, the document from the readers.

  describe('edge cases', () => {
    it('reads the ring’s closing segment, last anchor to first', () => {
      expect(selectedSegments(sharedBorderDocument(), 'fr-couronne', [3, 0])).toEqual([[3, 0]])
    })

    it('ignores selected anchors that are not consecutive on the target’s ring', () => {
      expect(selectedSegments(sharedBorderDocument(), 'fr-couronne', [0, 2])).toEqual([])
    })
  })
})
