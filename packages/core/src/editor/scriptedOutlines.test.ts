import { describe, expect, it } from 'vitest'

import { addAnchor, closeRing } from './documentEdits'
import { sharedBorderDocument } from './documentFixtures'
import { placeScriptedRing, replaceScriptedRun, ringCrossesItself } from './scriptedOutlines'

import type { Position } from './scriptedOutlines'
import type { Provenance } from '../data/provenance'
import type { YearDocument } from '../data/yearDocument'

/** The Pen's provenance for a new point. */
const BY_EYE: Provenance = { name: 'reported by eye', licence: 'fact' }

/** A degree of latitude is about 111 km: 1e-6° about 0.11 m, 1e-4° about 11 m. */
const TENTH_OF_A_METRE = 1e-6
const ELEVEN_METRES = 1e-4

/**
 * The shared-border document with a county, vassal of the Empire, not drawn yet.
 * @returns the document
 */
function withCounty(): YearDocument {
  const doc = sharedBorderDocument()
  doc.polities.push({
    id: 'county',
    name: 'County',
    rank: 'county',
    status: 'country',
    suzerain: 'hre',
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  })
  return doc
}

/** A square inside the Empire (2–4°E, 46–48°N). */
const INSIDE_EMPIRE: Position[] = [
  [2.5, 47.5],
  [3.5, 47.5],
  [3.5, 46.5],
  [2.5, 46.5],
]

