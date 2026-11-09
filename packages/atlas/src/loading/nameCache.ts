/**
 * The names a year was given, kept for the page's life (ATLAS-333, step 2): placing a year's names takes about 2.5 s
 * in their worker, and a reader who goes back to a year asks for the very same placement again.
 *
 * **Keyed by what the names are made from, never by the year's number alone**: the year's own content — its anchors,
 * its outlines, its registry — and the names' settings. A year saved again in the Cartographer has another key, so its
 * names are placed anew rather than shown stale; a setting moved in the panel likewise.
 */

import { fingerprint } from '@europe-historical-atlas/core/utils/fingerprint'

import type { NameSheet } from '../sources/mapSources'
import type { AuthoredYear } from '@europe-historical-atlas/core/data/yearFormat'
import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

/** A year's names as the map lays them: every level's placement, and the sheet their letters are cut from. */
export interface CachedNames {
  /** Every level's names. */
  readonly placed: YearNames
  /** The letters' sheet and measures. */
  readonly sheet: NameSheet
}

/** The names already placed, by what they were placed from. */
export interface NameCache {
  /**
   * The names placed from this key, if any — and the key counts as used, so it is the last one dropped.
   * @param key - from {@link namesKey}
   * @returns the names, or `undefined` when none were placed from it
   */
  get(key: string): CachedNames | undefined
  /**
   * Keep names placed from a key, dropping the least recently used once past the limit.
   * @param key - from {@link namesKey}
   * @param names - the names
   */
  set(key: string, names: CachedNames): void
}

/**
 * How many placements are kept. A placement holds two canvases — the letters and their halo field — each about
 * 2048 × 510 pixels on 1100's 56 characters, so ~8 MB a placement (computed from `glyphSheet`'s layout, 2026-11-02):
 * six keep the last years a reader went through, ~50 MB at most. Every move of a names setting in the panel makes a
 * key of its own, which is why the bound is low.
 */
export const NAME_CACHE_LIMIT = 6

/**
 * An empty cache.
 * @param limit - how many placements it keeps
 * @returns the cache
 * @throws when the limit is not a positive whole number — a cache that keeps nothing is a wiring fault
 */
export function createNameCache(limit: number = NAME_CACHE_LIMIT): NameCache {
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error(`[atlas] a name cache keeps a whole number of placements, not ${String(limit)}`)
  // A Map iterates in insertion order: re-inserting on use keeps the least recently used first.
  const entries = new Map<string, CachedNames>()
  return {
    get(key) {
      const names = entries.get(key)
      if (names === undefined) return undefined
      entries.delete(key)
      entries.set(key, names)
      return names
    },
    set(key, names) {
      entries.delete(key)
      entries.set(key, names)
      for (const oldest of entries.keys()) {
        if (entries.size <= limit) break
        entries.delete(oldest)
      }
    },
  }
}

/**
 * The key a year's names are kept under: the year's content, and everything else the placement reads — the names'
 * settings, the frame the year is projected in, the names' grid. Fingerprinting the year costs ~20 ms on a year of
 * 57,000 anchors, ~3 ms on 8,000 (measured 2026-11-02), once a request.
 * @param year - the authored year, as read from its files
 * @param placement - the names' settings, every one of them (a setting that only paints still changes the key, which
 *   costs a placement and never shows a wrong one), the frame and the grid
 * @returns the key
 */
export function namesKey(year: AuthoredYear, placement: object): string {
  return `${fingerprint(JSON.stringify(year))}|${JSON.stringify(placement)}`
}
