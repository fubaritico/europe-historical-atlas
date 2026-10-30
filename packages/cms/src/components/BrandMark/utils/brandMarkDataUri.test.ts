import { describe, expect, it } from 'vitest'

import { BRAND_MARK_COLOURS, MAP_TYPEFACE } from '@europe-historical-atlas/core/utils/lettering'

import { brandMarkDataUri } from './brandMarkDataUri'

const PREFIX = 'data:image/svg+xml,'

/**
 * The SVG document an address carries.
 * @param uri - the `data:` address
 * @returns the decoded document
 */
function svgOf(uri: string): string {
  return decodeURIComponent(uri.slice(PREFIX.length))
}

describe('brandMarkDataUri', () => {
  describe('happy path', () => {
    it('is an SVG data address holding the capital lambda on its tile', () => {
      const uri = brandMarkDataUri(24)
      const svg = svgOf(uri)

      expect(uri.startsWith(PREFIX)).toBe(true)
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"')).toBe(
        true
      )
      expect(svg).toContain('>Λ</text>')
      expect(svg.endsWith('</svg>')).toBe(true)
    })

    it('sets the lambda in the map’s face, at the map title’s weight, in the atlas’s brown on its vellum', () => {
      const svg = svgOf(brandMarkDataUri(24))

      expect(svg).toContain(`font-family="${MAP_TYPEFACE}"`)
      expect(svg).toContain('font-weight="500"')
      expect(svg).toContain(`fill="${BRAND_MARK_COLOURS.ground}"`)
      expect(svg).toContain(`fill="${BRAND_MARK_COLOURS.ink}"`)
    })
  })

  describe('variants', () => {
    it('places the corner and the baseline from the measured geometry at each side', () => {
      const small = svgOf(brandMarkDataUri(24))
      const large = svgOf(brandMarkDataUri(96))

      expect(small).toContain('rx="4.8"')
      expect(small).toContain('x="12" y="19.08"')
      expect(small).toContain('font-size="20.4"')
      expect(large).toContain('rx="19.2"')
      expect(large).toContain('x="48" y="76.32"')
      expect(large).toContain('font-size="81.6"')
    })
  })

  // L3: N/A — a drawing from a number, nothing refused.

  describe('unmanaged errors', () => {
    it('writes a NaN side as NaN rather than a plausible size', () => {
      expect(svgOf(brandMarkDataUri(Number.NaN))).toContain('width="NaN"')
    })
  })

  describe('edge cases', () => {
    it('escapes the double quotes, the brackets and the lambda; the face’s single quotes stay, as URI encoding allows', () => {
      const body = brandMarkDataUri(24).slice(PREFIX.length)

      expect(body).not.toMatch(/["<>Λ]/)
      expect(body).toContain("'Iowan%20Old%20Style'")
    })
  })
})
