import { describe, expect, it } from 'vitest'

import { EVENT_ICON_PALETTE } from './eventIcons'
import { EVENT_ICON_SVG_STYLE, eventIconSvg } from './eventIconSvg'

import type { EventIconKind } from './eventIcons'

const KINDS: EventIconKind[] = ['swords', 'tower', 'crown']

describe('eventIconSvg', () => {
  describe('happy path', () => {
    it.each(KINDS)('draws the %s with an explicit size, so it rasterises', (kind) => {
      const svg = eventIconSvg(kind)
      expect(svg).toMatch(/^<svg [^>]*width="128" height="128" viewBox="[\d ]+">/)
      expect(svg.endsWith('</svg>')).toBe(true)
    })
  })

  describe('variants', () => {
    it('rings the drawing with the light rim before painting it, so the rim is under it', () => {
      const svg = eventIconSvg('swords')
      const rim = svg.indexOf(`stroke="${EVENT_ICON_SVG_STYLE.rim}"`)
      const body = svg.indexOf(`fill="${EVENT_ICON_SVG_STYLE.flatSteel}"`)
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

    it('paints the swords in flat colours, grey blade and dark hilt, with no outline', () => {
      const svg = eventIconSvg('swords', EVENT_ICON_PALETTE, {
        ...EVENT_ICON_SVG_STYLE,
        flatSteel: '#111111',
        flatHilt: '#222222',
      })
      expect(svg).toContain('fill="#111111"')
      expect(svg).toContain('fill="#222222"')
      expect(svg).not.toContain(`stroke="${EVENT_ICON_SVG_STYLE.ink}"`)
    })

    it('outlines the detailed drawings', () => {
      expect(eventIconSvg('tower')).toContain(`stroke="${EVENT_ICON_SVG_STYLE.ink}"`)
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
