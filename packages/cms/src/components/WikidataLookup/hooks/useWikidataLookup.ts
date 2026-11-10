import { useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

import { fetchCandidates, fetchLot, fetchPlace } from '../lookupClient'
import { filledSummary } from '../utils/filledSummary'
import { said, withoutChoice } from '../utils/lookupState'
import { lotOutcome } from '../utils/lotOutcome'

import { useLotFields } from './useLotFields'
import { usePlaceFields } from './usePlaceFields'

import type { NamedItem } from '../../../wikidata/placeLot'
import type { WikidataCandidate } from '../../../wikidata/wikidataPlace'
import type { LookupState } from '../utils/lookupState'
import type { LotField } from '../utils/lotUpdates'

export type { LookupState } from '../utils/lookupState'
export type { LotField } from '../utils/lotUpdates'

/** What the button and the lists need. */
export interface WikidataLookup {
  /** Where the lookup stands. */
  state: LookupState
  /**
   * Search the items the name typed may mean.
   * @returns once the list or the sentence is shown
   */
  search: () => Promise<void>
  /**
   * Fill the position, the id and the lot from one item.
   * @param candidate - the item chosen
   * @returns once filled, or the sentence shown
   */
  choose: (candidate: WikidataCandidate) => Promise<void>
  /**
   * Fill a field of the lot from the item chosen in its list.
   * @param field - `country` or `region`
   * @param item - the item chosen
   * @returns nothing
   */
  chooseLot: (field: LotField, item: NamedItem) => void
}

/**
 * The lookup's state and its steps, wired to the place form's fields.
 * @returns the state, and what the button and the lists call
 */
export function useWikidataLookup(): WikidataLookup {
  const name = useFormFields(([fields]) => fields.name?.value)
  const fillPlace = usePlaceFields()
  const lotFields = useLotFields()
  const [state, setState] = useState<LookupState>({ kind: 'idle' })

  const search = async (): Promise<void> => {
    if (typeof name !== 'string' || name.trim() === '') {
      setState(said('Écrivez d’abord un nom.', 'info'))
      return
    }
    setState({ kind: 'busy' })
    const answer = await fetchCandidates(name)
    if (!answer.ok) setState(said(answer.message, 'error'))
    else if (answer.data.length === 0)
      setState(said(`Aucun élément Wikidata pour « ${name} ».`, 'info'))
    else setState({ kind: 'choose', candidates: answer.data })
  }
  const choose = async (candidate: WikidataCandidate): Promise<void> => {
    setState({ kind: 'busy' })
    const answer = await fetchPlace(candidate.id)
    if (!answer.ok) {
      setState(said(answer.message, 'error'))
      return
    }
    const place = answer.data
    fillPlace(place)
    const filled = filledSummary(candidate.id, place)
    // The lot is asked apart: a failure there leaves the position filled, and says that the lot was not read.
    const lot = await fetchLot(place.wikidata)
    if (!lot.ok) {
      setState(said(`${filled} Le pays et la région n’ont pas été lus : ${lot.message}`, 'error'))
      return
    }
    const outcome = lotOutcome(lot.data)
    const lotChoices = lotFields.apply(outcome)
    setState({
      kind: 'said',
      message: `${filled} Lot : ${outcome.sentence}`,
      tone: 'info',
      lotChoices,
    })
  }
  const chooseLot = (field: LotField, item: NamedItem): void => {
    lotFields.fill(field, item)
    setState((current) => withoutChoice(current, field))
  }
  return { state, search, choose, chooseLot }
}
