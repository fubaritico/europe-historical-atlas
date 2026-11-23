import { fetchWikidata } from '../wikidata/placeEndpoints'

import { LABELS_LOT, labelsUrl, readLabelsAnswer } from './wikidataLabels'

import type { ItemLabels } from './wikidataLabels'
import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** How the lots are paced: Wikidata refused 28 lots of 274 asked too fast on 2026-11-22 (the spike's measure). */
export interface Pace {
  /** Milliseconds between two lots. */
  readonly between: number
  /** Milliseconds before the first new attempt at a refused lot, doubled at each next one. */
  readonly retry: number
  /** How many times a lot is asked in all before the command gives up. */
  readonly attempts: number
}

/** The pace of the command: one lot a quarter-second, a refused one asked again after 5, 10, 20 and 40 seconds. */
export const WIKIDATA_PACE: Pace = { between: 250, retry: 5000, attempts: 5 }

/**
 * Wikidata's names for every item, a lot at a time, one lot after the other. A lot refused is asked again, slower; one
 * still refused at its last attempt stops everything (the dev's rule, `rules/error-handling.md`: a list missing a lot
 * would read as « nothing to sort », so it is never written).
 * @param ids - the items, each once
 * @param fetchFile - how to fetch
 * @param wait - how to pause, in milliseconds
 * @param pace - the pauses and the attempts
 * @returns each item's names, by its id; an item Wikidata does not know has no entry
 * @throws {Error} naming the lot and the last refusal, once a lot has used its attempts
 */
export async function fetchLabels(
  ids: readonly string[],
  fetchFile: FetchLike,
  wait: (ms: number) => Promise<void>,
  pace: Pace = WIKIDATA_PACE
): Promise<Map<string, ItemLabels>> {
  const names = new Map<string, ItemLabels>()
  for (let start = 0; start < ids.length; start += LABELS_LOT) {
    if (start > 0) await wait(pace.between)
    const lot = ids.slice(start, start + LABELS_LOT)
    const answer = await askLot(lot, fetchFile, wait, pace)
    for (const [id, labels] of answer) names.set(id, labels)
  }
  return names
}

/**
 * One lot, asked until Wikidata answers or the attempts run out.
 * @param lot - its items
 * @param fetchFile - how to fetch
 * @param wait - how to pause
 * @param pace - the pauses and the attempts
 * @returns the lot's names
 * @throws {Error} once the attempts have run out
 */
async function askLot(
  lot: readonly string[],
  fetchFile: FetchLike,
  wait: (ms: number) => Promise<void>,
  pace: Pace
): Promise<Map<string, ItemLabels>> {
  let refusal: unknown = null
  for (let attempt = 0; attempt < pace.attempts; attempt += 1) {
    if (attempt > 0) {
      console.warn(
        `[CMS] names:check — Wikidata refused the lot from ${lot[0] ?? '?'} (${String(refusal)}), asked again`
      )
      await wait(pace.retry * 2 ** (attempt - 1))
    }
    try {
      return await fetchWikidata(fetchFile, labelsUrl(lot), readLabelsAnswer)
    } catch (error: unknown) {
      refusal = error instanceof Error ? error.message : error
    }
  }
  throw new Error(
    `Wikidata n’a pas répondu pour le lot qui commence à ${lot[0] ?? '?'} après ${String(pace.attempts)} essais (${String(refusal)}) : rien n’est écrit.`
  )
}
