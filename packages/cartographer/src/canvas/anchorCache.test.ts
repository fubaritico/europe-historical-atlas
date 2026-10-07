import { describe, expect, it } from 'vitest'

import { moveAnchor } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { projectToBackdrop } from '../view/projection'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'

import { createAnchorCache } from './anchorCache'

describe('anchorCache', () => {
  describe('happy path', () => {
    it('projects the table into backdrop pixels', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)

      expect(cache.anchorsInBackdrop(document, 0)).toEqual(
        projectToBackdrop(document.anchors, TEST_BACKDROP_FRAME)
      )
    })

    it('hands back the SAME array at the same version — the whole point', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)

      const first = cache.anchorsInBackdrop(document, 7)
      const second = cache.anchorsInBackdrop(document, 7)

      // Reference identity is the contract: it is how "nothing was recomputed" becomes observable
      // rather than a claim in a comment. A pan writes the viewport sixty times a second, and none of
      // those must re-run a `log(tan(…))` per anchor.
      expect(second).toBe(first)
    })

    it('recomputes when the version moves, because an anchor may have', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)
      const before = cache.anchorsInBackdrop(document, 0)

      moveAnchor(document, 0, [10, 50])
      const after = cache.anchorsInBackdrop(document, 1)

      expect(after).not.toBe(before)
      expect(after[0]).not.toEqual(before[0])
    })
  })

  describe('variants', () => {
    it('holds whatever the last version asked for, not a history of them', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)

      const atZero = cache.anchorsInBackdrop(document, 0)
      cache.anchorsInBackdrop(document, 1)
      const backToZero = cache.anchorsInBackdrop(document, 0)

      // Going back to a version it has seen is still a miss: the cache remembers one table, which is
      // all a canvas ever draws. Caching more would mean holding a copy per undo step.
      expect(backToZero).not.toBe(atZero)
      expect(backToZero).toEqual(atZero)
    })

    it('answers for a document with no anchors', () => {
      const document = sharedBorderDocument()
      document.anchors = []
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)

      expect(cache.anchorsInBackdrop(document, 0)).toEqual([])
    })

    it('keeps one table per cache, so two canvases cannot share a stale one', () => {
      const document = sharedBorderDocument()
      const one = createAnchorCache(TEST_BACKDROP_FRAME)
      const two = createAnchorCache(TEST_BACKDROP_FRAME)

      expect(two.anchorsInBackdrop(document, 0)).not.toBe(one.anchorsInBackdrop(document, 0))
    })
  })

  describe('managed errors', () => {
    it('misses on its very first call even at version zero', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)

      // Guarded by starting from `null` rather than an empty array: an empty document at version 0 must
      // not read as "already computed".
      expect(cache.anchorsInBackdrop(document, 0)).toHaveLength(document.anchors.length)
    })

    it('does not notice an anchor moved without the version moving, and that is the contract', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)
      const before = cache.anchorsInBackdrop(document, 3)

      moveAnchor(document, 0, [10, 50])

      // Stale on purpose. The counter is bumped by every action of the edition slice, so a move that
      // did not bump it did not go through the store — which is the fault, not this.
      expect(cache.anchorsInBackdrop(document, 3)).toBe(before)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. Below is the hostile version number.
    it('treats a version that is not a number as a miss every time', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)

      const first = cache.anchorsInBackdrop(document, Number.NaN)
      const second = cache.anchorsInBackdrop(document, Number.NaN)

      // `NaN !== NaN`, so every call misses — a cache that never hits rather than one that goes stale,
      // which is the right way round for a value nobody should be passing.
      expect(second).not.toBe(first)
    })
  })

  describe('edge cases', () => {
    it('projects through Mercator, not by proportion', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)
      const bounds = TEST_BACKDROP_FRAME.bounds

      const projected = cache.anchorsInBackdrop(document, 0)
      const first = document.anchors[0]
      if (first === undefined) throw new Error('fixture: the document has no anchors')
      const byProportion =
        ((bounds.north - first[1]) / (bounds.north - bounds.south)) *
        TEST_BACKDROP_FRAME.size.height

      expect(projected[0]?.[1]).not.toBeCloseTo(byProportion, 0)
    })

    it('keeps the table parallel to the document’s, so an index means the same thing', () => {
      const document = sharedBorderDocument()
      const cache = createAnchorCache(TEST_BACKDROP_FRAME)

      expect(cache.anchorsInBackdrop(document, 0)).toHaveLength(document.anchors.length)
    })
  })
})
