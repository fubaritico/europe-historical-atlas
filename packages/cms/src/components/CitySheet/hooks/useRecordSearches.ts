import { useCallback } from 'react'

import { searchRecords } from '../utils/searchRecords'

import type { RecordChoice } from '../utils/sheetValues'

/** The two searches of the form, each stable for the life of the form. */
export interface RecordSearches {
  /** The places matching what was typed, by name. */
  places: (query: string) => Promise<RecordChoice[]>
  /** The sources matching what was typed, by title. */
  sources: (query: string) => Promise<RecordChoice[]>
}

/**
 * The form's searches of the base: the places and the sources, in the content language.
 * @param api - the API's root
 * @param locale - the content language
 * @returns the two searches
 */
export function useRecordSearches(api: string, locale: string): RecordSearches {
  const places = useCallback(
    (query: string) =>
      searchRecords(fetch, { api, collection: 'places', field: 'name', locale }, query),
    [api, locale]
  )
  const sources = useCallback(
    (query: string) =>
      searchRecords(fetch, { api, collection: 'sources', field: 'title', locale }, query),
    [api, locale]
  )
  return { places, sources }
}
