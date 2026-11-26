import { CmsUnreachableError, SESSION_COOKIE, cookieOf } from './cmsSession'
import { CmsRefusalError, CmsSessionRefusedError } from './cmsTerritories'
import { LOG_TAG, answer, createBodyMiddleware, isSameMachineRequest } from './httpEndpoint'
import { readTerritoryRequest, territoryBody } from './territoryRequest'

import type { CmsTerritories } from './cmsTerritories'
import type { BodyStream, EndpointRequest, EndpointResponse, ResponseSink } from './httpEndpoint'

/**
 * The dev server's « Ajouter au CMS » endpoint (CARTO-498, the flow offline) — `POST /__cms/territories` creates a
 * polity's territory in the CMS on the dev's machine, or finds the one its Wikidata item already has, and answers its
 * number, which the page writes on the polity.
 *
 * **Why the dev server.** The page's origin is the Cartographer's, the CMS's another; the dev server speaks to the CMS
 * from Node, **with the session of whoever is signed in** — Payload's cookie, which the browser sends here and the page
 * never reads (`cmsSession.ts`). Online, the contribution goes another way (REPO-533).
 *
 * **What it refuses, because it writes into the base**: only a request from a page this server served on this very
 * machine (`isSameMachineRequest`, as the maps' endpoint), only `POST`, only with a session, only a request whose every
 * field is checked here (`readTerritoryRequest`).
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
export async function handleTerritoryCreation(
  request: EndpointRequest,
  cms: CmsTerritories
): Promise<EndpointResponse> {
  if (!isSameMachineRequest(request.host, request.origin)) {
    console.warn(`${LOG_TAG} refused a territory from another origin: ${String(request.origin)}`)
    return answer(403, {
      reason: 'only a page of this server, on this machine, may write to the CMS',
    })
  }
  if (request.method !== 'POST') return answer(405, { reason: 'only POST creates a territory' })
  const token = cookieOf(request.cookie, SESSION_COOKIE)
  if (token === null) {
    console.warn(`${LOG_TAG} « Ajouter au CMS » refused: nobody is signed in`)
    return answer(401, { reason: 'nobody is signed in to the CMS' })
  }
  const asked = readTerritoryRequest(request.body)
  if ('refused' in asked) {
    console.warn(`${LOG_TAG} refused a territory: ${asked.refused}`)
    return answer(400, { reason: asked.refused })
  }
  try {
    const existing = await cms.findByWikidata(token, asked.wikidata)
    if (existing !== null)
      return answer(200, { id: existing, created: false } satisfies TerritoryAnswer)
    const id = await cms.create(token, territoryBody(asked))
    return answer(200, { id, created: true } satisfies TerritoryAnswer)
  } catch (error: unknown) {
    if (error instanceof CmsUnreachableError) {
      console.warn(`${LOG_TAG} « Ajouter au CMS »: ${error.message}`)
      return answer(503, { reason: 'the CMS does not answer' })
    }
    if (error instanceof CmsSessionRefusedError) {
      console.warn(`${LOG_TAG} « Ajouter au CMS »: the CMS refused the session (${error.message})`)
      return answer(401, { reason: error.message })
    }
    if (error instanceof CmsRefusalError) {
      console.warn(`${LOG_TAG} the CMS refused the territory ${asked.wikidata}: ${error.message}`)
      return answer(502, { reason: error.message })
    }
    throw error
  }
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
    handle: (request) => handleTerritoryCreation(request, cms),
    failure: 'the creation in the CMS failed in the dev server',
  })
}
