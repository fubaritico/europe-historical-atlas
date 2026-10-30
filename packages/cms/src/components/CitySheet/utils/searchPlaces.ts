import type { PlaceChoice } from './sheetValues'

/** How many places the list offers at most. */
export const MAX_PLACES = 10

/** Where the places are searched. */
export interface PlaceSearchTarget {
  /** The API's root: `/api`. */
  api: string
  /** The content language the names are read in. */
  locale: string
}

/**
 * The places whose name contains what was typed, read from the base at each search — so a place created in another
 * tab is offered at once, with no reload (the dev, 2026-10-30).
 * @param fetcher - the `fetch` to use
 * @param target - the API's root and the language
 * @param query - what was typed
 * @returns the matching places, by name
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses the search, or answers something that is not a list of places
 */
export async function searchPlaces(
  fetcher: typeof fetch,
  target: PlaceSearchTarget,
  query: string
): Promise<PlaceChoice[]> {
  const params = new URLSearchParams({
    'where[name][like]': query,
    limit: String(MAX_PLACES),
    depth: '0',
    sort: 'name',
    locale: target.locale,
    'select[name]': 'true',
  })
  const response = await fetcher(`${target.api}/places?${params.toString()}`, {
    credentials: 'include',
  })
  if (!response.ok)
    throw new Error(`[CMS] the search for places was refused (${String(response.status)})`)
  const answer = (await response.json()) as { docs?: unknown }
  if (!Array.isArray(answer.docs)) throw new Error('[CMS] the search for places answered no list')
  return answer.docs.map((doc: unknown) => {
    const { id, name } = (doc ?? {}) as { id?: unknown; name?: unknown }
    if ((typeof id !== 'number' && typeof id !== 'string') || typeof name !== 'string') {
      throw new Error(`[CMS] the search for places answered a place without its id or name`)
    }
    return { id, name }
  })
}
