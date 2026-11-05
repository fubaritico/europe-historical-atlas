import { describe, expect, it } from 'vitest'

import { addAnchor } from './documentEdits'
import { AQUITAINE_IDENTITY, ringOf, sharedBorderDocument } from './documentFixtures'
import { isStretchPasteRefusal, pasteStretch } from './pasteStretch'
import { PASTE_WELD_KM } from './pasteWeld'
import { cloneYearDocument } from './yearDocument'

import type { CopiedStretch } from './clipboard'

// s22-copy-paste.md, « # 2 — a stretch onto a polity ». France holds the western square of the fixture, the Empire
// the eastern one, sharing the stretch from anchor 1 [2, 48] to anchor 2 [2, 46].

const EYE = { name: 'reported by eye — Duby (reference)', licence: 'fact' }
const KM = PASTE_WELD_KM

/**
 * A copied stretch through these points.
 * @param coordinates - `[longitude, latitude]` per point
 * @param closed - whether it is a whole outline
 * @returns the stretch
 */
function stretch(coordinates: [number, number][], closed = false): CopiedStretch {
  return {
    kind: 'stretch',
    map: '1100-backup',
    polity: 'Kingdom of Poland',
    closed,
    points: coordinates.map((at) => ({ at, provenance: EYE })),
  }
}

/** France's western edge bent out to 0.5° W: its ends 0.37 km from anchors 0 and 3. */
const WEST_BULGE = stretch([
  [0.005, 48],
  [-0.5, 47],
  [0.005, 46],
])

