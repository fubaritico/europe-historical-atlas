/** A click on the empty swatch does nothing, and says so (`rules/error-handling.md`). */
export function refuseColour(): void {
  console.warn('[Cartographer] colour refused: no polity is selected to set its colour.')
}
