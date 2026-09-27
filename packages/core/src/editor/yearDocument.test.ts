import { describe, expect, it } from 'vitest'

import { assembleAuthoredYear } from '../data/yearConsistency'

import { addAnchor, closeRing, moveAnchor } from './documentEdits'
import {
  createYearDocument,
  openYearDocument,
  referencedAnchors,
  saveYearDocument,
} from './yearDocument'

import type { YearDocument } from './yearDocument'

const zone = { west: -45, south: 20, east: 60, north: 76 }
const source = [{ id: 0, name: 'reported by eye — Duby (reference)', licence: 'fact' }]

/** Two polities sharing a run of anchors along their common limit, which is the case that matters. */
function sharedBorderDocument(): YearDocument {
  const doc = createYearDocument(1100, zone, source)
  for (const point of [
    [0, 48],
    [2, 48],
    [2, 46],
    [0, 46],
    [4, 48],
    [4, 46],
  ] as [number, number][])
    addAnchor(doc, point, 0)

  doc.polities.push(
    {
      id: 'fr-couronne',
      name: 'Reaume de France',
      rank: 'kingdom',
      status: 'country',
      suzerain: null,
      existsFrom: 987,
      existsTo: null,
      colour: null,
      wikidata: null,
    },
    {
      id: 'hre',
      name: 'Sacrum Imperium',
      rank: 'empire',
      status: 'country',
      suzerain: null,
      existsFrom: 962,
      existsTo: null,
      colour: null,
      wikidata: null,
    }
  )
  // France holds the western square; the Empire holds the eastern one. Anchors 1 and 2 are the shared
  // limit — both rings run over them, and moving either moves both.
  closeRing(doc, 'fr-couronne', [0, 1, 2, 3])
  closeRing(doc, 'hre', [1, 4, 5, 2])
  return doc
}

/** Resolve a claim's first ring into coordinates, the way a renderer would. */
function ringOf(doc: YearDocument, polityId: string): [number, number][] {
  const claim = doc.claims.find((existing) => existing.polity === polityId)
  return (claim?.rings[0] ?? []).map((index) => {
    const anchor = doc.anchors[index]
    if (anchor === undefined) throw new Error(`anchor ${String(index)} missing`)
    return [anchor[0], anchor[1]]
  })
}

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
      const france = reopened.claims.find((claim) => claim.polity === 'fr-couronne')?.rings[0] ?? []
      const empire = reopened.claims.find((claim) => claim.polity === 'hre')?.rings[0] ?? []
      const shared = france.filter((index) => empire.includes(index))
      expect(shared).toHaveLength(2)

      const moved = shared[0]
      if (moved === undefined) throw new Error('fixture')
      moveAnchor(reopened, moved, [99, 99])
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
