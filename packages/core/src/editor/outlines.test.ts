import { describe, expect, it } from 'vitest'

import { yearClaimSchema } from '../data/yearFormat'

import { insertAnchorOnStretch, removeAnchors } from './anchorEdits'
import { weldAnchor } from './anchorWeld'
import { collectBorderEdges } from './borderGraph'
import { replaceOutline } from './documentEdits'
import { documentFaults } from './documentFaults'
import { ringOf, sharedBorderDocument } from './documentFixtures'
import {
  everyOutline,
  isOpenRing,
  isRingOpen,
  keepRings,
  outlineFloor,
  segmentCount,
  setRingOpen,
} from './outlines'
import { PASTE_WELD_KM, weldPastedRings } from './pasteWeld'
import { checkRetrace, retraceArcs, retraceStretch } from './retrace'
import { cloneYearDocument, saveYearDocument } from './yearDocument'

import type { YearClaim } from '../data/yearFormat'

// open-outlines.md — the dev, 2026-11-05: "an outline must be allowed not to be closed". France's square of the fixture
// runs 0 [0, 48] → 1 [2, 48] → 2 [2, 46] → 3 [0, 46]; left open, its two ends are anchors 0 and 3 and the west edge
// between them is no segment. The Empire holds 1 → 4 → 5 → 2, sharing 1–2 with France.

const EYE = { name: 'reported by eye — Duby (reference)', licence: 'fact' }

/**
 * The fixture with France's outline left open.
 * @returns the map
 */
function franceOpen(): ReturnType<typeof sharedBorderDocument> {
  const doc = sharedBorderDocument()
  const france = doc.claims.find((claim) => claim.polity === 'fr-couronne')
  if (france !== undefined) france.open = [0]
  return doc
}

/**
 * France's claim in a map.
 * @param doc - the map
 * @returns the claim
 */
function france(doc: ReturnType<typeof sharedBorderDocument>): YearClaim | undefined {
  return doc.claims.find((claim) => claim.polity === 'fr-couronne')
}

describe('open outlines', () => {
  describe('happy path', () => {
    it('reads a ring as open only when its claim names it', () => {
      expect(isRingOpen({ open: [1] }, 1)).toBe(true)
      expect(isRingOpen({ open: [1] }, 0)).toBe(false)
      expect(isRingOpen({}, 0)).toBe(false)
    })

    it('derives no border along the line between an open outline’s two ends', () => {
      const closed = collectBorderEdges(sharedBorderDocument())
      const open = collectBorderEdges(franceOpen())

      expect(closed.has('0:3')).toBe(true)
      expect(open.has('0:3')).toBe(false)
      expect(open.has('0:1')).toBe(true)
    })

    it('saves an open outline with its position, and a map with none without the key', () => {
      const saved = saveYearDocument(franceOpen()).polities.claims
      const plain = saveYearDocument(sharedBorderDocument()).polities.claims

      expect(saved.find((claim) => claim.polity === 'fr-couronne')?.open).toEqual([0])
      expect(plain.every((claim) => !('open' in claim))).toBe(true)
    })
  })

  describe('variants', () => {
    it('keeps the open positions sorted, and drops the key with the last', () => {
      const claim: YearClaim = {
        polity: 'x',
        rings: [
          [0, 1],
          [2, 3],
          [4, 5],
        ],
      }
      setRingOpen(claim, 2, true)
      setRingOpen(claim, 0, true)

      expect(claim.open).toEqual([0, 2])
      setRingOpen(claim, 0, false)
      setRingOpen(claim, 2, false)
      expect('open' in claim).toBe(false)
    })

    it('renumbers the open positions with the rings kept', () => {
      const claim: YearClaim = {
        polity: 'x',
        rings: [
          [0, 1, 2],
          [3, 4],
          [5, 6],
        ],
        open: [1, 2],
      }
      keepRings(claim, (_ring, at) => at !== 1)

      expect(claim).toEqual({
        polity: 'x',
        rings: [
          [0, 1, 2],
          [5, 6],
        ],
        open: [1],
      })
    })

    it('counts every segment of a closed ring, and all but the closing one of an open outline', () => {
      expect(segmentCount([0, 1, 2, 3], false)).toBe(4)
      expect(segmentCount([0, 1, 2, 3], true)).toBe(3)
      expect(segmentCount([0], true)).toBe(0)
      expect(outlineFloor(true)).toBe(2)
      expect(outlineFloor(false)).toBe(3)
    })

    it('tells an open ring by identity, and a declared gap’s as closed', () => {
      const doc = franceOpen()
      const ring = france(doc)?.rings[0] ?? []
      doc.deliberateGaps.push({ ring: [0, 1, 2], reason: 'march' })

      expect(isOpenRing(doc.claims, ring)).toBe(true)
      expect(isOpenRing(doc.claims, doc.deliberateGaps[0]?.ring ?? [])).toBe(false)
      expect(everyOutline(doc.claims).map((each) => each.open)).toEqual([true, false])
    })

    it('inserts no point on the line between an open outline’s ends', () => {
      expect(insertAnchorOnStretch(franceOpen(), 3, 0, [0, 47], EYE)).toBeNull()
      expect(insertAnchorOnStretch(sharedBorderDocument(), 3, 0, [0, 47], EYE)).toBe(6)
    })

    it('keeps an open outline of two points where a closed ring of two would go whole', () => {
      const open = franceOpen()
      const closed = sharedBorderDocument()
      removeAnchors(open, [0, 1], 'fr-couronne')
      removeAnchors(closed, [0, 1], 'fr-couronne')

      expect(ringOf(open, 'fr-couronne')).toEqual([
        [2, 46],
        [0, 46],
      ])
      expect(france(closed)).toBeUndefined()
    })

    it('offers one way between two anchors of an open outline, never across its ends', () => {
      expect(retraceArcs(franceOpen(), 'fr-couronne', 0, 3)?.only).toBe('forward')
      expect(retraceArcs(franceOpen(), 'fr-couronne', 3, 0)?.only).toBe('backward')
      expect(checkRetrace(franceOpen(), 'fr-couronne', 0, 3, [])).toEqual({ kind: 'not-an-arc' })
    })

    it('retraces an open outline in place, its two ends kept as its ends', () => {
      const doc = franceOpen()
      retraceStretch(doc, 'fr-couronne', 1, 2, [], [{ at: [2.5, 47], provenance: EYE }])

      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [2, 48],
        [2.5, 47],
        [2, 46],
        [0, 46],
      ])
      expect(ringOf(doc, 'hre')).toContainEqual([2.5, 47])
    })

    it('copies the open positions with the map, sharing nothing', () => {
      const doc = franceOpen()
      const copy = cloneYearDocument(doc)
      copy.claims[0]?.open?.push(5)

      expect(france(doc)?.open).toEqual([0])
    })
  })

  describe('managed errors', () => {
    it('reads an open outline of two indices, and refuses a closed ring of two', () => {
      expect(yearClaimSchema.safeParse({ polity: 'x', rings: [[0, 1]], open: [0] }).success).toBe(
        true
      )
      expect(yearClaimSchema.safeParse({ polity: 'x', rings: [[0, 1]] }).success).toBe(false)
    })

    it('refuses open positions naming no ring, unsorted, or empty', () => {
      const ring = [0, 1, 2]
      expect(yearClaimSchema.safeParse({ polity: 'x', rings: [ring], open: [1] }).success).toBe(
        false
      )
      expect(
        yearClaimSchema.safeParse({ polity: 'x', rings: [ring, ring], open: [1, 0] }).success
      ).toBe(false)
      expect(yearClaimSchema.safeParse({ polity: 'x', rings: [ring], open: [] }).success).toBe(
        false
      )
    })

    it('says an open position naming no ring as a fault of the map', () => {
      const doc = franceOpen()
      const claim = france(doc)
      if (claim !== undefined) claim.open = [3]

      expect(documentFaults(doc)).toEqual([
        'the open outlines of "fr-couronne" name 3, against 1 rings, or a ring is under its floor',
      ])
    })
  })
})

