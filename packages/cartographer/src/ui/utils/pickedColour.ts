import { isColor } from '@fubaritico/behaviors'

import type { ColorValue, HsvaColor } from '@fubaritico/behaviors'

/**
 * The picker's value as the Cartographer holds a polity's colour: a colour, or `null` for « automatic » (CARTO-465,
 * design system 0.10.0). The picker can also hand « no colour » (`'none'`), but only with `allowNone`, which no picker
 * here is given yet: reaching it is a defect of the design system's contract, never a gesture — said in the console
 * only (my choice, no dialogue for a branch no gesture reaches), and the gesture changes nothing. **Transitional**: the
 * dev wants « no colour » as a real state (2026-11-17), a tribe's zone with no fill that still takes a click
 * (CARTO-466) — this refusal goes with it.
 * @param value - what the picker handed
 * @returns the colour or `null` for automatic; `undefined` for a value the Cartographer does not take
 */
export function pickedColour(value: ColorValue): HsvaColor | null | undefined {
  if (value === null || isColor(value)) return value
  console.error(
    '[Cartographer] the colour picker handed « no colour », which no picker here offers: the colour is left as it was'
  )
  return undefined
}