describe('scriptedOutlines', () => {
  describe('placeScriptedRing', () => {
    describe('happy path', () => {
      it('closes the ring and carves the vassal out of its suzerain, as the Pen does', () => {
        const doc = withCounty()

        const answer = placeScriptedRing(doc, 'county', INSIDE_EMPIRE, BY_EYE)

        expect(answer).toMatchObject({ ok: true, reused: 0, created: 4, carved: 'hre' })
        expect(answer.ring).toHaveLength(4)
        expect(doc.claims.find((claim) => claim.polity === 'hre')?.rings).toHaveLength(2)
      })

      it('lays each position exactly where it is given — no snap', () => {
        const doc = withCounty()

        const answer = placeScriptedRing(doc, 'county', INSIDE_EMPIRE, BY_EYE)

        expect(answer.ring.map((index) => doc.anchors[index])).toEqual(INSIDE_EMPIRE)
      })
    })

    describe('variants', () => {
      it('takes a live anchor lying within a metre, so the border is shared', () => {
        // The trap: a copy at the same place looks the same, and drifts at the first move
        const doc = withCounty()
        const nearCorner: Position = [4 - TENTH_OF_A_METRE, 48 - TENTH_OF_A_METRE]

        const answer = placeScriptedRing(doc, 'county', [[3, 47.5], nearCorner, [3.5, 47]], BY_EYE)

        expect(answer.reused).toBe(1)
        expect(answer.ring).toContain(4)
      })

      it('creates a new anchor beyond a metre', () => {
        const doc = withCounty()
        const nearCorner: Position = [4 - ELEVEN_METRES, 48 - ELEVEN_METRES]

        const answer = placeScriptedRing(doc, 'county', [[3, 47.5], nearCorner, [3.5, 47]], BY_EYE)

        expect(answer).toMatchObject({ reused: 0, created: 3 })
        expect(answer.ring).not.toContain(4)
      })

      it('reaches as far as the distance it is given', () => {
        const doc = withCounty()
        const nearCorner: Position = [4 - ELEVEN_METRES, 48 - ELEVEN_METRES]

        const answer = placeScriptedRing(
          doc,
          'county',
          [[3, 47.5], nearCorner, [3.5, 47]],
          BY_EYE,
          {
            reuseMetres: 20,
          }
        )

        expect(answer.ring).toContain(4)
      })

      it('never takes an anchor no ring holds', () => {
        const doc = withCounty()
        const dead = addAnchor(doc, [3, 47], 0)

        const answer = placeScriptedRing(
          doc,
          'county',
          [
            [3, 47],
            [3.5, 47.5],
            [3.5, 46.5],
          ],
          BY_EYE
        )

        expect(answer.ring).not.toContain(dead)
      })
    })

    describe('managed errors', () => {
      it.each([
        ['an unknown polity', 'nobody', INSIDE_EMPIRE, 'no polity "nobody" on this map'],
        [
          'two positions',
          'county',
          INSIDE_EMPIRE.slice(0, 2),
          'a ring needs three positions at least',
        ],
        [
          'a position not finite',
          'county',
          [
            [3, 47],
            [Number.NaN, 47],
            [3.5, 46.5],
          ],
          'a position is not two finite numbers',
        ],
        [
          'a ring crossing itself',
          'county',
          [
            [2.5, 47.5],
            [3.5, 46.5],
            [3.5, 47.5],
            [2.5, 46.5],
          ],
          'the ring crosses itself',
        ],
      ] as [string, string, Position[], string][])(
        'refuses %s, writing nothing',
        (_case, polity, positions, refusal) => {
          const doc = withCounty()
          const anchors = doc.anchors.length

          expect(placeScriptedRing(doc, polity, positions, BY_EYE)).toMatchObject({
            ok: false,
            refusal,
          })
          expect(doc.anchors).toHaveLength(anchors)
        }
      )

      it('refuses a vassal whose suzerain’s outline is open, as the Pen does', () => {
        const doc = withCounty()
        const hre = doc.claims.find((claim) => claim.polity === 'hre')
        if (hre === undefined) throw new Error('fixture changed')
        hre.open = [0]

        expect(placeScriptedRing(doc, 'county', INSIDE_EMPIRE, BY_EYE).refusal).toContain(
          'open outline'
        )
      })
    })

    describe('edge cases', () => {
      it('refuses two neighbouring positions falling on one anchor', () => {
        const doc = withCounty()

        const answer = placeScriptedRing(
          doc,
          'county',
          [
            [3, 47.5],
            [4, 48],
            [4, 48 - TENTH_OF_A_METRE],
            [3.5, 47],
          ],
          BY_EYE
        )

        expect(answer).toMatchObject({ ok: false, refusal: 'two positions are one anchor' })
      })

      it('refuses two positions apart in the ring falling on one anchor — a figure of eight (review ARCH-002)', () => {
        const doc = withCounty()

        const answer = placeScriptedRing(
          doc,
          'county',
          // Anchors 4, 5, then 4 again: apart among the anchors reused, so a check of neighbours alone lets it through
          [
            [4, 48],
            [3, 47.5],
            [4, 46],
            [3.5, 47],
            [4 - TENTH_OF_A_METRE, 48 - TENTH_OF_A_METRE],
          ],
          BY_EYE
        )

        expect(answer.refusal).toBe('two positions are one anchor')
      })

      it('reuses nothing at a distance of zero', () => {
        const doc = withCounty()
        const nearCorner: Position = [4 - TENTH_OF_A_METRE, 48 - TENTH_OF_A_METRE]

        const answer = placeScriptedRing(
          doc,
          'county',
          [[3, 47.5], nearCorner, [3.5, 47]],
          BY_EYE,
          {
            reuseMetres: 0,
          }
        )

        expect(answer).toMatchObject({ ok: true, reused: 0, created: 3 })
      })

      it.each([Number.NaN, -1, 1001])(
        'refuses a distance of reuse of %s, writing nothing',
        (metres) => {
          const doc = withCounty()
          const anchors = doc.anchors.length

          const answer = placeScriptedRing(doc, 'county', INSIDE_EMPIRE, BY_EYE, {
            reuseMetres: metres,
          })

          expect(answer.ok).toBe(false)
          expect(answer.refusal).toMatch(/reuseMetres/)
          expect(doc.anchors).toHaveLength(anchors)
        }
      )
    })

    // L4: N/A — no reading nor async; the closing's own faults are `carve.ts`'s, carried in `refusal`.
  })

  describe('replaceScriptedRun', () => {
    describe('happy path', () => {
      it('moves the border two polities share, both rings following', () => {
        const doc = sharedBorderDocument()

        const answer = replaceScriptedRun(doc, 1, 2, [[2.5, 47]], BY_EYE)

        expect(answer).toMatchObject({ ok: true, created: 1, reused: 0 })
        const laid = answer.ring[1]
        expect(answer.ring).toEqual([1, laid, 2])
        for (const claim of doc.claims) expect(claim.rings[0]).toContain(laid)
      })
    })

    describe('variants', () => {
      it('lays a run of many positions in their order', () => {
        const doc = sharedBorderDocument()
        const run: Position[] = [
          [2.2, 47.6],
          [2.4, 47.2],
          [2.3, 46.6],
        ]

        const answer = replaceScriptedRun(doc, 1, 2, run, BY_EYE)

        expect(answer.ring.slice(1, -1).map((index) => doc.anchors[index])).toEqual(run)
      })

      it('decides the stretch by the polity named when rings run differently', () => {
        const doc = differentRuns()

        const answer = replaceScriptedRun(doc, 1, 2, [[2.5, 47]], BY_EYE, { polity: 'hre' })

        expect(answer).toMatchObject({ ok: true, replaced: [] })
        const third = doc.claims.find((claim) => claim.polity === 'third')?.rings[0]
        expect(third).not.toContain(answer.ring[1])
      })

      it('takes a neighbour’s live anchor within a metre into the run', () => {
        const doc = differentRuns()
        const middle = doc.claims.find((claim) => claim.polity === 'third')?.rings[0]?.[1]
        if (middle === undefined) throw new Error('fixture changed')
        const [lon, lat] = doc.anchors[middle] ?? [0, 0]

        const answer = replaceScriptedRun(doc, 1, 2, [[lon, lat + TENTH_OF_A_METRE]], BY_EYE, {
          polity: 'hre',
        })

        expect(answer).toMatchObject({ ok: true, reused: 1, ring: [1, middle, 2] })
      })
    })

    describe('managed errors', () => {
      it('refuses an end no ring holds', () => {
        const doc = sharedBorderDocument()
        const dead = addAnchor(doc, [9, 9], 0)

        expect(replaceScriptedRun(doc, dead, 2, [], BY_EYE).refusal).toBe(
          'an end is no live anchor'
        )
      })

      it('refuses rings running differently between the anchors, unless a polity is named', () => {
        const doc = differentRuns()
        const anchors = doc.anchors.length

        expect(replaceScriptedRun(doc, 1, 2, [[2.5, 47]], BY_EYE).refusal).toContain(
          'name the polity'
        )
        expect(doc.anchors).toHaveLength(anchors)
      })

      it('refuses a polity named that holds no ring over both', () => {
        const doc = withCounty()

        expect(replaceScriptedRun(doc, 1, 2, [], BY_EYE, { polity: 'county' }).refusal).toBe(
          'no ring of "county" holds both anchors'
        )
      })

      it('refuses two anchors both ways round as far apart', () => {
        const doc = sharedBorderDocument()

        expect(replaceScriptedRun(doc, 0, 2, [], BY_EYE).refusal).toContain('as long')
      })
    })

    describe('edge cases', () => {
      it('refuses one anchor as both ends', () => {
        expect(replaceScriptedRun(sharedBorderDocument(), 1, 1, [], BY_EYE).refusal).toBe(
          'the two ends are one anchor'
        )
      })

      it('never takes for a position an anchor the run replaces', () => {
        // Moving a border a little: a position within a metre of an anchor it replaces is a new point
        const doc = sharedBorderDocument()
        const extra = addAnchor(doc, [2, 47], 0)
        for (const claim of doc.claims) {
          const ring = claim.rings[0]
          if (ring === undefined) continue
          const at = ring.indexOf(1)
          const next = ring[(at + 1) % ring.length]
          ring.splice(next === 2 ? at + 1 : at, 0, extra)
        }

        const answer = replaceScriptedRun(doc, 1, 2, [[2, 47 + TENTH_OF_A_METRE]], BY_EYE)

        expect(answer.ok).toBe(true)
        expect(answer.ring).not.toContain(extra)
      })
    })
  })

  describe('ringCrossesItself', () => {
    it('tells a bow tie from a square', () => {
      expect(ringCrossesItself(INSIDE_EMPIRE)).toBe(false)
      expect(
        ringCrossesItself([
          [0, 0],
          [1, 1],
          [1, 0],
          [0, 1],
        ])
      ).toBe(true)
    })
  })
})

/**
 * The shared border, with a third polity whose ring runs between anchors 1 and 2 another way.
 * @returns the document
 */
function differentRuns(): YearDocument {
  const doc = sharedBorderDocument()
  const a = addAnchor(doc, [1.5, 47], 0)
  const b = addAnchor(doc, [1, 50], 0)
  const c = addAnchor(doc, [3, 50], 0)
  doc.polities.push({
    id: 'third',
    name: 'Third',
    rank: 'county',
    status: 'country',
    suzerain: null,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  })
  closeRing(doc, 'third', [1, a, 2, b, c])
  return doc
}
