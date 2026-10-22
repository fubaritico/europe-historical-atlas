import { describe, expect, it } from 'vitest'

import { ZONES } from './zones'

/** Every source file of the package that may mount a boundary, by its text — its tests left out. */
const SOURCES = import.meta.glob<string>(
  ['../../../**/*.tsx', '../../../*.tsx', '!**/*.test.tsx'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  }
)

/** The zones named by a `zone="…"` literal across the sources — a boundary's, or a panel's. */
const named = new Set(
  Object.values(SOURCES).flatMap((text) => [...text.matchAll(/zone="([a-z-]+)"/g)].map((m) => m[1]))
)

describe('ZONES', () => {
  describe('happy path', () => {
    // The type keeps a call site inside the list; nothing else keeps the list from naming a zone no boundary
    // stands in — and `?break=` would accept it and break nothing (review ARCH-002, 2026-10-22).
    it('names only zones a boundary stands in', () => {
      expect(ZONES.filter((zone) => !named.has(zone))).toEqual([])
    })
  })

  describe('variants', () => {
    it('reads the root boundary of main.tsx as well as the components', () => {
      expect(named.has('cartographer')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('holds no zone twice', () => {
      expect(new Set(ZONES).size).toBe(ZONES.length)
    })
  })

  describe('unmanaged errors', () => {
    it('finds sources to read, so an empty glob cannot pass the first test by reading nothing', () => {
      expect(Object.keys(SOURCES).length).toBeGreaterThan(50)
    })
  })

  describe('edge cases', () => {
    it('names every zone in the stable form `?break=` takes: lower case and hyphens', () => {
      expect(ZONES.filter((zone) => !/^[a-z]+(-[a-z]+)*$/.test(zone))).toEqual([])
    })
  })
})
