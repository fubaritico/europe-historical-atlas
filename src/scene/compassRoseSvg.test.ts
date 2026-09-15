import { describe, expect, it } from 'vitest'

import { buildCompassRoseSvg } from './compassRoseSvg'

import type { CompassRoseColors } from './compassRoseSvg'

const COLORS: CompassRoseColors = { ink: '#4a3424', halfWind: '#3f5e3a', quarterWind: '#7a2230' }

describe('buildCompassRoseSvg', () => {
  describe('happy path', () => {
    it('returns a sized SVG document embedding the three portolan colours', () => {
      const svg = buildCompassRoseSvg({ colors: COLORS, labels: true })
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain('width="372"')
      expect(svg).toContain('height="372"')
      expect(svg).toContain(COLORS.ink)
      expect(svg).toContain(COLORS.halfWind)
      expect(svg).toContain(COLORS.quarterWind)
    })
  })

  describe('variants', () => {
    it('includes the French wind labels when labels = true', () => {
      const svg = buildCompassRoseSvg({ colors: COLORS, labels: true })
      expect(svg).toContain('>NE<')
      expect(svg).toContain('>NO<')
    })

    it('omits all text when labels = false', () => {
      expect(buildCompassRoseSvg({ colors: COLORS, labels: false })).not.toContain('<text')
    })

    it('honours a custom colour code', () => {
      const svg = buildCompassRoseSvg({
        colors: { ink: '#111111', halfWind: '#00ff00', quarterWind: '#ff0000' },
        labels: false,
      })
      expect(svg).toContain('#00ff00')
      expect(svg).toContain('#ff0000')
    })
  })

  describe('managed errors', () => {
    it('rejects a non-hex colour (attribute breakout) and falls back to black', () => {
      const svg = buildCompassRoseSvg({
        colors: { ink: '" onload="alert(1)', halfWind: '#3f5e3a', quarterWind: '#7a2230' },
        labels: false,
      })
      expect(svg).not.toContain('onload')
      expect(svg).toContain('#000000')
    })
  })

  // L4 (unmanaged errors): N/A — pure string builder over fixed geometry; colours are validated.

  describe('edge cases', () => {
    it('accepts 3- and 8-digit hex colours', () => {
      const svg = buildCompassRoseSvg({
        colors: { ink: '#abc', halfWind: '#11223344', quarterWind: '#7a2230' },
        labels: false,
      })
      expect(svg).toContain('#abc')
      expect(svg).toContain('#11223344')
    })
  })
})
