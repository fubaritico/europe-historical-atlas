import { isColor } from '@fubaritico/behaviors'

import type { ColorValue, HsvaColor } from '@fubaritico/behaviors'

/**
 * The value of a picker that offers a colour or « automatic » only — the rail's swatch (CARTO-465, design system
 * 0.10.0): a colour, or `null` for « automatic ». A picker can also hand « no colour » (`'none'`), but only with
 * `allowNone`, which the swatch is not given: reaching it there is a defect of the design system's contract, never a
 * gesture — said in the console only (my choice, no dialogue for a branch no gesture reaches), and the gesture changes
 * nothing. **The form's field offers the three states** (CARTO-484) and does not pass through here.
 * @param value - what the picker handed
 * @returns the colour or `null` for automatic; `undefined` for a value the Cartographer does not take
 */
export function colourOrAutomatic(value: ColorValue): HsvaColor | null | undefined {
  if (value === null || isColor(value)) return value
  console.error(
    '[Cartographer] the colour picker handed « no colour », which this picker does not offer: the colour is left as it was'
  )
  return undefined
}
