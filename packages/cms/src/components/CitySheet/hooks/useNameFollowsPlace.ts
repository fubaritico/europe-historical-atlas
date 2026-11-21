import { useFormikContext } from 'formik'
import { useEffect, useRef } from 'react'

import type { SheetValues } from '../utils/sheetValues'

/**
 * The sheet's place, with the rule that ties the name of the time to it (CMS-495): a name is a name of one place, so
 * **changing or removing the place empties the name chosen** — the server would refuse the sheet of Smyrna a name of
 * Ankara, and the form says so by emptying the field rather than at the save. The place the sheet opens with is not a
 * change: its name is kept.
 * @returns the place's id, or `null` before one is chosen
 */
export function useNameFollowsPlace(): number | string | null {
  const { values, setFieldValue } = useFormikContext<SheetValues>()
  const place = values.place?.id ?? null
  const previous = useRef(place)

  useEffect(() => {
    if (previous.current === place) return
    previous.current = place
    void setFieldValue('periodName', null)
  }, [place, setFieldValue])

  return place
}