describe('pasteStretch', () => {
  describe('happy path', () => {
    it('merges a part of an outline into the polity’s, between the anchors its ends hook onto', () => {
      const doc = sharedBorderDocument()
      const done = pasteStretch(doc, WEST_BULGE, 'fr-couronne', KM)

      expect(done).toEqual({ kind: 'merged', points: 3, removed: 0, neighbours: [] })
      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
        [-0.5, 47],
      ])
    })

    it('adds a whole outline to a polity with nothing drawn, as its outline', () => {
      const doc = sharedBorderDocument()
      doc.polities.push({ ...AQUITAINE_IDENTITY, suzerain: null })
      const outline = stretch(
        [
          [10, 40],
          [11, 40],
          [11, 39],
        ],
        true
      )
      const done = pasteStretch(doc, outline, 'aquitaine', KM)

      expect(done).toEqual({ kind: 'ring', points: 3, welded: 0 })
      expect(ringOf(doc, 'aquitaine')).toEqual([
        [10, 40],
        [11, 40],
        [11, 39],
      ])
    })
  })

  describe('variants', () => {
    it('replaces the side of the smaller change, not the side of fewer points', () => {
      // France's south edge carries three more points: from anchor 0 to anchor 2 the north-east side has one point
      // between them, the west-south side four — but the stretch runs along the west and the south.
      const doc = sharedBorderDocument()
      const south = [
        [1.5, 46],
        [1, 46],
        [0.5, 46],
      ].map(([lon, lat]) => addAnchor(doc, [lon ?? 0, lat ?? 0], 0))
      const france = doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings[0]
      france?.splice(3, 0, ...south)
      pasteStretch(
        doc,
        stretch([
          [0.005, 48],
          [-0.2, 46.5],
          [0.5, 45.8],
          [2.005, 46],
        ]),
        'fr-couronne',
        KM
      )

      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
        [0.5, 45.8],
        [-0.2, 46.5],
      ])
    })

    it('replaces the smaller side: a bend along the shared border, the Empire following', () => {
      const doc = sharedBorderDocument()
      const done = pasteStretch(
        doc,
        stretch([
          [2.005, 48],
          [2.3, 47],
          [2.005, 46],
        ]),
        'fr-couronne',
        KM
      )

      expect(done).toMatchObject({ kind: 'merged', neighbours: ['hre'] })
      expect(ringOf(doc, 'hre')).toContainEqual([2.3, 47])
    })

    it('adds a whole outline to a polity already drawn as one more ring, welded where it meets the map', () => {
      const doc = sharedBorderDocument()
      const done = pasteStretch(
        doc,
        stretch(
          [
            [0.005, 48],
            [-1, 48],
            [-1, 47],
          ],
          true
        ),
        'fr-couronne',
        KM
      )

      expect(done).toEqual({ kind: 'ring', points: 3, welded: 1 })
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings).toHaveLength(2)
    })
  })

  describe('managed errors', () => {
    it('refuses a part of an outline onto a polity with nothing drawn, and writes nothing', () => {
      const doc = sharedBorderDocument()
      doc.polities.push({ ...AQUITAINE_IDENTITY, suzerain: null })
      const before = cloneYearDocument(doc)

      expect(pasteStretch(doc, WEST_BULGE, 'aquitaine', KM)).toEqual({ refused: 'no-outline' })
      expect(doc).toEqual(before)
    })

    it('refuses a stretch an end of which lies farther than the weld distance, and says how far', () => {
      const doc = sharedBorderDocument()
      const before = cloneYearDocument(doc)
      const done = pasteStretch(
        doc,
        stretch([
          [-0.5, 48],
          [-0.6, 47],
          [0.005, 46],
        ]),
        'fr-couronne',
        KM
      )

      expect(done).toMatchObject({ refused: 'too-far' })
      expect(isStretchPasteRefusal(done) && done.refused === 'too-far' && done.km).toBeCloseTo(
        37.3,
        0
      )
      expect(doc).toEqual(before)
    })

    it('refuses a stretch whose two ends hook onto the same anchor', () => {
      const doc = sharedBorderDocument()

      expect(
        pasteStretch(
          doc,
          stretch([
            [0.001, 48],
            [-0.5, 48.5],
            [0.002, 48],
          ]),
          'fr-couronne',
          KM
        )
      ).toEqual({ refused: 'same-end' })
    })

    it('refuses where ⟨retracer⟩ would, a border dressed by hand over the stretch, and writes nothing', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ run: [0, 1], hand: 'dotted', source: null, note: null })
      const before = cloneYearDocument(doc)
      // Hooked onto anchors 1 and 3, the smaller side replaces anchor 0, which the dressed run covers.
      const done = pasteStretch(
        doc,
        stretch([
          [2.001, 48],
          [0.5, 47],
          [0.005, 46],
        ]),
        'fr-couronne',
        KM
      )

      expect(done).toEqual({ refused: 'retrace', why: { kind: 'dressed-run' } })
      expect(doc).toEqual(before)
    })

    it('refuses a polity the map does not hold', () => {
      expect(pasteStretch(sharedBorderDocument(), WEST_BULGE, 'nowhere', KM)).toEqual({
        refused: 'no-polity',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('throws on an open stretch of fewer than two points, which the clipboard’s reader refuses', () => {
      const doc = sharedBorderDocument()

      expect(() => pasteStretch(doc, stretch([[0, 48]]), 'fr-couronne', KM)).toThrow(
        /fewer than two points/
      )
    })
  })

  describe('edge cases', () => {
    it('tells a refusal from a paste', () => {
      expect(isStretchPasteRefusal({ refused: 'same-end' })).toBe(true)
      expect(isStretchPasteRefusal({ kind: 'ring', points: 3, welded: 0 })).toBe(false)
    })

    it('merges a stretch of two points, its ends alone, as a straight line between them', () => {
      const doc = sharedBorderDocument()
      const done = pasteStretch(
        doc,
        stretch([
          [0.005, 48],
          [0.005, 46],
        ]),
        'fr-couronne',
        KM
      )

      expect(done).toEqual({ kind: 'merged', points: 2, removed: 0, neighbours: [] })
      expect(ringOf(doc, 'fr-couronne')).toHaveLength(4)
    })
  })
})
