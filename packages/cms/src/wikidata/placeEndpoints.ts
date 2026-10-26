import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import {
  WIKIDATA_ID,
  WIKIDATA_USER_AGENT,
  entityUrl,
  readPlaceEntity,
  readSearchAnswer,
  searchUrl,
} from './wikidataPlace'

import type { WikidataPlace } from './wikidataPlace'
import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'
import type { Endpoint, PayloadRequest } from 'payload'

/** What the handlers read of Payload's request — structural, so a test hands them a literal. */
export type LookupRequest = Pick<PayloadRequest, 'user' | 'query' | 'routeParams'>

/**
 * Ask Wikidata and read its answer — the one way this package fetches from it. Throws on any failure: the routes
 * turn that into the form's sentence, the seed lets it stop the run.
 * @param fetchFile - how to fetch
 * @param url - what to ask
 * @param read - how to read the answer
 * @returns what `read` made of it
 */
export async function fetchWikidata<T>(
  fetchFile: FetchLike,
  url: string,
  read: (value: unknown) => T
): Promise<T> {
  const response = await fetchFile(url, { headers: { 'User-Agent': WIKIDATA_USER_AGENT } })
  if (!response.ok) throw new Error(`HTTP ${String(response.status)}`)
  return read(await response.json())
}

/**
 * Read the place one item describes, throwing on any failure.
 * @param id - its item
 * @param fetchFile - how to fetch
 * @returns the place
 */
export function fetchPlaceEntity(
  id: string,
  fetchFile: FetchLike = fetchWithin
): Promise<WikidataPlace> {
  return fetchWikidata(fetchFile, entityUrl(id), readPlaceEntity)
}

/** What the form is told when Wikidata cannot be reached — the gesture is to try again. */
const UNREACHABLE = 'Wikidata ne répond pas, réessayez.'

/**
 * Ask Wikidata and read its answer, or turn any failure into the form's sentence.
 * @param fetchFile - how to fetch
 * @param url - what to ask
 * @param read - how to read the answer
 * @returns the JSON response for the form
 */
async function askWikidata(
  fetchFile: FetchLike,
  url: string,
  read: (value: unknown) => unknown
): Promise<Response> {
  try {
    return Response.json(await fetchWikidata(fetchFile, url, read))
  } catch (error: unknown) {
    // The detail stays in the server's log; the form gets what it can act on.
    console.error(`[CMS] Wikidata failed on ${url}`, error)
    return Response.json({ error: UNREACHABLE }, { status: 502 })
  }
}

/**
 * The French name a search was asked for.
 * @param request - the request
 * @returns the name, or `null` when there is none worth searching
 */
function nameOf(request: LookupRequest): string | null {
  const name = request.query.name
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null
}

/**
 * Search the items a French name may mean. Signed-in contributors only.
 * @param request - the request: `?name=Paris`
 * @param fetchFile - how to fetch
 * @returns the candidates, or the reason there are none
 */
export async function searchPlaces(
  request: LookupRequest,
  fetchFile: FetchLike = fetchWithin
): Promise<Response> {
  if (request.user === null) return Response.json({ error: 'Non connecté.' }, { status: 401 })
  const name = nameOf(request)
  if (name === null) return Response.json({ error: 'Écrivez d’abord un nom.' }, { status: 400 })
  return askWikidata(fetchFile, searchUrl(name), readSearchAnswer)
}

/**
 * Read the place one item describes. Signed-in contributors only.
 * @param request - the request: `/wikidata/Q90`
 * @param fetchFile - how to fetch
 * @returns the place, or the reason it cannot be read
 */
export async function readPlace(
  request: LookupRequest,
  fetchFile: FetchLike = fetchWithin
): Promise<Response> {
  if (request.user === null) return Response.json({ error: 'Non connecté.' }, { status: 401 })
  const id = request.routeParams?.id
  if (typeof id !== 'string' || !WIKIDATA_ID.test(id)) {
    return Response.json({ error: 'Identifiant Wikidata invalide.' }, { status: 400 })
  }
  return askWikidata(fetchFile, entityUrl(id), readPlaceEntity)
}

/** The two routes the place form calls: `/api/places/wikidata-search?name=…` and `/api/places/wikidata/:id`. */
export const placeEndpoints: Endpoint[] = [
  { path: '/wikidata-search', method: 'get', handler: (request) => searchPlaces(request) },
  { path: '/wikidata/:id', method: 'get', handler: (request) => readPlace(request) },
]
