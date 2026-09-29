import { describe, expect, it } from 'vitest'

import { assembleAuthoredYear } from '../data/yearConsistency'

import { addAnchor, closeRing, moveAnchor } from './documentEdits'
import {
  FIXTURE_SOURCES,
  FIXTURE_ZONE,
  firstSharedAnchor,
  ringOf,
  sharedAnchorsBetween,
  sharedBorderDocument,
} from './documentFixtures'
import {
  cloneYearDocument,
  createYearDocument,
  openYearDocument,
  referencedAnchors,
  saveYearDocument,
} from './yearDocument'

import type { YearDocument } from './yearDocument'

const zone = FIXTURE_ZONE
const source = FIXTURE_SOURCES

/** Save and reopen, which is what the round-trip guarantee is about. */
function roundTrip(doc: YearDocument): YearDocument {
  return openYearDocument(assembleAuthoredYear(saveYearDocument(doc), 'round-trip'))
}

describe('YearDocument', () => {
  describe('happy path', () => {
    it('opens empty', () => {
      const doc = createYearDocument(1100, zone)
      expect(doc.anchors).toEqual([])
      expect(doc.polities).toEqual([])
      expect(doc.year).toBe(1100)
    })

    it('survives a save and a reopen with its shape intact', () => {
      const reopened = roundTrip(sharedBorderDocument())
      expect(reopened.year).toBe(1100)
      expect(reopened.polities).toHaveLength(2)
      expect(reopened.claims).toHaveLength(2)
      expect(reopened.anchors).toHaveLength(6)
    })
  })

  describe('variants', () => {
    it('KEEPS THE SHARING across a round trip — the guarantee the whole format exists for', () => {
      // Written to fail if a save ever resolved rings to coordinates and a load recreated one anchor per
      // ring. The screen would look identical and the sliver would appear three gestures later.
      const reopened = roundTrip(sharedBorderDocument())
      expect(sharedAnchorsBetween(reopened, 'fr-couronne', 'hre')).toHaveLength(2)
      moveAnchor(reopened, firstSharedAnchor(reopened), [99, 99])
      expect(ringOf(reopened, 'fr-couronne')).toContainEqual([99, 99])
      expect(ringOf(reopened, 'hre')).toContainEqual([99, 99])
    })

    it('drops an anchor nothing holds any more, on save and not before', () => {
      const doc = sharedBorderDocument()
      const orphan = addAnchor(doc, [30, 30], 0)
      expect(doc.anchors).toHaveLength(7) // still there while the document is open
      expect(referencedAnchors(doc).has(orphan)).toBe(false)
      expect(saveYearDocument(doc).polities.anchors).toHaveLength(6)
    })

    it('keeps an anchor a dressed run holds, even when no ring does', () => {
      // A hand-set stroke is a decision; dropping the points under it would undo it silently.
      const doc = sharedBorderDocument()
      const a = addAnchor(doc, [30, 30], 0)
      const b = addAnchor(doc, [31, 31], 0)
      doc.runs.push({ run: [a, b], hand: 'bold', source: null, note: null })
      expect(saveYearDocument(doc).polities.anchors).toHaveLength(8)
    })

    it('keeps an anchor only a declared gap holds', () => {
      const doc = sharedBorderDocument()
      const a = addAnchor(doc, [30, 30], 0)
      const b = addAnchor(doc, [31, 31], 0)
      const c = addAnchor(doc, [32, 30], 0)
      doc.deliberateGaps.push({ ring: [a, b, c], reason: 'marches' })
      expect(saveYearDocument(doc).polities.anchors).toHaveLength(9)
    })

    it('keeps the anchors in their original order, so a saved year diffs readably', () => {
      const doc = sharedBorderDocument()
      expect(saveYearDocument(doc).polities.anchors.slice(0, 3)).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
      ])
    })

    it('renumbers every reference through the same mapping', () => {
      const doc = createYearDocument(1100, zone, source)
      const orphan = addAnchor(doc, [9, 9], 0)
      const a = addAnchor(doc, [0, 0], 0)
      const b = addAnchor(doc, [1, 0], 0)
      const c = addAnchor(doc, [1, 1], 0)
      doc.polities.push({
        id: 'x',
        name: 'X',
        rank: null,
        status: null,
        suzerain: null,
        existsFrom: null,
        existsTo: null,
        colour: null,
        wikidata: null,
      })
      closeRing(doc, 'x', [a, b, c])
      expect(orphan).toBe(0) // the orphan sits *before* the live ones, so everything shifts
      const saved = saveYearDocument(doc)
      expect(saved.polities.anchors).toHaveLength(3)
      expect(saved.polities.claims[0]?.rings[0]).toEqual([0, 1, 2])
    })

    it('copies rather than aliases what it opened', () => {
      const original = sharedBorderDocument()
      const files = saveYearDocument(original)
      const doc = openYearDocument(assembleAuthoredYear(files, 'copy'))
      moveAnchor(doc, 0, [77, 77])
      expect(files.polities.anchors[0]).toEqual([0, 48])
    })
  })

  describe('managed errors', () => {
    it('drops a ring that falls below three indices after renumbering', () => {
      // Two of its three anchors are shared with nothing and referenced by nothing else, so they go —
      // and a two-point ring encloses no area, which the schema would refuse anyway.
      const doc = createYearDocument(1100, zone, source)
      const a = addAnchor(doc, [0, 0], 0)
      doc.polities.push({
        id: 'x',
        name: 'X',
        rank: null,
        status: null,
        suzerain: null,
        existsFrom: null,
        existsTo: null,
        colour: null,
        wikidata: null,
      })
      doc.claims.push({ polity: 'x', rings: [[a, 98, 99]] })
      expect(saveYearDocument(doc).polities.claims[0]?.rings).toEqual([])
    })

    it('drops a dressed run that falls below two indices', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ run: [0, 500], hand: 'bold', source: null, note: null })
      expect(saveYearDocument(doc).borders.runs).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // L4: pure, no async, no collaborator. What follows is the malformed-state class — a document whose
    // parallel arrays have come apart, which no operation here can produce but a caller could.

    it('gives an anchor with no declared provenance source zero rather than undefined', () => {
      const doc = sharedBorderDocument()
      doc.anchorSource = [0, 0, 0] // shorter than the anchors, which no operation does
      expect(saveYearDocument(doc).polities.anchorSource).toEqual([0, 0, 0, 0, 0, 0])
    })
  })

  describe('edge cases', () => {
    it('saves an empty document into three readable files', () => {
      const files = saveYearDocument(createYearDocument(1100, zone, source))
      expect(files.polities.anchors).toEqual([])
      expect(files.registry.polities).toEqual([])
      expect(() => assembleAuthoredYear(files, 'empty')).not.toThrow()
    })

    it('survives two round trips unchanged', () => {
      const once = saveYearDocument(sharedBorderDocument())
      const twice = saveYearDocument(openYearDocument(assembleAuthoredYear(once, 'a')))
      expect(twice).toEqual(once)
    })

    it('produces files the readers accept, which is the only definition of saved', () => {
      const files = saveYearDocument(sharedBorderDocument())
      expect(() => assembleAuthoredYear(files, 'years/1100')).not.toThrow()
    })
  })
})

