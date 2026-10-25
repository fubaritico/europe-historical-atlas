import type { WikidataCandidate } from '../../../wikidata/wikidataPlace'

/** What one proposed item needs. */
interface CandidateButtonProps {
  /** The item. */
  candidate: WikidataCandidate
  /**
   * Fill the form from it.
   * @param candidate - the item chosen
   * @returns once filled
   */
  onChoose: (candidate: WikidataCandidate) => Promise<void>
}

/**
 * One proposed item: its label, what it is, its id.
 * @param props - the item and what choosing it does
 * @param props.candidate
 * @param props.onChoose
 * @returns the button
 */
export function CandidateButton({ candidate, onChoose }: CandidateButtonProps) {
  // Handlers
  const handleClick = (): void => {
    void onChoose(candidate)
  }

  return (
    <button type="button" className="wikidata-lookup__choice" onClick={handleClick}>
      <strong>{candidate.label}</strong>
      {candidate.description !== null && <span> — {candidate.description}</span>}
      <span className="wikidata-lookup__id"> {candidate.id}</span>
    </button>
  )
}
