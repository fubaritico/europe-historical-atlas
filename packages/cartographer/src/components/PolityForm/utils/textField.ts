import type { PolityFieldsProps, PolityFormField } from '../polityFieldsProps'

/**
 * The props of a controlled text field reporting to {@link PolityFieldsProps.onField}.
 * @param field - the draft field the input shows and reports
 * @param props - the form's props: the draft read and the `onField` called on a change
 * @returns the input's value and its change handler
 */
export function textField(field: PolityFormField, props: PolityFieldsProps) {
  return {
    value: props.draft[field] ?? '',
    onChange: (event: { target: { value: string } }) => {
      props.onField(field, event.target.value)
    },
  }
}
