import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSessionStore } from '../state/sessionStore'

import { createSessionKeeper, settledState } from './sessionKeeper'

import type { SessionOutcome, SessionPort } from './sessionClient'
import type { SessionState } from '../state/sessionStore'

const USER = { id: 1, email: 'author@example.org' }
const SIGNED_IN: SessionOutcome = { kind: 'signedIn', user: USER }
const PACE = 1000

/**
 * A port whose every route answers what the test says.
 * @param outcome - the answer of every route, unless a test changes one
 * @returns the port, each route a spy
 */
function portAnswering(outcome: SessionOutcome) {
  return {
    who: vi.fn<SessionPort['who']>(() => Promise.resolve(outcome)),
    signIn: vi.fn<SessionPort['signIn']>(() => Promise.resolve(outcome)),
    signOut: vi.fn<SessionPort['signOut']>(() => Promise.resolve({ kind: 'signedOut' })),
    refresh: vi.fn<SessionPort['refresh']>(() => Promise.resolve(outcome)),
  }
}

/**
 * Timers the test beats by hand.
 * @returns the timers, and how to beat the running loop
 */
function handTimers() {
  const loops = new Map<number, () => void>()
  let next = 0
  return {
    timers: {
      every: vi.fn((run: () => void) => {
        next += 1
        loops.set(next, run)
        return next
      }),
      stop: vi.fn((handle: unknown) => {
        loops.delete(handle as number)
      }),
    },
    running: () => loops.size,
    beat: async () => {
      for (const run of [...loops.values()]) run()
      await Promise.resolve()
      await Promise.resolve()
    },
  }
}

/**
 * A keeper over a fresh store.
 * @param port - the port
 * @param start - where the session stands at first
 * @param gestured - whether the author made a gesture since the last beat; always, by default
 * @returns the keeper, the store and the timers
 */
