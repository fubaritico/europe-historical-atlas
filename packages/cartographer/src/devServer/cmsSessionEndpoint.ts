import { CmsUnreachableError, SESSION_COOKIE, cookieOf, sessionUserOf } from './cmsSession'
import {
  LOG_TAG,
  LOOPBACK_HOST,
  answer,
  createBodyMiddleware,
  isSameMachineRequest,
} from './httpEndpoint'

import type { CmsAnswer, CmsSession, SessionUser } from './cmsSession'
import type { BodyStream, EndpointRequest, EndpointResponse, ResponseSink } from './httpEndpoint'

/**
 * The dev server's session endpoint (CARTO-535, the Cartographer behind the CMS's account) — under
 * `/__cms/session`: `GET /` who is signed in, `POST /login` with `{ email, password }`, `POST /logout`,
 * `POST /refresh`. It relays to the CMS of the dev's machine (`cmsSession.ts`) and hands back the CMS's cookie, so a
 * session opened here is the CMS admin's too, and the other way round.
 *
 * **What it refuses, because it carries a password**: only a request from a page this server served on this very
 * machine (`isSameMachineRequest`, as the maps' endpoint). The page is answered the user, never the token.
 *
 * **Every refusal is said** (`rules/error-handling.md`): on the server's console, and in the answer — the CMS not
 * started or silent past the delay (503), the address or the password refused (401, the CMS's own sentence), any other
 * answer of the CMS that names no user (502) — a fault is never read as nobody signed in.
 */

/** What the page is told of the session. */
export interface SessionAnswer {
  /** Who is signed in, or `null`. */
  user: SessionUser | null
}

/**
 * The answer that tells the page who is signed in, with the cookies the CMS set.
 * @param user - who is signed in, or `null`
 * @param cms - the CMS's answer whose cookies are relayed, if any
 * @returns the answer
 */
function signedIn(user: SessionUser | null, cms?: CmsAnswer): EndpointResponse {
  const response = answer(200, { user } satisfies SessionAnswer)
  return cms === undefined || cms.setCookie.length === 0
    ? response
    : { ...response, setCookie: cms.setCookie }
}

/**
 * The CMS's own sentence in a refusal — Payload's `{ errors: [{ message }] }`.
 * @param cms - the CMS's answer
 * @returns the sentence
 */
function refusalOf(cms: CmsAnswer): string {
  const errors = (cms.body as { errors?: { message?: unknown }[] } | null)?.errors
  const first = Array.isArray(errors) ? errors[0]?.message : undefined
  return typeof first === 'string' ? first : `the CMS answered HTTP ${String(cms.status)}`
}

/**
 * Read the address and the password a sign-in sends.
 * @param body - the request's body
 * @returns them, or `null` when the body does not carry both
 */
function credentialsOf(body: string): { email: string; password: string } | null {
  try {
    const value = JSON.parse(body) as { email?: unknown; password?: unknown } | null
    const email = value?.email
    const password = value?.password
    return typeof email === 'string' &&
      email.trim() !== '' &&
      typeof password === 'string' &&
      password !== ''
      ? { email: email.trim(), password }
      : null
  } catch {
    return null
  }
}

/**
 * Open a session.
 * @param request - the request
 * @param session - the CMS's session routes
 * @returns the answer
 */
async function login(request: EndpointRequest, session: CmsSession): Promise<EndpointResponse> {
  const credentials = credentialsOf(request.body)
  if (credentials === null) {
    console.warn(`${LOG_TAG} refused a sign-in without an address and a password`)
    return answer(400, { reason: 'an address and a password are needed' })
  }
  const cms = await session.login(credentials.email, credentials.password)
  if (cms.status !== 200) {
    // The address is not logged: a terminal's lines get pasted into tickets (review SEC-003 of 2026-11-25)
    console.warn(`${LOG_TAG} the CMS refused a sign-in: ${refusalOf(cms)}`)
    return answer(401, { reason: refusalOf(cms) })
  }
  return userOrFault(cms, 'signing in')
}

/**
 * The CMS's answer that should name a user, read: a user, nobody (`{ user: null }`), or a fault said on the console and
 * answered 502 — never read as nobody (the dev's call, CARTO-535: the user always gets a feedback).
 * @param cms - the CMS's answer
 * @param what - what was asked, for the console
 * @returns the answer
 */
