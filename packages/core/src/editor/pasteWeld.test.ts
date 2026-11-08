import { describe, expect, it } from 'vitest'

import { createYearDocument } from '../data/yearDocument'

import { addAnchor, closeRing } from './documentEdits'
import { AQUITAINE_IDENTITY, sharedBorderDocument } from './documentFixtures'
import { PASTE_WELD_KM, weldPastedRings } from './pasteWeld'

import type { ClipboardPoint } from './clipboard'
import type { WeldedRing } from './pasteWeld'
import type { YearDocument } from '../data/yearDocument'

// s22-copy-paste.md, « paste a polity onto free ground »: « where its edge comes within the weld distance of a
// neighbour's or of the coast, it takes their points ». At 48° north, 0.01° of longitude is about 0.75 km.

const EYE = { name: 'reported by eye — Duby (reference)', licence: 'fact' }
const KM = PASTE_WELD_KM

/**
 * Pasted points at these coordinates, every one reported by eye.
 * @param coordinates - `[longitude, latitude]` per point
 * @returns the pasted ring
 */
function pasted(coordinates: [number, number][]): ClipboardPoint[] {
  return coordinates.map((at) => ({ at, provenance: EYE }))
}

/**
 * Weld one pasted ring, as a polity of one ring is.
 * @param doc - the map
 * @param ring - the pasted points
 * @param km - the weld distance
 * @returns the welded ring
 */
function weldOne(doc: YearDocument, ring: ClipboardPoint[], km: number): WeldedRing {
  const [welded] = weldPastedRings(doc, [ring], km)
  if (welded === undefined) throw new Error('no ring welded')
  return welded
}

/**
 * The fixture map, its Empire's eastern edge bent through a point at `[4.5, 47]` between its anchors 4 and 5.
 * @returns the map and that point's anchor
 */
function bentEmpire(): { doc: YearDocument; bend: number } {
  const doc = sharedBorderDocument()
  const bend = addAnchor(doc, [4.5, 47], 0)
  const empire = doc.claims.find((claim) => claim.polity === 'hre')
  empire?.rings[0]?.splice(2, 0, bend)
  return { doc, bend }
}

/**
 * The anchors of a polity's first ring.
 * @param doc - the map
 * @param polity - its id
 * @returns the ring
 */
function ringOfPolity(doc: YearDocument, polity: string): number[] {
  return doc.claims.find((claim) => claim.polity === polity)?.rings[0] ?? []
}

