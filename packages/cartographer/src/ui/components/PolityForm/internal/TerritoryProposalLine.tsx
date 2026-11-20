import { Button } from '@fubaritico/react/Button'

import { POLITY_MESSAGES } from '../../../../i18n/polity'
import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'

import type { TerritoryProposal, TerritoryProposalField } from '../../../utils/territoryProposals'

/**
 * The line of one field the CMS's territory can fill (CARTO-488): the field's name, the value — a rank named in the
 * page's language — and its button.
 *
 * **A copy of Wikidata's line, kept on purpose** (`WikidataPanel/internal/SuggestionLine`, review QUAL-002 of
 * 2026-11-20): the same markup in the same classes, each with its own catalogue — a third place that needs it is
 * when the line becomes a component of its own.
 *
 * **The button stays once its value is taken**, inert, as Wikidata's does (review A11Y-008 of its panel): the element
 * holding the keyboard focus is not removed from under it.
 * @param props - the proposal and the click
 * @param props.proposal - what the territory proposes for the field
 * @param props.onUse - take it
 * @returns the line
 */
export function TerritoryProposalLine({
  proposal,
  onUse,
}: {
  proposal: TerritoryProposal
  onUse: (field: TerritoryProposalField, value: string) => void
}) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)
  const polity = useTranslation(POLITY_MESSAGES)

  // Derived
  const { field, value, state } = proposal
  const shown = field === 'rank' ? polity('rankName', { rank: value }) : value
  const verb = t('proposalVerb', { state })
  const name = t('proposalField', { field })
  const agrees = state === 'same'

  // Handlers
  const handleUse = () => {
    if (!agrees) onUse(field, value)
  }

  // Render
  return (
    <li className="wikidata-panel__suggestion">
      <span className="wikidata-panel__field">{name}</span>
      <span className="wikidata-panel__value">{shown}</span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleUse}
        aria-disabled={agrees ? 'true' : undefined}
        aria-label={t('proposalLabel', { verb, value: shown, field: name })}
      >
        {verb}
      </Button>
    </li>
  )
}
