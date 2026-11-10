import type { NamedItem, PlaceLot } from '../../../wikidata/placeLot'

/** What the form does with one field of the lot (CMS-414, the dev's rule of 2026-11-10). */
export type LotFieldOutcome =
  /** Wikidata gives one: it is filled. */
  | { kind: 'fill'; item: NamedItem }
  /** It gives several: nothing is filled, a list offers them to choose from. */
  | { kind: 'choose'; items: NamedItem[] }
  /** It gives none: nothing is filled, the sentence says so — then the field is typed. */
  | { kind: 'missing' }

/** What the form does with the whole lot, and the words it says about it. */
export interface LotOutcome {
  /** The country today. */
  country: LotFieldOutcome
  /** The region today. */
  region: LotFieldOutcome
  /** The part of the sentence under the button that speaks of the lot. */
  sentence: string
}

/**
 * One field's outcome: one item fills it, several are offered, none is said.
 * @param items - what Wikidata gives for it
 * @returns the outcome
 */
function fieldOutcome(items: readonly NamedItem[]): LotFieldOutcome {
  const [first] = items
  if (first === undefined) return { kind: 'missing' }
  return items.length === 1 ? { kind: 'fill', item: first } : { kind: 'choose', items: [...items] }
}

/**
 * The words for one field.
 * @param outcome - its outcome
 * @param what - `le pays` or `la région`
 * @returns the clause
 */
function clause(outcome: LotFieldOutcome, what: string): string {
  if (outcome.kind === 'fill') return `${what} ${outcome.item.name}`
  if (outcome.kind === 'choose') return `${what} : plusieurs dans Wikidata, à choisir ci-dessous`
  return `${what} : absent de Wikidata, à saisir`
}

/**
 * What the form does with a lot, never picking for the contributor: one answer fills, several are offered, none is said.
 * @param lot - what Wikidata gives
 * @returns each field's outcome and the sentence
 */
export function lotOutcome(lot: PlaceLot): LotOutcome {
  const country = fieldOutcome(lot.countries)
  const region = fieldOutcome(lot.regions)
  return {
    country,
    region,
    sentence: `${clause(country, 'le pays')} ; ${clause(region, 'la région')}.`,
  }
}
