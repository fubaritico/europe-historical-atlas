/**
 * The title page's side of the operation (CMS-507): call the route, and turn its answer into the results or the
 * sentence to show. No React here, so it is exercised with a stub fetch.
 */

import type { AttachResult } from '../../../titles/attachCities'

/** What attaching answers: each city's result, or the sentence that refused the whole. */
export type AttachAnswer = { ok: true; results: AttachResult[] } | { ok: false; message: string }

/** Said when the route cannot be reached — the CMS's server, not the operation. */
const SERVER_DOWN =
  'L’outil de contribution ne répond pas : aucune ville n’a été rattachée, réessayez.'

/**
 * Whether a body is the route's answer.
 * @param body - what was read
 * @returns `true` for `{ results: [...] }`
 */
function isResults(body: unknown): body is { results: AttachResult[] } {
  return (
    typeof body === 'object' && body !== null && 'results' in body && Array.isArray(body.results)
  )
}

/**
 * Attach cities to a title at a year, on the CMS's server.
 * @param title - the title, by id
 * @param year - the year
 * @param places - the cities' places, by id
 * @param fetchFile - how to fetch; the browser's in the page
 * @returns each city's result, or the sentence to show
 */
export async function attachClient(
  title: number | string,
  year: number,
  places: readonly (number | string)[],
  fetchFile: typeof fetch = fetch
): Promise<AttachAnswer> {
  let response: Response
  try {
    response = await fetchFile(`/api/titles/${encodeURIComponent(String(title))}/cities`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, places }),
    })
  } catch (error: unknown) {
    console.error('[CMS] the route of a title’s cities could not be reached', error)
    return { ok: false, message: SERVER_DOWN }
  }
  const body: unknown = await response.json().catch(() => null)
  if (response.ok && isResults(body)) return { ok: true, results: body.results }
  const message =
    typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Réponse inattendue du rattachement (${String(response.status)}).`
  console.error(`[CMS] attaching cities failed: ${message}`)
  return { ok: false, message }
}
