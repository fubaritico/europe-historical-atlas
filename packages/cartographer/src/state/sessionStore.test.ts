import { describe, expect, it } from 'vitest'

import { createSessionStore, mayEdit } from './sessionStore'

import type { SessionState } from './sessionStore'

const USER = { id: 1, email: 'author@example.org' }

describe('sessionStore', () => {
  describe('happy path', () => {
    it('opens checking, before the CMS has said', () => {
      expect(createSessionStore().getState().session).toEqual({ kind: 'checking' })
    })

    it('holds what it is told', () => {
      const store = createSessionStore()

      store.getState().setSession({ kind: 'signedIn', user: USER })

      expect(store.getState().session).toEqual({ kind: 'signedIn', user: USER })
    })
  })

  describe('variants', () => {
    it.each<[SessionState, boolean]>([
      [{ kind: 'checking' }, false],
      [{ kind: 'signedOut', problem: null }, false],
      [{ kind: 'signedOut', problem: { kind: 'offline' } }, false],
      [{ kind: 'signedIn', user: USER }, true],
      [{ kind: 'expired', user: USER, problem: null }, true],
    ])('lets the gestures act on %o: %s', (session, expected) => {
      expect(mayEdit(session)).toBe(expected)
    })
  })

  describe('managed errors', () => {
    // L3: N/A — the store holds a state and checks nothing; what goes wrong is the keeper's, and tested there.
    it('keeps an expired session’s problem, so the dialogue can say it', () => {
      const store = createSessionStore()

      store.getState().setSession({ kind: 'expired', user: USER, problem: { kind: 'offline' } })

      expect(store.getState().session).toEqual({
        kind: 'expired',
        user: USER,
        problem: { kind: 'offline' },
      })
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — no input is read, nothing is awaited.
    it('gives each page its own store', () => {
      const one = createSessionStore()
      const other = createSessionStore()

      one.getState().setSession({ kind: 'signedIn', user: USER })

      expect(other.getState().session).toEqual({ kind: 'checking' })
    })
  })

  describe('edge cases', () => {
    it('tells subscribers of each change', () => {
      const store = createSessionStore()
      const seen: string[] = []
      store.subscribe((state) => seen.push(state.session.kind))

      store.getState().setSession({ kind: 'signedIn', user: USER })
      store.getState().setSession({ kind: 'expired', user: USER, problem: null })

      expect(seen).toEqual(['signedIn', 'expired'])
    })
  })
})
