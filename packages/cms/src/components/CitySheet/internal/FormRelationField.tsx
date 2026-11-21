import { getIn, useFormikContext } from 'formik'

import { RelationField } from './RelationField'

import type { SheetValues } from '../utils/sheetValues'
import type { CollectionSlug, Where } from 'payload'

/**
 * A field of the sheet's form that chooses one record with Payload's own relationship field — found in the list, or
 * created by its « + » in a drawer (the dev, 2026-11-16: *every reference is chosen or created on the spot*). Its value
 * in the form is the record's id; the field reads the name itself. The form's error for it shows under it once touched.
 * @param props - where it is, what it chooses in, its texts
 * @param props.name - its path in the form's values: `holderTitle`, `testimonies.0.source`
 * @param props.collection - the collection it chooses in
 * @param props.label - its label
 * @param props.description - the sentence under it
 * @param props.only - the records offered, when not all of the collection — the same object from one render to the next
 * @returns the field
 */
export function FormRelationField({
  name,
  collection,
  label,
  description,
  only,
}: {
  name: string
  collection: CollectionSlug
  label: string
  description: string
  only?: Where
}) {
  const { values, getFieldMeta, setFieldValue, setFieldTouched } = useFormikContext<SheetValues>()
  const meta = getFieldMeta(name)
  const error = meta.touched ? meta.error : undefined

  // Handlers
  const handleChange = (id: number | string | null) => {
    void setFieldValue(name, id)
    void setFieldTouched(name, true, false)
  }

  // Render
  return (
    <div className="city-sheet__field">
      <RelationField
        path={name}
        collection={collection}
        label={label}
        description={description}
        value={(getIn(values, name) as number | string | null | undefined) ?? null}
        onChange={handleChange}
        {...(only === undefined ? {} : { only })}
      />
      {error !== undefined && (
        <p className="city-sheet__help city-sheet__help--error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
