import { afterEach, describe, expect, it, vi } from 'vitest'

import { PROLONG_EVERY_MS } from '../../persistence/sessionKeeper'
import { createSessionStore } from '../../state/sessionStore'

import { pageCms, startSession, whenSignedIn } from './startSession'

import type { SessionState } from '../../state/sessionStore'

const USER = { id: 1, email: 'author@example.org' }

const idle = () => Promise.resolve()

/**
 * A session standing where the test puts it, with a keeper that does nothing.
 * @param state - where it stands
 * @returns the handle
 */
function sessionAt(state: SessionState) {
  const store = createSessionStore()
  store.getState().setSession(state)
  return { store, keeper: { check: idle, signIn: idle, signOut: idle, lost: vi.fn() } }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('whenSignedIn', () => {
  describe('happy path', () => {
    it('runs the command when someone is signed in', () => {
      const run = vi.fn()

      whenSignedIn(sessionAt({ kind: 'signedIn', user: USER }), 'Save', run)()

      expect(run).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('runs it while a dialogue asks to sign in again — what is drawn meanwhile is kept', () => {
      const run = vi.fn()

      whenSignedIn(sessionAt({ kind: 'expired', user: USER, problem: null }), 'Save', run)()

      expect(run).toHaveBeenCalledTimes(1)
    })
  })

  describe('managed errors', () => {
    it.each<SessionState>([{ kind: 'checking' }, { kind: 'signedOut', problem: null }])(
      'declines it with nobody, on the console: %o',
      (state) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const run = vi.fn()

        whenSignedIn(sessionAt(state), 'Save', run)()

        expect(run).not.toHaveBeenCalled()
        expect(warn).toHaveBeenCalledWith('[Cartographer] Save declined: nobody is signed in')
      }
    )
  })

  describe('unmanaged errors', () => {
    // L4: N/A — the gate reads a store and calls a function; it awaits nothing.
    it('reads the session at the moment of the gesture, not when the command was made', () => {
      const session = sessionAt({ kind: 'signedOut', problem: null })
      const run = vi.fn()
      const command = whenSignedIn(session, 'Save', run)

      session.store.getState().setSession({ kind: 'signedIn', user: USER })
      command()

      expect(run).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('declines again once signed out', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const session = sessionAt({ kind: 'signedIn', user: USER })
      const run = vi.fn()
      const command = whenSignedIn(session, 'Save', run)

      session.store.getState().setSession({ kind: 'signedOut', problem: null })
      command()

      expect(run).not.toHaveBeenCalled()
    })
  })
})

describe('startSession', () => {
  it('asks the dev server who is signed in at once, and holds the answer', async () => {
    const fetchFile = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ user: USER }), { status: 200 }))
    )
    vi.stubGlobal('fetch', fetchFile)

    const { store } = startSession('/__cms/session', () => undefined)
    await vi.waitFor(() => {
      expect(store.getState().session).toEqual({ kind: 'signedIn', user: USER })
    })

    expect(fetchFile).toHaveBeenCalledWith('/__cms/session/', expect.anything())
  })

  it('prolongs the session every thirty minutes with the window’s timers, and stops once signed out', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    try {
      const fetchFile = vi.fn((input: unknown) =>
        Promise.resolve(
          new Response(JSON.stringify({ user: String(input).endsWith('/logout') ? null : USER }), {
            status: 200,
          })
        )
      )
      vi.stubGlobal('fetch', fetchFile)
      const refreshes = () =>
        fetchFile.mock.calls.filter(([url]) => url === '/__cms/session/refresh').length
      const { store, keeper } = startSession('/__cms/session', () => undefined)
      await vi.waitFor(() => {
        expect(store.getState().session.kind).toBe('signedIn')
      })

      await vi.advanceTimersByTimeAsync(PROLONG_EVERY_MS)
      expect(refreshes()).toBe(1)
      await keeper.signOut()
      await vi.advanceTimersByTimeAsync(PROLONG_EVERY_MS * 2)

      expect(refreshes()).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('hands an answer it cannot read to the screen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))
    )
    const defect = vi.fn()

    startSession('/__cms/session', defect)

    await vi.waitFor(() => {
      expect(defect).toHaveBeenCalledWith('the dev server answered 200 with {}')
    })
  })
})

describe('pageCms', () => {
  describe('happy path', () => {
    it('reaches the CMS on this machine, and tells the session when the CMS refuses it', () => {
      const session = sessionAt({ kind: 'signedIn', user: USER })

      const channel = pageCms(session, '/__cms/territories', vi.fn())
      if (channel.mode === 'offline') channel.sessionLost()

      expect(channel.mode).toBe('offline')
      expect(session.keeper.lost).toHaveBeenCalledTimes(1)
    })
  })

  // L2: the page's address decides the mode, tested by cmsChannelOf
  // L3, L4: N/A — it reads the address and hands the keeper's gesture
  // L5: N/A — one call, at the composition root
})
