/**
 * The year the cities are attached at (CMS-507): proposed by the block, typed over as the contributor wishes; a text
 * that is not a whole year is said under it, the field marked invalid (review A11Y-002).
 * @param props - the text and where it goes
 * @param props.text - the year as typed
 * @param props.valid - whether it is a whole year
 * @param props.onType - called with each new text
 * @returns the field and its sentence
 */
export function YearField({
  text,
  valid,
  onType,
}: {
  text: string
  valid: boolean
  onType: (text: string) => void
}) {
  return (
    <>
      <label className="field-label" htmlFor="title-cities-year">
        Année
      </label>
      <input
        id="title-cities-year"
        inputMode="numeric"
        value={text}
        aria-invalid={!valid}
        aria-describedby={valid ? undefined : 'title-cities-year-error'}
        onChange={(event) => {
          onType(event.target.value)
        }}
      />
      {!valid && (
        <p id="title-cities-year-error" className="field-description">
          Tapez une année entière, par exemple 1100.
        </p>
      )}
    </>
  )
}
