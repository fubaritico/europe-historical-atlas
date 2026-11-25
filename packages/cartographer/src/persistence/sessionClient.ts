import { ANSWER_TIMEOUT_MS } from '@europe-historical-atlas/core/utils/fetchWithin'

import type { SignedInUser } from '../state/sessionStore'
import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/**
 * The session as the page reaches it (CARTO-535): the dev server's `/__cms/session` routes, which relay to the CMS of
 * the dev's machine and keep its cookie — the page never holds the token.
 */

/**
 * How long the page waits for the dev server: twice the relay's own delay to the CMS, so the relay's « the CMS does not
 * answer » always arrives first, and this one only catches the dev server itself silent.
 */
export const SESSION_WAIT_MS = 2 * ANSWER_TIMEOUT_MS

/** How a request about the session ended. */
export type SessionOutcome =
  /** Someone is signed in. */
  | { kind: 'signedIn'; user: SignedInUser }
  /** Nobody is. */
  | { kind: 'signedOut' }
  /** The CMS does not answer — or the dev server itself, the page's request getting no answer. */
  | { kind: 'offline' }
  /** The CMS refused the address and the password, in its words — or the dev server refused the request. */
  | { kind: 'refused'; reason: string }
  /** The dev server answered with nothing the page can read — a defect of the Cartographer's own code. */
  | { kind: 'broken'; detail: string }

/** The port the session's keeper speaks through. */
export interface SessionPort {
  /** @returns who is signed in */
  who(): Promise<SessionOutcome>
  /**
   * Sign in.
   * @param email - the address
   * @param password - the password, sent to the dev server and on to the CMS, never kept
   * @returns how it ended
   */
  signIn(email: string, password: string): Promise<SessionOutcome>
  /** @returns how signing out ended — nobody, once done */
  signOut(): Promise<SessionOutcome>
  /** @returns the session prolonged, or nobody when the CMS no longer knows it */
  refresh(): Promise<SessionOutcome>
}

/**
 * Read the dev server's answer.
 * @param status - its HTTP status
 * @param body - its JSON, or `null`
 * @returns how the request ended
 */
export function sessionOutcomeOf(status: number, body: unknown): SessionOutcome {
  const fields = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  if (status === 503) return { kind: 'offline' }
  if (status === 200) {
    const user = fields.user as Record<string, unknown> | null | undefined
    if (user === null) return { kind: 'signedOut' }
    // The dev's call (CARTO-535): an answer that names nobody readable is never read as nobody signed in — it is said
    return typeof user === 'object' && typeof user.id === 'number' && typeof user.email === 'string'
      ? { kind: 'signedIn', user: { id: user.id, email: user.email } }
      : { kind: 'broken', detail: `the dev server answered 200 with ${JSON.stringify(body)}` }
  }
  return {
    kind: 'refused',
    reason:
      typeof fields.reason === 'string'
        ? fields.reason
        : `the dev server answered HTTP ${String(status)}`,
  }
}

/**
 * The port over the dev server's routes.
 * @param route - the routes' root, `CMS_SESSION_ROUTE`
 * @param fetchFile - how to fetch
 * @returns the port
 */
export function createSessionClient(route: string, fetchFile: FetchLike): SessionPort {
  const ask = async (path: string, init?: RequestInit): Promise<SessionOutcome> => {
    let response: Response
    try {
      response = await fetchFile(`${route}${path}`, {
        credentials: 'same-origin',
        signal: AbortSignal.timeout(SESSION_WAIT_MS),
        ...init,
      })
    } catch (error: unknown) {
      // The dev's call (CARTO-535): no answer — the dev server stopped, or none within the wait — reads as the CMS not
      // answering, the form's « Réessayer » recovering it; the cause is said here
      console.warn(`[Cartographer] the session's request got no answer: ${String(error)}`)
      return { kind: 'offline' }
    }
    const body: unknown = await response.json().catch(() => null)
    return sessionOutcomeOf(response.status, body)
  }
  const post = (path: string, body?: object) =>
    ask(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  return {
    who: () => ask('/'),
    signIn: (email, password) => post('/login', { email, password }),
    signOut: () => post('/logout'),
    refresh: () => post('/refresh'),
  }
}
