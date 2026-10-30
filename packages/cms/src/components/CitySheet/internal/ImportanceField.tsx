import { Dropdown } from '@fubaritico/react/Dropdown'
import { useFormikContext } from 'formik'

import { CITY_IMPORTANCES } from '@europe-historical-atlas/core/data/cityImportance'

import type { CitySheetMessageKey } from '../i18n'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'
import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/** Each importance's label in the screen's texts. */
const LABEL_KEYS: Readonly<Record<CityImportance, CitySheetMessageKey>> = {
  capital: 'capital',
  'large-city': 'largeCity',
  city: 'city',
}

/**
 * The importance, one of three, as the design system's `Dropdown` — its help under it, or its error once chosen
 * nothing and left.
 * @param props - the translator
 * @param props.say - the translator
 * @returns the field
 */
export function ImportanceField({ say }: { say: Say }) {
  const { values, getFieldMeta, setFieldValue, setFieldTouched } = useFormikContext<SheetValues>()
  const meta = getFieldMeta('importance')
  const wrong = meta.touched && meta.error !== undefined

  // Handlers
  const handleSelect = (value: string) => {
    void setFieldValue('importance', value)
    void setFieldTouched('importance', true, false)
  }

  return (
    <div className="city-sheet__field">
      <Dropdown
        label={say('importance')}
        options={CITY_IMPORTANCES.map((value) => ({ value, label: say(LABEL_KEYS[value]) }))}
        selectedValue={values.importance}
        onSelect={handleSelect}
        trigger={({ selectedLabel }) =>
          selectedLabel === '' ? say('importanceChoose') : selectedLabel
        }
        buttonFullWidth
        menuAriaLabel={say('importance')}
        aria-label={say('importanceNamed', {
          value:
            values.importance === '' ? say('importanceChoose') : say(LABEL_KEYS[values.importance]),
        })}
      />
      <p
        className={`city-sheet__help${wrong ? ' city-sheet__help--error' : ''}`}
        role={wrong ? 'alert' : undefined}
      >
        {wrong ? meta.error : say('importanceHelp')}
      </p>
    </div>
  )
}
