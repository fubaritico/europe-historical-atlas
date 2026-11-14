import { Checkbox } from '@fubaritico/react/Checkbox'
import { useFormikContext } from 'formik'

import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/**
 * « Poids attesté par une source » (CMS-433, the dev, 2026-11-13): unticked by default, the community's presence is
 * attested and its weight supposed — the map is to show it uncertain; ticked, a source says that weight.
 * @param props - where it is and the translator
 * @param props.name - its path in the form's values
 * @param props.say - the translator
 * @returns the box and its sentence
 */
export function WeightAttestedField({ name, say }: { name: string; say: Say }) {
  // Context
  const { getFieldProps } = useFormikContext<SheetValues>()

  // Render
  return (
    <div className="city-sheet__field">
      <Checkbox {...getFieldProps({ name, type: 'checkbox' })} label={say('weightAttested')} />
      <p className="city-sheet__help">{say('weightAttestedHelp')}</p>
    </div>
  )
}
