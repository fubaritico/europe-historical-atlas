import type { WikidataPlace } from '../../../wikidata/wikidataPlace'

/**
 * What the lookup filled, and what it left to the contributor, in one sentence.
 * @param id - the item chosen
 * @param place - what Wikidata gave for it
 * @returns the sentence shown under the button
 */
export function filledSummary(id: string, place: WikidataPlace): string {
  const filled = ['l’identifiant']
  const missing: string[] = []
  ;(place.coordinates === null ? missing : filled).push('la position')
  ;(place.existsFrom === null ? missing : filled).push('la fondation')
  if (place.existsTo !== null) filled.push('la fin')
  const rest =
    missing.length === 0 ? '' : ` — pas de ${missing.join(' ni de ')} dans Wikidata, à saisir`
  return `Rempli depuis ${id} : ${filled.join(', ')}${rest}.`
}
