'use client'

import { Button } from '@payloadcms/ui'

import { useWikidataLookup } from './hooks/useWikidataLookup'
import { CandidateButton } from './internal/CandidateButton'

/**
 * The button beside a place's name: search Wikidata for the French name, offer the items it may mean, and fill the
 * position and the Wikidata id from the one chosen. Nothing is filled before a choice — « Paris » is also a town in
 * Texas, a family name and a plant.
 * @returns the button, and under it the choice or the sentence
 */
export function WikidataLookup() {
  const { state, search, choose } = useWikidataLookup()

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
    </div>
  )
}
