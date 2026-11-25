import { describe, expect, it, vi } from 'vitest'

import { createSessionStore } from '../state/sessionStore'

import { autosaveFollowsSession } from './autosaveFollowsSession'

const USER = { id: 1, email: 'author@example.org' }

/**
 * The follower over a fresh session, the map open or not.
 * @param ready - whether the map is open
 * @returns the keeper's spies, the store, and the follower
 */
function following(ready = true) {
  const keeper = { start: vi.fn(), stop: vi.fn() }
  const store = createSessionStore()
  const follower = autosaveFollowsSession(keeper, store, () => ready)
  return { keeper, store, follower }
}

describe('autosaveFollowsSession', () => {
  describe('happy path', () => {
    it('saves automatically once the map is open and someone is signed in', () => {
      const { keeper, store, follower } = following()

      store.getState().setSession({ kind: 'signedIn', user: USER })
      follower.follow()

      expect(keeper.start).toHaveBeenCalled()
    })

    it('stops when nobody is signed in any more', () => {
      const { keeper, store } = following()
      store.getState().setSession({ kind: 'signedIn', user: USER })

      store.getState().setSession({ kind: 'signedOut', problem: null })

      expect(keeper.stop).toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('keeps saving while a session expired in the middle of a drawing — nothing is lost', () => {
      const { keeper, store } = following()
      store.getState().setSession({ kind: 'signedIn', user: USER })
      keeper.start.mockClear()

      store.getState().setSession({ kind: 'expired', user: USER, problem: null })

      expect(keeper.start).toHaveBeenCalled()
      expect(keeper.stop).not.toHaveBeenCalled()
    })

    it('starts again when someone signs in again', () => {
      const { keeper, store } = following()
      store.getState().setSession({ kind: 'signedOut', problem: null })

      store.getState().setSession({ kind: 'signedIn', user: USER })

      expect(keeper.start).toHaveBeenCalledTimes(1)
    })
  })

  describe('managed errors', () => {
    it('never saves a map that is not open, whoever is signed in', () => {
      const { keeper, store, follower } = following(false)

      store.getState().setSession({ kind: 'signedIn', user: USER })
      follower.follow()

      expect(keeper.start).not.toHaveBeenCalled()
    })
  })

  // L4: N/A — the follower calls two functions on a store's change; nothing is read nor awaited.

  describe('edge cases', () => {
    it('while the CMS is still asked, nothing is saved', () => {
      const { keeper, follower } = following()

      follower.follow()

      expect(keeper.start).not.toHaveBeenCalled()
      expect(keeper.stop).toHaveBeenCalled()
    })

    it('stops following when asked, and the automatic save with it', () => {
      const { keeper, store, follower } = following()
      follower.stop()

      store.getState().setSession({ kind: 'signedIn', user: USER })

      expect(keeper.start).not.toHaveBeenCalled()
      expect(keeper.stop).toHaveBeenCalledTimes(1)
    })
  })
})
