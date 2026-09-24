import { describe, expect, it } from 'vitest'

import {
  assetError,
  boundsMatch,
  expectArray,
  expectBounds,
  expectInteger,
  expectLonLat,
  expectNullableString,
  expectNumber,
  expectString,
  field,
  isAssetError,
  parseAsset,
} from './assetError'

const BOX = { west: 0, south: 0, east: 10, north: 10 }

/** Run a reader inside a parse, so a field complaint comes back as a described asset failure. */
function parsing<T>(read: () => T): () => T {
  return () => parseAsset('regions', '/x.json', read)
}

describe('assetError', () => {
  describe('happy path', () => {
    it('carries the asset, the kind, the source and what broke', () => {
      const error = assetError('heightmap', 'consistency', '/dem.bin', '3 samples, expected 9')
      expect(error.asset).toBe('heightmap')
      expect(error.failure).toBe('consistency')
      expect(error.source).toBe('/dem.bin')
      expect(error.detail).toBe('3 samples, expected 9')
      // The message is what a console shows; the fields are what the app acts on.
      expect(error.message).toContain('/dem.bin')
    })

    it('is recognisable among other failures', () => {
      expect(isAssetError(assetError('rivers', 'schema', '/r.json', 'bad'))).toBe(true)
      expect(isAssetError(new Error('offline'))).toBe(false)
      expect(isAssetError('offline')).toBe(false)
      expect(isAssetError(null)).toBe(false)
    })
  })

  describe('variants', () => {
    it('reports a schema complaint as a schema failure, naming the field', () => {
      try {
        parsing(() => expectNumber(field({ a: 'x' }, 'p')('a'), 'p.a'))()
        expect.unreachable('should have thrown')
      } catch (error: unknown) {
        expect(isAssetError(error)).toBe(true)
        if (!isAssetError(error)) return
        expect(error.failure).toBe('schema')
        expect(error.detail).toContain('p.a')
      }
    })

    it('leaves a failure that is not about a field alone', () => {
      // A parser that blows up for another reason must not be relabelled as a schema problem.
      expect(
        parsing(() => {
          throw new RangeError('out of memory')
        })
      ).toThrow(RangeError)
    })
  })

  describe('managed errors', () => {
    it('rejects a payload that is not an object at all', () => {
      expect(parsing(() => field([1, 2], 'payload'))).toThrow(/payload should be an object/)
      expect(parsing(() => field(null, 'payload'))).toThrow(/payload should be an object/)
    })

    it('rejects a number that is not finite', () => {
      expect(parsing(() => expectNumber(Number.NaN, 'p'))).toThrow(/finite number/)
      expect(parsing(() => expectNumber('3', 'p'))).toThrow(/finite number/)
    })

    it('rejects a count that is fractional or below its floor', () => {
      expect(parsing(() => expectInteger(2.5, 'p', 1))).toThrow(/whole number/)
      expect(parsing(() => expectInteger(0, 'p', 1))).toThrow(/at least 1/)
      expect(expectInteger(4, 'p', 1)).toBe(4)
    })

    it('accepts a name the dataset genuinely lacks, but not a number in its place', () => {
      expect(expectNullableString(null, 'p')).toBeNull()
      expect(expectNullableString(undefined, 'p')).toBeNull()
      expect(expectNullableString('Francia', 'p')).toBe('Francia')
      expect(parsing(() => expectNullableString(7, 'p'))).toThrow(/a string/)
    })

    it('rejects a box whose edges are the wrong way round', () => {
      // A north/south swap turns the whole map upside down and reports nothing.
      expect(parsing(() => expectBounds({ ...BOX, north: -5 }, 'b'))).toThrow(/north of south/)
      expect(parsing(() => expectBounds({ ...BOX, east: -5 }, 'b'))).toThrow(/east of west/)
      expect(expectBounds(BOX, 'b')).toEqual(BOX)
    })

    it('rejects a coordinate pair that is not two numbers', () => {
      expect(expectLonLat([2, 48], 'p')).toEqual([2, 48])
      expect(parsing(() => expectLonLat([2], 'p'))).toThrow(/pair/)
      expect(parsing(() => expectLonLat(['2', 48], 'p'))).toThrow(/p\[0\]/)
    })
  })

  describe('unmanaged errors', () => {
    it('describes what it found without printing it back whole', () => {
      // A payload can be megabytes; a message that embeds it is a message nobody can read.
      const long = 'x'.repeat(5000)
      expect(parsing(() => expectNumber(long, 'p'))).toThrow(/a long string/)
      expect(parsing(() => expectNumber({ deep: 1 }, 'p'))).toThrow(/an object/)
      expect(parsing(() => expectNumber([1, 2, 3], 'p'))).toThrow(/an array of 3/)
    })

    it('names a type it has nothing useful to print for', () => {
      expect(parsing(() => expectString(() => undefined, 'p'))).toThrow(/function/)
    })
  })

  describe('edge cases', () => {
    it('accepts an empty array where an array is expected', () => {
      expect(expectArray([], 'p')).toEqual([])
      expect(parsing(() => expectArray({}, 'p'))).toThrow(/an array/)
    })

    it('reads a missing field as undefined rather than throwing on the lookup', () => {
      expect(field({}, 'p')('nothing')).toBeUndefined()
    })
  })
})

describe('boundsMatch', () => {
  describe('happy path', () => {
    it('accepts two boxes describing the same frame', () => {
      expect(boundsMatch(BOX, { ...BOX })).toBe(true)
    })
  })

  describe('variants', () => {
    it('rejects a mask cropped to somewhere else', () => {
      // Internally valid, completely wrong: the coastline would simply land in the wrong place.
      expect(boundsMatch(BOX, { ...BOX, west: -45 })).toBe(false)
    })

    it('tolerates the rounding a JSON round trip introduces', () => {
      expect(boundsMatch(BOX, { ...BOX, north: 10 + 1e-9 })).toBe(true)
    })
  })

  // L3/L4: N/A — a pure comparison, nothing validated and nothing thrown.

  describe('edge cases', () => {
    it('takes the tolerance it is given', () => {
      expect(boundsMatch(BOX, { ...BOX, north: 10.5 }, 1)).toBe(true)
      expect(boundsMatch(BOX, { ...BOX, north: 10.5 }, 0.1)).toBe(false)
    })
  })
})
