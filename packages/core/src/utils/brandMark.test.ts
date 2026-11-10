import { describe, expect, it } from 'vitest'

import { TAB_MARK_SIDE, brandMarkSvg } from './brandMark'
import { BRAND_GLYPH, BRAND_MARK_COLOURS, MAP_TYPEFACE } from './lettering'

// REPO-415: one drawing of the mark for the three applications' tabs.
describe('brandMarkSvg', () => {
  describe('happy path', () => {
    it('draws the lambda in the map’s face, in the atlas’s brown on its vellum tile', () => {
      const svg = brandMarkSvg(TAB_MARK_SIDE)
      expect([
        svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"'),
        svg.includes(`>${BRAND_GLYPH}</text>`),
        svg.includes(`font-family="${MAP_TYPEFACE}"`),
        svg.includes(`fill="${BRAND_MARK_COLOURS.ground}"`),
        svg.includes(`fill="${BRAND_MARK_COLOURS.ink}"`),
        svg.endsWith('</svg>'),
      ]).toEqual([true, true, true, true, true, true])
    })
  })

  describe('variants', () => {
    it('draws at the side asked', () => {
      expect(brandMarkSvg(96)).toContain('viewBox="0 0 96 96"')
    })
  })

  // L3, L4, L5: N/A — a drawing from constants; the geometry's edges are lettering's (lettering.test.ts).
})
