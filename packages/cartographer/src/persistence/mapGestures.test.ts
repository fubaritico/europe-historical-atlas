import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { createMapGestures } from './mapGestures'
import { persistenceWords } from './persistenceWords'

import type { MapGesturesDeps } from './mapGestures'
import type { YearSession } from './yearSession'

/**
 * A map's session that records its calls.
 * @param calls - where the calls go
 * @param modified - whether the map open changed
 * @returns the session
 */
function mapSession(calls: string[], modified: boolean): YearSession {
  return {
    openOnStartup: () => Promise.resolve(),
    save: () => {
      calls.push('save')
      return Promise.resolve(true)
    },
    saveAs: (name) => {
      calls.push(`save as ${name}`)
      return Promise.resolve({ done: true })
    },
    saveCopy: () => Promise.resolve(true),
    saveSilently: () => Promise.resolve(),
    map: () => '1100',
    isModified: () => modified,
    phase: () => 'ready',
  }
}

/**
 * The gestures' world, every collaborator a spy.
 * @param open - whether a map is open, and changed
 * @returns the deps and what they recorded
 */
function world(open: 'none' | 'saved' | 'modified'): MapGesturesDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    session: open === 'none' ? null : mapSession(calls, open === 'modified'),
    version: () => 1,
    askSaveFirst: (reason) => {
      calls.push(`ask ${reason.kind}`)
      return Promise.resolve('yes')
    },
    carryView: () => calls.push('carry'),
    reloadOn: (map) => calls.push(`reload on ${map ?? 'the start screen'}`),
    archive: {
      save: (_document, map) => {
        calls.push(`write ${map}`)
        return Promise.resolve({ map, polities: 0, vertices: 0 })
      },
    },
    emptyYear: createYearDocument,
    report: vi.fn(),
    words: () => persistenceWords('en'),
  }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createMapGestures', () => {
  describe('happy path', () => {
    it('opens a map from the editor through the question, the view carried', async () => {
      const deps = world('modified')
      expect(await createMapGestures(deps).openMap('1200')).toBe(true)
      expect(deps.calls).toEqual(['ask open', 'save', 'carry', 'reload on 1200'])
    })
  })

  describe('variants', () => {
    it('opens a map from the start screen at once, nothing to ask nor save', async () => {
      const deps = world('none')
      expect(await createMapGestures(deps).openMap('1200')).toBe(true)
      expect(deps.calls).toEqual(['reload on 1200'])
    })

    it('closes the map through the question, back to the start screen', async () => {
      const deps = world('modified')
      expect(await createMapGestures(deps).closeMap()).toBe(true)
      expect(deps.calls).toEqual(['ask close', 'save', 'carry', 'reload on the start screen'])
    })

    it('creates a map from the editor: the question, the map written, the page on it', async () => {
      const deps = world('modified')
      expect(await createMapGestures(deps).createMap({ year: '1110', name: '1110' })).toEqual({
        done: true,
      })
      expect(deps.calls).toEqual(['ask open', 'save', 'write 1110', 'carry', 'reload on 1110'])
    })

    it('creates a map from the start screen with no question', async () => {
      const deps = world('none')
      await createMapGestures(deps).createMap({ year: '1110', name: '1110' })
      expect(deps.calls).toEqual(['write 1110', 'carry', 'reload on 1110'])
    })

    it('saves as through the map’s session', async () => {
      const deps = world('saved')
      expect(await createMapGestures(deps).saveAs('1100-essai')).toEqual({ done: true })
      expect(deps.calls).toEqual(['save as 1100-essai'])
    })
  })

  describe('managed errors', () => {
    it('refuses a new map named like the map open, its files kept (review QUAL-001)', async () => {
      const deps = world('saved')
      const outcome = await createMapGestures(deps).createMap({ year: '1100', name: '1100' })
      expect(outcome).toEqual({
        done: false,
        refusal: { field: 'name', text: 'A map named 1100 exists already — choose another name' },
      })
      expect(deps.calls).toEqual([])
    })

    it('declines to close a map on the start screen, said in the console', async () => {
      const deps = world('none')
      expect(await createMapGestures(deps).closeMap()).toBe(false)
      expect(deps.calls).toEqual([])
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no map is open'))
    })

    it('declines to save as on the start screen, the form closing', async () => {
      const deps = world('none')
      expect(await createMapGestures(deps).saveAs('essai')).toEqual({ done: false, refusal: null })
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no map is open'))
    })
  })

  // L4: N/A — each gesture is its module's (`mapChange`, `newMap`), whose failures are tested there.

  describe('edge cases', () => {
    it('opens a map from an unchanged editor with no question', async () => {
      const deps = world('saved')
      await createMapGestures(deps).openMap('1200')
      expect(deps.calls).toEqual(['carry', 'reload on 1200'])
    })
  })
})
