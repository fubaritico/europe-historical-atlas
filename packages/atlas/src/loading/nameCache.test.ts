import { describe, expect, it } from 'vitest'

import { NAME_GRID_WIDTH } from '@europe-historical-atlas/core/pipeline/yearNames'

import { createNameCache, namesKey } from './nameCache'
import { AUTHORED_FILES } from './testing/yearFixtures'

import type { CachedNames } from './nameCache'
import type { NameSheet } from '../sources/mapSources'

/**
 * A placement standing for a year's names.
 * @param tag - what tells it from another
 * @returns the names
 */
function names(tag: number): CachedNames {
  return {
    placed: { levels: [], gridWidth: NAME_GRID_WIDTH, gridHeight: tag, unnamed: [] },
    sheet: {} as NameSheet,
  }
}

describe('createNameCache', () => {
  describe('happy path', () => {
    it('gives back what was kept under a key', () => {
      const cache = createNameCache()
      const kept = names(1)
      cache.set('a', kept)
      expect(cache.get('a')).toBe(kept)
    })
  })

  describe('variants', () => {
    it('replaces what a key held when set again', () => {
      const cache = createNameCache()
      const second = names(2)
      cache.set('a', names(1))
      cache.set('a', second)
      expect(cache.get('a')).toBe(second)
    })

    it('drops the least recently used past its limit, a key read counting as used', () => {
      const cache = createNameCache(2)
      cache.set('a', names(1))
      cache.set('b', names(2))
      cache.get('a')
      cache.set('c', names(3))
      expect([cache.get('a') !== undefined, cache.get('b'), cache.get('c') !== undefined]).toEqual([
        true,
        undefined,
        true,
      ])
    })
  })

  describe('managed errors', () => {
    it('refuses a limit that would keep nothing', () => {
      expect(() => createNameCache(0)).toThrow('whole number')
      expect(() => createNameCache(1.5)).toThrow('whole number')
    })
  })

  // L4: N/A — no async work, nothing external.

  describe('edge cases', () => {
    it('answers nothing for a key never kept', () => {
      expect(createNameCache().get('never')).toBeUndefined()
    })

    it('keeps one placement with a limit of one', () => {
      const cache = createNameCache(1)
      cache.set('a', names(1))
      cache.set('b', names(2))
      expect([cache.get('a'), cache.get('b')?.placed.gridHeight]).toEqual([undefined, 2])
    })
  })
})

describe('namesKey', () => {
  it('gives the same key for the same year and settings', () => {
    expect(namesKey(AUTHORED_FILES, { capitals: false })).toBe(
      namesKey(structuredClone(AUTHORED_FILES), { capitals: false })
    )
  })

  it('gives another key when an anchor moved', () => {
    const moved = structuredClone(AUTHORED_FILES)
    const anchor = moved.polities.anchors[0]
    if (anchor === undefined) throw new Error('no anchor in the test year')
    anchor[0] += 0.000001
    expect(namesKey(moved, {})).not.toBe(namesKey(AUTHORED_FILES, {}))
  })

  it('gives another key when a setting changed', () => {
    expect(namesKey(AUTHORED_FILES, { capitals: true })).not.toBe(
      namesKey(AUTHORED_FILES, { capitals: false })
    )
  })
})