function userOrFault(cms: CmsAnswer, what: string): EndpointResponse {
  const user = sessionUserOf(cms.body)
  const nobody = (cms.body as { user?: unknown } | null)?.user === null
  if (cms.status === 200 && (user !== null || nobody)) return signedIn(user, cms)
  console.warn(`${LOG_TAG} ${what}: the CMS answered HTTP ${String(cms.status)}, no user to read`)
  return answer(502, { reason: `${what}: ${refusalOf(cms)}` })
}

/**
 * Prolong a session, or say there is none to prolong — Payload answers 403 for a session it no longer knows
 * (3.92, `auth/operations/refresh.ts`), the one refusal that means nobody.
 * @param token - the session's token, or `null`
 * @param session - the CMS's session routes
 * @returns the answer
 */
async function refresh(token: string | null, session: CmsSession): Promise<EndpointResponse> {
  if (token === null) return signedIn(null)
  const cms = await session.refresh(token)
  if (cms.status === 401 || cms.status === 403) return signedIn(null)
  return userOrFault(cms, 'prolonging the session')
}

/**
 * Close a session: done when the CMS says so; otherwise said, and the page keeps saying it.
 * @param token - the session's token, or `null`
 * @param session - the CMS's session routes
 * @returns the answer
 */
async function logout(token: string | null, session: CmsSession): Promise<EndpointResponse> {
  if (token === null) return signedIn(null)
  const cms = await session.logout(token)
  if (cms.status === 200) return signedIn(null, cms)
  console.warn(`${LOG_TAG} signing out: the CMS answered HTTP ${String(cms.status)}`)
  return answer(502, { reason: `signing out: ${refusalOf(cms)}` })
}

/**
 * The method and the path a request asks, `GET /` for the route itself.
 * @param request - the request
 * @returns `METHOD /path`
 */
function askedOf(request: EndpointRequest): string {
  const path = request.path === undefined || request.path === '' ? '/' : request.path
  return `${request.method ?? ''} ${path}`
}

/**
 * Answer one request.
 * @param request - the request, its body read
 * @param session - the CMS's session routes
 * @returns the answer
 */
async function route(request: EndpointRequest, session: CmsSession): Promise<EndpointResponse> {
  const token = cookieOf(request.cookie, SESSION_COOKIE)
  const asked = askedOf(request)
  switch (asked) {
    case 'GET /':
      return token === null
        ? signedIn(null)
        : userOrFault(await session.me(token), 'who is signed in')
    case 'POST /login':
      return login(request, session)
    case 'POST /logout':
      return logout(token, session)
    case 'POST /refresh':
      return refresh(token, session)
    default:
      return answer(404, { reason: `no such session route: ${asked}` })
  }
}

/**
 * Whether a request comes from a page this server served on this machine. A browser sends no `Origin` with a GET to its
 * own origin, so a GET without one, to a loopback host, is the page's own; a GET with another origin is refused like
 * any other request.
 * @param request - the request
 * @returns `true` when it does
 */
function fromThisPage(request: EndpointRequest): boolean {
  if (isSameMachineRequest(request.host, request.origin)) return true
  return (
    request.method === 'GET' &&
    request.origin === undefined &&
    request.host !== undefined &&
    LOOPBACK_HOST.test(request.host)
  )
}

/**
 * Answer one request, the CMS's silence told apart.
 * @param request - the request, its body read
 * @param session - the CMS's session routes
 * @returns the answer
 */
export async function handleSession(
  request: EndpointRequest,
  session: CmsSession
): Promise<EndpointResponse> {
  if (!fromThisPage(request)) {
    console.warn(
      `${LOG_TAG} refused a session request from another origin: ${String(request.origin)}`
    )
    return answer(403, { reason: 'only a page of this server, on this machine, may sign in' })
  }
  try {
    return await route(request, session)
  } catch (error: unknown) {
    if (!(error instanceof CmsUnreachableError)) throw error
    console.warn(`${LOG_TAG} the session: ${error.message}`)
    return answer(503, { reason: 'the CMS does not answer' })
  }
}

/**
 * The endpoint as a Connect middleware.
 * @param session - the CMS's session routes
 * @returns the middleware
 */
export function createCmsSessionMiddleware(
  session: CmsSession
): (req: BodyStream, res: ResponseSink) => void {
  return createBodyMiddleware({
    handle: (request) => handleSession(request, session),
    failure: 'the session failed in the dev server',
  })
}
