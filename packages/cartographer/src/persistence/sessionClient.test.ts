import { describe, expect, it, vi } from 'vitest'

import { createSessionClient, sessionOutcomeOf } from './sessionClient'

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

const USER = { id: 1, email: 'author@example.org' }

/**
 * A fetch that answers every request with the status and the body given.
 * @param status - the HTTP status
 * @param body - the JSON body
 * @returns the stub, a spy
 */
function answering(status: number, body: unknown) {
  return vi.fn<FetchLike>(() => Promise.resolve(new Response(JSON.stringify(body), { status })))
}

describe('sessionOutcomeOf', () => {
  describe('happy path', () => {
    it('reads someone signed in', () => {
      expect(sessionOutcomeOf(200, { user: USER })).toEqual({ kind: 'signedIn', user: USER })
    })
  })

  describe('variants', () => {
    it('reads nobody', () => {
      expect(sessionOutcomeOf(200, { user: null })).toEqual({ kind: 'signedOut' })
    })

    it('reads the CMS not started', () => {
      expect(sessionOutcomeOf(503, { reason: 'the CMS does not answer' })).toEqual({
        kind: 'offline',
      })
    })
  })

  describe('managed errors', () => {
    it('carries the refusal’s words', () => {
      expect(sessionOutcomeOf(401, { reason: 'The email or password is incorrect.' })).toEqual({
        kind: 'refused',
        reason: 'The email or password is incorrect.',
      })
    })

    it('names the status when the refusal has no words', () => {
      expect(sessionOutcomeOf(403, null)).toEqual({
        kind: 'refused',
        reason: 'the dev server answered HTTP 403',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('keeps only the id and the address of the user it is handed', () => {
      expect(sessionOutcomeOf(200, { user: { ...USER, roles: ['admin'] } })).toEqual({
        kind: 'signedIn',
        user: USER,
      })
    })
  })

  describe('edge cases', () => {
    it('a user it cannot read is a defect, never nobody signed in', () => {
      expect(sessionOutcomeOf(200, { user: { id: '1', email: USER.email } })).toEqual({
        kind: 'broken',
        detail: 'the dev server answered 200 with {"user":{"id":"1","email":"author@example.org"}}',
      })
    })

    it.each([[null], [{}], [{ user: 'author' }]])(
      'a 200 with no user field to read is a defect: %o',
      (body) => {
        expect(sessionOutcomeOf(200, body)).toMatchObject({ kind: 'broken' })
      }
    )
  })
})

describe('createSessionClient', () => {
  describe('happy path', () => {
    it('asks who is signed in on the route’s root, with the page’s cookie', async () => {
      const fetchFile = answering(200, { user: USER })

      const outcome = await createSessionClient('/__cms/session', fetchFile).who()

      expect(outcome).toEqual({ kind: 'signedIn', user: USER })
      const [url, init] = fetchFile.mock.calls[0] ?? []
      const { signal, ...rest } = init ?? {}
      expect(url).toBe('/__cms/session/')
      expect(signal).toBeInstanceOf(AbortSignal)
      expect(rest).toEqual({ credentials: 'same-origin' })
    })
  })

  describe('variants', () => {
    it.each([
      ['signIn', '/login', { email: 'a@b.c', password: 'p' }],
      ['signOut', '/logout', {}],
      ['refresh', '/refresh', {}],
    ] as const)('%s posts JSON to %s', async (gesture, path, body) => {
      const fetchFile = answering(200, { user: null })
      const client = createSessionClient('/__cms/session', fetchFile)

      await (gesture === 'signIn' ? client.signIn('a@b.c', 'p') : client[gesture]())

      const [url, init] = fetchFile.mock.calls[0] ?? []
      const { signal, ...rest } = init ?? {}
      expect(url).toBe(`/__cms/session${path}`)
      expect(signal).toBeInstanceOf(AbortSignal)
      expect(rest).toEqual({
        credentials: 'same-origin',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    })
  })

  describe('managed errors', () => {
    it('reads the CMS not started from the dev server’s 503', async () => {
      const client = createSessionClient('/__cms/session', answering(503, { reason: 'x' }))

      expect(await client.who()).toEqual({ kind: 'offline' })
    })
  })

  describe('unmanaged errors', () => {
    it('a request that gets no answer reads as the CMS not answering, the cause on the console', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const fetchFile = vi.fn<FetchLike>(() => Promise.reject(new Error('no answer within 10 s')))

      expect(await createSessionClient('/__cms/session', fetchFile).who()).toEqual({
        kind: 'offline',
      })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no answer within 10 s'))
      warn.mockRestore()
    })

    it('a body that is no JSON is read as a refusal naming the status', async () => {
      const fetchFile = vi.fn<FetchLike>(() =>
        Promise.resolve(new Response('<html>', { status: 500 }))
      )

      expect(await createSessionClient('/__cms/session', fetchFile).who()).toEqual({
        kind: 'refused',
        reason: 'the dev server answered HTTP 500',
      })
    })
  })

  describe('edge cases', () => {
    it('never sends the password anywhere but the login route', async () => {
      const fetchFile = answering(200, { user: USER })
      const client = createSessionClient('/__cms/session', fetchFile)

      await client.who()
      await client.refresh()
      await client.signOut()

      expect(JSON.stringify(fetchFile.mock.calls)).not.toContain('password')
    })
  })
})
