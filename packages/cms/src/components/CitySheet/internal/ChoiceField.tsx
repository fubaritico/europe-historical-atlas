import { Dropdown } from '@fubaritico/react/Dropdown'
import { getIn, useFormikContext } from 'formik'

import { FieldNote } from './FieldNote'

import type { Choice } from '../utils/choice'
import type { SheetValues } from '../utils/sheetValues'

/**
 * One value from a short list — an importance, what a line speaks about, a reason — as the design system's `Dropdown`,
 * its label above it, its help under it, or its error once touched. The list's name says what is chosen, or invites
 * to choose.
 * @param props - where the value is, the list and the texts
 * @param props.name - its path in the form's values
 * @param props.label - what the field is called
 * @param props.help - the sentence under it
 * @param props.choices - the list
 * @param props.prompt - what the empty field says: « Choisir… »
 * @param props.named - the field's name for a reader of the screen, given what is chosen or the prompt
 * @returns the field
 */
export function ChoiceField({
  name,
  label,
  help,
  choices,
  prompt,
  named,
}: {
  name: string
  label: string
  help: string
  choices: readonly Choice[]
  prompt: string
  named: (value: string) => string
}) {
  const { values, getFieldMeta, setFieldValue, setFieldTouched } = useFormikContext<SheetValues>()
  const meta = getFieldMeta(name)
  const wrong = meta.touched && meta.error !== undefined
  const held: unknown = getIn(values, name)
  const chosen = choices.find((choice) => String(choice.value) === String(held))

  // Handlers
  const handleSelect = (value: string) => {
    const choice = choices.find((one) => String(one.value) === value)
    if (choice === undefined)
      console.error(`[CMS] ${name}: a value was chosen that the list did not offer: ${value}`)
    else {
      void setFieldValue(name, choice.value)
      void setFieldTouched(name, true, false)
    }
  }

  return (
    <div className="city-sheet__field">
      <Dropdown
        label={label}
        options={choices.map((choice) => ({ value: String(choice.value), label: choice.label }))}
        selectedValue={chosen === undefined ? '' : String(chosen.value)}
        onSelect={handleSelect}
        trigger={() => chosen?.label ?? prompt}
        buttonFullWidth
        menuAriaLabel={label}
        aria-label={named(chosen?.label ?? prompt)}
      />
      <FieldNote help={help} error={wrong ? meta.error : undefined} />
    </div>
  )
}
