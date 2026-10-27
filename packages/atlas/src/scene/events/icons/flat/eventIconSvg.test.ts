import { describe, expect, it } from 'vitest'

import { EVENT_ICON_PALETTE } from '../palette'

import { EVENT_ICON_SVG_STYLE, drawingSvg, eventIconSvg } from './eventIconSvg'
import { TOWER_DRAWING } from './tower'
import { TREBUCHET_DRAWING } from './trebuchet'

import type { EventIconKind } from '../kinds'

const KINDS: EventIconKind[] = ['swords', 'tower', 'crown']

/**
 * The rim's width a drawing is given: its first stroke, the rim pass coming first.
 * @param svg - the drawing
 * @returns the width, in the drawing's units
 */
function widthOf(svg: string): number {
  return Number(/stroke-width="([\d.]+)"/.exec(svg)?.[1])
}

describe('eventIconSvg', () => {
  describe('happy path', () => {
    it.each(KINDS)('draws the %s with an explicit size, so it rasterises', (kind) => {
      const svg = eventIconSvg(kind)
      expect(svg).toMatch(/^<svg [^>]*width="128" height="128" viewBox="[-\d. ]+">/)
      expect(svg.endsWith('</svg>')).toBe(true)
    })
  })

  describe('variants', () => {
    it('rings the drawing with the light rim before painting it, so the rim is under it', () => {
      const svg = eventIconSvg('swords')
      const rim = svg.indexOf(`stroke="${EVENT_ICON_SVG_STYLE.rim}"`)
      const body = svg.indexOf(`fill="${EVENT_ICON_SVG_STYLE.silhouette}"`)
      expect(rim).toBeGreaterThan(-1)
      expect(rim).toBeLessThan(body)
    })

    it('crosses the two swords at right angles', () => {
      const svg = eventIconSvg('swords')
      expect(svg).toContain('rotate(45 32 32)')
      expect(svg).toContain('rotate(-45 32 32)')
    })

    it('crops the swords to their own extent, so no pixel goes to margin', () => {
      expect(eventIconSvg('swords')).toContain('viewBox="10 10 44 44"')
    })

    it.each([
      ['swords', ['#111111']],
      ['tower', ['#111111']],
    ] as const)('paints the %s as one silhouette, with no outline', (kind, colours) => {
      const svg = eventIconSvg(kind, EVENT_ICON_PALETTE, {
        ...EVENT_ICON_SVG_STYLE,
        silhouette: '#111111',
        rim: '#eeeeee',
      })
      // The body's shapes end on their fill; the rim's go on to their stroke.
      const fills = new Set([...svg.matchAll(/fill="([^"]+)"\/>/g)].map((match) => match[1]))
      expect(fills).toEqual(new Set(colours))
      expect(svg).not.toContain(`stroke="${EVENT_ICON_SVG_STYLE.ink}"`)
    })

    it("cuts the reserve tower's door into its outline, so the rim follows into the doorway", () => {
      const svg = drawingSvg(TOWER_DRAWING, EVENT_ICON_PALETTE, EVENT_ICON_SVG_STYLE)
      // One shape, drawn twice — under, in the rim, then over, in the silhouette — and its outline climbs the doorway.
      const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1])
      expect(paths).toHaveLength(2)
      for (const path of paths) expect(path).toContain('L28 48 Q32 43 36 48 L36 58')
      expect(svg).toContain('viewBox="6.5 9.5 51 51"')
    })

    it('draws the siege as the trebuchet, cropped to it and its stone', () => {
      expect(eventIconSvg('tower')).toBe(
        drawingSvg(TREBUCHET_DRAWING, EVENT_ICON_PALETTE, EVENT_ICON_SVG_STYLE)
      )
      expect(eventIconSvg('tower')).toContain('viewBox="-6 -6 82 82"')
    })

    it('draws every rim as thick on screen: wider in a wider drawing, in proportion to the swords’', () => {
      const swords = widthOf(eventIconSvg('swords'))
      expect(swords).toBe(EVENT_ICON_SVG_STYLE.rimWidth)
      // The siege's drawing is 82 wide to the swords' 44.
      expect(widthOf(eventIconSvg('tower'))).toBeCloseTo((swords * 82) / 44, 1)
    })

    it('outlines the detailed drawings', () => {
      expect(eventIconSvg('crown')).toContain(`stroke="${EVENT_ICON_SVG_STYLE.ink}"`)
    })

    it('paints in the palette and the style given', () => {
      const svg = eventIconSvg(
        'crown',
        { ...EVENT_ICON_PALETTE, gold: '#00ff00' },
        { ...EVENT_ICON_SVG_STYLE, rim: '#ff00ff' }
      )
      expect(svg).toContain('fill="#00ff00"')
      expect(svg).toContain('stroke="#ff00ff"')
    })
  })

  // L3: N/A — every kind is a member of a closed union; nothing is refused
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('gives every shape both its rim and its body, none drawn once', () => {
      const svg = eventIconSvg('tower')
      const shapes = svg.match(/<(path|rect|circle) /g) ?? []
      expect(shapes.length % 2).toBe(0)
    })
  })
})
