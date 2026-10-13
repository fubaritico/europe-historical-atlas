import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MAP_TYPEFACE } from '@europe-historical-atlas/core/utils/lettering'

import { BrandMark } from './brandMark'

/**
 * Render the mark and return its SVG.
 * @returns the SVG element
 */
function mark(): SVGSVGElement {
  const svg = render(<BrandMark />).container.querySelector('svg')
  if (svg === null) throw new Error('no svg')
  return svg
}

describe('BrandMark', () => {
  describe('happy path', () => {
    it('draws a 20 × 20 tile with slightly rounded corners, hidden from assistive tech', () => {
      const svg = mark()

      expect(svg.getAttribute('width')).toBe('20')
      expect(svg.getAttribute('height')).toBe('20')
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      expect(svg.querySelector('.brand-mark__ground')?.getAttribute('rx')).toBe('4')
    })

    it('writes a capital lambda, not an A', () => {
      expect(mark().querySelector('.brand-mark__glyph')?.textContent).toBe('Λ')
    })
  })

  describe('variants', () => {
    it('sets the lambda in the map’s face, at the map title’s weight', () => {
      const glyph = mark().querySelector('.brand-mark__glyph')

      expect(glyph?.getAttribute('font-family')).toBe(MAP_TYPEFACE)
      expect(glyph?.getAttribute('font-weight')).toBe('500')
    })
  })

  // L3: N/A — a constant drawing, no input to refuse.
  // L4: N/A — nothing can fail at runtime; a missing face falls back along MAP_TYPEFACE's own stack.

  describe('edge cases', () => {
    it('centres the lambda on the tile, its ink on the baseline rather than its em box', () => {
      const glyph = mark().querySelector('.brand-mark__glyph')

      expect(glyph?.getAttribute('x')).toBe('10')
      expect(glyph?.getAttribute('y')).toBe('15.9')
      expect(glyph?.getAttribute('dominant-baseline')).toBe('alphabetic')
      expect(glyph?.getAttribute('text-anchor')).toBe('middle')
    })
  })
})
