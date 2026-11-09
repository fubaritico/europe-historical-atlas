import { afterEach, describe, expect, it, vi } from 'vitest'

import { overlapHatches } from './overlapHatches'
import * as overlapsModule from './overlaps'
import { TWO_OVERLAPPING, squaresDocument } from './testing/overlapFixtures'
import { yearOverlaps } from './yearOverlaps'

// ATLAS-399: the overlaps projected on the year's frame, in their polities' colours.

/** A frame of 4° by 4°, so the shared band — longitude 1 to 2, latitude 40 to 42 — falls inside. */
const BBOX = { west: 0, south: 40, east: 4, north: 44 }

/** No polity wears the vassals' band. */
const NO_BAND = (): number => 0

/** Each fixture polity's colour, by id. */
const COLOURS = new Map(TWO_OVERLAPPING.map(({ id, colour }) => [id, colour]))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('overlapHatches', () => {
  describe('happy path', () => {
    it('gives the shared band test1’s red and test2’s blue, in that order', () => {
      const { hatches } = overlapHatches(
        yearOverlaps(squaresDocument(TWO_OVERLAPPING)),
        BBOX,
        COLOURS,
        NO_BAND
      )
      expect(hatches.map(({ colours }) => colours)).toEqual([
        [
          { r: 0xff, g: 0x20, b: 0x00 },
          { r: 0x20, g: 0x40, b: 0xff },
        ],
      ])
    })

    it('projects the band on the frame: longitude 1 to 2 is u 0.25 to 0.5', () => {
      const [hatch] = overlapHatches(
        yearOverlaps(squaresDocument(TWO_OVERLAPPING)),
        BBOX,
        COLOURS,
        NO_BAND
      ).hatches
      const us = (hatch?.rings.flat() ?? []).map(({ u }) => u)
      expect([Math.min(...us), Math.max(...us)]).toEqual([0.25, 0.5])
    })
  })

  describe('variants', () => {
    it('keeps every ring of a piece in two parts, for the cut’s even-odd rule', () => {
      // test2 claims a second square over test1's other end: the common ground is two separate squares.
      const document = squaresDocument(TWO_OVERLAPPING)
      const from = document.anchors.length
      document.anchors.push([-1, 40], [0.5, 40], [0.5, 41], [-1, 41])
      document.anchorSource.push(0, 0, 0, 0)
      document.claims.push({ polity: 'test2', rings: [[from, from + 1, from + 2, from + 3]] })
      const [hatch] = overlapHatches(yearOverlaps(document), BBOX, COLOURS, NO_BAND).hatches
      expect(hatch?.rings).toHaveLength(2)
    })

    it('puts the south edge of the frame at v 1', () => {
      const [hatch] = overlapHatches(
        yearOverlaps(squaresDocument(TWO_OVERLAPPING)),
        BBOX,
        COLOURS,
        NO_BAND
      ).hatches
      const vs = (hatch?.rings.flat() ?? []).map(({ v }) => v)
      expect(Math.max(...vs)).toBeCloseTo(1, 9)
    })
  })

  describe('a contested vassal', () => {
    // The dev, 2026-11-09: a contested vassal keeps its band at the zoom, as any vassal.
    it('gives a piece the depth of the first of its polities that wears the band', () => {
      const [hatch] = overlapHatches(
        yearOverlaps(squaresDocument(TWO_OVERLAPPING)),
        BBOX,
        COLOURS,
        (polity) => (polity === 'test2' ? 1 : 0)
      ).hatches
      expect(hatch?.bandDepth).toBe(1)
    })

    it('gives a piece of sovereigns alone no band', () => {
      const [hatch] = overlapHatches(
        yearOverlaps(squaresDocument(TWO_OVERLAPPING)),
        BBOX,
        COLOURS,
        NO_BAND
      ).hatches
      expect(hatch?.bandDepth).toBe(0)
    })
  })

  describe('managed errors', () => {
    it('hands no refusal back for a year the geometry accepts', () => {
      expect(
        overlapHatches(yearOverlaps(squaresDocument(TWO_OVERLAPPING)), BBOX, COLOURS, NO_BAND)
          .refused
      ).toEqual([])
    })

    it('hands a refused pair through, with nothing to hatch for it', () => {
      vi.spyOn(overlapsModule, 'pairOverlap').mockImplementation(() => {
        throw new Error('degenerate ring')
      })
      const { hatches, refused } = overlapHatches(
        yearOverlaps(squaresDocument(TWO_OVERLAPPING)),
        BBOX,
        COLOURS,
        NO_BAND
      )
      expect([hatches, refused]).toEqual([
        [],
        [{ a: 'test1', b: 'test2', reason: 'degenerate ring' }],
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('throws when a polity of a piece has no colour — every polity is coloured, so a defect', () => {
      expect(() =>
        overlapHatches(yearOverlaps(squaresDocument(TWO_OVERLAPPING)), BBOX, new Map(), NO_BAND)
      ).toThrow(/"test1" has no colour/)
    })
  })

  describe('edge cases', () => {
    it('hatches nothing in a year without an overlap', () => {
      const { hatches } = overlapHatches(
        yearOverlaps(
          squaresDocument([
            TWO_OVERLAPPING[0] ?? { id: 'x', square: [0, 40, 1], colour: '#000000' },
          ])
        ),
        BBOX,
        COLOURS,
        NO_BAND
      )
      expect(hatches).toEqual([])
    })
  })
})
