import { Button } from '@fubaritico/react/Button'

import type { WikidataField, WikidataSuggestion } from '../../../wikidata/wikidataFacts'

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
export function SuggestionLine({
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
