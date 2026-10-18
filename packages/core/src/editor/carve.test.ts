import { describe, expect, it } from 'vitest'

import { pointInRings } from '../geo/pointInRing'

import { carveOutOfSuzerain } from './carve'
import { addAnchor, addPolity, closeRing } from './documentEdits'
import { createYearDocument } from './yearDocument'

import type { Carving, CarvingFault } from './carve'
import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'

const source = [{ id: 0, name: 'reported by eye', licence: 'fact' }]

function polity(id: string, suzerain: string | null = null): YearPolity {
  return {
    id,
    name: id,
    rank: null,
    status: null,
    suzerain,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
}

/** Put points in and hand back their indices. */
function anchors(doc: YearDocument, points: [number, number][]): number[] {
  return points.map((point) => addAnchor(doc, point, 0))
}

/**
 * France, a 20° square whose west side has a middle anchor and whose south side too:
 * `0 (0,0) · 1 (10,0) · 2 (20,0) · 3 (20,20) · 4 (0,20) · 5 (0,10)`. Aquitaine declared its vassal.
 */
function france(): YearDocument {
  const doc = createYearDocument(1100, source)
  anchors(doc, [
    [0, 0],
    [10, 0],
    [20, 0],
    [20, 20],
    [0, 20],
    [0, 10],
  ])
  addPolity(doc, polity('france'))
  addPolity(doc, polity('aquitaine', 'france'))
  closeRing(doc, 'france', [0, 1, 2, 3, 4, 5])
  return doc
}

/** Close an outline for a polity and carve it, as the Cartographer does at close. */
function closeAndCarve(
  doc: YearDocument,
  polityId: string,
  ring: number[]
): Carving | CarvingFault | null {
  closeRing(doc, polityId, ring)
  const claim = doc.claims.find((each) => each.polity === polityId)
  const closed = claim?.rings.at(-1)
  if (closed === undefined) throw new Error('fixture: the outline did not close')
  return carveOutOfSuzerain(doc, polityId, closed)
}

/** France's own rings, as coordinates. */
function domainOf(doc: YearDocument, id = 'france'): [number, number][][] {
  const rings = doc.claims.find((claim) => claim.polity === id)?.rings ?? []
  return rings.map((ring) =>
    ring.flatMap((index) => {
      const point = doc.anchors[index]
      return point === undefined ? [] : [point]
    })
  )
}

/** Whether a point is still France's own. */
function frenchAt(doc: YearDocument, point: [number, number]): boolean {
  return pointInRings(point, domainOf(doc))
}

describe('carveOutOfSuzerain', () => {
  describe('happy path', () => {
    it('takes the ground under a vassal sharing the suzerain’s corner, and shares the new limit', () => {
      const doc = france()
      const [inner] = anchors(doc, [[10, 10]])
      const carving = closeAndCarve(doc, 'aquitaine', [0, 1, inner ?? -1, 5])

      expect(carving).toEqual({ suzerain: 'france', crossings: 0, rings: 1 })
      expect(frenchAt(doc, [5, 5])).toBe(false)
      expect(frenchAt(doc, [15, 15])).toBe(true)
      const ring = doc.claims.find((claim) => claim.polity === 'france')?.rings[0] ?? []
      expect(ring).toContain(inner)
      expect(ring).not.toContain(0)
    })
  })

  describe('variants', () => {
    it('leaves a hole, by the vassal’s own anchors, for a vassal wholly inside', () => {
      const doc = france()
      const hole = anchors(doc, [
        [5, 5],
        [8, 5],
        [8, 8],
        [5, 8],
      ])
      closeAndCarve(doc, 'aquitaine', hole)

      const rings = doc.claims.find((claim) => claim.polity === 'france')?.rings ?? []
      expect(rings).toHaveLength(2)
      expect(rings.some((ring) => [...ring].sort().join() === [...hole].sort().join())).toBe(true)
      expect(frenchAt(doc, [6, 6])).toBe(false)
      expect(frenchAt(doc, [2, 2])).toBe(true)
    })

    it('places a shared anchor where the outline crosses the suzerain’s limit, and keeps the outside the vassal’s', () => {
      const doc = france()
      const corners = anchors(doc, [
        [15, 5],
        [25, 5],
        [25, 15],
        [15, 15],
      ])
      const carving = closeAndCarve(doc, 'aquitaine', corners)

      expect(carving).toEqual({ suzerain: 'france', crossings: 2, rings: 1 })
      const crossings = [6 + 4, 6 + 5]
      const frenchRing = doc.claims.find((claim) => claim.polity === 'france')?.rings[0] ?? []
      const vassalRing = doc.claims.find((claim) => claim.polity === 'aquitaine')?.rings[0] ?? []
      for (const index of crossings) {
        expect(frenchRing).toContain(index)
        expect(vassalRing).toContain(index)
      }
      expect(doc.anchors[crossings[0] ?? -1]?.[0]).toBeCloseTo(20)
      expect(frenchAt(doc, [17, 10])).toBe(false)
      expect(frenchAt(doc, [17, 2])).toBe(true)
    })

    it('inserts a crossing in a neighbour sharing the crossed limit too, so they keep sharing it', () => {
      const doc = france()
      const empire = anchors(doc, [
        [30, 0],
        [30, 20],
      ])
      addPolity(doc, polity('hre'))
      closeRing(doc, 'hre', [2, empire[0] ?? -1, empire[1] ?? -1, 3])
      closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [15, 5],
          [25, 5],
          [25, 15],
          [15, 15],
        ])
      )

      const hreRing = doc.claims.find((claim) => claim.polity === 'hre')?.rings[0] ?? []
      expect(hreRing).toHaveLength(6)
    })

    it('splits the suzerain in two when the vassal runs right across it', () => {
      const doc = france()
      closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [-5, 8],
          [25, 8],
          [25, 12],
          [-5, 12],
        ])
      )

      expect(doc.claims.find((claim) => claim.polity === 'france')?.rings).toHaveLength(2)
      expect(frenchAt(doc, [10, 4])).toBe(true)
      expect(frenchAt(doc, [10, 16])).toBe(true)
      expect(frenchAt(doc, [10, 10])).toBe(false)
    })

    it('carves a second outline of the same vassal — an exclave', () => {
      const doc = france()
      closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [2, 2],
          [4, 2],
          [4, 4],
          [2, 4],
        ])
      )
      closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [14, 14],
          [16, 14],
          [16, 16],
          [14, 16],
        ])
      )

      expect(frenchAt(doc, [3, 3])).toBe(false)
      expect(frenchAt(doc, [15, 15])).toBe(false)
      expect(frenchAt(doc, [10, 10])).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('carves nothing for a polity owing nobody', () => {
      const doc = france()
      addPolity(doc, polity('castile'))
      const before = JSON.stringify(doc.claims[0])
      const ring = anchors(doc, [
        [5, 5],
        [8, 5],
        [8, 8],
      ])
      closeRing(doc, 'castile', ring)

      expect(carveOutOfSuzerain(doc, 'castile', ring)).toBeNull()
      expect(JSON.stringify(doc.claims[0])).toBe(before)
    })

    it('carves nothing from a suzerain with no domain of its own', () => {
      const doc = createYearDocument(1100, source)
      addPolity(doc, polity('hre'))
      addPolity(doc, polity('saxony', 'hre'))

      expect(
        closeAndCarve(
          doc,
          'saxony',
          anchors(doc, [
            [0, 0],
            [1, 0],
            [1, 1],
          ])
        )
      ).toBeNull()
    })

    it('carves nothing for an outline lying wholly outside the suzerain', () => {
      const doc = france()
      const before = doc.claims.find((claim) => claim.polity === 'france')?.rings[0]?.slice()

      expect(
        closeAndCarve(
          doc,
          'aquitaine',
          anchors(doc, [
            [30, 30],
            [35, 30],
            [35, 35],
          ])
        )
      ).toBeNull()
      expect(doc.claims.find((claim) => claim.polity === 'france')?.rings[0]).toEqual(before)
    })

    it('never carves a co-vassal it overlaps — only the suzerain’s own domain', () => {
      const doc = france()
      addPolity(doc, polity('poitou', 'france'))
      const aquitaine = anchors(doc, [
        [30, 0],
        [40, 0],
        [40, 10],
        [30, 10],
      ])
      closeRing(doc, 'aquitaine', aquitaine)
      closeAndCarve(
        doc,
        'poitou',
        anchors(doc, [
          [35, 5],
          [45, 5],
          [45, 15],
          [35, 15],
        ])
      )

      expect(doc.claims.find((claim) => claim.polity === 'aquitaine')?.rings).toEqual([aquitaine])
    })
  })

  describe('unmanaged errors', () => {
    it('leaves the domain untouched and says so when the segments do not close', () => {
      const doc = france()
      const claim = doc.claims.find((each) => each.polity === 'france')
      const before = JSON.stringify(claim?.rings)

      // The vassal's south side lies ON France's, between its anchors, sharing none: neither segment has
      // the remaining domain on one side, so France's limit loses its ends at (0,0) and (10,0).
      const carving = closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [2, 0],
          [8, 0],
          [8, 5],
          [2, 5],
        ])
      )

      expect(carving).toHaveProperty('reason')
      expect(JSON.stringify(claim?.rings)).toBe(before)
    })
  })

  describe('unmanaged errors — after a crossing was placed', () => {
    it('puts the document back as it was, crossing anchors included', () => {
      const doc = france()
      const before = JSON.stringify({ anchors: doc.anchors, claims: doc.claims })

      // Its south side lies ON France's (the walk cannot close), its next side crosses France's east limit.
      const carving = closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [2, 0],
          [8, 0],
          [25, 5],
          [25, 15],
          [2, 15],
        ])
      )
      const vassal = doc.claims.find((claim) => claim.polity === 'aquitaine')
      const vassalRing = vassal?.rings[0] ?? []
      doc.claims = doc.claims.filter((claim) => claim.polity !== 'aquitaine')
      doc.anchors.length = 6

      expect(carving).toHaveProperty('reason')
      expect(vassalRing).toHaveLength(5)
      expect(JSON.stringify({ anchors: doc.anchors, claims: doc.claims })).toBe(before)
    })
  })

  describe('edge cases', () => {
    it('places one anchor where a segment walked out and back is crossed once', () => {
      const doc = createYearDocument(1100, source)
      const [sw, base, tip, se, ne, nw] = anchors(doc, [
        [0, 0],
        [10, 0],
        [10, 5],
        [20, 0],
        [20, 20],
        [0, 20],
      ])
      addPolity(doc, polity('france'))
      addPolity(doc, polity('aquitaine', 'france'))
      closeRing(
        doc,
        'france',
        [sw, base, tip, base, se, ne, nw].map((i) => i ?? -1)
      )
      const count = doc.anchors.length

      const carving = closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [8, 2],
          [12, 2],
          [12, 4],
          [8, 4],
        ])
      )

      expect(carving).toMatchObject({ crossings: 2 })
      expect(doc.anchors).toHaveLength(count + 4 + 2)
    })

    // Measured on 1100, 2026-10-15: the Franks' ring runs up a river near Ghent and back down it over other
    // anchors at the very same positions. Keyed by anchor, the walk could not close; keyed by position it does.
    it('carves a domain whose ring runs out and back over anchors at the same positions', () => {
      const doc = createYearDocument(1100, source)
      const [sw, base, tip, tipAgain, baseAgain, se, ne, nw] = anchors(doc, [
        [0, 0],
        [10, 0],
        [10, 5],
        [10, 5],
        [10, 0],
        [20, 0],
        [20, 20],
        [0, 20],
      ])
      addPolity(doc, polity('france'))
      addPolity(doc, polity('aquitaine', 'france'))
      closeRing(
        doc,
        'france',
        [sw, base, tip, tipAgain, baseAgain, se, ne, nw].map((i) => i ?? -1)
      )

      const carving = closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [2, 12],
          [4, 12],
          [4, 14],
          [2, 14],
        ])
      )

      expect(carving).not.toHaveProperty('reason')
      expect(frenchAt(doc, [3, 13])).toBe(false)
      expect(frenchAt(doc, [15, 15])).toBe(true)
    })

    it('drops the whole domain when the vassal covers all of it', () => {
      const doc = france()
      closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [-1, -1],
          [21, -1],
          [21, 21],
          [-1, 21],
        ])
      )

      expect(doc.claims.find((claim) => claim.polity === 'france')?.rings).toEqual([])
    })
  })
})
