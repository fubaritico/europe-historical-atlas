import type { LotChoices, LotField } from './lotUpdates'
import type { WikidataCandidate } from '../../../wikidata/wikidataPlace'

/** Where the lookup stands: idle, waiting, a list to choose from, or a sentence — with the lot's lists, if any. */
export type LookupState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'choose'; candidates: WikidataCandidate[] }
  | { kind: 'said'; message: string; tone: 'info' | 'error'; lotChoices: LotChoices }

/**
 * A sentence with no list under it.
 * @param message - the sentence
 * @param tone - how it reads
 * @returns the state
 */
export function said(message: string, tone: 'info' | 'error'): LookupState {
  return { kind: 'said', message, tone, lotChoices: {} }
}

/**
 * The state once a field's list has been answered: that list goes, the other stays.
 * @param state - the state
 * @param field - the field chosen
 * @returns the state without that list
 */
export function withoutChoice(state: LookupState, field: LotField): LookupState {
  if (state.kind !== 'said') return state
  const lotChoices: LotChoices = {}
  if (field !== 'country' && state.lotChoices.country !== undefined)
    lotChoices.country = state.lotChoices.country
  if (field !== 'region' && state.lotChoices.region !== undefined)
    lotChoices.region = state.lotChoices.region
  return { ...state, lotChoices }
}