describe('weldPastedRings', () => {
  describe('happy path', () => {
    it('welds two pasted points onto the neighbour’s points they lie near, the others kept as copied', () => {
      const doc = sharedBorderDocument()
      const ring = pasted([
        [4.01, 48],
        [6, 48],
        [6, 46],
        [4.01, 46],
      ])
      const welded = weldOne(doc, ring, KM)

      expect(welded.welded).toBe(2)
      expect(welded.points.map((point) => point.anchor ?? null)).toEqual([4, null, null, 5])
    })

    it('follows the neighbour’s points between two pasted points welded onto its outline', () => {
      const { doc, bend } = bentEmpire()
      const welded = weldOne(
        doc,
        pasted([
          [4.01, 48],
          [6, 48],
          [6, 46],
          [4.01, 46],
        ]),
        KM
      )

      expect(welded.points.map((point) => point.anchor ?? null)).toEqual([4, null, null, 5, bend])
      expect(welded.welded).toBe(2)
    })
  })

  describe('variants', () => {
    it('puts a pasted point near a stretch of the neighbour on it, and the neighbour gains it', () => {
      const doc = sharedBorderDocument()
      const welded = weldOne(
        doc,
        pasted([
          [4.01, 47.6],
          [6, 47.6],
          [6, 46.4],
          [4.01, 46.4],
        ]),
        KM
      )
      const first = welded.points[0]?.anchor
      const last = welded.points[3]?.anchor

      expect(welded.welded).toBe(2)
      expect(doc.anchors[first ?? -1]).toEqual([4, 47.6])
      expect(ringOfPolity(doc, 'hre')).toEqual([1, 4, first, last, 5, 2])
    })

    it('records a point put on a stretch under the neighbour’s source', () => {
      const doc = sharedBorderDocument()
      const welded = weldOne(
        doc,
        pasted([
          [4.01, 47.6],
          [6, 47.6],
          [6, 46.4],
        ]),
        KM
      )

      expect(welded.points[0]?.provenance).toEqual(EYE)
      expect(doc.anchorSource[welded.points[0]?.anchor ?? -1]).toBe(0)
    })

    it('gives a pasted point the point an earlier one was put on, when they lie within reach', () => {
      // 0.6 km apart, both 0.75 km from the Empire's eastern stretch and far from its points.
      const doc = sharedBorderDocument()
      const welded = weldOne(
        doc,
        pasted([
          [4.01, 47.6],
          [4.01, 47.595],
          [6, 47.595],
          [6, 47.6],
        ]),
        KM
      )
      const placed = welded.points[0]?.anchor

      expect(welded.welded).toBe(2)
      expect(ringOfPolity(doc, 'hre')).toEqual([1, 4, placed, 5, 2])
    })

    it('welds a second ring onto a stretch the first ring’s weld split', () => {
      const doc = sharedBorderDocument()
      const [first, second] = weldPastedRings(
        doc,
        [
          pasted([
            [4.01, 47.6],
            [6, 47.6],
            [6, 47.7],
          ]),
          pasted([
            [4.01, 46.4],
            [5.5, 46.4],
            [5.5, 46.3],
          ]),
        ],
        KM
      )

      expect(ringOfPolity(doc, 'hre')).toEqual([
        1,
        4,
        first?.points[0]?.anchor,
        second?.points[0]?.anchor,
        5,
        2,
      ])
    })

    it('takes the nearest of three points within reach, listed between the two others', () => {
      // 1.1 km, 0.4 km and 0.7 km from the pasted point: neither the first nor the last within reach is the nearest.
      const doc = createYearDocument(1100, [{ id: 0, ...EYE }])
      for (const point of [
        [4.02, 48],
        [4, 48],
        [4.015, 48],
        [4, 47],
      ] as [number, number][])
        addAnchor(doc, point, 0)
      doc.polities.push({ ...AQUITAINE_IDENTITY, suzerain: null })
      closeRing(doc, 'aquitaine', [0, 1, 2, 3])
      const welded = weldOne(
        doc,
        pasted([
          [4.005, 48],
          [6, 48],
          [6, 46],
        ]),
        KM
      )

      expect(welded.points[0]?.anchor).toBe(1)
    })

    it('welds nothing in a map started empty', () => {
      const doc = createYearDocument(1200)
      const ring = pasted([
        [4.01, 48],
        [6, 48],
        [6, 46],
      ])

      expect(weldOne(doc, ring, KM)).toEqual({
        points: ring.map((point) => ({ at: point.at, provenance: point.provenance })),
        welded: 0,
      })
    })
  })

  describe('managed errors', () => {
    it('leaves unwelded an islet the weld would leave under three points', () => {
      const doc = sharedBorderDocument()
      const welded = weldOne(
        doc,
        pasted([
          [4.001, 48],
          [4.002, 48],
          [4.001, 47.999],
        ]),
        KM
      )

      expect(welded.welded).toBe(0)
      expect(welded.points.every((point) => point.anchor === undefined)).toBe(true)
      expect(doc.anchors).toHaveLength(6)
    })
  })

  describe('unmanaged errors', () => {
    it('throws rather than weld onto a point whose source the map does not declare', () => {
      const doc = sharedBorderDocument()
      doc.anchorSource[4] = 9

      expect(() =>
        weldOne(
          doc,
          pasted([
            [4.01, 48],
            [6, 48],
            [6, 46],
          ]),
          KM
        )
      ).toThrow(/anchor 4 has no declared source/)
    })

    it('throws rather than walk forever round a neighbour holding a point that is no number', () => {
      const { doc, bend } = bentEmpire()
      doc.anchors[bend] = [Number.NaN, Number.NaN]

      expect(() =>
        weldOne(
          doc,
          pasted([
            [4.01, 48],
            [6, 48],
            [6, 46],
            [4.01, 46],
          ]),
          KM
        )
      ).toThrow(/no shorter way found/)
    })
  })

  describe('edge cases', () => {
    it('never welds two rings of one pasted polity onto each other', () => {
      const doc = createYearDocument(1200)
      const [first, second] = weldPastedRings(
        doc,
        [
          pasted([
            [10, 40],
            [11, 40],
            [11, 39],
          ]),
          pasted([
            [10.001, 40],
            [11.001, 40],
            [11.001, 39],
          ]),
        ],
        KM
      )

      expect(first?.welded).toBe(0)
      expect(second?.welded).toBe(0)
    })

    it('welds a polity’s ring while leaving its islet unwelded', () => {
      const doc = sharedBorderDocument()
      const [mainland, islet] = weldPastedRings(
        doc,
        [
          pasted([
            [4.01, 48],
            [6, 48],
            [6, 46],
            [4.01, 46],
          ]),
          pasted([
            [4.001, 48],
            [4.002, 48],
            [4.001, 47.999],
          ]),
        ],
        KM
      )

      expect(mainland?.welded).toBe(2)
      expect(islet?.welded).toBe(0)
    })

    it('welds nothing when no ring is pasted', () => {
      expect(weldPastedRings(sharedBorderDocument(), [], KM)).toEqual([])
    })

    it('keeps one point where two pasted points in a row weld onto the same point of the map', () => {
      const doc = sharedBorderDocument()
      const welded = weldOne(
        doc,
        pasted([
          [4.001, 48],
          [4.002, 48],
          [6, 48],
          [6, 46],
        ]),
        KM
      )

      expect(welded.points.map((point) => point.anchor ?? null)).toEqual([4, null, null])
      expect(welded.welded).toBe(2)
    })

    it('welds nothing beyond the distance given', () => {
      const doc = sharedBorderDocument()
      const welded = weldOne(
        doc,
        pasted([
          [4.01, 48],
          [6, 48],
          [6, 46],
        ]),
        0.5
      )

      expect(welded.welded).toBe(0)
    })
  })
})
