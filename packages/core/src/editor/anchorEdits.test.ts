import { describe, expect, it } from 'vitest'

import { insertAnchorOnStretch, removeAnchor, removeAnchors } from './anchorEdits'
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
      expect(removeAnchor(doc, 0)).toEqual({ polities: ['fr-couronne'], rings: 0, spared: [] })
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
    // The dev, 2026-10-14: nothing refuses a deletion. With no owner named, a ring that would fall
    // under three anchors — it would vanish on the next open — keeps its points, and says whose.
    it('keeps the points of a ring that would fall under three anchors, and does nothing', () => {
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
    it('keeps the points of a gap ring that would fall to two, and removes the rest', () => {
      const doc = withGap()

      expect(removeAnchor(doc, 1)).not.toBeNull()
      expect(doc.deliberateGaps[0]?.ring).toEqual([1, 2, 5])
      expect(ringOf(doc, 'fr-couronne')).toEqual([0, 2, 3])
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

/**
 * The shared border, France given two more anchors on its own stretches — six in its ring.
 * @returns the document and the two new anchors
 */
function sixAnchorFrance() {
  const doc = sharedBorderDocument()
  const top = insertAnchorOnStretch(doc, 0, 1, [1, 48], { name: 'test', licence: 'CC0' })
  const bottom = insertAnchorOnStretch(doc, 2, 3, [1, 46], { name: 'test', licence: 'CC0' })
  if (top === null || bottom === null) throw new Error('fixture changed')
  return { doc, top, bottom }
}

describe('removeAnchors', () => {
  describe('happy path', () => {
    // s03 — "delete several at once … all twelve are removed in one undo step".
    it('removes several anchors from the rings holding them, at once', () => {
      const { doc, top, bottom } = sixAnchorFrance()
      expect(removeAnchors(doc, [top, bottom])?.polities).toEqual(['fr-couronne'])
      expect(ringOf(doc, 'fr-couronne')).toEqual([0, 1, 2, 3])
    })
  })

  describe('variants', () => {
    it('names every polity that held one of them — a shared anchor and its neighbour’s', () => {
      const { doc, top } = sixAnchorFrance()
      expect(removeAnchors(doc, [top, 1])?.polities.sort()).toEqual(['fr-couronne', 'hre'])
    })
  })

  describe('managed errors', () => {
    // The dev, 2026-10-14: an owner's ring that would fall under three goes whole, as if all were taken.
    it('deletes the owner’s ring whole when the removal would leave it under three anchors', () => {
      const doc = sharedBorderDocument()
      expect(removeAnchors(doc, [0, 3], 'fr-couronne')).toEqual({
        polities: ['fr-couronne'],
        rings: 1,
        spared: [],
      })
      expect(doc.claims.map((claim) => claim.polity)).toEqual(['hre'])
      expect(doc.claims[0]?.rings).toEqual([[1, 4, 5, 2]])
    })
  })

  describe('unmanaged errors', () => {
    it('refuses anchors no ring holds', () => {
      expect(removeAnchors(sharedBorderDocument(), [98, 99])).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('refuses an empty selection', () => {
      expect(removeAnchors(sharedBorderDocument(), [])).toBeNull()
    })
  })

  describe('removeAnchors — a whole ring of the owner (the dev, 2026-10-14)', () => {
    // Illustrator's gesture: every point of an outline selected and deleted deletes the outline.
    it('deletes the owner’s ring whole when every one of its anchors goes', () => {
      const doc = sharedBorderDocument()
      const island = [6, 7, 8]
      for (const point of [
        [10, 50],
        [11, 50],
        [10, 51],
      ] as [number, number][]) {
        doc.anchors.push(point)
        doc.anchorSource.push(0)
      }
      doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings.push(island)
      expect(removeAnchors(doc, island, 'fr-couronne')).toEqual({
        polities: ['fr-couronne'],
        rings: 1,
        spared: [],
      })
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings).toEqual([
        [0, 1, 2, 3],
      ])
    })

    it('leaves a polity with no territory, so no claim, when its last ring goes', () => {
      const doc = sharedBorderDocument()
      doc.claims = doc.claims.filter((claim) => claim.polity === 'fr-couronne')
      expect(removeAnchors(doc, [0, 1, 2, 3], 'fr-couronne')).toMatchObject({ rings: 1 })
      expect(doc.claims).toEqual([])
    })

    // Review ARCH-001, 2026-10-14: a ring sharing a border was undeletable — the neighbour lost the shared
    // anchors and fell short. The list goes; the shared points stay with the Empire.
    it('deletes a ring that shares a border, the neighbour keeping every one of its anchors', () => {
      const doc = sharedBorderDocument()
      expect(removeAnchors(doc, [0, 1, 2, 3], 'fr-couronne')).toEqual({
        polities: ['fr-couronne'],
        rings: 1,
        spared: [],
      })
      expect(doc.claims.map((claim) => claim.polity)).toEqual(['hre'])
      expect(doc.claims[0]?.rings).toEqual([[1, 4, 5, 2]])
    })

    it('deletes no ring whole with no owner named: the ring keeps its points', () => {
      const doc = sharedBorderDocument()
      doc.claims = doc.claims.filter((claim) => claim.polity === 'fr-couronne')
      expect(removeAnchors(doc, [0, 1, 2, 3])).toBeNull()
      expect(ringOf(doc, 'fr-couronne')).toEqual([0, 1, 2, 3])
    })

    // Deleting a neighbour's outline unsaid would be the inverse defect.
    it('never deletes another polity’s ring: it keeps the points it would lose, and is named', () => {
      const doc = sharedBorderDocument()
      // The Empire's whole ring selected, France the owner: France, left with two, goes whole; the Empire
      // is not France's to delete, so it keeps every point and is named.
      expect(removeAnchors(doc, [1, 4, 5, 2], 'fr-couronne')).toEqual({
        polities: ['fr-couronne', 'hre'],
        rings: 1,
        spared: ['hre'],
      })
      expect(doc.claims.map((claim) => claim.rings[0])).toEqual([[1, 4, 5, 2]])
    })

    it('removes the other selected anchors from the other rings beside a whole ring', () => {
      const doc = sharedBorderDocument()
      doc.anchors.push([10, 50], [11, 50], [10, 51])
      doc.anchorSource.push(0, 0, 0)
      doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings.push([6, 7, 8])
      expect(removeAnchors(doc, [6, 7, 8, 0], 'fr-couronne')).toEqual({
        polities: ['fr-couronne'],
        rings: 1,
        spared: [],
      })
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings).toEqual([[1, 2, 3]])
    })
  })
})
