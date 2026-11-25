import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CmsUnreachableError } from './cmsSession'
import { handleSession } from './cmsSessionEndpoint'

import type { CmsAnswer, CmsSession } from './cmsSession'
import type { EndpointRequest } from './httpEndpoint'

const DEV = { id: 1, email: 'dev@example.org' }
const SET = ['payload-token=t; Path=/; HttpOnly; SameSite=Lax']

/**
 * A request from the Cartographer's own page.
 * @param fields - what to change
 * @returns the request
 */
function request(fields: Partial<EndpointRequest> = {}): EndpointRequest {
  return {
    method: 'POST',
    path: '/login',
    host: 'localhost:5174',
    origin: 'http://localhost:5174',
    cookie: 'payload-token=the-token',
    body: JSON.stringify({ email: 'dev@example.org', password: 'secret' }),
    ...fields,
  }
}

/**
 * An answer of the CMS.
 * @param status - its status
 * @param body - its JSON
 * @param setCookie - its cookies
 * @returns the answer
 */
const cms = (status: number, body: unknown, setCookie: string[] = []): CmsAnswer => ({
  status,
  body,
  setCookie,
})

/**
 * The CMS's sessions as a stand-in, every route answering the dev signed in.
 * @returns the stand-in
 */
function session() {
  return {
    me: vi.fn<CmsSession['me']>(() => Promise.resolve(cms(200, { user: DEV }))),
    login: vi.fn<CmsSession['login']>(() => Promise.resolve(cms(200, { user: DEV }, SET))),
    logout: vi.fn<CmsSession['logout']>(() =>
      Promise.resolve(cms(200, {}, ['payload-token=; Max-Age=0']))
    ),
    refresh: vi.fn<CmsSession['refresh']>(() => Promise.resolve(cms(200, { user: DEV }, SET))),
  }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleSession', () => {
  describe('happy path', () => {
    it('signs in, answering the user and setting the CMS cookie, never the token', async () => {
      const cmsSession = session()
      const response = await handleSession(request(), cmsSession)
      expect(response).toEqual({ status: 200, body: JSON.stringify({ user: DEV }), setCookie: SET })
      expect(response.body).not.toContain('the-token')
      expect(cmsSession.login).toHaveBeenCalledWith('dev@example.org', 'secret')
    })
  })

  describe('variants', () => {
    it('says who is signed in, from the cookie, on a GET without an origin', async () => {
      const cmsSession = session()
      const response = await handleSession(
        request({ method: 'GET', path: '/', origin: undefined, body: '' }),
        cmsSession
      )
      expect(response.body).toBe(JSON.stringify({ user: DEV }))
      expect(cmsSession.me).toHaveBeenCalledWith('the-token')
    })

    it('says nobody is signed in when the browser holds no session, and asks the CMS nothing', async () => {
      const cmsSession = session()
      const response = await handleSession(
        request({ method: 'GET', path: '/', origin: undefined, cookie: undefined }),
        cmsSession
      )
      expect(response.body).toBe(JSON.stringify({ user: null }))
      expect(cmsSession.me).not.toHaveBeenCalled()
    })

    it('signs out, relaying the expired cookie', async () => {
      const response = await handleSession(request({ path: '/logout', body: '' }), session())
      expect(response).toEqual({
        status: 200,
        body: JSON.stringify({ user: null }),
        setCookie: ['payload-token=; Max-Age=0'],
      })
    })

    it('prolongs the session, relaying the new cookie', async () => {
      const response = await handleSession(request({ path: '/refresh', body: '' }), session())
      expect(response.setCookie).toEqual(SET)
      expect(response.body).toBe(JSON.stringify({ user: DEV }))
    })
  })

  describe('managed errors', () => {
    it('hands back the CMS refusal of a wrong password', async () => {
      const cmsSession = session()
      cmsSession.login.mockResolvedValue(
        cms(401, { errors: [{ message: 'Mot de passe incorrect' }] })
      )
      expect(await handleSession(request(), cmsSession)).toEqual({
        status: 401,
        body: JSON.stringify({ reason: 'Mot de passe incorrect' }),
      })
    })

    it('refuses a sign-in without a password, and asks the CMS nothing', async () => {
      const cmsSession = session()
      const response = await handleSession(
        request({ body: '{"email":"dev@example.org"}' }),
        cmsSession
      )
      expect(response.status).toBe(400)
      expect(cmsSession.login).not.toHaveBeenCalled()
    })

    it('says the CMS is not started', async () => {
      const cmsSession = session()
      cmsSession.login.mockRejectedValue(new CmsUnreachableError(new Error('ECONNREFUSED')))
      expect((await handleSession(request(), cmsSession)).status).toBe(503)
    })

    it.each([401, 403])(
      'says a session the CMS no longer knows (HTTP %i) is nobody',
      async (status) => {
        const cmsSession = session()
        cmsSession.refresh.mockResolvedValue(cms(status, { errors: [{ message: 'expired' }] }))
        const response = await handleSession(request({ path: '/refresh', body: '' }), cmsSession)
        expect(response.body).toBe(JSON.stringify({ user: null }))
      }
    )

    it('never writes the address of a refused sign-in to the terminal', async () => {
      const warn = vi.mocked(console.warn)
      const cmsSession = session()
      cmsSession.login.mockResolvedValue(cms(401, { errors: [{ message: 'no' }] }))
      await handleSession(request(), cmsSession)
      expect(warn.mock.calls.flat().join(' ')).not.toContain('dev@example.org')
    })

    it('signing out the CMS refuses is said, and no cookie is relayed', async () => {
      const cmsSession = session()
      cmsSession.logout.mockResolvedValue(cms(500, null, ['payload-token=; Max-Age=0']))
      const response = await handleSession(request({ path: '/logout', body: '' }), cmsSession)
      expect(response).toEqual({
        status: 502,
        body: JSON.stringify({ reason: 'signing out: the CMS answered HTTP 500' }),
      })
    })
  })

  describe('a CMS fault is never read as nobody signed in', () => {
    it('a CMS failing on prolonging is a 502, said on the console', async () => {
      const cmsSession = session()
      cmsSession.refresh.mockResolvedValue(cms(500, null))
      const response = await handleSession(request({ path: '/refresh', body: '' }), cmsSession)
      expect(response.status).toBe(502)
      expect(vi.mocked(console.warn)).toHaveBeenCalledWith(
        expect.stringContaining('prolonging the session: the CMS answered HTTP 500')
      )
    })

    it('a CMS failing on « who » is a 502', async () => {
      const cmsSession = session()
      cmsSession.me.mockResolvedValue(cms(500, null))
      const response = await handleSession(
        request({ method: 'GET', path: '/', origin: undefined, body: '' }),
        cmsSession
      )
      expect(response.status).toBe(502)
    })

    it('a « who » answered 200 with a user it cannot read is a 502', async () => {
      const cmsSession = session()
      cmsSession.me.mockResolvedValue(cms(200, { user: { id: '1' } }))
      const response = await handleSession(
        request({ method: 'GET', path: '/', origin: undefined, body: '' }),
        cmsSession
      )
      expect(response.status).toBe(502)
    })

    it('a « who » answered 200 with nobody is nobody', async () => {
      const cmsSession = session()
      cmsSession.me.mockResolvedValue(cms(200, { user: null }))
      const response = await handleSession(
        request({ method: 'GET', path: '/', origin: undefined, body: '' }),
        cmsSession
      )
      expect(response).toEqual({ status: 200, body: JSON.stringify({ user: null }) })
    })
  })

  describe('unmanaged errors', () => {
    it('lets an unexpected failure through, for the middleware to answer 500', async () => {
      const cmsSession = session()
      cmsSession.me.mockRejectedValue(new Error('boom'))
      await expect(
        handleSession(request({ method: 'GET', path: '/', origin: undefined }), cmsSession)
      ).rejects.toThrow('boom')
    })
  })

  describe('edge cases', () => {
    it('refuses a sign-in from another origin before anything', async () => {
      const cmsSession = session()
      const response = await handleSession(request({ origin: 'http://evil.example' }), cmsSession)
      expect(response.status).toBe(403)
      expect(cmsSession.login).not.toHaveBeenCalled()
    })

    it('refuses a GET from another origin', async () => {
      const response = await handleSession(
        request({ method: 'GET', path: '/', origin: 'http://evil.example' }),
        session()
      )
      expect(response.status).toBe(403)
    })

    it('refuses a GET without an origin to a host that is not this machine', async () => {
      const cmsSession = session()
      const response = await handleSession(
        request({ method: 'GET', path: '/', origin: undefined, host: 'evil.example', body: '' }),
        cmsSession
      )
      expect(response.status).toBe(403)
      expect(cmsSession.me).not.toHaveBeenCalled()
    })

    it('refuses a POST without an origin, even to this machine', async () => {
      const cmsSession = session()
      const response = await handleSession(request({ origin: undefined }), cmsSession)
      expect(response.status).toBe(403)
      expect(cmsSession.login).not.toHaveBeenCalled()
    })

    it('answers 404 to a route it does not have', async () => {
      expect((await handleSession(request({ path: '/elsewhere' }), session())).status).toBe(404)
    })
  })
})
