import { hexToRgba, hsvaToHex, rgbaToHsva } from '@fubaritico/behaviors'

import { NO_COLOUR, isUncoloured } from '@europe-historical-atlas/core/data/yearFormat'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { HistoryStep } from '@europe-historical-atlas/core/editor/history'
import type { ColorValue, HsvaColor } from '@fubaritico/behaviors'

/*
 * A polity's colour between the file and the pickers — `#rrggbb`, `null` ("automatic", the palette's choice) or `none`
 * (« no colour », CARTO-445) on one side; HSVA, `null` or « no colour » on the other. Shared by the polity form and
 * the rail's swatch (2026-10-13), so the two cannot read or write a colour differently: the form holds the three
 * states (`formColour`, CARTO-484), the swatch a colour or "automatic" (`pickedColour`).
 */

/**
 * A polity's colour as the rail's swatch holds it, or `null` for "automatic" — and for a polity with no colour at all
 * (CARTO-445), which the swatch's picker is not given: it keeps that state itself (`recolouring`). The form shows the
 * three states ({@link formColour}).
 *
 * **A colour that does not read as hex is said, and opens as automatic.** It cannot come from the
 * readers (the schema takes `#rrggbb` only) nor from the picker; reaching it is a defect. Validating the
 * form then would write the palette's colour in its place — the one cost of not refusing to open.
 * @param polity - the polity
 * @returns the HSVA, or `null`
 */
export function pickedColour(polity: YearPolity): HsvaColor | null {
  if (polity.colour === null || isUncoloured(polity.colour)) return null
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
 * A polity's colour as the form's field holds it (CARTO-484): its colour, `null` for "automatic", or « no colour » —
 * the people known by its name alone, the country whose history the atlas does not tell.
 * @param polity - the polity
 * @returns the picker's value
 */
export function formColour(polity: YearPolity): ColorValue {
  return isUncoloured(polity.colour) ? NO_COLOUR : pickedColour(polity)
}

/**
 * The file's `#rrggbb` for a picked colour.
 *
 * **The alpha is set to opaque, and that is the format speaking, not a fallback**: a polity's colour has
 * no alpha channel — the atlas lays it over the relief itself — and the file's schema accepts six digits
 * only. The form never offers alpha, so this changes nothing a picker produced; it stops an eight-digit
 * hex, which the reader would refuse at the next open, from ever being written.
 * @param colour - the picked colour, `null` for "automatic", or « no colour »
 * @returns the lowercase six-digit hex, `null` — the file's own "the palette decides" — or the file's « no colour »
 */
export function toFileColour(colour: ColorValue): string | null {
  if (colour === null || colour === NO_COLOUR) return colour
  return hsvaToHex({ ...colour, a: 1 })
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
 *
 * **"Automatic" on a polity with no colour changes nothing** (CARTO-445): the swatch's picker is not given « no
 * colour », so it cannot tell the two apart — the uncoloured polity keeps its state until a colour is picked, or the
 * form's field changes it (CARTO-484).
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
  if (picked === null && isUncoloured(polity.colour)) return null
  const colour = toFileColour(picked)
  if (colour === polity.colour) return null
  return {
    polity: { ...polity, colour },
    step: { kind: 'colour-polity', label },
  }
}
