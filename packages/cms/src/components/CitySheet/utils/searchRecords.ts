import type { RecordChoice } from './sheetValues'

/** How many records the list offers at most. */
export const MAX_RECORDS = 10

/** Where the records are searched, and by which of their fields. */
export interface RecordSearchTarget {
  /** The API's root: `/api`. */
  api: string
  /** The collection: `places`, `sources`. */
  collection: string
  /** The field the name is read from: a place's `name`, a source's `title`. */
  field: string
  /** The content language the names are read in. */
  locale: string
}

/**
 * The records whose name contains what was typed, read from the base at each search — so a place or a source created
 * in another tab is offered at once, with no reload (the dev, 2026-10-30).
 * @param fetcher - the `fetch` to use
 * @param target - the API's root, the collection, its name field and the language
 * @param query - what was typed
 * @returns the matching records, by name
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses the search, or answers something that is not a list of records
 */
export async function searchRecords(
  fetcher: typeof fetch,
  target: RecordSearchTarget,
  query: string
): Promise<RecordChoice[]> {
  const params = new URLSearchParams({
    [`where[${target.field}][like]`]: query,
    limit: String(MAX_RECORDS),
    depth: '0',
    sort: target.field,
    locale: target.locale,
    [`select[${target.field}]`]: 'true',
  })
  const response = await fetcher(`${target.api}/${target.collection}?${params.toString()}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(
      `[CMS] the search in ${target.collection} was refused (${String(response.status)})`
    )
  }
  const answer = (await response.json()) as { docs?: unknown }
  if (!Array.isArray(answer.docs)) {
    throw new Error(`[CMS] the search in ${target.collection} answered no list`)
  }
  return answer.docs.map((doc: unknown) => {
    const record = (doc ?? {}) as Record<string, unknown>
    const id = record.id
    const name = record[target.field]
    if ((typeof id !== 'number' && typeof id !== 'string') || typeof name !== 'string') {
      throw new Error(
        `[CMS] the search in ${target.collection} answered a record without its id or name`
      )
    }
    return { id, name }
  })
}
