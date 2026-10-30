/**
 * The sentence under a field the design system does not word itself: its help, or its error once it is wrong. Two
 * elements, never one whose role changes — an alert is announced when it appears, not when a role is set on it.
 * @param props - the help and the error
 * @param props.help - the sentence under the field
 * @param props.error - the error, when the field is touched and wrong
 * @returns the sentence
 */
export function FieldNote({ help, error }: { help: string; error: string | undefined }) {
  return error === undefined ? (
    <p key="help" className="city-sheet__help">
      {help}
    </p>
  ) : (
    <p key="error" className="city-sheet__help city-sheet__help--error" role="alert">
      {error}
    </p>
  )
}
