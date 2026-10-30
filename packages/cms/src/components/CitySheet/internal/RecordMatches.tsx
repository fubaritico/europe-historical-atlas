import { Typeahead } from '@fubaritico/react/Typeahead'

import type { RecordFieldTexts } from '../utils/recordFieldTexts'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * The records offered for what was typed, the typed part in bold — or « none of that name », once the base has
 * answered and only then. Rendered inside a record field's `Typeahead`.
 * @param props - the matches, whether the base has answered, and the texts
 * @param props.matches - the records offered
 * @param props.answered - whether the base has answered the search under way
 * @param props.texts - the field's texts
 * @returns the list
 */
export function RecordMatches({
  matches,
  answered,
  texts,
}: {
  matches: RecordChoice[]
  answered: boolean
  texts: RecordFieldTexts
}) {
  return (
    <Typeahead.Menu aria-label={texts.list}>
      {matches.map((record, index) => (
        <Typeahead.Item key={record.id} value={String(record.id)} index={index}>
          <Typeahead.Highlight>{record.name}</Typeahead.Highlight>
        </Typeahead.Item>
      ))}
      {answered && matches.length === 0 && <Typeahead.Empty>{texts.none}</Typeahead.Empty>}
    </Typeahead.Menu>
  )
}
