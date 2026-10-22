import { hexToRgba, hsvaToHex, rgbaToHsva } from '@fubaritico/behaviors'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { HistoryStep } from '@europe-historical-atlas/core/editor/history'
import type { HsvaColor } from '@fubaritico/behaviors'

/**
 * A polity's colour between the file and the picker — `#rrggbb` or `null` on one side, HSVA or `null` on
 * the other, `null` being "automatic", the palette's choice. Shared by the polity form and the rail's
 * swatch (2026-10-13), so the two cannot read or write a colour differently.
 */

/**
 * A polity's colour as the picker holds it, or `null` for "automatic".
 *
 * **A colour that does not read as hex is said, and opens as automatic.** It cannot come from the
 * readers (the schema takes `#rrggbb` only) nor from the picker; reaching it is a defect. Validating the
 * form then would write the palette's colour in its place — the one cost of not refusing to open.
 * @param polity - the polity
 * @returns the HSVA, or `null`
 */
export function pickedColour(polity: YearPolity): HsvaColor | null {
  if (polity.colour === null) return null
  const rgba = hexToRgba(polity.colour)
  if (rgba === null) {
    console.error(
      `[Cartographer] "${polity.id}" has the colour "${polity.colour}", which is no hex.`
    )
    return null
  }
  return rgbaToHsva(rgba)
}

/**
 * The file's `#rrggbb` for a picked colour.
 *
 * **The alpha is set to opaque, and that is the format speaking, not a fallback**: a polity's colour has
 * no alpha channel — the atlas lays it over the relief itself — and the file's schema accepts six digits
 * only. The form never offers alpha, so this changes nothing a picker produced; it stops an eight-digit
 * hex, which the reader would refuse at the next open, from ever being written.
 * @param colour - the picked colour, or `null` for "automatic"
 * @returns the lowercase six-digit hex, or `null` — the file's own "the palette decides"
 */
export function toFileColour(colour: HsvaColor | null): string | null {
  return colour === null ? null : hsvaToHex({ ...colour, a: 1 })
}

/** A recolouring ready for the document: the polity as it will be, and how the history names the step. */
export interface Recolouring {
  /** The polity, its colour replaced. */
  polity: YearPolity
  /** The step — *"colour Reaume de France"*. */
  step: HistoryStep
}

/**
 * What a gesture in the swatch's picker asks of the document, or nothing.
 *
 * **A gesture that ends where it began is no step**: a click in the picker that lands on the same colour,
 * or "automatic" pressed on a polity that already has none, would otherwise put a row in `{History}` that
 * ‹ctrl+Z› takes back to no visible effect.
 * @param polity - the polity aimed at
 * @param picked - where the gesture ended, or `null` for "automatic"
 * @param label - how the history names the step, in the page's language
 * @returns the recolouring, or `null` when the colour does not change
 */
export function recolouring(
  polity: YearPolity,
  picked: HsvaColor | null,
  label: string
): Recolouring | null {
  const colour = toFileColour(picked)
  if (colour === polity.colour) return null
  return {
    polity: { ...polity, colour },
    step: { kind: 'colour-polity', label },
  }
}
