import { Checkbox } from '@fubaritico/react/Checkbox'
import { useFormikContext } from 'formik'

import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/**
 * « Déduite de son district » (CMS-507, `files/plans/historian/autonomy-and-1200.md` § 2.1): ticked, the line's source
 * proves the lord of the city's district, not the city by name — the holder is inferred. Ticked by the operation that
 * attaches cities to a title; unticked by hand once a source names the city itself.
 * @param props - where it is and the translator
 * @param props.name - its path in the form's values
 * @param props.say - the translator
 * @returns the box and its sentence
 */
export function ByDistrictField({ name, say }: { name: string; say: Say }) {
  // Context
  const { getFieldProps } = useFormikContext<SheetValues>()

  // Render
  return (
    <div className="city-sheet__field">
      <Checkbox {...getFieldProps({ name, type: 'checkbox' })} label={say('byDistrict')} />
      <p className="city-sheet__help">{say('byDistrictHelp')}</p>
    </div>
  )
}
