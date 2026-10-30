import { MultiSelect } from '@fubaritico/react/MultiSelect'
import { useFormikContext } from 'formik'

import { reasonIds } from '../utils/reasonIds'

import type { Say } from '../utils/say'
import type { RecordChoice, SheetValues } from '../utils/sheetValues'

/**
 * The reasons for the city's importance, as the design system's `MultiSelect` (0.9.0, asked for on 2026-10-30): the
 * chosen ones as removable badges, a search that ignores case and accents, every sentence in the admin's language —
 * the remove buttons and the announcements are read aloud. The list is read when the page opens; it is short.
 * Its strings are mapped back to the reasons' ids by `reasonIds`.
 * @param props - the reasons offered and the translator
 * @param props.reasons - every reason of the CMS's list, in the admin's language
 * @param props.say - the translator
 * @returns the field
 */
export function ReasonsField({ reasons, say }: { reasons: readonly RecordChoice[]; say: Say }) {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<SheetValues>()

  // Handlers
  const handleChange = (chosen: string[]) => {
    void setFieldValue('reasons', reasonIds(chosen, reasons))
  }
  const handleBlur = () => {
    void setFieldTouched('reasons', true, false)
  }

  return (
    <div className="city-sheet__field">
      <MultiSelect
        label={say('reasons')}
        options={reasons.map((reason) => ({ value: String(reason.id), label: reason.name }))}
        value={values.reasons.map(String)}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={say('reasonsPlaceholder')}
        message={reasons.length === 0 ? say('reasonsNone') : say('reasonsHelp')}
        messages={{
          remove: (name) => say('reasonRemove', { name }),
          added: (name) => say('reasonAdded', { name }),
          removed: (name) => say('reasonRemoved', { name }),
          results: (count) => say('reasonResults', { count }),
          noResults: say('reasonNoResults'),
        }}
      />
    </div>
  )
}
