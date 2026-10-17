import { anachronism, suggestionsFor } from '../wikidata/wikidataFacts'

import type { WikidataReading } from './useWikidataItem'
import type { WikidataView } from './WikidataPanel'
import type { PolityWithWikidata, WikidataComparable } from '../wikidata/wikidataFacts'

/**
 * What the form's Wikidata panel shows, from where the reading stands (CARTO-243): the anachronism for the
 * year edited and one suggestion per field. An item that is a Wikipedia category, not a polity, offers
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
    suggestions: suggestionsFor(form, facts, polities),
  }
}

/**
 * The short message the live region holds for a view, or `''`.
 * @param view - where the reading stands
 * @returns the sentence to announce
 */
export function statusOf(view: WikidataView): string {
  if (view.kind === 'reading') return `Reading ${view.id} on Wikidata…`
  if (view.kind === 'failed')
    return `Wikidata did not answer (${view.reason}) — the form works without it`
  if (view.kind === 'unknown') return `Wikidata does not know ${view.id}`
  if (view.kind === 'found' && view.facts.notASubject !== null)
    return `${view.facts.id} is ${view.facts.notASubject}, not a polity — check the id`
  if (view.kind === 'found' && view.warning !== null) return view.warning
  return ''
}
