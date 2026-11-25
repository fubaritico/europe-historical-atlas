import { ANSWER_TIMEOUT_MS } from '@europe-historical-atlas/core/utils/fetchWithin'

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/**
 * The CMS's sessions, as the dev server reaches them (CARTO-535): Payload's own routes for its users — `me`, `login`,
 * `logout`, `refresh-token` — on the CMS of the dev's machine. **The session is the browser's**: its cookie,
 * `payload-token`, is set for `localhost` whichever port wrote it (Payload 3.92 sets no domain, `auth/cookies.ts`), so
 * the CMS's admin and the Cartographer share it. The dev server reads it from the request and hands it to the CMS as
 * `Authorization: JWT <token>`, which Payload takes whatever the origin (`auth/extractJWT.ts`). The page never sees the
 * token: it stays in an `HttpOnly` cookie.
 */

/** The cookie Payload keeps its session in — its default prefix, `payload`, the CMS sets no other. */
export const SESSION_COOKIE = 'payload-token'

/** Who is signed in, as the page is told. */
export interface SessionUser {
  /** The user's number in the CMS. */
  id: number
  /** The user's address — the CMS's users have no other name. */
  email: string
}

/** What the CMS answered, relayed: its status, its JSON, and the cookies it set. */
export interface CmsAnswer {
  /** The HTTP status. */
  status: number
  /** The JSON body, or `null` when it is not JSON. */
  body: unknown
  /** The `Set-Cookie` headers, as the CMS wrote them. */
  setCookie: string[]
}

/** The CMS did not answer at all — not started. */
export class CmsUnreachableError extends Error {
  /**
   * @param cause - why the request failed
   */
  constructor(cause: unknown) {
    super(`the CMS did not answer (${cause instanceof Error ? cause.message : String(cause)})`)
    this.name = 'CmsUnreachableError'
  }
}

/** The CMS's session routes. */
export interface CmsSession {
  /**
   * Who a session belongs to.
   * @param token - the session's token
   * @returns the CMS's answer
   */
  me(token: string): Promise<CmsAnswer>
  /**
   * Open a session.
   * @param email - the user's address
   * @param password - the user's password
   * @returns the CMS's answer, its cookie set on success
   */
  login(email: string, password: string): Promise<CmsAnswer>
  /**
   * Close a session.
   * @param token - the session's token
   * @returns the CMS's answer, its cookie expired
   */
  logout(token: string): Promise<CmsAnswer>
  /**
   * Prolong a session by Payload's own length (two hours, `tokenExpiration`).
   * @param token - the session's token
   * @returns the CMS's answer, a new cookie set
   */
  refresh(token: string): Promise<CmsAnswer>
}

/**
 * Read a request's cookie by its name.
 * @param header - the `Cookie` header, or nothing
 * @param name - the cookie's name
 * @returns its value, or `null` when the request carries none
 */
export function cookieOf(header: string | undefined, name: string): string | null {
  if (header === undefined) return null
  for (const part of header.split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) {
      // Read as written, never decoded: Payload's token is a JWT, which needs no escape — and a foreign cookie of
      // the same name with a broken escape would otherwise throw on every route (review SEC-001 of 2026-11-25)
      const value = part.slice(at + 1).trim()
      return value === '' ? null : value
    }
  }
  return null
}

/**
 * The user a CMS's answer names — Payload's `{ user: { id, email } }`.
 * @param body - the answer's JSON
 * @returns the user, or `null` when the answer names none
 */
export function sessionUserOf(body: unknown): SessionUser | null {
  const user = (body as { user?: unknown } | null)?.user as
    Record<string, unknown> | null | undefined
  if (typeof user !== 'object' || user === null) return null
  return typeof user.id === 'number' && typeof user.email === 'string'
    ? { id: user.id, email: user.email }
    : null
}

const withToken = (token: string) => ({ Authorization: `JWT ${token}` })

/**
 * The CMS's session routes, over its REST API.
 * @param url - the CMS's address, `http://127.0.0.1:3100`
 * @param fetchFile - how to fetch
 * @returns the routes
 */
export function createCmsSession(url: string, fetchFile: FetchLike): CmsSession {
  const base = `${url.replace(/\/+$/, '')}/api/users`
  const ask = async (path: string, init: RequestInit): Promise<CmsAnswer> => {
    let response: Response
    try {
      // Every call bounded, the POSTs too (`fetchWithin` bounds reads only): a CMS that never answers is the CMS
      // not answering — the dev's call of 2026-11-25 (CARTO-535). A sign-in cut after the CMS accepted it leaves
      // a cookie the page finds at its next « Réessayer ».
      response = await fetchFile(`${base}${path}`, {
        ...init,
        signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
      })
    } catch (error: unknown) {
      throw new CmsUnreachableError(error)
    }
    const body: unknown = await response.json().catch(() => null)
    return { status: response.status, body, setCookie: response.headers.getSetCookie() }
  }
  return {
    me: (token) => ask('/me', { headers: withToken(token) }),
    login: (email, password) =>
      ask('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    logout: (token) => ask('/logout', { method: 'POST', headers: withToken(token) }),
    refresh: (token) => ask('/refresh-token', { method: 'POST', headers: withToken(token) }),
  }
}
