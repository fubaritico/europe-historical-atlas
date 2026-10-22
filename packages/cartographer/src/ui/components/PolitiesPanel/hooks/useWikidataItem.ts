import { useEffect, useState } from 'react'

import { WIKIDATA_ID } from '../../../../wikidata/wikidataSource'

import type { WikidataSource } from '../../../../wikidata/wikidataSource'
import type { WikidataReading } from '../../../utils/wikidataView'

/**
 * Read the Wikidata item the form names, a moment after the author stops typing (CARTO-243).
 *
 * **Where the reading stands is derived, not set**: the effect only stores answers, each tagged with the id
 * it is for; *reading* is simply "the last answer is not for this id". So an answer that arrives after the
 * id changed is ignored by construction — a slow reply for *Q2721* never stands for *Q272033* — and no
 * state is set synchronously in the effect. **A failure is said, never blocking**: the form works without
 * Wikidata; the panel says it did not answer, and the console logs it.
 */

/** How long after the last keystroke the item is read, in milliseconds. */
export const WIKIDATA_DELAY_MS = 400

/** An answer, kept with the id it is for. */
interface Answer {
  /** The id the answer is for. */
  id: string
  /** What the reading found. */
  reading: WikidataReading
}

/**
 * The item named by the form's Wikidata field, read through the source.
 * @param source - where Wikidata is read from
 * @param typed - the field as typed
 * @returns where the reading stands
 */
export function useWikidataItem(source: WikidataSource, typed: string): WikidataReading {
  // State
  const [answer, setAnswer] = useState<Answer | null>(null)

  // Derived
  const id = typed.trim()
  const valid = WIKIDATA_ID.test(id)

  // Effects
  useEffect(() => {
    if (!valid) return undefined
    let current = true
    const timer = window.setTimeout(() => {
      source.read([id]).then(
        (read) => {
          if (!current) return
          const facts = read.found.get(id)
          setAnswer({
            id,
            reading: facts === undefined ? { kind: 'unknown', id } : { kind: 'found', facts },
          })
        },
        (error: unknown) => {
          if (!current) return
          console.warn(`[Cartographer] Wikidata did not answer for ${id}`, error)
          setAnswer({ id, reading: { kind: 'failed', id } })
        }
      )
    }, WIKIDATA_DELAY_MS)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [source, id, valid])

  // Return
  if (!valid) return { kind: 'none' }
  return answer?.id === id ? answer.reading : { kind: 'reading', id }
}
