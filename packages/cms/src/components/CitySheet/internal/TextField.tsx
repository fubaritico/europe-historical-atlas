import { Input } from '@fubaritico/react/Input'
import { useFormikContext } from 'formik'

import type { SheetValues } from '../utils/sheetValues'

/**
 * A line of free text — where a source says it — as the design system's `Input`, its help under it.
 * @param props - where the value is, its label and its help
 * @param props.name - its path in the form's values
 * @param props.label - what the field is called
 * @param props.help - the sentence under it
 * @returns the field
 */
export function TextField({ name, label, help }: { name: string; label: string; help: string }) {
  const { getFieldProps, getFieldMeta } = useFormikContext<SheetValues>()
  const meta = getFieldMeta(name)
  const error = meta.touched ? meta.error : undefined
  return (
    <Input
      {...getFieldProps(name)}
      label={label}
      message={error ?? help}
      messageType={error === undefined ? 'info' : 'error'}
    />
  )
}
