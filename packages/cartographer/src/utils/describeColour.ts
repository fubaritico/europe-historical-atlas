import { hsvaToHsla, hueName } from '@fubaritico/behaviors'

import type { ColourPickerMessageKey } from '../i18n/colourPicker'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'
import type { HsvaColor } from '@fubaritico/behaviors'

/*
 * A colour in words for a screen reader, in the page's language (ATLAS-159) — the design system's own
 * `describeColor` speaks English only, and its picker takes a replacement (`describeColor` prop) so a
 * consumer can localise it. **The bands are the design system's**, read from `@fubaritico/behaviors`'
 * `color-picker/describe.js` (0.7.0): the hue's name is its own (`hueName`); only the thresholds below are
 * restated, the module not exporting them.
 */

/** HSL lightness at or below which a colour reads as black, at or above which white. */
const BLACK_MAX_L = 4
const WHITE_MIN_L = 97
/** HSL saturation below which a colour reads as a gray. */
const ACHROMATIC_MAX_S = 8
/** Gray lightness below which it is dark, above which light. */
const GRAY_DARK_MAX_L = 30
const GRAY_LIGHT_MIN_L = 75
/** Lightness bands of a chromatic colour: very dark < 20 ≤ dark < 40 … 65 < light ≤ 85 < very light. */
const VERY_DARK_MAX_L = 20
const DARK_MAX_L = 40
const LIGHT_MIN_L = 65
const VERY_LIGHT_MIN_L = 85
/** HSL saturation below which a colour is grayish, above which (mid lightness) vivid. */
const GRAYISH_MAX_S = 30
const VIVID_MIN_S = 90

/**
 * The shade of a colour with no perceivable hue, or `null` when it has one.
 * @param s - HSL saturation, `[0, 100]`
 * @param l - HSL lightness, `[0, 100]`
 * @returns the shade's key in the catalogue
 */
function shadeOf(s: number, l: number): string | null {
  if (l <= BLACK_MAX_L) return 'black'
  if (l >= WHITE_MIN_L) return 'white'
  if (s >= ACHROMATIC_MAX_S) return null
  if (l < GRAY_DARK_MAX_L) return 'darkGray'
  if (l > GRAY_LIGHT_MIN_L) return 'lightGray'
  return 'gray'
}

/**
 * The lightness band of a chromatic colour.
 * @param l - HSL lightness, `[0, 100]`
 * @returns its key in the catalogue
 */
function lightnessOf(l: number): string {
  if (l < VERY_DARK_MAX_L) return 'veryDark'
  if (l < DARK_MAX_L) return 'dark'
  if (l > VERY_LIGHT_MIN_L) return 'veryLight'
  if (l > LIGHT_MIN_L) return 'light'
  return 'none'
}

/**
 * The saturation band of a chromatic colour — vivid only away from the light and dark ends.
 * @param s - HSL saturation, `[0, 100]`
 * @param l - HSL lightness, `[0, 100]`
 * @returns its key in the catalogue
 */
function saturationOf(s: number, l: number): string {
  if (s < GRAYISH_MAX_S) return 'grayish'
  if (s > VIVID_MIN_S && l >= DARK_MAX_L && l <= LIGHT_MIN_L) return 'vivid'
  return 'none'
}

/**
 * Describe a colour — *"dark red"*, *« rouge foncé »* — with its opacity when translucent.
 * @param color - the colour
 * @param t - the picker's messages, in the page's language
 * @returns a short phrase
 * @throws {RangeError} when the hue is `NaN` or infinite (the design system's `hueName`)
 */
export function describeColour(color: HsvaColor, t: Translate<ColourPickerMessageKey>): string {
  const { h, s, l } = hsvaToHsla(color)
  const shade = shadeOf(s, l)
  const words =
    shade === null
      ? t('chromatic', {
          hue: hueName(h),
          lightness: lightnessOf(l),
          saturation: saturationOf(s, l),
        })
      : t('achromatic', { shade })
  return color.a < 1 ? t('translucent', { words, percent: Math.round(color.a * 100) }) : words
}
