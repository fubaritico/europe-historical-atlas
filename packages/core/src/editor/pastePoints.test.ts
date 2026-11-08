import { describe, expect, it } from 'vitest'

import { cloneYearDocument } from '../data/yearDocument'

import { addAnchor } from './documentEdits'
import { AQUITAINE_IDENTITY, ringOf, sharedBorderDocument } from './documentFixtures'
import { isPointsPasteRefusal, pastePoints } from './pastePoints'
import { PASTE_WELD_KM } from './pasteWeld'

import type { CopiedPiece, CopiedPoints } from './clipboard'
import type { PointsPasted } from './pastePoints'

// open-outlines.md and s22-copy-paste.md, « # 2 — points onto a polity ». France holds the western square of the
// fixture, the Empire the eastern one, sharing the stretch from anchor 1 [2, 48] to anchor 2 [2, 46].

const EYE = { name: 'reported by eye — Duby (reference)', licence: 'fact' }
const KM = PASTE_WELD_KM

/**
 * A piece through these points.
 * @param coordinates - `[longitude, latitude]` per point
 * @param closed - whether it is a whole closed outline
 * @returns the piece
 */
function piece(coordinates: [number, number][], closed = false): CopiedPiece {
  return { closed, points: coordinates.map((at) => ({ at, provenance: EYE })) }
}

/**
 * Points copied as these pieces.
 * @param pieces - the pieces, in order
 * @returns the copy
 */
function points(...pieces: CopiedPiece[]): CopiedPoints {
  return { kind: 'points', map: '1100-backup', polity: 'Republic of Venice', pieces }
}

/**
 * What a paste did, nothing but what is named.
 * @param done - the counts that differ from nothing
 * @returns the whole answer
 */
function pasted(done: Partial<PointsPasted>): PointsPasted {
  return {
    outlines: 0,
    open: 0,
    merged: 0,
    points: 0,
    welded: 0,
    neighbours: [],
    leftOut: [],
    carved: [],
    ...done,
  }
}

/** France's western edge bent out to 0.5° W: its ends 0.37 km from anchors 0 and 3. */
const WEST_BULGE = piece([
  [0.005, 48],
  [-0.5, 47],
  [0.005, 46],
])

/** A triangle far in the south, touching nothing. */
const SOUTH_TRIANGLE = piece(
  [
    [10, 40],
    [11, 40],
    [11, 39],
  ],
  true
)

/**
 * The fixture with Aquitaine in it, nothing drawn.
 * @returns the map
 */
function withAquitaine(): ReturnType<typeof sharedBorderDocument> {
  const doc = sharedBorderDocument()
  doc.polities.push({ ...AQUITAINE_IDENTITY, suzerain: null })
  return doc
}

/**
 * The fixture with France's outline left open, from anchor 0 to anchor 3.
 * @returns the map
 */
function franceOpen(): ReturnType<typeof sharedBorderDocument> {
  const doc = sharedBorderDocument()
  const france = doc.claims.find((claim) => claim.polity === 'fr-couronne')
  if (france !== undefined) france.open = [0]
  return doc
}

