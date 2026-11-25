import { afterEach, describe, expect, it, vi } from 'vitest'

import { persistenceWords } from './persistenceWords'
import { createSignOut, signOutAfterSaving } from './signOut'

import type { SaveFirstAnswer } from './mapChange'
import type { SignOutDeps } from './signOut'

/**
 * Signing out's world, recording what happened in order.
 * @param over - what differs: the map changed or not, the answer, whether the save succeeds
 * @param over.modified - whether the map holds a change not saved
 * @param over.answer - the author's answer to the question
 * @param over.saves - whether the save succeeds
 * @returns the deps and the record
 */
function world(over: { modified?: boolean; answer?: SaveFirstAnswer; saves?: boolean } = {}) {
  const calls: string[] = []
  const deps: SignOutDeps = {
    isModified: () => over.modified ?? true,
    save: () => {
      calls.push('save')
      return Promise.resolve(over.saves ?? true)
    },
    askSaveFirst: (reason) => {
      calls.push(`ask ${reason.kind}`)
      return Promise.resolve(over.answer ?? 'yes')
    },
    signOut: () => {
      calls.push('sign out')
      return Promise.resolve()
    },
    report: vi.fn(),
    words: () => persistenceWords('en'),
  }
  return { deps, calls }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('signOutAfterSaving', () => {
  describe('happy path', () => {
    it('a change not saved: asks, saves, then signs out', async () => {
      const { deps, calls } = world()

      expect(await signOutAfterSaving(deps)).toBe(true)
      expect(calls).toEqual(['ask signOut', 'save', 'sign out'])
    })
  })

  describe('variants', () => {
    it('nothing to save: signs out at once, asking nothing', async () => {
      const { deps, calls } = world({ modified: false })

      expect(await signOutAfterSaving(deps)).toBe(true)
      expect(calls).toEqual(['sign out'])
    })

    it('[No]: signs out, the change unsaved', async () => {
      const { deps, calls } = world({ answer: 'no' })

      expect(await signOutAfterSaving(deps)).toBe(true)
      expect(calls).toEqual(['ask signOut', 'sign out'])
    })
  })

  describe('managed errors', () => {
    it('‹escape›: stays signed in, said on the console', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { deps, calls } = world({ answer: 'cancel' })

      expect(await signOutAfterSaving(deps)).toBe(false)
      expect(calls).toEqual(['ask signOut'])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('cancelled'))
    })

    it('a save that fails keeps the author signed in — its own alarm says it', async () => {
      const { deps, calls } = world({ saves: false })

      expect(await signOutAfterSaving(deps)).toBe(false)
      expect(calls).toEqual(['ask signOut', 'save'])
    })
  })

  describe('unmanaged errors', () => {
    it('a question that cannot be asked keeps the author signed in, with the alarm', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { deps, calls } = world()
      deps.askSaveFirst = () => Promise.reject(new Error('opening a map is already asking'))

      expect(await signOutAfterSaving(deps)).toBe(false)
      expect(calls).toEqual([])
      expect(deps.report).toHaveBeenCalledWith(
        expect.objectContaining({ tone: 'alarm', topic: 'session' })
      )
    })
  })

  // L5: the question is asked with its reason, so the dialogue says « sign out », never a map's name
  describe('edge cases', () => {
    it('a second press while the first runs is declined and said — one question, one save', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { deps, calls } = world()
      let answer: (value: SaveFirstAnswer) => void = () => undefined
      deps.askSaveFirst = (reason) => {
        calls.push(`ask ${reason.kind}`)
        return new Promise((resolve) => {
          answer = resolve
        })
      }
      const signOut = createSignOut(deps)

      const first = signOut()
      expect(await signOut()).toBe(false)
      answer('yes')

      expect(await first).toBe(true)
      expect(calls).toEqual(['ask signOut', 'save', 'sign out'])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('already under way'))
    })

    it('after a cancel, the next press asks again', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { deps, calls } = world({ answer: 'cancel' })
      const signOut = createSignOut(deps)

      await signOut()
      await signOut()

      expect(calls).toEqual(['ask signOut', 'ask signOut'])
    })

    it('asks with signing out as the reason', async () => {
      const { deps } = world()
      const ask = vi.spyOn(deps, 'askSaveFirst')

      await signOutAfterSaving(deps)

      expect(ask).toHaveBeenCalledWith({ kind: 'signOut' })
    })
  })
})