describe('cloneYearDocument', () => {
  describe('happy path', () => {
    it('copies every value across', () => {
      const doc = sharedBorderDocument()
      expect(cloneYearDocument(doc)).toEqual(doc)
    })
  })

  describe('variants', () => {
    it('SHARES NO FIELD with the document it copied — the forgotten-field guard', () => {
      // A field added to YearDocument and forgotten in the clone would be *aliased* between snapshots,
      // so two of them would quietly edit each other with nothing to see on screen. This walks the keys
      // so the guard does not have to be remembered.
      const doc = sharedBorderDocument()
      const copy = cloneYearDocument(doc)
      for (const key of Object.keys(doc) as (keyof YearDocument)[]) {
        const original = doc[key]
        if (typeof original !== 'object') continue
        expect(copy[key], `the field "${key}" is aliased rather than copied`).not.toBe(original)
      }
    })

    it('copies the nested lists too, not just the arrays holding them', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ run: [0, 1], hand: 'bold', source: null, note: null })
      doc.pairs.push({
        between: ['fr-couronne', 'hre'],
        type: 'agreed',
        hand: null,
        source: null,
        note: null,
      })
      doc.deliberateGaps.push({ ring: [0, 1, 2], reason: 'marches' })
      const copy = cloneYearDocument(doc)
      expect(copy.anchors[0]).not.toBe(doc.anchors[0])
      expect(copy.claims[0]).not.toBe(doc.claims[0])
      expect(copy.claims[0]?.rings[0]).not.toBe(doc.claims[0]?.rings[0])
      expect(copy.deliberateGaps[0]?.ring).not.toBe(doc.deliberateGaps[0]?.ring)
      expect(copy.pairs[0]?.between).not.toBe(doc.pairs[0]?.between)
      expect(copy.runs[0]?.run).not.toBe(doc.runs[0]?.run)
    })

    it('KEEPS THE SHARING, because an anchor held twice is one integer and not one object', () => {
      const copy = cloneYearDocument(sharedBorderDocument())
      expect(sharedAnchorsBetween(copy, 'fr-couronne', 'hre')).toHaveLength(2)
      moveAnchor(copy, firstSharedAnchor(copy), [99, 99])
      expect(ringOf(copy, 'fr-couronne')).toContainEqual([99, 99])
      expect(ringOf(copy, 'hre')).toContainEqual([99, 99])
    })

    it('leaves the original alone when the copy is edited', () => {
      const doc = sharedBorderDocument()
      const copy = cloneYearDocument(doc)
      moveAnchor(copy, 0, [77, 77])
      copy.polities.push({
        id: 'later',
        name: 'Later',
        rank: null,
        status: null,
        suzerain: null,
        existsFrom: null,
        existsTo: null,
        colour: null,
        wikidata: null,
      })
      expect(ringOf(doc, 'fr-couronne')).not.toContainEqual([77, 77])
      expect(doc.polities).toHaveLength(2)
    })
  })

  describe('managed errors', () => {
    // L3: N/A — a copy of a well-typed document has nothing to refuse. The malformed-state class is below.
    it('copies a document whose parallel arrays have come apart, without inventing values', () => {
      const doc = sharedBorderDocument()
      doc.anchorSource = [0, 0, 0]
      expect(cloneYearDocument(doc).anchorSource).toEqual([0, 0, 0])
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — pure, synchronous, no collaborator to fail.
    it('copies a ring holding an index the anchor table does not, rather than silently pruning it', () => {
      // Pruning here would be a repair nobody asked for; saving is where a dangling index is dropped.
      const doc = sharedBorderDocument()
      doc.claims.push({ polity: 'nowhere', rings: [[0, 1, 500]] })
      expect(cloneYearDocument(doc).claims.at(-1)?.rings[0]).toEqual([0, 1, 500])
    })
  })

  describe('edge cases', () => {
    it('copies an empty document', () => {
      const empty = createYearDocument(1100, zone, source)
      const copy = cloneYearDocument(empty)
      expect(copy).toEqual(empty)
      expect(copy.anchors).not.toBe(empty.anchors)
    })

    it('survives being copied twice with no drift', () => {
      const doc = sharedBorderDocument()
      expect(cloneYearDocument(cloneYearDocument(doc))).toEqual(doc)
    })
  })
})
