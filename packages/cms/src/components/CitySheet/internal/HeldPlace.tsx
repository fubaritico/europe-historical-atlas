import { IconButton } from '@fubaritico/react/IconButton'
import { useFormikContext } from 'formik'

import type { Say } from '../utils/say'
import type { PlaceChoice, SheetValues } from '../utils/sheetValues'

/**
 * The place chosen, with a button to remove it — the search field comes back in its stead, and the field counts as
 * touched, so an empty place says so at once.
 * @param props - the place and the translator
 * @param props.place - the place held
 * @param props.say - the translator
 * @returns the place held
 */
export function HeldPlace({ place, say }: { place: PlaceChoice; say: Say }) {
  const { setFieldValue, setFieldTouched } = useFormikContext<SheetValues>()

  // Handlers
  const handleRemove = () => {
    void setFieldValue('place', null)
    void setFieldTouched('place', true, false)
  }

  return (
    <>
      <span className="city-sheet__label">{say('place')}</span>
      <div className="city-sheet__held">
        <strong>{place.name}</strong>
        <IconButton
          type="button"
          size="sm"
          icon="XMark"
          aria-label={say('placeRemove', { name: place.name })}
          onClick={handleRemove}
        />
      </div>
    </>
  )
}
