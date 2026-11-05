import { describe, expect, it } from 'vitest'

import { AQUITAINE_IDENTITY } from './documentFixtures'
import { addOverlap, overlapCandidates, pairOverlap, polityShape, suzerainsOf } from './overlaps'
import { createYearDocument } from './yearDocument'

import type { Overlap, PolityShape } from './overlaps'
import type { YearDocument } from './yearDocument'
import type { MultiPolygon } from 'polygon-clipping'

// CARTO-364 — the dev, 2026-11-06: an outline spilling over another's makes a hatched zone in the colours of both;
// four over one another, four — "it must be computed that way".

/**
 * A square of anchors added to a document, claimed by a polity.
 * @param document - the document to add it to
 * @param polity - who claims it
 * @param west - its west edge, in degrees
 * @param south - its south edge
 * @param side - its side
 * @param suzerain - the polity's suzerain, if any
 */
function square(
  document: YearDocument,
  polity: string,
  [west, south, side]: [number, number, number],
  suzerain: string | null = null
): void {
  const from = document.anchors.length
  document.anchors.push(
    [west, south],
    [west + side, south],
    [west + side, south + side],
    [west, south + side]
  )
  document.anchorSource.push(0, 0, 0, 0)
  document.polities.push({ ...AQUITAINE_IDENTITY, id: polity, name: polity, suzerain })
  document.claims.push({ polity, rings: [[from, from + 1, from + 2, from + 3]] })
}

/**
 * The area of a ground, in square degrees.
 * @param shape - the ground
 * @returns its area
 */
function areaOf(shape: MultiPolygon): number {
  let total = 0
  for (const polygon of shape) {
    for (const [k, ring] of polygon.entries()) {
      let twice = 0
      for (const [i, [x1, y1]] of ring.entries()) {
        const [x2, y2] = ring[(i + 1) % ring.length] ?? [x1, y1]
        twice += x1 * y2 - x2 * y1
      }
      total += (k === 0 ? 1 : -1) * Math.abs(twice / 2)
    }
  }
  return total
}

/**
 * Every polity's shape, in the order of the registry.
 * @param document - the document
 * @returns the shapes of the polities that enclose something
 */
function shapesOf(document: YearDocument): PolityShape[] {
  return document.polities.flatMap((polity) => {
    const shape = polityShape(document, polity.id)
    return shape === null ? [] : [shape]
  })
}

/**
 * Every overlap of a document, cut into pieces.
 * @param document - the document
 * @returns the pieces
 */
function overlapsOf(document: YearDocument): Overlap[] {
  let pieces: Overlap[] = []
  for (const [a, b] of overlapCandidates(document, shapesOf(document))) {
    const area = pairOverlap(a, b)
    if (area.length > 0)
      pieces = addOverlap(document, pieces, { polities: [a.polity, b.polity], area })
  }
  return pieces
}

