import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { changeMap } from './mapChange'
import { persistenceWords } from './persistenceWords'

import type { MapChangeDeps, SaveFirstAnswer } from './mapChange'

/** The world a change of map runs in, every collaborator a spy. */
function world(
  over: {
    modified?: boolean
    answer?: SaveFirstAnswer
    saves?: boolean
    drawsWhileSaving?: boolean
  } = {}
): MapChangeDeps & { calls: string[] } {
  const calls: string[] = []
  let version = 1
  return {
    calls,
    session: {
      map: () => '1100',
      isModified: () => over.modified ?? true,
      save: () => {
        calls.push('save')
        if (over.drawsWhileSaving === true) version += 1
        return Promise.resolve(over.saves ?? true)
      },
    },
    version: () => version,
    askSaveFirst: (map) => {
      calls.push(`ask ${map}`)
      return Promise.resolve(over.answer ?? 'yes')
    },
    carryView: () => calls.push('carry'),
    search: '?map=1100',
    go: (address) => calls.push(`go ${address}`),
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

describe('changeMap', () => {
  describe('happy path', () => {
    it('asks, saves, carries the view, then goes to the map', async () => {
      const deps = world()
      expect(await changeMap(deps, '1200')).toBe(true)
      expect(deps.calls).toEqual(['ask 1200', 'save', 'carry', 'go ?map=1200'])
    })
  })

  describe('variants', () => {
    it('opens without saving on [No]', async () => {
      const deps = world({ answer: 'no' })
      expect(await changeMap(deps, '1200')).toBe(true)
      expect(deps.calls).toEqual(['ask 1200', 'carry', 'go ?map=1200'])
    })

    it('asks nothing when the page holds no change', async () => {
      const deps = world({ modified: false })
      expect(await changeMap(deps, '1200')).toBe(true)
      expect(deps.calls).toEqual(['carry', 'go ?map=1200'])
    })
  })

  describe('managed errors', () => {
    it('opens nothing when the question is dismissed', async () => {
      const deps = world({ answer: 'cancel' })
      expect(await changeMap(deps, '1200')).toBe(false)
      expect(deps.calls).toEqual(['ask 1200'])
    })

    it('opens nothing when the save fails — its own alarm says why', async () => {
      const deps = world({ saves: false })
      expect(await changeMap(deps, '1200')).toBe(false)
      expect(deps.calls).toEqual(['ask 1200', 'save'])
    })

    it('opens nothing when a gesture was drawn while the page was being saved, and says so', async () => {
      const deps = world({ drawsWhileSaving: true })
      expect(await changeMap(deps, '1200')).toBe(false)
      expect(deps.calls).toEqual(['ask 1200', 'save'])
      expect(deps.report).toHaveBeenCalledWith(expect.objectContaining({ tone: 'warning' }))
    })
  })

  describe('unmanaged errors', () => {
    // Review ARCH-004: a question already up rejects; the opening is refused and said, never dropped in silence.
    it('opens nothing and raises the alarm when the question cannot be asked', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const deps = world()
      deps.askSaveFirst = () => Promise.reject(new Error('opening a map is already asking'))
      expect(await changeMap(deps, '1200')).toBe(false)
      expect(deps.calls).toEqual([])
      expect(deps.report).toHaveBeenCalledWith(expect.objectContaining({ tone: 'alarm' }))
    })
  })

  describe('edge cases', () => {
    it('does nothing for the map already open', async () => {
      const deps = world()
      expect(await changeMap(deps, '1100')).toBe(false)
      expect(deps.calls).toEqual([])
    })
  })
})
