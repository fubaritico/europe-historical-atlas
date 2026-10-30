import { useRef, useState } from 'react'

import type { RecordChoice } from '../utils/sheetValues'

/** What a record field — the place, a line's source — reads of its search. */
export interface RecordSearch {
  /** The records offered for what was last typed. */
  matches: RecordChoice[]
  /** Whether the last search failed — the field says so in place of its help. */
  failed: boolean
  /**
   * Whether the base has answered the search under way — until then the list says nothing, rather than « none of
   * that name » for a name not yet looked up.
   */
  answered: boolean
  /** Search for what was typed; `''` empties the list. */
  run: (query: string) => void
}

/**
 * A record field's search: the newest answer only — an older one arriving late never replaces it — and a failure
 * said under the field and in the console, the list emptied (the dev, 2026-10-30: nothing silent).
 * @param search - the records matching a query, from the base
 * @returns the matches, whether the last search failed, and the search to run
 */
export function useRecordSearch(search: (query: string) => Promise<RecordChoice[]>): RecordSearch {
  const latest = useRef(0)
  const [matches, setMatches] = useState<RecordChoice[]>([])
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
        console.error('[CMS] a search of the base failed', error)
        setFailed(true)
        setMatches([])
      }
    )
  }

  return { matches, failed, answered, run }
}