describe('overlaps', () => {
  describe('happy path', () => {
    it('finds the ground two neighbours both cover, with both of them', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 2])
      square(document, 'empire', [1, 0, 2])

      const pieces = overlapsOf(document)

      expect(pieces.map((piece) => piece.polities)).toEqual([['france', 'empire']])
      expect(areaOf(pieces[0]?.area ?? [])).toBeCloseTo(2)
    })

    it('gives three polities over one ground as one piece of three', () => {
      const document = createYearDocument(1100)
      square(document, 'a', [0, 0, 2])
      square(document, 'b', [1, 0, 2])
      square(document, 'c', [1, 1, 2])

      const triple = overlapsOf(document).filter((piece) => piece.polities.length === 3)

      expect(triple.map((piece) => [...piece.polities].sort())).toEqual([['a', 'b', 'c']])
      expect(areaOf(triple[0]?.area ?? [])).toBeCloseTo(1)
    })

    it('gives four polities over one ground as one piece of four', () => {
      const document = createYearDocument(1100)
      for (const id of ['a', 'b', 'c', 'd']) square(document, id, [0, 0, 1])

      expect(overlapsOf(document).map((piece) => [...piece.polities].sort())).toEqual([
        ['a', 'b', 'c', 'd'],
      ])
    })
  })

  describe('variants', () => {
    it('finds nothing between neighbours that only touch', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 1])
      square(document, 'empire', [1, 0, 1])

      expect(overlapsOf(document)).toEqual([])
    })

    it('reads a vassal inside its suzerain as vassalage, not as an overlap', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 4])
      square(document, 'aquitaine', [1, 1, 1], 'france')

      expect(overlapsOf(document)).toEqual([])
    })

    it('reads a vassal of a vassal inside the kingdom above both as vassalage too', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 4])
      square(document, 'aquitaine', [5, 5, 1], 'france')
      square(document, 'poitou', [1, 1, 1], 'aquitaine')

      expect(overlapsOf(document)).toEqual([])
    })

    it('hatches two vassals of one suzerain that overlap each other', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 6])
      square(document, 'anjou', [1, 1, 2], 'france')
      square(document, 'maine', [2, 1, 2], 'france')

      expect(overlapsOf(document).map((piece) => piece.polities)).toEqual([['anjou', 'maine']])
    })

    it('leaves the suzerain out of a ground its vassal shares with a third polity', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 4])
      square(document, 'flanders', [2, 2, 1], 'france')
      square(document, 'empire', [2, 2, 3])

      const pieces = overlapsOf(document)

      expect(pieces.some((piece) => piece.polities.includes('flanders'))).toBe(true)
      expect(
        pieces.every(
          (piece) => !piece.polities.includes('france') || !piece.polities.includes('flanders')
        )
      ).toBe(true)
    })

    it('closes an open outline by the line between its ends, as its fill is', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 2])
      square(document, 'empire', [1, 0, 2])
      const empire = document.claims[1]
      if (empire !== undefined) {
        // The last point dropped and the outline left open: the triangle (1,0) (3,0) (3,2), closed by its chord, crosses
        // France's east half under the diagonal — half a square degree.
        empire.rings = [empire.rings[0]?.slice(0, 3) ?? []]
        empire.open = [0]
      }

      expect(areaOf(overlapsOf(document)[0]?.area ?? [])).toBeCloseTo(0.5)
    })

    it('takes a polity’s two claims together', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 1])
      square(document, 'france-bis', [3, 0, 1])
      const second = document.claims[1]
      if (second !== undefined) second.polity = 'france'

      expect(polityShape(document, 'france')?.shape).toHaveLength(2)
    })

    it('reads a ring inside another of the same claim as a hole', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 4])
      square(document, 'hole', [1, 1, 2])
      const [outer, inner] = document.claims
      if (outer !== undefined && inner !== undefined) outer.rings.push(...inner.rings)

      expect(areaOf(polityShape(document, 'france')?.shape ?? [])).toBeCloseTo(12)
    })
  })

  describe('managed errors', () => {
    it('gives no shape to a polity with no claim', () => {
      const document = createYearDocument(1100)

      expect(polityShape(document, 'nobody')).toBeNull()
    })

    it('gives no shape to an open line of two points, which encloses nothing', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 1])
      const claim = document.claims[0]
      if (claim !== undefined) {
        claim.rings = [claim.rings[0]?.slice(0, 2) ?? []]
        claim.open = [0]
      }

      expect(polityShape(document, 'france')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('lets the geometry’s refusal of a degenerate ring through, for the caller to decide', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 1])
      document.anchors[1] = [Number.NaN, 0]

      expect(() => polityShape(document, 'france')).toThrow(/degenerate/)
    })
  })

  describe('edge cases', () => {
    it('walks a loop in the registry once round, never forever', () => {
      const document = createYearDocument(1100)
      square(document, 'a', [0, 0, 1], 'b')
      square(document, 'b', [0, 0, 1], 'a')

      expect([...suzerainsOf(document, 'a')].sort()).toEqual(['a', 'b'])
    })

    it('skips a pair whose boxes do not meet without intersecting it', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 1])
      square(document, 'rus', [10, 10, 1])

      expect(overlapCandidates(document, shapesOf(document))).toEqual([])
    })
  })
})
