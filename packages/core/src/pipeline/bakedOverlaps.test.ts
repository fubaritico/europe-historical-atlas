import { describe, expect, it } from 'vitest'

import { TWO_OVERLAPPING, squaresDocument } from '../data/testing/overlapFixtures'
import { openYearDocument, saveYearDocument } from '../data/yearDocument'
import { yearOverlaps } from '../data/yearOverlaps'

import {
  BAKED_OVERLAPS_VERSION,
  bakedOverlapsPath,
  overlapsKey,
  readBakedOverlaps,
} from './bakedOverlaps'

import type { BakedOverlaps } from './bakedOverlaps'

// ATLAS-399: the overlaps computed at the build, and the key the page checks them against.

/** test1 and test2 overlapping, as the files on disk say. */
const YEAR = { year: 1100, ...saveYearDocument(squaresDocument(TWO_OVERLAPPING)) }

/**
 * The file the build writes for a year (`bake/bakeYearOverlaps` in the atlas).
 * @param year - the year
 * @returns its content
 */
function bakeYearOverlaps(year: typeof YEAR): BakedOverlaps {
  return {
    version: BAKED_OVERLAPS_VERSION,
    key: overlapsKey(year),
    overlaps: yearOverlaps(openYearDocument(year)),
  }
}

describe('overlapsKey and the file', () => {
  describe('happy path', () => {
    it('writes test1 and test2’s shared band under the year’s key, readable back', () => {
      const baked = bakeYearOverlaps(YEAR)
      const read = readBakedOverlaps(JSON.parse(JSON.stringify(baked)), 'overlaps.json')
      expect([
        read.key === overlapsKey(YEAR),
        read.overlaps.pieces.map(({ polities }) => polities),
      ]).toEqual([true, [['test1', 'test2']]])
    })
  })

  describe('variants', () => {
    it('writes the file where the page fetches it, whatever the trailing slash', () => {
      expect([bakedOverlapsPath('/years/', 1100), bakedOverlapsPath('years', 1200)]).toEqual([
        '/years/1100/overlaps.json',
        'years/1200/overlaps.json',
      ])
    })
  })

  // L3, L4: the reader's refusals, below.

  describe('edge cases', () => {
    it('keys a year moved since the build otherwise, so the page computes it again', () => {
      const moved = structuredClone(YEAR)
      moved.polities.anchors[0] = [0.5, 40]
      expect(overlapsKey(moved)).not.toBe(overlapsKey(YEAR))
    })

    it('keys a year whose borders alone were restyled the same: they move no ground', () => {
      const restyled = {
        ...YEAR,
        borders: { ...YEAR.borders, pairs: [{ a: 'test1', b: 'test2', hand: 'contested' }] },
      } as unknown as typeof YEAR
      expect(JSON.stringify(restyled.borders)).not.toBe(JSON.stringify(YEAR.borders))
      expect(overlapsKey(restyled)).toBe(overlapsKey(YEAR))
    })
  })
})

describe('readBakedOverlaps', () => {
  describe('managed errors', () => {
    it('refuses a file of another version, naming the field', () => {
      const other = { ...bakeYearOverlaps(YEAR), version: BAKED_OVERLAPS_VERSION + 1 }
      expect(() => readBakedOverlaps(other, '/years/1100/overlaps.json')).toThrow(
        /\/years\/1100\/overlaps\.json is not a year's baked overlaps: version/
      )
    })

    it('refuses a piece of one polity: an overlap is two at least', () => {
      const baked = bakeYearOverlaps(YEAR)
      const lone = {
        ...baked,
        overlaps: {
          ...baked.overlaps,
          pieces: [{ polities: ['test1'], area: baked.overlaps.pieces[0]?.area ?? [] }],
        },
      }
      expect(() => readBakedOverlaps(lone, 'f')).toThrow(/overlaps\.pieces\.0\.polities/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses what is not an object at all', () => {
      expect(() => readBakedOverlaps('nonsense', 'f')).toThrow(/is not a year's baked overlaps/)
    })
  })
})
