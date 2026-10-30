import { IconButton } from '@fubaritico/react/IconButton'
import { useFormikContext } from 'formik'

import type { RecordFieldTexts } from '../utils/recordFieldTexts'
import type { RecordChoice, SheetValues } from '../utils/sheetValues'

/**
 * The record chosen, with a button to remove it — the search field comes back in its stead, and the field counts as
 * touched, so an empty field says so at once.
 * @param props - where it is, the record and the texts
 * @param props.name - its path in the form's values
 * @param props.record - the record held
 * @param props.texts - the field's texts
 * @returns the record held
 */
export function HeldRecord({
  name,
  record,
  texts,
}: {
  name: string
  record: RecordChoice
  texts: RecordFieldTexts
}) {
  const { setFieldValue, setFieldTouched } = useFormikContext<SheetValues>()

  // Handlers
  const handleRemove = () => {
    void setFieldValue(name, null)
    void setFieldTouched(name, true, false)
  }

  return (
    <>
      <span className="city-sheet__label">{texts.label}</span>
      <div className="city-sheet__held">
        <strong>{record.name}</strong>
        <IconButton
          type="button"
          size="sm"
          icon="XMark"
          aria-label={texts.remove(record.name)}
          onClick={handleRemove}
        />
      </div>
    </>
  )
}
