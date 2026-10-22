import { describeColor } from '@fubaritico/behaviors'
import { describe, expect, it } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { COLOUR_PICKER_MESSAGES } from '../i18n/colourPicker'

import { describeColour } from './describeColour'

import type { HsvaColor } from '@fubaritico/behaviors'

const EN = createTranslator(COLOUR_PICKER_MESSAGES, 'en')
const FR = createTranslator(COLOUR_PICKER_MESSAGES, 'fr')

/** A grid over the whole space — every hue band, every lightness and saturation band, two opacities. */
const GRID: HsvaColor[] = [0, 20, 50, 100, 180, 230, 275, 320, 350].flatMap((h) =>
  [0, 5, 25, 60, 95, 100].flatMap((s) =>
    [0, 3, 15, 35, 50, 70, 90, 100].flatMap((v) => [1, 0.5].map((a) => ({ h, s, v, a })))
  )
)

describe('describeColour', () => {
  describe('happy path', () => {
    it('says what the design system says, word for word, in English', () => {
      for (const colour of GRID) expect(describeColour(colour, EN)).toBe(describeColor(colour))
    })
  })

  describe('variants', () => {
    it('names a colour in French, the adjectives after the hue', () => {
      expect(describeColour({ h: 0, s: 100, v: 30, a: 1 }, FR)).toBe('rouge très foncé')
      expect(describeColour({ h: 230, s: 15, v: 60, a: 1 }, FR)).toBe('bleu grisâtre')
      expect(describeColour({ h: 120, s: 100, v: 100, a: 1 }, FR)).toBe('vert vif')
    })

    it('names a colour with no hue, and a translucent one', () => {
      expect(describeColour({ h: 0, s: 0, v: 50, a: 1 }, FR)).toBe('gris')
      expect(describeColour({ h: 0, s: 0, v: 100, a: 0.5 }, FR)).toBe('blanc, opacité 50 %')
    })
  })

  describe('unmanaged errors', () => {
    it('throws on a hue that is no number, as the design system does', () => {
      expect(() => describeColour({ h: Number.NaN, s: 50, v: 50, a: 1 }, EN)).toThrow(RangeError)
    })
  })

  // L3: N/A — nothing is refused; L5 (the bands' edges) is the grid's, against the design system.
})
