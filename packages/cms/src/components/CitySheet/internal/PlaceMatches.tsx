import { Typeahead } from '@fubaritico/react/Typeahead'

import type { Say } from '../utils/say'
import type { PlaceChoice } from '../utils/sheetValues'

/**
 * The places offered for what was typed, the typed part in bold — or « no place of that name », once the base has
 * answered and only then. Rendered inside the place field's `Typeahead`.
 * @param props - the matches, whether the base has answered, and the translator
 * @param props.matches - the places offered
 * @param props.answered - whether the base has answered the search under way
 * @param props.say - the translator
 * @returns the list
 */
export function PlaceMatches({
  matches,
  answered,
  say,
}: {
  matches: PlaceChoice[]
  answered: boolean
  say: Say
}) {
  return (
    <Typeahead.Menu aria-label={say('placeList')}>
      {matches.map((place, index) => (
        <Typeahead.Item key={place.id} value={String(place.id)} index={index}>
          <Typeahead.Highlight>{place.name}</Typeahead.Highlight>
        </Typeahead.Item>
      ))}
      {answered && matches.length === 0 && <Typeahead.Empty>{say('placeNone')}</Typeahead.Empty>}
    </Typeahead.Menu>
  )
}
