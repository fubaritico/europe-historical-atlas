import { describe, expect, it, vi } from 'vitest'

import { CmsUnreachableError, cookieOf, createCmsSession, sessionUserOf } from './cmsSession'

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

describe('cookieOf', () => {
  describe('happy path', () => {
    it('reads the session among the cookies of localhost', () => {
      expect(cookieOf('theme=dark; payload-token=abc.def; lang=fr', 'payload-token')).toBe(
        'abc.def'
      )
    })
  })

  describe('variants', () => {
    it('reads a value as written, never decoded — a JWT needs no escape', () => {
      expect(cookieOf('payload-token=a%3Db', 'payload-token')).toBe('a%3Db')
    })
  })

  describe('unmanaged errors', () => {
    it('a foreign cookie with a broken escape does not throw — the CMS then says it knows no such session', () => {
      expect(cookieOf('payload-token=%E0%A4%A', 'payload-token')).toBe('%E0%A4%A')
    })
  })

  // L3: N/A — any header is read, nothing is refused

  describe('edge cases', () => {
    it.each([undefined, 'theme=dark', 'payload-token=', 'my-payload-token=abc'])(
      'finds nothing in %s — no header, another cookie, an empty value, a name that only ends like it',
      (header) => {
        expect(cookieOf(header, 'payload-token')).toBeNull()
      }
    )
  })
})

describe('sessionUserOf', () => {
  describe('happy path', () => {
    it('reads the user Payload names', () => {
      expect(sessionUserOf({ user: { id: 1, email: 'dev@example.org', sessions: [] } })).toEqual({
        id: 1,
        email: 'dev@example.org',
      })
    })
  })

  describe('edge cases', () => {
    it.each([null, {}, { user: null }, { user: { id: '1', email: 'x' } }])(
      'names nobody in %o',
      (body) => {
        expect(sessionUserOf(body)).toBeNull()
      }
    )
  })
})

describe('createCmsSession', () => {
  describe('happy path', () => {
    it('signs in, relaying the cookie the CMS set', async () => {
      const fetchFile = vi.fn<FetchLike>(() =>
        Promise.resolve(
          Response.json(
            { user: { id: 1, email: 'dev@example.org' } },
            { headers: { 'Set-Cookie': 'payload-token=t; Path=/; HttpOnly; SameSite=Lax' } }
          )
        )
      )
      const answer = await createCmsSession('http://127.0.0.1:3100/', fetchFile).login(
        'dev@example.org',
        'secret'
      )
      expect(answer.status).toBe(200)
      expect(answer.setCookie).toEqual(['payload-token=t; Path=/; HttpOnly; SameSite=Lax'])
      const [url, init] = fetchFile.mock.calls[0] ?? []
      expect(url).toBe('http://127.0.0.1:3100/api/users/login')
      expect(init?.method).toBe('POST')
      expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
      expect(init?.body).toBe(JSON.stringify({ email: 'dev@example.org', password: 'secret' }))
    })
  })

  describe('variants', () => {
    it.each([
      ['me', '/api/users/me', undefined],
      ['logout', '/api/users/logout', 'POST'],
      ['refresh', '/api/users/refresh-token', 'POST'],
    ] as const)('hands the session to %s as a JWT', async (route, path, method) => {
      const fetchFile = vi.fn<FetchLike>(() => Promise.resolve(Response.json({})))
      await createCmsSession('http://127.0.0.1:3100', fetchFile)[route]('the-token')
      const [url, init] = fetchFile.mock.calls[0] ?? []
      expect(url).toBe(`http://127.0.0.1:3100${path}`)
      expect(init?.method).toBe(method)
      expect(new Headers(init?.headers).get('Authorization')).toBe('JWT the-token')
    })

    it('bounds every call in time, the POSTs too — a silent CMS is the CMS not answering', async () => {
      const fetchFile = vi.fn<FetchLike>(() => Promise.resolve(Response.json({})))
      await createCmsSession('http://x', fetchFile).login('a@b.c', 'p')
      const [, init] = fetchFile.mock.calls[0] ?? []
      expect(init?.signal).toBeInstanceOf(AbortSignal)
    })

    it('a call cut by its delay reads as the CMS not answering', async () => {
      const fetchFile = vi.fn<FetchLike>(() =>
        Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'))
      )
      await expect(createCmsSession('http://x', fetchFile).login('a@b.c', 'p')).rejects.toThrow(
        CmsUnreachableError
      )
    })
  })

  describe('managed errors', () => {
    it('relays a refusal as the CMS answered it', async () => {
      const fetchFile = vi.fn<FetchLike>(() =>
        Promise.resolve(
          Response.json({ errors: [{ message: 'Mot de passe incorrect' }] }, { status: 401 })
        )
      )
      const answer = await createCmsSession('http://x', fetchFile).login('a@b.c', 'wrong')
      expect(answer).toEqual({
        status: 401,
        body: { errors: [{ message: 'Mot de passe incorrect' }] },
        setCookie: [],
      })
    })
  })

  describe('unmanaged errors', () => {
    it('tells a CMS that does not answer', async () => {
      const fetchFile = vi.fn<FetchLike>(() => Promise.reject(new TypeError('fetch failed')))
      await expect(createCmsSession('http://x', fetchFile).me('t')).rejects.toThrow(
        CmsUnreachableError
      )
    })
  })

  describe('edge cases', () => {
    it('reads an answer that is not JSON as no body', async () => {
      const fetchFile = vi.fn<FetchLike>(() =>
        Promise.resolve(new Response('<html>', { status: 500 }))
      )
      expect((await createCmsSession('http://x', fetchFile).me('t')).body).toBeNull()
    })
  })
})