describe('pastePoints', () => {
  describe('happy path', () => {
    it('merges a piece into the polity’s outline, between the anchors its ends hook onto', () => {
      const doc = sharedBorderDocument()

      expect(pastePoints(doc, points(WEST_BULGE), 'fr-couronne', KM)).toEqual(
        pasted({ merged: 1, points: 3 })
      )
      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
        [-0.5, 47],
      ])
    })

    it('adds a whole outline to a polity with nothing drawn, as its outline', () => {
      const doc = withAquitaine()

      expect(pastePoints(doc, points(SOUTH_TRIANGLE), 'aquitaine', KM)).toEqual(
        pasted({ outlines: 1, points: 3 })
      )
      expect(ringOf(doc, 'aquitaine')).toEqual([
        [10, 40],
        [11, 40],
        [11, 39],
      ])
    })

    // The dev, 2026-11-05, on his Venice: every point copied is carried over, whatever it makes.
    it('pastes a whole outline and a piece in one go: the outline added, the piece merged', () => {
      const doc = sharedBorderDocument()
      const done = pastePoints(doc, points(SOUTH_TRIANGLE, WEST_BULGE), 'fr-couronne', KM)

      expect(done).toEqual(pasted({ outlines: 1, merged: 1, points: 6 }))
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings).toHaveLength(2)
      expect(ringOf(doc, 'fr-couronne')).toContainEqual([-0.5, 47])
    })
  })

  describe('variants', () => {
    it('replaces the side of the smaller change, not the side of fewer points', () => {
      // France's south edge carries three more points: from anchor 0 to anchor 2 the north-east side has one point
      // between them, the west-south side four — but the piece runs along the west and the south.
      const doc = sharedBorderDocument()
      const south = [
        [1.5, 46],
        [1, 46],
        [0.5, 46],
      ].map(([lon, lat]) => addAnchor(doc, [lon ?? 0, lat ?? 0], 0))
      const france = doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings[0]
      france?.splice(3, 0, ...south)
      pastePoints(
        doc,
        points(
          piece([
            [0.005, 48],
            [-0.2, 46.5],
            [0.5, 45.8],
            [2.005, 46],
          ])
        ),
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
      const done = pastePoints(
        doc,
        points(
          piece([
            [2.005, 48],
            [2.3, 47],
            [2.005, 46],
          ])
        ),
        'fr-couronne',
        KM
      )

      expect(done).toMatchObject({ merged: 1, neighbours: ['hre'] })
      expect(ringOf(doc, 'hre')).toContainEqual([2.3, 47])
    })

    it('adds a whole outline to a polity already drawn as one more outline, welded where it meets the map', () => {
      const doc = sharedBorderDocument()
      const done = pastePoints(
        doc,
        points(
          piece(
            [
              [0.005, 48],
              [-1, 48],
              [-1, 47],
            ],
            true
          )
        ),
        'fr-couronne',
        KM
      )

      expect(done).toEqual(pasted({ outlines: 1, points: 3, welded: 1 }))
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings).toHaveLength(2)
    })

    // The dev, 2026-11-05: "you take the nearest point to merge it with" — however far.
    it('hooks an end far from the outline onto its nearest point, and merges', () => {
      const doc = sharedBorderDocument()
      const done = pastePoints(
        doc,
        points(
          piece([
            [-0.5, 48],
            [-0.6, 47],
            [0.005, 46],
          ])
        ),
        'fr-couronne',
        KM
      )

      expect(done).toEqual(pasted({ merged: 1, points: 3 }))
      expect(ringOf(doc, 'fr-couronne')).toContainEqual([-0.6, 47])
    })

    it('hooks the last end onto the nearest other point when both ends lie nearest the same one', () => {
      const doc = sharedBorderDocument()
      const done = pastePoints(
        doc,
        points(
          piece([
            [0.001, 48],
            [-0.5, 48.5],
            [0.002, 48],
          ])
        ),
        'fr-couronne',
        KM
      )

      expect(done).toEqual(pasted({ merged: 1, points: 3 }))
      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [-0.5, 48.5],
        [2, 48],
        [2, 46],
        [0, 46],
      ])
    })

    it('leaves a piece open on a polity with nothing drawn: an open outline of it', () => {
      const doc = withAquitaine()
      const done = pastePoints(
        doc,
        points(
          piece([
            [10, 40],
            [11, 40],
          ])
        ),
        'aquitaine',
        KM
      )

      expect(done).toEqual(pasted({ open: 1, points: 2 }))
      expect(doc.claims.find((claim) => claim.polity === 'aquitaine')).toMatchObject({ open: [0] })
      expect(ringOf(doc, 'aquitaine')).toEqual([
        [10, 40],
        [11, 40],
      ])
    })

    it('closes an open outline with a piece hooked onto its two ends', () => {
      const doc = franceOpen()
      const done = pastePoints(doc, points(WEST_BULGE), 'fr-couronne', KM)

      expect(done).toEqual(pasted({ merged: 1, points: 3 }))
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.open).toBeUndefined()
      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
        [-0.5, 47],
      ])
    })

    // Review QUAL-004, 2026-11-05: both ways round, with more than one point between, the order read whole.
    it('closes an open outline from its last end to its first, the points laid in order', () => {
      const doc = franceOpen()
      pastePoints(
        doc,
        points(
          piece([
            [0.005, 46],
            [-0.5, 46.5],
            [-0.5, 47.5],
            [0.005, 48],
          ])
        ),
        'fr-couronne',
        KM
      )

      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
        [-0.5, 46.5],
        [-0.5, 47.5],
      ])
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.open).toBeUndefined()
    })

    it('closes an open outline from its first end to its last, the points laid reversed', () => {
      const doc = franceOpen()
      pastePoints(
        doc,
        points(
          piece([
            [0.005, 48],
            [-0.5, 47.5],
            [-0.5, 46.5],
            [0.005, 46],
          ])
        ),
        'fr-couronne',
        KM
      )

      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
        [-0.5, 46.5],
        [-0.5, 47.5],
      ])
    })

    it('leaves a line of two anchors open when a piece joins its ends with nothing between', () => {
      const doc = withAquitaine()
      pastePoints(
        doc,
        points(
          piece([
            [10, 40],
            [11, 40],
          ])
        ),
        'aquitaine',
        KM
      )
      pastePoints(
        doc,
        points(
          piece([
            [10.001, 40],
            [11.001, 40],
          ])
        ),
        'aquitaine',
        KM
      )

      expect(doc.claims.find((claim) => claim.polity === 'aquitaine')?.open).toEqual([0])
    })

    it('merges into an open outline along its one way, never across its two ends', () => {
      const doc = franceOpen()
      // Hooked onto anchors 0 and 1: on the closed square the smaller change; open, the one way between them.
      pastePoints(
        doc,
        points(
          piece([
            [0.005, 48],
            [1, 49],
            [2.005, 48],
          ])
        ),
        'fr-couronne',
        KM
      )

      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [1, 49],
        [2, 48],
        [2, 46],
        [0, 46],
      ])
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.open).toEqual([0])
    })
  })

  describe('managed errors', () => {
    it('leaves out, and names, a piece ⟨retracer⟩ refuses — a border dressed by hand — writing nothing for it', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ run: [0, 1], hand: 'dotted', source: null, note: null })
      const before = cloneYearDocument(doc)
      // Hooked onto anchors 1 and 3, the smaller side replaces anchor 0, which the dressed run covers.
      const done = pastePoints(
        doc,
        points(
          piece([
            [2.001, 48],
            [0.5, 47],
            [0.005, 46],
          ])
        ),
        'fr-couronne',
        KM
      )

      expect(done).toEqual(pasted({ leftOut: [{ kind: 'dressed-run' }] }))
      expect(doc).toEqual(before)
    })

    // The dev, 2026-11-05: a vassal is never closed over a suzerain still open — the piece is left out, nothing written.
    it('leaves out a piece that would close a vassal whose suzerain is still open, writing nothing', () => {
      const doc = sharedBorderDocument()
      const empire = doc.polities.find((polity) => polity.id === 'hre')
      if (empire !== undefined) empire.suzerain = 'fr-couronne'
      for (const claim of doc.claims) claim.open = [0]
      const before = cloneYearDocument(doc)
      const done = pastePoints(
        doc,
        points(
          piece([
            [2.001, 46],
            [3, 47],
            [2.001, 48],
          ])
        ),
        'hre',
        KM
      )

      expect(done).toEqual(
        pasted({ leftOut: [{ kind: 'suzerain-open', suzerain: 'fr-couronne' }] })
      )
      expect(doc).toEqual(before)
    })

    it('pastes the other pieces when one is left out', () => {
      const doc = sharedBorderDocument()
      doc.runs.push({ run: [0, 1], hand: 'dotted', source: null, note: null })
      const refused = piece([
        [2.001, 48],
        [0.5, 47],
        [0.005, 46],
      ])
      const done = pastePoints(doc, points(SOUTH_TRIANGLE, refused), 'fr-couronne', KM)

      expect(done).toEqual(pasted({ outlines: 1, points: 3, leftOut: [{ kind: 'dressed-run' }] }))
    })

    it('refuses a polity the map does not hold', () => {
      expect(pastePoints(sharedBorderDocument(), points(WEST_BULGE), 'nowhere', KM)).toEqual({
        refused: 'no-polity',
      })
    })
  })

  describe('edge cases', () => {
    it('tells a refusal from a paste', () => {
      expect(isPointsPasteRefusal({ refused: 'no-polity' })).toBe(true)
      expect(isPointsPasteRefusal(pasted({ outlines: 1 }))).toBe(false)
    })

    it('merges a piece of two points, its ends alone, as a straight line between them', () => {
      const doc = sharedBorderDocument()
      const done = pastePoints(
        doc,
        points(
          piece([
            [0.005, 48],
            [0.005, 46],
          ])
        ),
        'fr-couronne',
        KM
      )

      expect(done).toEqual(pasted({ merged: 1, points: 2 }))
      expect(ringOf(doc, 'fr-couronne')).toHaveLength(4)
    })
  })
})
