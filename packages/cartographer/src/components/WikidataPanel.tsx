import { Button } from '@fubaritico/react/Button'

import { nameOf, spanOf } from '../wikidata/wikidataFacts'

import { statusOf } from './wikidataView'

import type { WikidataFacts, WikidataField, WikidataSuggestion } from '../wikidata/wikidataFacts'

/**
 * What Wikidata says about the polity in the form (CARTO-243): its name, its years, its Wikipedia articles,
 * a warning when the year edited lies outside its dates, whether it calls itself a vassal state (CARTO-248),
 * and one button per field it can fill. The view of
 * the shell/view/binding split — literals in, a click out; the dialogue reads Wikidata and decides nothing
 * here.
 *
 * **It proposes, it never writes**: a field the author left empty shows *[Use]*; a field they filled
 * differently shows *[Replace]*; it changes only on that click.
 *
 * **One live region, always there, holding only the short messages** (review A11Y-010): reading, failed,
 * unknown, not a polity, the anachronism. A region inserted already full is often not announced, and one
 * wrapping links and buttons would re-read them all; so the summary and the buttons sit outside it.
 */

/** Where the reading of the item stands. */
export type WikidataView =
  | { kind: 'none' }
  | { kind: 'reading'; id: string }
  | { kind: 'failed'; id: string; reason: string }
  | { kind: 'unknown'; id: string }
  | {
      kind: 'found'
      facts: WikidataFacts
      warning: string | null
      suggestions: WikidataSuggestion[]
    }

/** What the panel needs. */
export interface WikidataPanelProps {
  /** What to show. */
  view: WikidataView
  /** Take Wikidata's value for a field. */
  onUse: (field: WikidataField, value: string) => void
}

/** How each field reads in the panel. */
const FIELD_LABEL: Readonly<Record<WikidataField, string>> = {
  name: 'Name',
  existsFrom: 'Exists from',
  existsTo: 'Exists to',
  suzerain: 'Suzerain',
}

/** The verb of each suggestion's button — the same word shown and announced (review A11Y-001). */
const VERB: Readonly<Record<WikidataSuggestion['state'], string>> = {
  empty: 'Use',
  differs: 'Replace',
  same: 'Agrees',
}

/**
 * The line of one field Wikidata can fill.
 *
 * **The button stays once its value is taken** (review A11Y-008): it turns into an inert *Agrees*, so the
 * element holding the keyboard focus is not removed from under it.
 * @param props - the suggestion and the click
 * @param props.suggestion - what Wikidata proposes for the field
 * @param props.onUse - take it
 * @returns the line
 */
function SuggestionLine({
  suggestion,
  onUse,
}: {
  suggestion: WikidataSuggestion
  onUse: (field: WikidataField, value: string) => void
}) {
  // Derived
  const verb = VERB[suggestion.state]
  const agrees = suggestion.state === 'same'

  // Handlers
  const handleUse = () => {
    if (!agrees) onUse(suggestion.field, suggestion.value)
  }

  // Render
  return (
    <li className="wikidata-panel__suggestion">
      <span className="wikidata-panel__field">{FIELD_LABEL[suggestion.field]}</span>
      <span className="wikidata-panel__value">{suggestion.shown}</span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleUse}
        aria-disabled={agrees ? 'true' : undefined}
        aria-label={`${verb} ${suggestion.shown} for ${FIELD_LABEL[suggestion.field]}`}
      >
        {verb}
      </Button>
    </li>
  )
}

/**
 * The facts of an item found: name and years with its articles, then the suggestions.
 * @param props - the found view and the click
 * @param props.view - the facts and the suggestions
 * @param props.onUse - take a value
 * @returns the block, or nothing for an item that is not a polity
 */
function FoundFacts({
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

/**
 * Render what Wikidata says, under the form's Wikidata field.
 * @param props - the view and the click
 * @returns the panel: the live region always, the facts when an item was found
 */
export function WikidataPanel({ view, onUse }: WikidataPanelProps) {
  // Derived
  const status = statusOf(view)
  const warns = view.kind === 'unknown' || view.kind === 'found'

  // Render
  return (
    <div className="wikidata-panel">
      <p role="status" className={warns ? 'wikidata-panel__warning' : 'wikidata-panel__note'}>
        {status}
      </p>
      {view.kind === 'found' && <FoundFacts view={view} onUse={onUse} />}
    </div>
  )
}
