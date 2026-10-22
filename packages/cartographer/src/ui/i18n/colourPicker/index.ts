import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link COLOUR_PICKER_MESSAGES}: what the design system's colour picker says — its accessible
 * labels (`ColorPickerLabels`, English by default upstream), its swatch button, and the words a colour is
 * described in for a screen reader (`describeColour`).
 *
 * Its messages, and the values they take:
 * - `area`, `saturation`, `brightness`, `hue`, `alpha`, `hex`, `automatic`, `automaticDescription`,
 *   `areaRoleDescription`, `hexInvalid`, `picker` — The picker's labels, one per `ColorPickerLabels` entry.
 * - `trigger` — The field's swatch button.
 * - `achromatic` — A colour with no perceivable hue; `shade` is `black`, `white`, `darkGray`, `lightGray`
 *   or `gray`.
 * - `chromatic` — A colour with a hue: `hue` is the design system's hue name (`red`… `pink`), `lightness`
 *   is `veryDark`, `dark`, `light`, `veryLight` or `none`, `saturation` is `grayish`, `vivid` or `none` —
 *   ordered the language's way.
 * - `translucent` — A translucent colour: its words, then its opacity as a percentage.
 */
export type ColourPickerMessageKey = keyof typeof en

/**
 * {@link ColourPickerMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const COLOUR_PICKER_MESSAGES: Catalogue<ColourPickerMessageKey> = { fr, en }
