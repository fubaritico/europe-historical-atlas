import { Typeahead } from '@fubaritico/react/Typeahead'
import { useFormikContext } from 'formik'

import { useFocusOnSwap } from '../hooks/useFocusOnSwap'
import { usePlaceSearch } from '../hooks/usePlaceSearch'

import { HeldPlace } from './HeldPlace'
import { PlaceMatches } from './PlaceMatches'

import type { Say } from '../utils/say'
import type { PlaceChoice, SheetValues } from '../utils/sheetValues'

/** How long the field waits after a keystroke before searching the base. */
const SEARCH_DELAY_MS = 250

/**
 * The place, chosen by typing (the dev, 2026-10-30): each search reads the base, so a place created in another tab is
 * offered at once. Once chosen it is shown with a button to remove it (`HeldPlace`).
 * @param props - the search and the translator
 * @param props.search - the places matching what was typed, from the base
 * @param props.say - the translator
 * @returns the field
 */
export function PlaceField({
  search,
  say,
}: {
  search: (query: string) => Promise<PlaceChoice[]>
  say: Say
}) {
  const { values, getFieldMeta, setFieldValue, setFieldTouched, handleBlur } =
    useFormikContext<SheetValues>()
  const { matches, failed, answered, run } = usePlaceSearch(search)
  const box = useFocusOnSwap(values.place)

  // Derived
  const meta = getFieldMeta('place')
  const error = failed ? say('placeSearchFailed') : meta.touched ? meta.error : undefined

  // Handlers
  const handleSelect = (id: string) => {
    const chosen = matches.find((place) => String(place.id) === id)
    if (chosen === undefined)
      console.error(`[CMS] a place was chosen that the list did not offer: ${id}`)
    else {
      void setFieldValue('place', chosen)
      void setFieldTouched('place', true, false)
    }
  }

  // Render
  return (
    <div ref={box} className="city-sheet__field">
      {values.place !== null ? (
        <HeldPlace place={values.place} say={say} />
      ) : (
        <Typeahead minChars={1} debounceMs={SEARCH_DELAY_MS} onSearch={run} onSelect={handleSelect}>
          <Typeahead.Input
            label={say('place')}
            placeholder={say('placePlaceholder')}
            message={error ?? say('placeHelp')}
            messageType={error === undefined ? 'info' : 'error'}
            name="place"
            onBlur={handleBlur}
          />
          <PlaceMatches matches={matches} answered={answered} say={say} />
        </Typeahead>
      )}
    </div>
  )
}
