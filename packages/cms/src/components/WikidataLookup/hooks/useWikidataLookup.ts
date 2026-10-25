import { useField, useForm, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

import { fetchCandidates, fetchPlace } from '../lookupClient'
import { filledSummary } from '../utils/filledSummary'

import type { WikidataCandidate } from '../../../wikidata/wikidataPlace'
import type { HistoricalMoment } from '@europe-historical-atlas/core/time/historicalDate'

/** Where the lookup stands: idle, waiting, a list to choose from, or a sentence. */
export type LookupState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'choose'; candidates: WikidataCandidate[] }
  | { kind: 'said'; message: string; tone: 'info' | 'error' }

/** What the button and the list need. */
export interface WikidataLookup {
  /** Where the lookup stands. */
  state: LookupState
  /**
   * Search the items the name typed may mean.
   * @returns once the list or the sentence is shown
   */
  search: () => Promise<void>
  /**
   * Fill the position and the id from one item.
   * @param candidate - the item chosen
   * @returns once filled, or the sentence shown
   */
  choose: (candidate: WikidataCandidate) => Promise<void>
}

/** The form's fields of one end of a date, in the order they are filled. */
const MOMENT_PARTS = ['year', 'month', 'day', 'circa', 'margin', 'calendar'] as const

/**
 * The lookup's state and its two steps, wired to the place form's fields.
 * @returns the state, and what the button and the list call
 */
export function useWikidataLookup(): WikidataLookup {
  const name = useFormFields(([fields]) => fields.name?.value)
  const location = useField<[number, number]>({ path: 'location' })
  const wikidata = useField<string>({ path: 'wikidata' })
  const { dispatchFields, setModified } = useForm()
  const [state, setState] = useState<LookupState>({ kind: 'idle' })

  const search = async (): Promise<void> => {
    if (typeof name !== 'string' || name.trim() === '') {
      setState({ kind: 'said', message: 'Écrivez d’abord un nom.', tone: 'info' })
      return
    }
    setState({ kind: 'busy' })
    const answer = await fetchCandidates(name)
    if (!answer.ok) setState({ kind: 'said', message: answer.message, tone: 'error' })
    else if (answer.data.length === 0) {
      setState({ kind: 'said', message: `Aucun élément Wikidata pour « ${name} ».`, tone: 'info' })
    } else setState({ kind: 'choose', candidates: answer.data })
  }
  const fillMoment = (group: string, moment: HistoricalMoment): void => {
    for (const part of MOMENT_PARTS) {
      // The calendar keeps the form's default when Wikidata gives no day: it only matters for one.
      if (part === 'calendar' && moment.calendar === null) continue
      dispatchFields({ type: 'UPDATE', path: `${group}.${part}`, value: moment[part] })
    }
    setModified(true)
  }
  const choose = async (candidate: WikidataCandidate): Promise<void> => {
    setState({ kind: 'busy' })
    const answer = await fetchPlace(candidate.id)
    if (!answer.ok) {
      setState({ kind: 'said', message: answer.message, tone: 'error' })
      return
    }
    const place = answer.data
    wikidata.setValue(place.wikidata)
    if (place.coordinates !== null)
      location.setValue([place.coordinates.lon, place.coordinates.lat])
    if (place.existsFrom !== null) fillMoment('existsFrom', place.existsFrom)
    if (place.existsTo !== null) fillMoment('existsTo', place.existsTo)
    setState({ kind: 'said', message: filledSummary(candidate.id, place), tone: 'info' })
  }
  return { state, search, choose }
}
