import { Button } from '@fubaritico/react/Button'

import { useTranslation } from '../../../hooks/useTranslation'
import { WIKIDATA_PANEL_MESSAGES } from '../i18n'

import type { WikidataField, WikidataSuggestion } from '../../../wikidata/wikidataFacts'

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
  // Context
  const t = useTranslation(WIKIDATA_PANEL_MESSAGES)

  // Derived
  // The same verb shown and announced (review A11Y-001).
  const verb = t('verb', { state: suggestion.state })
  const field = t('fieldName', { field: suggestion.field })
  const agrees = suggestion.state === 'same'

  // Handlers
  const handleUse = () => {
    if (!agrees) onUse(suggestion.field, suggestion.value)
  }

  // Render
  return (
    <li className="wikidata-panel__suggestion">
      <span className="wikidata-panel__field">{field}</span>
      <span className="wikidata-panel__value">{suggestion.shown}</span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleUse}
        aria-disabled={agrees ? 'true' : undefined}
        aria-label={t('suggestionLabel', { verb, value: suggestion.shown, field })}
      >
        {verb}
      </Button>
    </li>
  )
}
