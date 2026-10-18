import { nameOf, spanOf } from '../../../wikidata/wikidataFacts'

import { SuggestionLine } from './SuggestionLine'

import type { WikidataField } from '../../../wikidata/wikidataFacts'
import type { WikidataView } from '../../shared/wikidataView'

/**
 * The facts of an item found: name and years with its articles, then the suggestions.
 * @param props - the found view and the click
 * @param props.view - the facts and the suggestions
 * @param props.onUse - take a value
 * @returns the block, or nothing for an item that is not a polity
 */
export function FoundFacts({
  view,
  onUse,
}: {
  view: Extract<WikidataView, { kind: 'found' }>
  onUse: (field: WikidataField, value: string) => void
}) {
  // Derived
  const { facts } = view

  // Render
  if (facts.notASubject !== null) return null
  return (
    <>
      <p className="wikidata-panel__summary">
        {nameOf(facts)} · {spanOf(facts)}
        {facts.vassalState && ' · a vassal state'}
        {facts.wikipedia.en !== null && (
          <a href={facts.wikipedia.en} target="_blank" rel="noreferrer">
            Wikipedia (en)
          </a>
        )}
        {facts.wikipedia.fr !== null && (
          <a href={facts.wikipedia.fr} target="_blank" rel="noreferrer">
            Wikipédia (fr)
          </a>
        )}
      </p>
      {view.suggestions.length > 0 && (
        <ul className="wikidata-panel__suggestions" aria-label="What Wikidata proposes">
          {view.suggestions.map((suggestion) => (
            <SuggestionLine key={suggestion.field} suggestion={suggestion} onUse={onUse} />
          ))}
        </ul>
      )}
    </>
  )
}
