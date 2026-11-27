import { CmsUnreachableError, SESSION_COOKIE, cookieOf } from './cmsSession'
import { CmsRefusalError, CmsSessionRefusedError } from './cmsTerritories'
import { LOG_TAG, answer, createBodyMiddleware, isFromThisPage } from './httpEndpoint'
import { readTerritoryRequest, territoryBody } from './territoryRequest'

import type { CmsTerritories } from './cmsTerritories'
import type { BodyStream, EndpointRequest, EndpointResponse, ResponseSink } from './httpEndpoint'

/**
 * The dev server's « Ajouter au CMS » endpoint (CARTO-498, the flow offline) — `POST /__cms/territories` creates a
 * polity's territory in the CMS on the dev's machine, or finds the one its Wikidata item already has, and answers its
 * number, which the page writes on the polity. `GET /__cms/territories` answers every territory of the CMS, read live,
 * for [Check this year] (CARTO-568).
 *
 * **Why the dev server.** The page's origin is the Cartographer's, the CMS's another; the dev server speaks to the CMS
 * from Node, **with the session of whoever is signed in** — Payload's cookie, which the browser sends here and the page
 * never reads (`cmsSession.ts`). Online, the contribution goes another way (REPO-533).
 *
 * **What it refuses, because it reads and writes the base in someone's name**: only a request from a page this server
 * served on this very machine (`isFromThisPage` — both headers for a `POST`, as the maps' endpoint; a loopback host for a
 * `GET`, which a browser sends without `Origin`), only `GET` and `POST`, only with a session, only a creation whose
 * every field is checked here (`readTerritoryRequest`).
 *
 * **Every refusal is said** (`rules/error-handling.md`): on the server's console, and in the answer the page shows —
 * the CMS not started (503, the page asks to start it and try again), nobody signed in or the session refused by the
 * CMS (401, the page asks to sign in again), the CMS's own refusal in its words (502).
 */

/** What the endpoint answers once the territory is the polity's. */
export interface TerritoryAnswer {
  /** The territory's number in the CMS. */
  id: number
  /** `true` when it was created now; `false` when the CMS already had it, found by its Wikidata item. */
  created: boolean
}

/**
 * Answer one request.
 * @param request - the request, its body read
 * @param cms - the CMS's territories
 * @returns the answer
 */
export async function handleTerritoryRequest(
  request: EndpointRequest,
  cms: CmsTerritories
): Promise<EndpointResponse> {
  // A GET carries no `Origin` from the page's own origin: the listing is the page's when its host is the loopback
  if (!isFromThisPage(request)) {
    console.warn(
      `${LOG_TAG} refused a territory request from another origin: ${String(request.origin)}`
    )
    return answer(403, {
      reason: 'only a page of this server, on this machine, may reach the CMS through it',
    })
  }
  const gesture = request.method === undefined ? undefined : GESTURES[request.method]
  if (gesture === undefined)
    return answer(405, { reason: 'only GET lists the territories and POST creates one' })
  const token = cookieOf(request.cookie, SESSION_COOKIE)
  if (token === null) {
    console.warn(`${LOG_TAG} ${gesture} refused: nobody is signed in`)
    return answer(401, { reason: 'nobody is signed in to the CMS' })
  }
  try {
    return request.method === 'GET'
      ? answer(200, { territories: await cms.list(token) })
      : await creation(request.body, cms, token)
  } catch (error: unknown) {
    return failureAnswer(error, gesture)
  }
}

/** What the endpoint does, by method: `GET` lists, `POST` creates. */
const GESTURES: Readonly<Partial<Record<string, string>>> = {
  GET: '[Check this year]',
  POST: '« Ajouter au CMS »',
}

/**
 * « Ajouter au CMS »: the territory the Wikidata item already has, or a new one.
 * @param body - the request's body
 * @param cms - the CMS's territories
 * @param token - the session's token
 * @returns the answer: its number, or why the request is refused
 */
async function creation(
  body: string,
  cms: CmsTerritories,
  token: string
): Promise<EndpointResponse> {
  const asked = readTerritoryRequest(body)
  if ('refused' in asked) {
    console.warn(`${LOG_TAG} refused a territory: ${asked.refused}`)
    return answer(400, { reason: asked.refused })
  }
  const existing = await cms.findByWikidata(token, asked.wikidata)
  if (existing !== null)
    return answer(200, { id: existing, created: false } satisfies TerritoryAnswer)
  const id = await cms.create(token, territoryBody(asked))
  return answer(200, { id, created: true } satisfies TerritoryAnswer)
}

/**
 * A failure of the CMS, as the page acts on it — the CMS not started (503), the session refused (401), the CMS's own
 * refusal in its words (502) — each said on the server's console; the page tells the author on screen. Anything else
 * is no answer of the CMS, and goes on.
 * @param error - what was thrown
 * @param gesture - which gesture asked, for the console
 * @returns the answer
 * @throws {unknown} the error itself, when it is no failure of the CMS
 */
function failureAnswer(error: unknown, gesture: string): EndpointResponse {
  if (error instanceof CmsUnreachableError) {
    console.warn(`${LOG_TAG} ${gesture}: ${error.message}`)
    return answer(503, { reason: 'the CMS does not answer' })
  }
  if (error instanceof CmsSessionRefusedError) {
    console.warn(`${LOG_TAG} ${gesture}: the CMS refused the session (${error.message})`)
    return answer(401, { reason: error.message })
  }
  if (error instanceof CmsRefusalError) {
    console.warn(`${LOG_TAG} ${gesture}: the CMS refused (${error.message})`)
    return answer(502, { reason: error.message })
  }
  throw error
}

/**
 * The endpoint as a Connect middleware.
 * @param cms - the CMS's territories
 * @returns the middleware
 */
export function createCmsTerritoryMiddleware(
  cms: CmsTerritories
): (req: BodyStream, res: ResponseSink) => void {
  return createBodyMiddleware({
    handle: (request) => handleTerritoryRequest(request, cms),
    failure: 'a territory request to the CMS failed in the dev server',
  })
}
