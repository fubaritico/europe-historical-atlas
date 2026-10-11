import { describe, expect, it } from 'vitest'

import { insertAnchorOnStretch, removeAnchor } from './anchorEdits'
import { sharedBorderDocument } from './documentFixtures'
import { MIN_RING_ANCHORS } from './yearDocument'

const BY_EYE = { name: 'reported by eye', licence: 'fact' }

/** The ring a polity's claim holds first. */
function ringOf(doc: ReturnType<typeof sharedBorderDocument>, polity: string): number[] {
  return doc.claims.find((claim) => claim.polity === polity)?.rings[0] ?? []
}

describe('anchorEdits', () => {
  describe('happy path', () => {
    // s03 — "a new anchor is created at that point on the stretch".
    it('inserts a new anchor between two neighbours of a ring', () => {
      const doc = sharedBorderDocument()
      const index = insertAnchorOnStretch(doc, 0, 1, [1, 48], BY_EYE)
      expect(ringOf(doc, 'fr-couronne')).toEqual([0, index, 1, 2, 3])
      expect(doc.anchors[index ?? -1]).toEqual([1, 48])
    })

    // s03 — "the anchor is removed and its two stretches merge into one".
    it('removes an anchor from its ring', () => {
      const doc = sharedBorderDocument()
      expect(removeAnchor(doc, 0)).toEqual({ polities: ['fr-couronne'] })
      expect(ringOf(doc, 'fr-couronne')).toEqual([1, 2, 3])
    })
  })

  describe('variants', () => {
    // s03 — "every path running over that stretch gains it, so none of them can drift".
    it('inserts into every ring that runs over a shared stretch', () => {
      const doc = sharedBorderDocument()
      const index = insertAnchorOnStretch(doc, 1, 2, [2, 47], BY_EYE)
      expect(ringOf(doc, 'fr-couronne')).toEqual([0, 1, index, 2, 3])
      expect(ringOf(doc, 'hre')).toEqual([1, 4, 5, 2, index])
    })

    // s03 — a shared anchor "is removed from both", the two outlines on the same remaining anchors.
    it('removes a shared anchor from every ring, and names the polities', () => {
      const doc = sharedBorderDocument()
      insertAnchorOnStretch(doc, 1, 2, [2, 47], BY_EYE)
      const removal = removeAnchor(doc, 6)
      expect(removal?.polities).toEqual(['fr-couronne', 'hre'])
      expect(ringOf(doc, 'fr-couronne')).toEqual([0, 1, 2, 3])
      expect(ringOf(doc, 'hre')).toEqual([1, 4, 5, 2])
    })

    it('inserts on the stretch that closes the ring, from its last anchor to its first', () => {
      const doc = sharedBorderDocument()
      const index = insertAnchorOnStretch(doc, 3, 0, [0, 47], BY_EYE)
      expect(ringOf(doc, 'fr-couronne')).toEqual([0, 1, 2, 3, index])
    })
  })

  describe('managed errors', () => {
    // s03 — "the deletion is refused": a ring left with fewer anchors would vanish on the next open.
    it('refuses to take a ring under three anchors, and writes nothing', () => {
      const doc = sharedBorderDocument()
      removeAnchor(doc, 0)
      expect(ringOf(doc, 'fr-couronne')).toHaveLength(MIN_RING_ANCHORS)
      expect(removeAnchor(doc, 3)).toBeNull()
      expect(ringOf(doc, 'fr-couronne')).toEqual([1, 2, 3])
    })

    it('inserts nothing between two anchors no ring joins', () => {
      const doc = sharedBorderDocument()
      const before = doc.anchors.length
      expect(insertAnchorOnStretch(doc, 0, 2, [1, 47], BY_EYE)).toBeNull()
      expect(doc.anchors).toHaveLength(before)
    })
  })

  describe('unmanaged errors', () => {
    it('removes nothing for an anchor no ring holds', () => {
      expect(removeAnchor(sharedBorderDocument(), 99)).toBeNull()
    })
  })

  describe('edge cases', () => {
    // The table only grows while editing: a removed anchor stays, held by nothing, until the save.
    it('leaves the anchor table as long as it was', () => {
      const doc = sharedBorderDocument()
      const before = doc.anchors.length
      removeAnchor(doc, 0)
      expect(doc.anchors).toHaveLength(before)
    })
  })
})

/** A no-man's-land on the shared side: anchors 1, 2 and a point east of it. */
function withGap(): ReturnType<typeof sharedBorderDocument> {
  const doc = sharedBorderDocument()
  doc.deliberateGaps.push({ ring: [1, 2, 5], reason: 'march' })
  return doc
}

/** A hand-set stroke along a run of anchors. */
function dressed(run: number[]) {
  return { hand: 'dotted', source: null, note: null, run }
}

describe('anchorEdits — the deliberate gaps and the dressed runs', () => {
  describe('happy path', () => {
    it('inserts into a gap ring that runs over the same stretch', () => {
      const doc = withGap()

      const index = insertAnchorOnStretch(doc, 1, 2, [2, 47], BY_EYE)

      expect(doc.deliberateGaps[0]?.ring).toEqual([1, index, 2, 5])
    })

    it('inserts into a dressed run that steps over the stretch', () => {
      const doc = sharedBorderDocument()
      doc.runs.push(dressed([0, 1, 2]))

      const index = insertAnchorOnStretch(doc, 1, 2, [2, 47], BY_EYE)

      expect(doc.runs[0]?.run).toEqual([0, 1, index, 2])
    })
  })

  describe('variants', () => {
    it('takes a removed anchor out of a dressed run that keeps two', () => {
      const doc = sharedBorderDocument()
      doc.runs.push(dressed([0, 1, 2]))

      removeAnchor(doc, 1)

      expect(doc.runs[0]?.run).toEqual([0, 2])
    })
  })

  describe('managed errors', () => {
    it('refuses a removal that would leave a gap ring of two', () => {
      const doc = withGap()

      expect(removeAnchor(doc, 1)).toBeNull()
      expect(doc.deliberateGaps[0]?.ring).toEqual([1, 2, 5])
      expect(ringOf(doc, 'fr-couronne')).toEqual([0, 1, 2, 3])
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — both functions refuse before writing; nothing is thrown.
    it('does not insert into a run whose two anchors are not consecutive in it', () => {
      const doc = sharedBorderDocument()
      doc.runs.push(dressed([1, 0, 2]))

      insertAnchorOnStretch(doc, 1, 2, [2, 47], BY_EYE)

      expect(doc.runs[0]?.run).toEqual([1, 0, 2])
    })
  })

  describe('edge cases', () => {
    // s13 — a hand-set stroke is a decision; the file refuses a run under two anchors.
    it('keeps a dressed run of two as it was when one of its anchors is removed', () => {
      const doc = sharedBorderDocument()
      doc.runs.push(dressed([0, 1]))

      removeAnchor(doc, 1)

      expect(doc.runs[0]?.run).toEqual([0, 1])
    })
  })
})