function keeperOver(port: SessionPort, start?: SessionState, gestured: () => boolean = () => true) {
  const store = createSessionStore()
  if (start !== undefined) store.getState().setSession(start)
  const hand = handTimers()
  const defect = vi.fn()
  const keeper = createSessionKeeper({
    port,
    store,
    timers: hand.timers,
    everyMs: PACE,
    gestured,
    defect,
  })
  return { keeper, store, hand, defect, session: () => store.getState().session }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('settledState', () => {
  const EXPIRED: SessionState = { kind: 'expired', user: USER, problem: null }

  it('someone signed in, whatever stood before', () => {
    expect(settledState(EXPIRED, SIGNED_IN)).toEqual({ kind: 'signedIn', user: USER })
  })

  it.each<[SessionOutcome, SessionState]>([
    [{ kind: 'signedOut' }, { kind: 'signedOut', problem: null }],
    [{ kind: 'offline' }, { kind: 'signedOut', problem: { kind: 'offline' } }],
    [
      { kind: 'refused', reason: 'no' },
      { kind: 'signedOut', problem: { kind: 'refused', reason: 'no' } },
    ],
    [
      { kind: 'broken', detail: 'x' },
      { kind: 'signedOut', problem: { kind: 'broken' } },
    ],
  ])('nobody, with what went wrong: %o', (outcome, expected) => {
    expect(settledState({ kind: 'checking' }, outcome)).toEqual(expected)
  })

  it('an expired session keeps its dialogue, with the problem in it', () => {
    expect(settledState(EXPIRED, { kind: 'offline' })).toEqual({
      ...EXPIRED,
      problem: { kind: 'offline' },
    })
    expect(settledState(EXPIRED, { kind: 'signedOut' })).toEqual(EXPIRED)
  })
})

describe('createSessionKeeper', () => {
  describe('happy path', () => {
    it('finds someone signed in at the opening, and starts prolonging at the pace given', async () => {
      const { keeper, session, hand } = keeperOver(portAnswering(SIGNED_IN))

      await keeper.check()

      expect(session()).toEqual({ kind: 'signedIn', user: USER })
      expect(hand.timers.every).toHaveBeenCalledWith(expect.any(Function), PACE)
      expect(hand.running()).toBe(1)
    })

    it('signs in with the address and the password, and opens the editor', async () => {
      const port = portAnswering(SIGNED_IN)
      const { keeper, session } = keeperOver(port, { kind: 'signedOut', problem: null })

      await keeper.signIn('author@example.org', 'secret')

      expect(port.signIn).toHaveBeenCalledWith('author@example.org', 'secret')
      expect(session()).toEqual({ kind: 'signedIn', user: USER })
    })

    it('signs out, and stops prolonging', async () => {
      const { keeper, session, hand } = keeperOver(portAnswering(SIGNED_IN))
      await keeper.check()

      await keeper.signOut()

      expect(session()).toEqual({ kind: 'signedOut', problem: null })
      expect(hand.running()).toBe(0)
    })
  })

  describe('variants', () => {
    it('finds nobody at the opening: the form, with nothing wrong', async () => {
      const { keeper, session, hand } = keeperOver(portAnswering({ kind: 'signedOut' }))

      await keeper.check()

      expect(session()).toEqual({ kind: 'signedOut', problem: null })
      expect(hand.running()).toBe(0)
    })

    it('keeps the session as it was while a beat prolongs it', async () => {
      const port = portAnswering(SIGNED_IN)
      const { keeper, session, hand } = keeperOver(port)
      await keeper.check()

      await hand.beat()

      expect(port.refresh).toHaveBeenCalledTimes(1)
      expect(session()).toEqual({ kind: 'signedIn', user: USER })
    })

    it('lets the session run out when no gesture was made since the last beat (CARTO-567)', async () => {
      const port = portAnswering(SIGNED_IN)
      const { keeper, session, hand } = keeperOver(port, undefined, () => false)
      await keeper.check()

      await hand.beat()

      expect(port.refresh).not.toHaveBeenCalled()
      expect(session()).toEqual({ kind: 'signedIn', user: USER })
      expect(hand.running()).toBe(1)
    })

    it('keeps a gesture owed when its prolonging failed, and prolongs at the next beat without a new one', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const port = portAnswering(SIGNED_IN)
      let made = true
      const { keeper, hand } = keeperOver(port, undefined, () => {
        const answer = made
        made = false
        return answer
      })
      await keeper.check()
      port.refresh.mockResolvedValueOnce({ kind: 'offline' })
      await hand.beat()

      await hand.beat()

      expect(port.refresh).toHaveBeenCalledTimes(2)
    })

    it('prolongs again at the first beat after a gesture', async () => {
      const port = portAnswering(SIGNED_IN)
      let made = false
      const { keeper, hand } = keeperOver(port, undefined, () => made)
      await keeper.check()
      await hand.beat()

      made = true
      await hand.beat()

      expect(port.refresh).toHaveBeenCalledTimes(1)
    })

    it('signing in again after an expiry opens the editor again, prolonged by one loop only', async () => {
      const port = portAnswering(SIGNED_IN)
      const { keeper, session, hand } = keeperOver(port, {
        kind: 'expired',
        user: USER,
        problem: null,
      })

      await keeper.signIn('author@example.org', 'secret')
      await keeper.signIn('author@example.org', 'secret')

      expect(session()).toEqual({ kind: 'signedIn', user: USER })
      expect(hand.running()).toBe(1)
    })
  })

  describe('managed errors', () => {
    it('the CMS not started: the form says it, and the console', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { keeper, session } = keeperOver(portAnswering({ kind: 'offline' }))

      await keeper.check()

      expect(session()).toEqual({ kind: 'signedOut', problem: { kind: 'offline' } })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('offline'))
    })

    it('the CMS refuses the password: its words reach the form', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const port = portAnswering({ kind: 'refused', reason: 'The email or password is incorrect.' })
      const { keeper, session } = keeperOver(port, { kind: 'signedOut', problem: null })

      await keeper.signIn('author@example.org', 'wrong')

      expect(session()).toEqual({
        kind: 'signedOut',
        problem: { kind: 'refused', reason: 'The email or password is incorrect.' },
      })
    })

    it('the CMS no longer knows the session: the editor stays, a dialogue asks to sign in again', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const port = portAnswering(SIGNED_IN)
      const { keeper, session, hand } = keeperOver(port)
      await keeper.check()
      port.refresh.mockResolvedValue({ kind: 'signedOut' })

      await hand.beat()

      expect(session()).toEqual({ kind: 'expired', user: USER, problem: null })
      expect(hand.running()).toBe(0)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('sign in again'))
    })

    it('the CMS refused the session to « Ajouter au CMS »: the editor stays, the dialogue asks to sign in again', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { keeper, session, hand } = keeperOver(portAnswering(SIGNED_IN))
      await keeper.check()

      keeper.lost()

      expect(session()).toEqual({ kind: 'expired', user: USER, problem: null })
      expect(hand.running()).toBe(0)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('« Ajouter au CMS »'))
    })

    it('a session lost while nobody is signed in, or already expired, changes nothing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const expired: SessionState = { kind: 'expired', user: USER, problem: { kind: 'offline' } }
      const nobody = keeperOver(portAnswering(SIGNED_IN), { kind: 'signedOut', problem: null })
      const already = keeperOver(portAnswering(SIGNED_IN), expired)

      nobody.keeper.lost()
      already.keeper.lost()

      expect(nobody.session()).toEqual({ kind: 'signedOut', problem: null })
      expect(already.session()).toEqual(expired)
      expect(warn).not.toHaveBeenCalled()
    })

    it('a refusal while expired keeps the dialogue, with the refusal in it', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const port = portAnswering({ kind: 'refused', reason: 'locked' })
      const { keeper, session } = keeperOver(port, { kind: 'expired', user: USER, problem: null })

      await keeper.signIn('author@example.org', 'wrong')

      expect(session()).toEqual({
        kind: 'expired',
        user: USER,
        problem: { kind: 'refused', reason: 'locked' },
      })
    })
  })

  describe('unmanaged errors', () => {
    it('an answer it cannot read at the opening: said loudly, shown on screen, and in the form', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { keeper, session, defect } = keeperOver(
        portAnswering({ kind: 'broken', detail: 'the dev server answered 200 with {}' })
      )

      await keeper.check()

      expect(session()).toEqual({ kind: 'signedOut', problem: { kind: 'broken' } })
      expect(error).toHaveBeenCalledWith(expect.stringContaining('answered 200 with {}'))
      expect(defect).toHaveBeenCalledWith('the dev server answered 200 with {}')
    })

    it('an answer it cannot read during a beat: shown on screen, the session kept', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const port = portAnswering(SIGNED_IN)
      const { keeper, session, hand, defect } = keeperOver(port)
      await keeper.check()
      port.refresh.mockResolvedValue({ kind: 'broken', detail: 'x' })

      await hand.beat()

      expect(session()).toEqual({ kind: 'signedIn', user: USER })
      expect(defect).toHaveBeenCalledWith('x')
      expect(hand.running()).toBe(1)
    })

    it('the CMS restarting during a beat: the session is kept, the next beat tries again', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const port = portAnswering(SIGNED_IN)
      const { keeper, session, hand, defect } = keeperOver(port)
      await keeper.check()
      port.refresh.mockResolvedValue({ kind: 'offline' })

      await hand.beat()

      expect(session()).toEqual({ kind: 'signedIn', user: USER })
      expect(hand.running()).toBe(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be prolonged'))
      expect(defect).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('a « who » answered after a newer sign-in writes nothing over it — the newest request wins', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const port = portAnswering(SIGNED_IN)
      let answerWho: (outcome: SessionOutcome) => void = () => undefined
      port.who.mockReturnValue(
        new Promise((resolve) => {
          answerWho = resolve
        })
      )
      const { keeper, session, hand } = keeperOver(port, { kind: 'signedOut', problem: null })

      const slow = keeper.check()
      await keeper.signIn('author@example.org', 'secret')
      answerWho({ kind: 'signedOut' })
      await slow

      expect(session()).toEqual({ kind: 'signedIn', user: USER })
      expect(hand.running()).toBe(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('a newer request'))
    })

    it('signing out while a session is expired leaves nobody, the dialogue gone', async () => {
      const { keeper, session } = keeperOver(portAnswering(SIGNED_IN), {
        kind: 'expired',
        user: USER,
        problem: null,
      })

      await keeper.signOut()

      expect(session()).toEqual({ kind: 'signedOut', problem: null })
    })

    it('a refusal during a beat keeps the session, said on the console', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const port = portAnswering(SIGNED_IN)
      const { keeper, session, hand } = keeperOver(port)
      await keeper.check()
      port.refresh.mockResolvedValue({ kind: 'refused', reason: 'prolonging: HTTP 500' })

      await hand.beat()

      expect(session()).toEqual({ kind: 'signedIn', user: USER })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be prolonged: refused'))
    })

    it('a beat answered after signing out changes nothing', async () => {
      const port = portAnswering(SIGNED_IN)
      const { keeper, session, hand } = keeperOver(port)
      await keeper.check()
      let answer: (outcome: SessionOutcome) => void = () => undefined
      port.refresh.mockReturnValue(
        new Promise((resolve) => {
          answer = resolve
        })
      )
      await hand.beat()

      await keeper.signOut()
      answer({ kind: 'signedOut' })
      await Promise.resolve()

      expect(session()).toEqual({ kind: 'signedOut', problem: null })
    })

    it('signing out when the CMS does not answer still leaves nobody, and says why', async () => {
      const port = portAnswering(SIGNED_IN)
      port.signOut.mockResolvedValue({ kind: 'offline' })
      const { keeper, session } = keeperOver(port)
      await keeper.check()

      await keeper.signOut()

      expect(session()).toEqual({ kind: 'signedOut', problem: { kind: 'offline' } })
    })
  })
})
