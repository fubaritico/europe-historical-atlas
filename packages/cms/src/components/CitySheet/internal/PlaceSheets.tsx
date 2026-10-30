import { useFormikContext } from 'formik'
import { useEffect } from 'react'

import { usePlaceSheets } from '../hooks/usePlaceSheets'

import type { SavedSheet } from '../../../fields/sheetOverlap'
import type { PlaceSheetsState } from '../hooks/usePlaceSheets'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/**
 * Reads the chosen place's saved sheets and hands them to the form's validation, which then runs again — so choosing
 * Rome after typing 1100 greys the button at once. Says under the place when they could not be read: the overlap is
 * then checked at save only, by the server.
 * @param props - how to read, where the sheets go, the translator
 * @param props.read - reads a place's sheets from the base
 * @param props.onSheets - receives what is known of them
 * @param props.say - the translator
 * @returns the sentence of a failed read, or nothing
 */
export function PlaceSheets({
  read,
  onSheets,
  say,
}: {
  read: (place: number | string) => Promise<SavedSheet[]>
  onSheets: (known: PlaceSheetsState) => void
  say: Say
}) {
  const { values, validateForm } = useFormikContext<SheetValues>()
  const known = usePlaceSheets(values.place?.id ?? null, read)

  // Effects — the validation reads the sheets when it runs; it is run again once they are known
  useEffect(() => {
    onSheets(known)
    void validateForm()
  }, [known, onSheets, validateForm])

  // Render
  if (known.kind !== 'failed') return null
  return (
    <p className="city-sheet__help city-sheet__help--error" role="alert">
      {say('placeSheetsFailed')}
    </p>
  )
}
