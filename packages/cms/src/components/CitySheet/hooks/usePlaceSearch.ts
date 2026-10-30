import { useRef, useState } from 'react'

import type { PlaceChoice } from '../utils/sheetValues'

/** What the place field reads of its search. */
export interface PlaceSearch {
  /** The places offered for what was last typed. */
  matches: PlaceChoice[]
  /** Whether the last search failed — the field says so in place of its help. */
  failed: boolean
  /**
   * Whether the base has answered the search under way — until then the list says nothing, rather than « no place of
   * that name » for a name not yet looked up.
   */
  answered: boolean
  /** Search for what was typed; `''` empties the list. */
  run: (query: string) => void
}

/**
 * The place field's search: the newest answer only — an older one arriving late never replaces it — and a failure
 * said under the field and in the console, the list emptied (the dev, 2026-10-30: nothing silent).
 * @param search - the places matching a query, from the base
 * @returns the matches, whether the last search failed, and the search to run
 */
export function usePlaceSearch(search: (query: string) => Promise<PlaceChoice[]>): PlaceSearch {
  const latest = useRef(0)
  const [matches, setMatches] = useState<PlaceChoice[]>([])
  const [failed, setFailed] = useState(false)
  const [answered, setAnswered] = useState(false)

  const run = (query: string) => {
    const call = ++latest.current
    setAnswered(false)
    if (query === '') {
      setFailed(false)
      setMatches([])
      return
    }
    search(query).then(
      (found) => {
        if (call !== latest.current) return
        setFailed(false)
        setMatches(found)
        setAnswered(true)
      },
      (error: unknown) => {
        if (call !== latest.current) return
        console.error('[CMS] the search for places failed', error)
        setFailed(true)
        setMatches([])
      }
    )
  }

  return { matches, failed, answered, run }
}
