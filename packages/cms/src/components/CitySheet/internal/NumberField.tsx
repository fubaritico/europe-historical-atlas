import { Input } from '@fubaritico/react/Input'
import { useFormikContext } from 'formik'

import type { SheetValues } from '../utils/sheetValues'
import type { ChangeEvent } from 'react'

/**
 * A number of the date — year, month, day, margin — as the design system's `Input`. Its sentence is the help until
 * the field is touched and wrong, then the error: never an error on a field the contributor has not reached yet.
 * @param props - where the value is, its label and its help
 * @param props.name - its path in the form's values: `date.start.year`
 * @param props.label - what the field is called
 * @param props.help - the sentence under it
 * @returns the field
 */
export function NumberField({ name, label, help }: { name: string; label: string; help: string }) {
  const { getFieldProps, getFieldMeta, setFieldValue } = useFormikContext<SheetValues>()
  const meta = getFieldMeta(name)
  const error = meta.touched ? meta.error : undefined

  // Handlers — the text as typed: Formik's own change handler turns a number input's text into a number, and the
  // form's values are text (`MomentValues`), read once by `readNumber`
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    void setFieldValue(name, event.target.value)
  }

  return (
    <Input
      {...getFieldProps(name)}
      onChange={handleChange}
      type="number"
      inputMode="numeric"
      label={label}
      message={error ?? help}
      messageType={error === undefined ? 'info' : 'error'}
    />
  )
}
