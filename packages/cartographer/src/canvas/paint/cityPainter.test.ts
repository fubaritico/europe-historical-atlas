import { describe, expect, it } from 'vitest'

import { paintCities } from './cityPainter'

import type { CityCanvas, CityStyle } from './cityPainter'

const STYLE: CityStyle = {
  cityInk: '#5c3a2e',
  cityHalo: '#f3e7cd',
  cityRadius: 3,
  cityFontSize: 11,
}

/** A context that writes down what it is asked, and in which colours. */
function recorder() {
  const calls: { op: string; args: unknown[]; fill: unknown; stroke: unknown }[] = []
  const ctx: CityCanvas = {
    font: '',
    textBaseline: 'alphabetic',
    lineWidth: 0,
    fillStyle: '',
    strokeStyle: '',
    beginPath: () => undefined,
    arc: (...args) => calls.push({ op: 'arc', args, fill: ctx.fillStyle, stroke: ctx.strokeStyle }),
    fill: () => calls.push({ op: 'fill', args: [], fill: ctx.fillStyle, stroke: ctx.strokeStyle }),
    stroke: () =>
      calls.push({ op: 'stroke', args: [], fill: ctx.fillStyle, stroke: ctx.strokeStyle }),
    fillText: (...args) =>
      calls.push({ op: 'fillText', args, fill: ctx.fillStyle, stroke: ctx.strokeStyle }),
    strokeText: (...args) =>
      calls.push({ op: 'strokeText', args, fill: ctx.fillStyle, stroke: ctx.strokeStyle }),
  }
  return { ctx, calls }
}

// CARTO-193: a city shown is a dot and its name, as a guide for the borders.
describe('paintCities', () => {
  describe('happy path', () => {
    it('paints Lyon as a dot at its point and its name beside it, halo under ink', () => {
      const { ctx, calls } = recorder()
      paintCities(ctx, [{ name: 'Lyon', at: [100, 50] }], STYLE)
      expect(calls.map(({ op }) => op)).toEqual(['arc', 'stroke', 'fill', 'strokeText', 'fillText'])
      expect(calls[0]?.args.slice(0, 3)).toEqual([100, 50, 3])
      expect(calls[4]).toEqual({
        op: 'fillText',
        args: ['Lyon', 106, 50],
        fill: '#5c3a2e',
        stroke: '#f3e7cd',
      })
      expect(ctx.font).toBe('600 11px system-ui, sans-serif')
    })
  })

  describe('variants', () => {
    it('paints each city shown once', () => {
      const { ctx, calls } = recorder()
      paintCities(
        ctx,
        [
          { name: 'Lyon', at: [100, 50] },
          { name: 'Zadar', at: [300, 80] },
        ],
        STYLE
      )
      expect(calls.filter(({ op }) => op === 'fillText').map(({ args }) => args[0])).toEqual([
        'Lyon',
        'Zadar',
      ])
    })
  })

  // L3, L4: N/A — drawing literals.

  describe('edge cases', () => {
    it('paints nothing and sets no face when no city is shown', () => {
      const { ctx, calls } = recorder()
      paintCities(ctx, [], STYLE)
      expect([calls.length, ctx.font]).toEqual([0, ''])
    })
  })
})
