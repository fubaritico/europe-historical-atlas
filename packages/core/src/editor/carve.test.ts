import polygonClipping from 'polygon-clipping'
import { describe, expect, it, vi } from 'vitest'

import { createYearDocument } from '../data/yearDocument'
import { pointInRings } from '../geo/pointInRing'

import { carveInFront, carveOutOfSuzerain } from './carve'
import { addAnchor, addPolity, closeRing } from './documentEdits'

import type { Carving, CarvingFault, CarvingHeld } from './carve'
import type { YearDocument } from '../data/yearDocument'
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
): Carving | CarvingFault | CarvingHeld | null {
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
    // The dev, 2026-11-05 (open-outlines.md): the suzerain is not carved while its outline is open.
    it('holds the carving back, writing nothing to the suzerain, while its outline is open', () => {
      const doc = france()
      const suzerain = doc.claims.find((claim) => claim.polity === 'france')
      if (suzerain !== undefined) suzerain.open = [0]
      const before = [...(suzerain?.rings[0] ?? [])]
      const [inner] = anchors(doc, [[10, 10]])
      const carving = closeAndCarve(doc, 'aquitaine', [0, 1, inner ?? -1, 5])

      expect(carving).toEqual({ suzerain: 'france', held: 'open-outline' })
      expect(suzerain?.rings).toEqual([before])
      expect(suzerain?.open).toEqual([0])
    })

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

    // The dev, 2026-11-12, Hum over Serbia, both Duklja's: a co-vassal under the outline gives its ground too.
    it('carves a co-vassal the outline covers, as it carves the suzerain', () => {
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

      expect(pointInRings([37, 7], domainOf(doc, 'aquitaine'))).toBe(false)
      expect(pointInRings([32, 2], domainOf(doc, 'aquitaine'))).toBe(true)
      expect(pointInRings([37, 7], domainOf(doc, 'poitou'))).toBe(true)
    })

    it('never carves a polity outside the suzerain’s extent', () => {
      const doc = france()
      addPolity(doc, polity('empire'))
      const empire = anchors(doc, [
        [30, 0],
        [40, 0],
        [40, 10],
        [30, 10],
      ])
      closeRing(doc, 'empire', empire)
      closeAndCarve(
        doc,
        'aquitaine',
        anchors(doc, [
          [35, 5],
          [45, 5],
          [45, 15],
          [35, 15],
        ])
      )

      expect(doc.claims.find((claim) => claim.polity === 'empire')?.rings).toEqual([empire])
    })

    // Croatia in Hungary, Bosnia in Serbia (1100, 2026-11-12): a side running along the suzerain's limit between
    // its anchors, sharing none, once left the walk of segments unclosed and the carving refused.
    it('carves a vassal whose side runs along the suzerain’s limit between its anchors', () => {
      const doc = france()
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

      expect(carving).toEqual({ suzerain: 'france', crossings: 0, rings: 1 })
      expect(frenchAt(doc, [5, 2])).toBe(false)
      expect(frenchAt(doc, [5, 7])).toBe(true)
      expect(frenchAt(doc, [1, 1])).toBe(true)
    })
  })

  describe('unmanaged errors', () => {
    // A refusal on the second domain puts back the first one carved, and the crossings it placed.
    it('puts the whole document back when the difference throws on a later domain', () => {
      const doc = france()
      addPolity(doc, polity('poitou', 'france'))
      closeRing(
        doc,
        'poitou',
        anchors(doc, [
          [15, 5],
          [25, 5],
          [25, 10],
          [15, 10],
        ])
      )
      const outline = anchors(doc, [
        [5, 2],
        [30, 2],
        [30, 8],
        [5, 8],
      ])
      const before = JSON.stringify({ anchors: doc.anchors, claims: doc.claims })
      const real = polygonClipping.difference
      let calls = 0
      const spy = vi.spyOn(polygonClipping, 'difference').mockImplementation((...args) => {
        calls += 1
        if (calls === 2) throw new Error('unreadable shape')
        return real(...args)
      })

      const carving = closeAndCarve(doc, 'aquitaine', outline)
      spy.mockRestore()
      doc.claims = doc.claims.filter((claim) => claim.polity !== 'aquitaine')

      expect(carving).toEqual({
        suzerain: 'france',
        reason: 'the difference could not be computed: unreadable shape',
      })
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

/** France and Aquitaine its vassal, drawn side by side: `0–10` and `10–20` on x, `0–10` on y. */
function family(): YearDocument {
  const doc = createYearDocument(1100, source)
  anchors(doc, [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [20, 0],
    [20, 10],
  ])
  addPolity(doc, polity('france'))
  addPolity(doc, polity('aquitaine', 'france'))
  closeRing(doc, 'france', [0, 1, 2, 3])
  closeRing(doc, 'aquitaine', [1, 4, 5, 2])
  return doc
}

/** Close an outline for France in front, as ‹alt› does at the close. */
function closeInFront(doc: YearDocument, ring: number[]): Carving | CarvingFault | null {
  closeRing(doc, 'france', ring)
  const closed = doc.claims.find((each) => each.polity === 'france')?.rings.at(-1)
  if (closed === undefined) throw new Error('fixture: the outline did not close')
  return carveInFront(doc, 'france', closed)
}

describe('carveInFront', () => {
  describe('happy path', () => {
    // The dev, 2026-11-12: Hungary's coastal towns, in Croatia its vassal.
    it('takes a vassal’s ground for its suzerain, and names whose', () => {
      const doc = family()
      const carving = closeInFront(
        doc,
        anchors(doc, [
          [14, 2],
          [18, 2],
          [18, 6],
          [14, 6],
        ])
      )

      expect(carving).toMatchObject({ suzerain: 'france', taken: ['aquitaine'] })
      expect(pointInRings([16, 4], domainOf(doc, 'aquitaine'))).toBe(false)
      expect(pointInRings([12, 8], domainOf(doc, 'aquitaine'))).toBe(true)
    })
  })

  describe('variants', () => {
    it('takes a co-vassal’s ground for a vassal, up its whole family', () => {
      const doc = family()
      addPolity(doc, polity('poitou', 'france'))
      closeRing(
        doc,
        'poitou',
        anchors(doc, [
          [2, 2],
          [8, 2],
          [8, 8],
          [2, 8],
        ])
      )
      closeRing(doc, 'aquitaine', [])
      const ring = anchors(doc, [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
      ])
      closeRing(doc, 'aquitaine', ring)
      const closed = doc.claims.find((each) => each.polity === 'aquitaine')?.rings.at(-1) ?? []
      const carving = carveInFront(doc, 'aquitaine', closed)

      expect(carving).toMatchObject({ taken: ['france', 'poitou'] })
      expect(pointInRings([5, 5], domainOf(doc, 'poitou'))).toBe(false)
    })
  })

  describe('managed errors', () => {
    // Review QUAL-004: a family member whose outline is open reads no area — left as it is, not named.
    it('leaves a family member whose outline is open as it is', () => {
      const doc = family()
      const aquitaine = doc.claims.find((claim) => claim.polity === 'aquitaine')
      if (aquitaine === undefined) throw new Error('fixture: no Aquitaine')
      aquitaine.open = [0]
      const before = JSON.stringify(aquitaine.rings)
      const carving = closeInFront(
        doc,
        anchors(doc, [
          [14, 2],
          [18, 2],
          [18, 6],
          [14, 6],
        ])
      )

      expect(carving).toBeNull()
      expect(JSON.stringify(aquitaine.rings)).toBe(before)
    })

    it('never takes from a polity outside the family', () => {
      const doc = family()
      addPolity(doc, polity('empire'))
      const empire = anchors(doc, [
        [30, 0],
        [40, 0],
        [40, 10],
        [30, 10],
      ])
      closeRing(doc, 'empire', empire)
      const carving = closeInFront(
        doc,
        anchors(doc, [
          [32, 2],
          [38, 2],
          [38, 8],
          [32, 8],
        ])
      )

      expect(carving).toBeNull()
      expect(doc.claims.find((claim) => claim.polity === 'empire')?.rings).toEqual([empire])
    })
  })

  describe('unmanaged errors', () => {
    it('puts the document back when the difference throws', () => {
      const doc = family()
      const outline = anchors(doc, [
        [14, 2],
        [18, 2],
        [18, 6],
        [14, 6],
      ])
      const before = JSON.stringify(doc.claims)
      const spy = vi.spyOn(polygonClipping, 'difference').mockImplementation(() => {
        throw new Error('unreadable shape')
      })
      const carving = closeInFront(doc, outline)
      spy.mockRestore()
      const france = doc.claims.find((claim) => claim.polity === 'france')
      france?.rings.pop()

      expect(carving).toHaveProperty('reason')
      expect(JSON.stringify(doc.claims)).toBe(before)
    })
  })

  describe('edge cases', () => {
    it('carves nothing for an outline over nobody of its family', () => {
      const doc = family()
      expect(
        closeInFront(
          doc,
          anchors(doc, [
            [50, 50],
            [52, 50],
            [52, 52],
            [50, 52],
          ])
        )
      ).toBeNull()
    })
  })
})
