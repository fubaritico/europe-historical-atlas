import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BarIcon } from './barIcons'

/**
 * Every edge the glyph draws, in the 18-unit grid after its shift — each must be a whole number, or the
 * glyph lands on half pixels and blurs at 1×.
 * @param svg - the rendered glyph
 * @returns the edges' coordinates
 */
function edges(svg: SVGSVGElement): number[] {
  const group = svg.querySelector('g')
  const [dx, dy] = (group?.getAttribute('transform') ?? '').match(/[\d.]+/g)?.map(Number) ?? []
  const shift = (values: number[]) =>
    values.map((value, index) => value + (index % 2 === 0 ? (dx ?? NaN) : (dy ?? NaN)))
  const polygons = [...svg.querySelectorAll('polygon')].flatMap((polygon) =>
    shift((polygon.getAttribute('points') ?? '').split(' ').map(Number))
  )
  const rects = [...svg.querySelectorAll('rect')].flatMap((rect) =>
    shift([Number(rect.getAttribute('x')), Number(rect.getAttribute('y'))])
  )
  return [...polygons, ...rects]
}

/**
 * Render one glyph and return its SVG.
 * @param name - the glyph
 * @returns the SVG element
 */
function glyph(name: 'plus' | 'trash'): SVGSVGElement {
  const svg = render(<BarIcon name={name} />).container.querySelector('svg')
  if (svg === null) throw new Error(`no svg for ${name}`)
  return svg
}

describe('BarIcon', () => {
  describe('happy path', () => {
    it('draws at its native 18 × 18 grid, filled in the button’s ink', () => {
      const { container } = render(<BarIcon name="trash" />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('viewBox')).toBe('0 0 18 18')
      expect(svg?.getAttribute('width')).toBe('18')
      expect(svg?.getAttribute('fill')).toBe('currentColor')
    })
  })

  describe('variants', () => {
    it.each(['plus', 'trash'] as const)('puts every edge of the %s on a whole pixel', (name) => {
      const found = edges(glyph(name))
      expect(found.length).toBeGreaterThan(0)
      expect(found.filter((value) => !Number.isInteger(value))).toEqual([])
    })

    it('frames the plus in thirty dots', () => {
      const { container } = render(<BarIcon name="plus" />)
      expect(container.querySelectorAll('rect')).toHaveLength(30)
    })
  })

  // L3/L4: N/A — a fixed drawing, no input to refuse.

  describe('edge cases', () => {
    it('stays inside its 18-unit grid', () => {
      const found = edges(glyph('plus'))
      expect(Math.min(...found)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...found)).toBeLessThanOrEqual(17)
    })
  })
})
