import { describe, expect, it } from 'vitest'

import { isWeldRefusal, threadAnchor, weldAnchor } from './anchorWeld'
import { sharedBorderDocument } from './documentFixtures'

/** The rings of a polity's claim. */
function ringsOf(doc: ReturnType<typeof sharedBorderDocument>, polity: string): number[][] {
  return doc.claims.find((claim) => claim.polity === polity)?.rings ?? []
}

// France [0, 1, 2, 3] and the Empire [1, 4, 5, 2], sharing anchors 1 and 2.
describe('weldAnchor', () => {
  describe('happy path', () => {
    // H-37: an anchor dropped on a neighbour's is replaced by it — one index, held by both.
    it('replaces the dragged anchor by the neighbour’s in every ring that holds it', () => {
      const doc = sharedBorderDocument()
      expect(weldAnchor(doc, 0, 4)).toEqual({ polities: ['fr-couronne', 'hre'] })
      expect(ringsOf(doc, 'fr-couronne')).toEqual([[4, 1, 2, 3]])
      expect(ringsOf(doc, 'hre')).toEqual([[1, 4, 5, 2]])
    })
  })

  describe('variants', () => {
    it('drops the repeat when the two were neighbours in the ring', () => {
      const doc = sharedBorderDocument()
      doc.claims.push({ polity: 'x', rings: [[0, 3, 5, 4]] })
      weldAnchor(doc, 4, 5)
      expect(ringsOf(doc, 'x')).toEqual([[0, 3, 5]])
      expect(ringsOf(doc, 'hre')).toEqual([[1, 5, 2]])
    })

    it('carries a dressed run and a deliberate gap onto the surviving anchor', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ hand: 'dotted', source: null, note: null, run: [3, 0, 1] })
      doc.deliberateGaps.push({ ring: [0, 3, 5], reason: 'march' })
      weldAnchor(doc, 0, 4)
      expect(doc.runs[0]?.run).toEqual([3, 4, 1])
      expect(doc.deliberateGaps[0]?.ring).toEqual([4, 3, 5])
    })
  })

  describe('managed errors', () => {
    // A ring visiting one point twice crosses itself there.
    it('refuses a weld that would make a ring visit the same anchor twice, writing nothing', () => {
      const doc = sharedBorderDocument()
      const result = weldAnchor(doc, 0, 2)
      expect(result !== null && isWeldRefusal(result) ? result.refused : null).toBe('pinch')
      expect(ringsOf(doc, 'fr-couronne')).toEqual([[0, 1, 2, 3]])
    })

    it('refuses a weld that would leave a ring under three anchors, writing nothing', () => {
      const doc = sharedBorderDocument()
      doc.claims.push({ polity: 'x', rings: [[0, 3, 5]] })
      const result = weldAnchor(doc, 0, 3)
      expect(result !== null && isWeldRefusal(result) ? result.refused : null).toBe('collapse')
      expect(ringsOf(doc, 'x')).toEqual([[0, 3, 5]])
    })
  })

  describe('unmanaged errors', () => {
    it('does nothing for an anchor that is not in the table', () => {
      const doc = sharedBorderDocument()
      expect(weldAnchor(doc, 0, 99)).toBeNull()
      expect(weldAnchor(doc, 99, 0)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('does nothing for an anchor welded onto itself, or held by no ring', () => {
      const doc = sharedBorderDocument()
      doc.anchors.push([9, 9])
      doc.anchorSource.push(0)
      expect(weldAnchor(doc, 0, 0)).toBeNull()
      expect(weldAnchor(doc, 6, 0)).toBeNull()
    })
  })
})

describe('threadAnchor', () => {
  describe('happy path', () => {
    // H-37, onto a stretch: the neighbour gains the point, and the two share it.
    it('puts the anchor on the neighbour’s stretch and threads it into the neighbour’s ring', () => {
      const doc = sharedBorderDocument()
      expect(threadAnchor(doc, 0, 4, 5, [4, 47])).toEqual({ polities: ['fr-couronne', 'hre'] })
      expect(ringsOf(doc, 'hre')).toEqual([[1, 4, 0, 5, 2]])
      expect(ringsOf(doc, 'fr-couronne')).toEqual([[0, 1, 2, 3]])
      expect(doc.anchors[0]).toEqual([4, 47])
    })
  })

  describe('variants', () => {
    it('threads it into a dressed run over the same stretch', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ hand: 'dotted', source: null, note: null, run: [1, 4, 5] })
      threadAnchor(doc, 0, 4, 5, [4, 47])
      expect(doc.runs[0]?.run).toEqual([1, 4, 0, 5])
    })
  })

  describe('managed errors', () => {
    it('does nothing when no ring runs over the stretch, writing nothing', () => {
      const doc = sharedBorderDocument()
      expect(threadAnchor(doc, 0, 4, 2, [3, 47])).toBeNull()
      expect(doc.anchors[0]).toEqual([0, 48])
    })
  })

  describe('unmanaged errors', () => {
    it('does nothing for an anchor that is not in the table', () => {
      expect(threadAnchor(sharedBorderDocument(), 99, 4, 5, [4, 47])).toBeNull()
    })
  })

  describe('edge cases', () => {
    // A ring that already holds the anchor would visit it twice: only the rings lacking it take it.
    it('does nothing for an end of the stretch, nor for a ring already holding the anchor', () => {
      const doc = sharedBorderDocument()
      expect(threadAnchor(doc, 4, 4, 5, [4, 47])).toBeNull()
      expect(threadAnchor(doc, 2, 4, 5, [4, 47])).toBeNull()
    })
  })
})
