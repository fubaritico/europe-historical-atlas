import { nameOf, spanOf } from '../../../../wikidata/wikidataFacts'
import { useTranslation } from '../../../hooks/useTranslation'
import { WIKIDATA_PANEL_MESSAGES } from '../i18n'

import { SuggestionLine } from './SuggestionLine'

import type { WikidataField } from '../../../../wikidata/wikidataFacts'
import type { WikidataView } from '../../../utils/wikidataView'

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
  // Context
  const t = useTranslation(WIKIDATA_PANEL_MESSAGES)

  // Derived
  const { facts } = view

  // Render
  if (facts.notASubject !== null) return null
  return (
    <>
      <p className="wikidata-panel__summary">
        {nameOf(facts)} · {spanOf(facts)}
        {facts.vassalState && t('vassalState')}
        {/* Each link is named in its article's language, whatever the page's — a proper name, not a catalogue
            entry — and says so, for a screen reader. */}
        {facts.wikipedia.en !== null && (
          <a href={facts.wikipedia.en} target="_blank" rel="noreferrer" lang="en">
            Wikipedia (en)
          </a>
        )}
        {facts.wikipedia.fr !== null && (
          <a href={facts.wikipedia.fr} target="_blank" rel="noreferrer" lang="fr">
            Wikipédia (fr)
          </a>
        )}
      </p>
      {view.suggestions.length > 0 && (
        <ul className="wikidata-panel__suggestions" aria-label={t('proposals')}>
          {view.suggestions.map((suggestion) => (
            <SuggestionLine key={suggestion.field} suggestion={suggestion} onUse={onUse} />
          ))}
        </ul>
      )}
    </>
  )
}
