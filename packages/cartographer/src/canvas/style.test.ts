import { describe, expect, it } from 'vitest'

import { CHROME_PAINT_STYLE, inDevicePixels } from './style'

describe('inDevicePixels', () => {
  describe('happy path', () => {
    /*
     * THE guard, and it is written over the object rather than over a list on purpose.
     *
     * The defect this function exists for is a length used in device pixels when it was declared in
     * screen pixels, and the way it comes back is somebody adding a twelfth length and not adding it
     * here. A test naming the eleven I know about would be the same forgetting, one file along — and it
     * would pass on the machine of whoever wrote it if they are on a 1× display, which is how the
     * original slipped through. So: every numeric field, whatever they end up being.
     */
    it('scales every length the style declares, including ones added later', () => {
      const scaled = inDevicePixels(CHROME_PAINT_STYLE, 2)

      const lengths = Object.entries(CHROME_PAINT_STYLE).filter(
        ([, value]) => typeof value === 'number'
      )
      expect(lengths.length).toBeGreaterThan(5)
      for (const [key, value] of lengths)
        expect({ [key]: scaled[key as keyof typeof scaled] }).toEqual({ [key]: value * 2 })
    })
  })

  describe('variants', () => {
    it('leaves every colour and family alone — they are not lengths', () => {
      const scaled = inDevicePixels(CHROME_PAINT_STYLE, 3)

      for (const [key, value] of Object.entries(CHROME_PAINT_STYLE))
        if (typeof value === 'string')
          expect({ [key]: scaled[key as keyof typeof scaled] }).toEqual({ [key]: value })
    })

    it('is the identity at a ratio of one, which is what a 1× display asks for', () => {
      expect(inDevicePixels(CHROME_PAINT_STYLE, 1)).toEqual(CHROME_PAINT_STYLE)
    })

    it('handles the fractional ratios a scaled desktop reports', () => {
      expect(inDevicePixels(CHROME_PAINT_STYLE, 1.5).labelSize).toBeCloseTo(
        CHROME_PAINT_STYLE.labelSize * 1.5,
        9
      )
    })
  })

  describe('managed errors', () => {
    it('does not mutate the style it was given, which is a module constant', () => {
      const before = { ...CHROME_PAINT_STYLE }

      inDevicePixels(CHROME_PAINT_STYLE, 4)

      expect(CHROME_PAINT_STYLE).toEqual(before)
    })
  })

  describe('unmanaged errors', () => {
    // A ratio of zero collapses every length to nothing, which draws nothing — visibly wrong, and
    // the loud propagation `rules/error-handling.md` prefers to a substituted 1 that hides the fault.
    it('passes a ratio of zero through rather than correcting it', () => {
      expect(inDevicePixels(CHROME_PAINT_STYLE, 0).pathWidth).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('reads as the design at 1× — the values are the stylesheet’s, not ours', () => {
      // `.artboard-label { font-size: 11px }` and `.artboard { border: 1px }`, as `style.ts` records.
      expect(CHROME_PAINT_STYLE.labelSize).toBe(11)
      expect(CHROME_PAINT_STYLE.zoneWidth).toBe(1)
    })
  })
})
