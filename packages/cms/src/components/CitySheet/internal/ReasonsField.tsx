import { Checkbox } from '@fubaritico/react/Checkbox'
import { useFormikContext } from 'formik'

import type { Say } from '../utils/say'
import type { RecordChoice, SheetValues } from '../utils/sheetValues'

/**
 * The reasons for the city's importance, one box each — boxes for now, a multi-select when the design system has one
 * and the list grows long (the dev, 2026-10-30). The list is read when the page opens; it is short and grows slowly.
 * @param props - the reasons offered and the translator
 * @param props.reasons - every reason of the CMS's list, in the admin's language
 * @param props.say - the translator
 * @returns the field
 */
export function ReasonsField({ reasons, say }: { reasons: readonly RecordChoice[]; say: Say }) {
  const { values, setFieldValue } = useFormikContext<SheetValues>()

  // Handlers
  const toggle = (id: number | string) => {
    const held = values.reasons.some((one) => String(one) === String(id))
    void setFieldValue(
      'reasons',
      held ? values.reasons.filter((one) => String(one) !== String(id)) : [...values.reasons, id]
    )
  }

  return (
    <fieldset className="city-sheet__group">
      <legend className="city-sheet__legend">{say('reasons')}</legend>
      <p className="city-sheet__help">
        {reasons.length === 0 ? say('reasonsNone') : say('reasonsHelp')}
      </p>
      <div className="city-sheet__boxes">
        {reasons.map((reason) => (
          <Checkbox
            key={reason.id}
            label={reason.name}
            checked={values.reasons.some((one) => String(one) === String(reason.id))}
            onChange={() => {
              toggle(reason.id)
            }}
          />
        ))}
      </div>
    </fieldset>
  )
}