describe('open outlines — the edits that write them', () => {
  // Review QUAL-001, 2026-11-05: an end welded onto the other closes the outline, as Illustrator joins two ends.
  it('closes an open outline whose end is welded onto its other end, losing no segment', () => {
    const doc = franceOpen()
    const done = weldAnchor(doc, 3, 0)

    expect(done).toEqual({ polities: ['fr-couronne'] })
    expect(france(doc)?.rings[0]).toEqual([0, 1, 2])
    expect(france(doc)?.open).toBeUndefined()
  })

  it('puts a resumed outline back in its place, open or now closed', () => {
    const doc = franceOpen()
    const points = [0, 1, 2, 3].map((anchor) => ({
      at: doc.anchors[anchor] ?? [0, 0],
      provenance: EYE,
      anchor,
    }))

    expect(replaceOutline(doc, 'fr-couronne', 0, [0, 1, 2, 3], points, false)).toBe(true)
    expect(france(doc)).toEqual({ polity: 'fr-couronne', rings: [[0, 1, 2, 3]] })
  })

  it('refuses to put back an outline that changed since it was taken up, writing nothing', () => {
    const doc = franceOpen()
    const before = cloneYearDocument(doc)
    const points = [{ at: [9, 9] as [number, number], provenance: EYE }]

    expect(replaceOutline(doc, 'fr-couronne', 0, [0, 1, 2], [...points, ...points], true)).toBe(
      false
    )
    expect(doc).toEqual(before)
  })

  it('refuses an outline under its floor, or naming an anchor the map lacks, writing nothing', () => {
    const doc = franceOpen()
    const before = cloneYearDocument(doc)
    const one = [{ at: [9, 9] as [number, number], provenance: EYE }]
    const bad = [
      { at: [9, 9] as [number, number], provenance: EYE },
      { at: [9, 8] as [number, number], provenance: EYE, anchor: 99 },
    ]

    expect(replaceOutline(doc, 'fr-couronne', 0, [0, 1, 2, 3], one, true)).toBe(false)
    expect(replaceOutline(doc, 'fr-couronne', 0, [0, 1, 2, 3], [...bad, ...one], false)).toBe(false)
    expect(replaceOutline(doc, 'nobody', 0, [0, 1, 2, 3], [...one, ...one], true)).toBe(false)
    expect(doc).toEqual(before)
  })

  // Review QUAL-002, 2026-11-05: an open piece welded keeps its ends apart — nothing followed or dropped between them.
  it('welds an open piece of two points onto the map without joining its ends', () => {
    const doc = sharedBorderDocument()
    const [line] = weldPastedRings(
      doc,
      [
        [
          { at: [0.001, 48], provenance: EYE },
          { at: [2.001, 46], provenance: EYE },
        ],
      ],
      PASTE_WELD_KM,
      [true]
    )

    // Between its two welded points it follows France's outline (0 → 1 → 2); closed, it would also follow it back from
    // anchor 2 to anchor 0 through 3. Open, its two ends stay apart.
    expect(line?.points.map((point) => point.anchor)).toEqual([0, 1, 2])
  })
})
