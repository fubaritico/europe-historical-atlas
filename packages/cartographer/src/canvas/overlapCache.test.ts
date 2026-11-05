import { afterEach, describe, expect, it, vi } from 'vitest'

import * as overlaps from '@europe-historical-atlas/core/editor/overlaps'
import { createYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { createOverlapCache } from './overlapCache'

import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

// CARTO-364 — the overlaps hatched, computed again only where a gesture moved something; a refusal of the geometry
// skipped and said (the dev, 2026-11-06).

vi.mock('@europe-historical-atlas/core/editor/overlaps', async (original) => {
  const actual = await original<typeof overlaps>()
  return { ...actual, pairOverlap: vi.fn(actual.pairOverlap), addOverlap: vi.fn(actual.addOverlap) }
})

/**
 * The geometry refusing a degenerate shape.
 * @throws always
 */
function refuse(): never {
  throw new Error('degenerate segment')
}

afterEach(() => {
  vi.mocked(overlaps.pairOverlap).mockClear()
  vi.mocked(overlaps.addOverlap).mockClear()
})

/**
 * A square of anchors claimed by a polity of its own.
 * @param document - the document
 * @param polity - who claims it
 * @param west - its west edge
 * @param south - its south edge
 * @param side - its side
 */
function square(
  document: YearDocument,
  polity: string,
  [west, south, side]: [number, number, number]
): void {
  const from = document.anchors.length
  document.anchors.push(
    [west, south],
    [west + side, south],
    [west + side, south + side],
    [west, south + side]
  )
  document.anchorSource.push(0, 0, 0, 0)
  document.polities.push({
    id: polity,
    name: polity,
    rank: 'kingdom',
    status: 'country',
    suzerain: null,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  })
  document.claims.push({ polity, rings: [[from, from + 1, from + 2, from + 3]] })
}

/**
 * France and the Empire overlapping, and Rus far away.
 * @returns the document
 */
function threePolities(): YearDocument {
  const document = createYearDocument(1100)
  square(document, 'france', [0, 0, 2])
  square(document, 'empire', [1, 0, 2])
  square(document, 'rus', [0, 1.5, 1])
  return document
}

/**
 * A cache whose backdrop is ten pixels a degree, and its log.
 * @returns the cache and the log
 */
function cache(): {
  overlapsOf: ReturnType<typeof createOverlapCache>['overlapsOf']
  log: ReturnType<typeof vi.fn>
} {
  const log = vi.fn()
  const made = createOverlapCache(([x, y]) => [x * 10, y * 10], log)
  return { overlapsOf: made.overlapsOf, log }
}

describe('createOverlapCache', () => {
  describe('happy path', () => {
    it('gives each overlap with its polities, in backdrop pixels', () => {
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 2])
      square(document, 'empire', [1, 0, 2])

      const { pieces, refused } = cache().overlapsOf(document, 1)

      expect(pieces.map((piece) => piece.polities)).toEqual([['france', 'empire']])
      const xs = pieces[0]?.rings.flat().map(([x]) => x) ?? []
      expect([Math.min(...xs), Math.max(...xs)]).toEqual([10, 20])
      expect(refused).toEqual([])
    })

    it('hands back the same answer at the same version, computing nothing', () => {
      const { overlapsOf } = cache()
      const document = threePolities()
      const first = overlapsOf(document, 1)
      vi.mocked(overlaps.pairOverlap).mockClear()

      expect(overlapsOf(document, 1)).toBe(first)
      expect(overlaps.pairOverlap).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('intersects again only the pairs of a polity a gesture moved', () => {
      const { overlapsOf } = cache()
      const document = threePolities()
      overlapsOf(document, 1)
      vi.mocked(overlaps.pairOverlap).mockClear()
      // Rus moves: its pairs with France and the Empire are computed again, France with the Empire is not.
      document.anchors[8] = [0.1, 1.5]
      overlapsOf(document, 2)

      const pairs = vi.mocked(overlaps.pairOverlap).mock.calls.map(([a, b]) => [a.polity, b.polity])
      expect(pairs).toEqual([
        ['france', 'rus'],
        ['empire', 'rus'],
      ])
    })

    it('follows an outline moved off its neighbour: the overlap is gone', () => {
      const { overlapsOf } = cache()
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 2])
      square(document, 'empire', [1, 0, 2])
      overlapsOf(document, 1)
      document.anchors[4] = [2, 0]
      document.anchors[7] = [2, 2]

      expect(overlapsOf(document, 2).pieces).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('skips a pair the geometry refuses, says it in the log, and hatches the rest', () => {
      const { overlapsOf, log } = cache()
      vi.mocked(overlaps.pairOverlap).mockImplementationOnce(() => {
        throw new Error('degenerate segment')
      })

      const { pieces, refused } = overlapsOf(threePolities(), 1)

      expect(refused).toEqual([{ a: 'france', b: 'empire' }])
      expect(
        pieces.some(
          (piece) => piece.polities.includes('empire') && piece.polities.includes('france')
        )
      ).toBe(false)
      expect(pieces.length).toBeGreaterThan(0)
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('"france" and "empire" could not be computed')
      )
    })

    it('says a refused pair once, while neither of its outlines moves', () => {
      const { overlapsOf, log } = cache()
      const document = threePolities()
      vi.mocked(overlaps.pairOverlap).mockImplementationOnce(() => {
        throw new Error('degenerate segment')
      })
      overlapsOf(document, 1)
      log.mockClear()

      expect(overlapsOf(document, 2).refused).toEqual([])
      expect(log).not.toHaveBeenCalled()
    })

    it('refuses a polity whose shape the geometry cannot read, alone', () => {
      const { overlapsOf } = cache()
      const document = threePolities()
      document.anchors[1] = [Number.NaN, 0]

      expect(overlapsOf(document, 1).refused).toEqual([{ a: 'france', b: null }])
    })
  })

  describe('managed errors — the cut', () => {
    it('skips a pair whose cut against the others is refused, and says it', () => {
      const { overlapsOf, log } = cache()
      vi.mocked(overlaps.addOverlap).mockImplementationOnce(() => {
        throw new Error('degenerate segment')
      })

      expect(overlapsOf(threePolities(), 1).refused).toEqual([{ a: 'france', b: 'empire' }])
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('could not be cut against the others')
      )
    })

    // Review ARCH-001: a cut is tried again at each version, and was said again on every gesture anywhere.
    it('says a refused cut once while neither outline moves, however many gestures elsewhere', () => {
      const { overlapsOf, log } = cache()
      const document = threePolities()
      vi.mocked(overlaps.addOverlap).mockImplementationOnce(refuse)
      overlapsOf(document, 1)
      log.mockClear()
      vi.mocked(overlaps.addOverlap).mockImplementationOnce(refuse)

      expect(overlapsOf(document, 2).refused).toEqual([])
      expect(log).not.toHaveBeenCalled()
    })

    it('says a refused cut again once one of its outlines moved', () => {
      const { overlapsOf } = cache()
      const document = threePolities()
      vi.mocked(overlaps.addOverlap).mockImplementationOnce(refuse)
      overlapsOf(document, 1)
      document.anchors[5] = [3.1, 0]
      vi.mocked(overlaps.addOverlap).mockImplementationOnce(refuse)

      expect(overlapsOf(document, 2).refused).toEqual([{ a: 'france', b: 'empire' }])
    })
  })

  describe('unmanaged errors', () => {
    it('lets a refusal from the projection through — it is not the geometry’s', () => {
      const made = createOverlapCache(() => {
        throw new Error('no frame')
      }, vi.fn())
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 2])
      square(document, 'empire', [1, 0, 2])

      expect(() => made.overlapsOf(document, 1)).toThrow('no frame')
    })
  })

  describe('edge cases', () => {
    // Review QUAL-002: rings combined even-odd in one claim, or united across two, are two shapes for the same points.
    it('shapes a polity again when its rings move from one claim to two', () => {
      const { overlapsOf } = cache()
      const document = createYearDocument(1100)
      square(document, 'france', [0, 0, 4])
      square(document, 'hole', [1, 1, 2])
      square(document, 'empire', [1.5, 1.5, 1])
      const [outer, inner] = document.claims
      if (outer === undefined || inner === undefined) throw new Error('fixture')
      outer.rings.push(...inner.rings)
      inner.rings = []
      document.claims.splice(1, 1)
      // France with a hole where the Empire lies: nothing shared.
      expect(overlapsOf(document, 1).pieces.filter((p) => p.polities.includes('empire'))).toEqual(
        []
      )
      const second = outer.rings.pop()
      if (second !== undefined) document.claims.push({ polity: 'france', rings: [second] })

      expect(overlapsOf(document, 2).pieces.some((p) => p.polities.includes('empire'))).toBe(true)
    })

    it('gives nothing for a map with no polity', () => {
      expect(cache().overlapsOf(createYearDocument(1100), 1)).toEqual({ pieces: [], refused: [] })
    })
  })
})
