import { describe, expect, it } from 'vitest'

import {
  chainSegments,
  clearOverride,
  coveringRun,
  dressPair,
  dressSegments,
} from './borderOverrides'
import { sharedBorderDocument } from './documentFixtures'

describe('chainSegments', () => {
  describe('happy path', () => {
    it('chains consecutive segments into one run, from one end', () => {
      expect(
        chainSegments([
          [1, 2],
          [2, 3],
          [3, 4],
        ])
      ).toEqual([[1, 2, 3, 4]])
    })
  })

  describe('variants', () => {
    it('chains segments given in any order and either way round', () => {
      const [run] = chainSegments([
        [3, 4],
        [2, 1],
        [3, 2],
      ])
      expect(run === undefined ? [] : [...run].sort()).toEqual([1, 2, 3, 4])
    })

    it('keeps two separate stretches apart', () => {
      expect(
        chainSegments([
          [1, 2],
          [7, 8],
        ])
      ).toHaveLength(2)
    })

    it('walks a closed loop once', () => {
      const [run] = chainSegments([
        [1, 2],
        [2, 3],
        [3, 1],
      ])
      expect(run).toHaveLength(4)
      expect(run?.[0]).toBe(run?.at(-1))
    })
  })

  describe('managed errors', () => {
    it('drops a segment from an anchor to itself', () => {
      expect(chainSegments([[5, 5]])).toEqual([])
    })
  })

  // L4: N/A — pure; the segments come from the marquee or a stored run.

  describe('edge cases', () => {
    it('stops at a fork rather than choosing a branch', () => {
      const runs = chainSegments([
        [1, 2],
        [2, 3],
        [2, 4],
      ])
      expect(runs).toHaveLength(3)
      expect(runs.every((run) => run.length === 2)).toBe(true)
    })

    it('counts a repeated segment once', () => {
      expect(
        chainSegments([
          [1, 2],
          [2, 1],
        ])
      ).toEqual([[1, 2]])
    })
  })
})

describe('dressSegments, dressPair, clearOverride', () => {
  describe('happy path', () => {
    it('dresses a stretch, which then covers its segments', () => {
      const doc = sharedBorderDocument()
      expect(dressSegments(doc, [[1, 2]], 'dotted')).toBe(true)
      expect(doc.runs).toEqual([{ run: [1, 2], hand: 'dotted', source: null, note: null }])
      expect(coveringRun(doc, 2, 1)).toBe(0)
    })

    it('dresses a whole limit between two polities', () => {
      const doc = sharedBorderDocument()
      dressPair(doc, ['hre', 'fr-couronne'], 'double')
      expect(doc.pairs).toEqual([
        {
          between: ['hre', 'fr-couronne'],
          type: 'indefinite',
          hand: 'double',
          source: null,
          note: null,
        },
      ])
    })
  })

  describe('variants', () => {
    it('takes a re-dressed segment out of an older stretch, which keeps the rest of itself', () => {
      const doc = sharedBorderDocument()
      dressSegments(
        doc,
        [
          [0, 1],
          [1, 2],
          [2, 3],
        ],
        'dashed'
      )
      dressSegments(doc, [[1, 2]], 'double')
      const hands = (a: number, b: number) => doc.runs[coveringRun(doc, a, b)]?.hand
      expect([hands(0, 1), hands(1, 2), hands(2, 3)]).toEqual(['dashed', 'double', 'dashed'])
    })

    it('gives segments back to the pair and the rule with a null hand', () => {
      const doc = sharedBorderDocument()
      dressSegments(
        doc,
        [
          [0, 1],
          [1, 2],
        ],
        'dashed'
      )
      dressSegments(doc, [[1, 2]], null)
      expect(coveringRun(doc, 1, 2)).toBe(-1)
      expect(coveringRun(doc, 0, 1)).toBeGreaterThanOrEqual(0)
    })

    it('replaces a pair’s hand, and keeps the fact it states', () => {
      const doc = sharedBorderDocument()
      doc.pairs.push({
        between: ['fr-couronne', 'hre'],
        type: 'contested',
        hand: 'double',
        source: null,
        note: null,
      })
      dressPair(doc, ['fr-couronne', 'hre'], null)
      expect(doc.pairs).toEqual([
        {
          between: ['fr-couronne', 'hre'],
          type: 'contested',
          hand: null,
          source: null,
          note: null,
        },
      ])
    })
  })

  describe('managed errors', () => {
    it('refuses to dress nothing, and changes nothing', () => {
      const doc = sharedBorderDocument()
      expect(dressSegments(doc, [], 'dotted')).toBe(false)
      expect(doc.runs).toEqual([])
    })

    it('refuses a pair of one polity with itself', () => {
      expect(dressPair(sharedBorderDocument(), ['hre', 'hre'], 'dotted')).toBe(false)
    })

    it('refuses to clear an override that does not exist', () => {
      expect(clearOverride(sharedBorderDocument(), 'run', 0)).toBe(false)
    })
  })

  // L4: N/A — pure edits on a document the readers validated.

  describe('edge cases', () => {
    it('removes a pair entry left with nothing to say', () => {
      const doc = sharedBorderDocument()
      dressPair(doc, ['fr-couronne', 'hre'], 'dotted')
      dressPair(doc, ['fr-couronne', 'hre'], null)
      expect(doc.pairs).toEqual([])
    })

    it('clears one override and only that one', () => {
      const doc = sharedBorderDocument()
      dressSegments(doc, [[0, 1]], 'dotted')
      dressSegments(doc, [[2, 3]], 'dashed')
      expect(clearOverride(doc, 'run', 0)).toBe(true)
      expect(doc.runs.map((run) => run.hand)).toEqual(['dashed'])
    })
  })
})
