/** The tooltip and the console's word when nobody is aimed at. */
const NO_TARGET = 'Active polity — none selected: select a polity to set its colour'

/** A click on the empty swatch does nothing, and says so (`rules/error-handling.md`). */
function refuseColour(): void {
  console.warn(`[Cartographer] colour refused: ${NO_TARGET}.`)
}

/**
 * The swatch with nobody aimed at: struck through, and it says why it does nothing.
 * @returns the disabled swatch button, whose click only warns
 */
export function EmptySwatch() {
  // Render
  return (
    <button
      type="button"
      className="tool-rail__swatch"
      aria-label="Active polity — none selected"
      aria-disabled="true"
      title={NO_TARGET}
      data-empty="true"
      onClick={refuseColour}
    />
  )
}
