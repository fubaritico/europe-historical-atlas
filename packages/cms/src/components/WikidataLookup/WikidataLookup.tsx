'use client'

import { Button } from '@payloadcms/ui'

import { useWikidataLookup } from './hooks/useWikidataLookup'
import { CandidateButton } from './internal/CandidateButton'
import { LotChoice } from './internal/LotChoice'

import type { LotField } from './hooks/useWikidataLookup'

/** The lot's fields, in the order their lists show. */
const LOT_FIELDS: readonly LotField[] = ['country', 'region']

/**
 * The button beside a place's name: search Wikidata for the French name, offer the items it may mean, and fill the
 * position, the Wikidata id and the lot — the country and the region today (CMS-414) — from the one chosen. Nothing
 * is filled before a choice — « Paris » is also a town in Texas, a family name and a plant; nor is a country or a
 * region when Wikidata gives several: a list offers them.
 * @returns the button, and under it the choice or the sentence, and the lot's lists
 */
export function WikidataLookup() {
  const { state, search, choose, chooseLot } = useWikidataLookup()

  // Handlers
  const handleSearchClick = (): void => {
    void search()
  }

  return (
    <div className="wikidata-lookup">
      <Button
        buttonStyle="secondary"
        size="medium"
        onClick={handleSearchClick}
        disabled={state.kind === 'busy'}
      >
        {state.kind === 'busy' ? 'Recherche…' : 'Chercher dans Wikidata'}
      </Button>
      {state.kind === 'choose' && (
        <ul className="wikidata-lookup__choices">
          {state.candidates.map((candidate) => (
            <li key={candidate.id}>
              <CandidateButton candidate={candidate} onChoose={choose} />
            </li>
          ))}
        </ul>
      )}
      {state.kind === 'said' && (
        <p
          className={`wikidata-lookup__message wikidata-lookup__message--${state.tone}`}
          role="status"
        >
          {state.message}
        </p>
      )}
      {state.kind === 'said' &&
        LOT_FIELDS.map((field) => {
          const items = state.lotChoices[field]
          return items === undefined ? null : (
            <LotChoice key={field} field={field} items={items} onChoose={chooseLot} />
          )
        })}
    </div>
  )
}
