import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { createNewMap } from './newMap'
import { persistenceWords } from './persistenceWords'
import { YearChangedOnDisk } from './yearArchive'

import type { NewMapDeps } from './newMap'

/** The world a new map is made in, every collaborator a spy. */
function world(
  over: { leaves?: boolean; save?: () => Promise<never>; current?: string } = {}
): NewMapDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    archive: {
      save: (document, map) => {
        calls.push(`write ${map} of ${String(document.year)}`)
        return over.save === undefined
          ? Promise.resolve({ map, polities: 0, vertices: 0 })
          : over.save()
      },
    },
    emptyYear: createYearDocument,
    current: () => over.current ?? null,
    leave: (map) => {
      calls.push(`leave for ${map}`)
      return Promise.resolve(over.leaves ?? true)
    },
    open: (map) => calls.push(`open ${map}`),
    words: () => persistenceWords('en'),
  }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createNewMap', () => {
  describe('happy path', () => {
    it('leaves the map open, writes an empty map of the year, then opens it', async () => {
      const deps = world()
      expect(await createNewMap(deps, { year: '1110', name: '1110-essai' })).toEqual({ done: true })
      expect(deps.calls).toEqual([
        'leave for 1110-essai',
        'write 1110-essai of 1110',
        'open 1110-essai',
      ])
    })
  })

  describe('variants', () => {
    it('makes the map of a year under that year’s name', async () => {
      const deps = world()
      expect(await createNewMap(deps, { year: '1110', name: '1110' })).toEqual({ done: true })
      expect(deps.calls).toContain('write 1110 of 1110')
    })

    it('takes a year before the Common Era, and trims what was typed', async () => {
      const deps = world()
      expect(await createNewMap(deps, { year: ' -50 ', name: ' gaule ' })).toEqual({ done: true })
      expect(deps.calls).toContain('write gaule of -50')
    })
  })

  describe('managed errors', () => {
    it.each([
      ['a year that is not one', { year: '11 10', name: 'essai' }, 'year', 'A year is written'],
      [
        'a name that cannot be a folder’s',
        { year: '1110', name: 'a/b' },
        'name',
        'letters, digits',
      ],
      [
        'a name that is another year',
        { year: '1110', name: '1200' },
        'name',
        'map of the year 1200',
      ],
    ])(
      'refuses %s under its field, asking and writing nothing',
      async (_case, typed, field, said) => {
        const deps = world()
        const outcome = await createNewMap(deps, typed)
        expect(outcome).toEqual({
          done: false,
          refusal: { field, text: expect.stringContaining(said) as string },
        })
        expect(deps.calls).toEqual([])
      }
    )

    it('refuses a map that exists already, writing over nothing', async () => {
      const deps = world({ save: () => Promise.reject(new YearChangedOnDisk('1100', 0)) })
      const outcome = await createNewMap(deps, { year: '1100', name: '1100' })
      expect(outcome).toEqual({
        done: false,
        refusal: { field: 'name', text: 'A map named 1100 exists already — choose another name' },
      })
      expect(deps.calls).not.toContain('open 1100')
    })

    it('creates nothing when the map open is not left — said by its own question or alarm', async () => {
      const deps = world({ leaves: false })
      expect(await createNewMap(deps, { year: '1110', name: '1110' })).toEqual({
        done: false,
        refusal: null,
      })
      expect(deps.calls).toEqual(['leave for 1110'])
    })
  })

  // Review QUAL-001 of 2026-11-25: its fingerprint held by the page, the open map's write would pass.
  describe('the map open', () => {
    it('refuses a new map named like the map open, before asking or writing anything', async () => {
      const deps = world({ current: '1100' })
      expect(await createNewMap(deps, { year: '1100', name: '1100' })).toEqual({
        done: false,
        refusal: { field: 'name', text: 'A map named 1100 exists already — choose another name' },
      })
      expect(deps.calls).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('says a leaving that failed under the field, rather than leaving the form waiting', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const deps = world()
      deps.leave = () => Promise.reject(new Error('relay busy'))
      expect(await createNewMap(deps, { year: '1110', name: '1110' })).toEqual({
        done: false,
        refusal: { field: 'name', text: 'not written: relay busy' },
      })
      expect(console.error).toHaveBeenCalled()
    })

    it('says the server’s failure under the field, and opens nothing', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const deps = world({ save: () => Promise.reject(new Error('disk full')) })
      expect(await createNewMap(deps, { year: '1110', name: '1110' })).toEqual({
        done: false,
        refusal: { field: 'name', text: 'not written: disk full' },
      })
      expect(console.error).toHaveBeenCalled()
      expect(deps.calls).not.toContain('open 1110')
    })
  })

  describe('edge cases', () => {
    it('refuses an empty year rather than reading it as the year 0', async () => {
      const deps = world()
      const outcome = await createNewMap(deps, { year: '', name: 'essai' })
      expect(outcome).toEqual({
        done: false,
        refusal: { field: 'year', text: expect.stringContaining('A year is written') as string },
      })
    })
  })
})
