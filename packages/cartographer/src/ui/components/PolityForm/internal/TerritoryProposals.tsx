import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'

import { TerritoryProposalLine } from './TerritoryProposalLine'

import type { TerritoryProposal, TerritoryProposalField } from '../../../utils/territoryProposals'

/**
 * What the CMS's territory proposes, under the « Territoire du CMS » field (CARTO-488): one line per field — « Use » on a blank
 * field, « Replace » on one filled otherwise, an inert « Agrees » where the form already says the same. Drawn as
 * Wikidata's proposals are, in the same classes. **It proposes, it never writes.**
 * @param props - the proposals and the click
 * @param props.proposals - one per field the territory has something for
 * @param props.onUse - take the territory's value for a field
 * @returns the list, or nothing when the territory proposes nothing
 */
export function TerritoryProposals({
  proposals,
  onUse,
}: {
  proposals: readonly TerritoryProposal[]
  onUse: (field: TerritoryProposalField, value: string) => void
}) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)

  // Render
  if (proposals.length === 0) return null
  return (
    <ul className="wikidata-panel__suggestions" aria-label={t('territoryProposals')}>
      {proposals.map((proposal) => (
        <TerritoryProposalLine key={proposal.field} proposal={proposal} onUse={onUse} />
      ))}
    </ul>
  )
}
