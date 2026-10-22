import { anachronism, suggestionsFor } from '../wikidata/wikidataFacts'

import type {
  Anachronism,
  PolityWithWikidata,
  WikidataComparable,
  WikidataFacts,
  WikidataSuggestion,
} from '../wikidata/wikidataFacts'

/** Where the reading of the form's Wikidata id stands — what `useWikidataItem` answers. */
export type WikidataReading =
  | { kind: 'none' }
  | { kind: 'reading'; id: string }
  | { kind: 'failed'; id: string }
  | { kind: 'unknown'; id: string }
  | { kind: 'found'; facts: WikidataFacts }

/** Where the reading of the item stands. */
export type WikidataView =
  | { kind: 'none' }
  | { kind: 'reading'; id: string }
  | { kind: 'failed'; id: string }
  | { kind: 'unknown'; id: string }
  | {
      kind: 'found'
      facts: WikidataFacts
      warning: Anachronism | null
      suggestions: WikidataSuggestion[]
    }

/**
 * What the form's Wikidata panel shows, from where the reading stands (CARTO-243): the anachronism for the
 * year edited and one suggestion per field, the suzerain among the lords of that year (CARTO-248). An item that is a Wikipedia category, not a polity, offers
 * nothing and warns of nothing but that. Pure, so the dialogue's binding stays a few lines.
 * @param reading - where the reading of the item stands
 * @param form - the form's current values
 * @param year - the year being edited
 * @param polities - the polities of the year, the one edited excluded
 * @returns the panel's view
 */
export function wikidataViewOf(
  reading: WikidataReading,
  form: WikidataComparable,
  year: number,
  polities: readonly PolityWithWikidata[]
): WikidataView {
  if (reading.kind !== 'found') return reading
  const { facts } = reading
  if (facts.notASubject !== null) return { kind: 'found', facts, warning: null, suggestions: [] }
  return {
    kind: 'found',
    facts,
    warning: anachronism(year, facts),
    suggestions: suggestionsFor(form, facts, polities, year),
  }
}
