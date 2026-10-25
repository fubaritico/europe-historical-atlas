/**
 * The place form's side of the Wikidata lookup: ask our two routes, and turn every answer into either data or the
 * sentence to show. No React here, so it is exercised with a stub fetch.
 */

import type { WikidataCandidate, WikidataPlace } from '../../wikidata/wikidataPlace'

/** What a lookup answers: the data, or the sentence the form shows instead. */
export type LookupAnswer<T> = { ok: true; data: T } | { ok: false; message: string }

/** Said when the route itself cannot be reached — the tool's server, not Wikidata. */
const SERVER_DOWN = 'L’outil de contribution ne répond pas, réessayez.'

/**
 * Call one of our routes.
 * @param fetchFile - how to fetch; the browser's in the form
 * @param url - the route
 * @returns its data, or the sentence to show
 */
async function call<T>(fetchFile: typeof fetch, url: string): Promise<LookupAnswer<T>> {
  try {
    const response = await fetchFile(url, { credentials: 'include' })
    const body: unknown = await response.json()
    if (response.ok) return { ok: true, data: body as T }
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Réponse inattendue (${String(response.status)}).`
    return { ok: false, message }
  } catch (error: unknown) {
    console.warn(`[CMS] ${url} failed`, error)
    return { ok: false, message: SERVER_DOWN }
  }
}

/**
 * The items a French name may mean.
 * @param name - the place's name, as typed
 * @param fetchFile - how to fetch
 * @returns the candidates, or the sentence to show
 */
export function fetchCandidates(
  name: string,
  fetchFile: typeof fetch = fetch
): Promise<LookupAnswer<WikidataCandidate[]>> {
  return call(fetchFile, `/api/places/wikidata-search?name=${encodeURIComponent(name)}`)
}

/**
 * The place one item describes.
 * @param id - the chosen item
 * @param fetchFile - how to fetch
 * @returns the place, or the sentence to show
 */
export function fetchPlace(
  id: string,
  fetchFile: typeof fetch = fetch
): Promise<LookupAnswer<WikidataPlace>> {
  return call(fetchFile, `/api/places/wikidata/${encodeURIComponent(id)}`)
}
