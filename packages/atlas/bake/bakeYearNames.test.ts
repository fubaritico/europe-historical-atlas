import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAuthoredYearSource } from '@europe-historical-atlas/core/data/yearManifest'

import { namesKey } from '../src/loading/nameCache'
import { AUTHORED_FILES, META } from '../src/loading/testing/yearFixtures'
import { createDevState } from '../src/tunables/devState'
import { DEFAULT_NAME_PARAMS } from '../src/tunables/params'

import { bakeYearNames } from './bakeYearNames'

import type { RegionSource } from '@europe-historical-atlas/core/data/regionSource'

/** The manifest listing the fixture's year, on the fixture's frame. */
const MANIFEST = { version: 1, bbox: META.bbox, years: [1100] }

/** Every character measured alike: the placement's outcome is not this test's subject. */
const MEASURE = (characters: readonly string[]) =>
  Object.fromEntries(characters.map((c) => [c, { advance: 0.5, ascent: 0.7, descent: 0.2 }]))

/**
 * The bake's inputs for the fixture's year.
 * @param params - the names' settings
 * @returns the inputs
 */
function inputs(params = { ...DEFAULT_NAME_PARAMS }) {
  return {
    year: 1100,
    files: {
      registry: AUTHORED_FILES.registry,
      polities: AUTHORED_FILES.polities,
      borders: AUTHORED_FILES.borders,
    },
    manifest: MANIFEST,
    heightmapMeta: META,
    measure: MEASURE,
    params,
  }
}

/**
 * The key the page computes for the fixture's year, along the page's own road: the year fetched and read by the
 * authored source, the names' settings as the page opens with them (`createDevState`).
 * @returns the key
 */
async function pageKey(): Promise<string> {
  const files: Record<string, unknown> = {
    '/years/index.json': MANIFEST,
    '/years/1100/registry.json': AUTHORED_FILES.registry,
    '/years/1100/polities.json': AUTHORED_FILES.polities,
    '/years/1100/borders.json': AUTHORED_FILES.borders,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(new Response(JSON.stringify(files[url]), { status: 200 }))
    )
  )
  const unauthored: RegionSource = { load: () => Promise.reject(new Error('not authored')) }
  const loaded = await createAuthoredYearSource({
    manifestUrl: '/years/index.json',
    yearsBase: '/years',
    unauthored,
  }).load(1100)
  if (loaded.authored === undefined) throw new Error('fixture: not an authored year')
  return namesKey(loaded.authored.year, {
    names: createDevState().names,
    bbox: loaded.authored.bbox,
    grid: META,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ATLAS-333: the names placed at the build are laid only under the page's key — so the two keys must be one.
describe('bakeYearNames', () => {
  describe('happy path', () => {
    it('bakes under the very key the page computes for the year it fetched', async () => {
      expect(bakeYearNames(inputs()).key).toBe(await pageKey())
    })
  })

  describe('variants', () => {
    it('bakes under another key once a setting differs from the page’s', async () => {
      const moved = bakeYearNames(inputs({ ...DEFAULT_NAME_PARAMS, capitals: true }))
      expect(moved.key).not.toBe(await pageKey())
    })

    it('measures every character the names hold, the leader’s dot with them', () => {
      const measure = vi.fn(MEASURE)
      bakeYearNames({ ...inputs(), measure })
      const asked = measure.mock.calls[0]?.[0] ?? []
      expect(asked).toContain('·')
      expect(new Set(asked).size).toBe(asked.length)
    })
  })

  describe('managed errors', () => {
    it('refuses a year whose files do not read, naming the file', () => {
      expect(() =>
        bakeYearNames({ ...inputs(), files: { ...inputs().files, registry: { version: 'x' } } })
      ).toThrow('/years/1100/registry.json')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a relief frame that is not one', () => {
      expect(() => bakeYearNames({ ...inputs(), heightmapMeta: { width: 'wide' } })).toThrow()
    })
  })

  describe('edge cases', () => {
    it('places every level of the year, on the names’ grid', () => {
      const { names } = bakeYearNames(inputs())
      expect(names.levels.length).toBeGreaterThan(0)
      expect(names.gridWidth).toBe(1200)
    })
  })
})
