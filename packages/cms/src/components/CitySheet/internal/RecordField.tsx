import { Typeahead } from '@fubaritico/react/Typeahead'
import { getIn, useFormikContext } from 'formik'

import { useFocusOnSwap } from '../hooks/useFocusOnSwap'
import { useRecordSearch } from '../hooks/useRecordSearch'

import { HeldRecord } from './HeldRecord'
import { RecordMatches } from './RecordMatches'

import type { RecordFieldTexts } from '../utils/recordFieldTexts'
import type { RecordChoice, SheetValues } from '../utils/sheetValues'

/** How long the field waits after a keystroke before searching the base. */
const SEARCH_DELAY_MS = 250

/**
 * A record of the CMS chosen by typing — the sheet's place, a line's source (the dev, 2026-10-30): each search reads
 * the base, so one created in another tab is offered at once. Once chosen it is shown with a button to remove it
 * (`HeldRecord`), and the keyboard's focus follows the swap.
 * @param props - where the value is, the texts and the search
 * @param props.name - its path in the form's values: `place`, `testimonies.0.source`
 * @param props.texts - the label, the help and every sentence of the field
 * @param props.search - the records matching what was typed, from the base
 * @returns the field
 */
export function RecordField({
  name,
  texts,
  search,
}: {
  name: string
  texts: RecordFieldTexts
  search: (query: string) => Promise<RecordChoice[]>
}) {
  const { values, getFieldMeta, setFieldValue, setFieldTouched, handleBlur } =
    useFormikContext<SheetValues>()
  const { matches, failed, answered, run } = useRecordSearch(search)
  const held = getIn(values, name) as RecordChoice | null
  const box = useFocusOnSwap(held)

  // Derived
  const meta = getFieldMeta(name)
  const error = failed ? texts.searchFailed : meta.touched ? meta.error : undefined

  // Handlers
  const handleSelect = (id: string) => {
    const chosen = matches.find((record) => String(record.id) === id)
    if (chosen === undefined)
      console.error(`[CMS] a record was chosen that the list did not offer: ${id}`)
    else {
      void setFieldValue(name, chosen)
      void setFieldTouched(name, true, false)
    }
  }

  // Render
  return (
    <div ref={box} className="city-sheet__field">
      {held !== null ? (
        <HeldRecord name={name} record={held} texts={texts} />
      ) : (
        <Typeahead minChars={1} debounceMs={SEARCH_DELAY_MS} onSearch={run} onSelect={handleSelect}>
          <Typeahead.Input
            label={texts.label}
            placeholder={texts.placeholder}
            message={error ?? texts.help}
            messageType={error === undefined ? 'info' : 'error'}
            name={name}
            onBlur={handleBlur}
          />
          <RecordMatches matches={matches} answered={answered} texts={texts} />
        </Typeahead>
      )}
    </div>
  )
}
