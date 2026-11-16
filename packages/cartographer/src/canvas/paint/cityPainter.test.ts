import { describe, expect, it } from 'vitest'

import { paintCities } from './cityPainter'

import type { CityCanvas, CityStyle } from './cityPainter'

const STYLE: CityStyle = {
  cityInk: '#5c3a2e',
  cityHalo: '#f3e7cd',
  cityMissing: '#c86a52',
  cityToCorrect: '#d9b44a',
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
      paintCities(ctx, [{ name: 'Lyon', at: [100, 50], colour: null, alert: null }], STYLE, false)
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
          { name: 'Lyon', at: [100, 50], colour: null, alert: null },
          { name: 'Zadar', at: [300, 80], colour: null, alert: null },
        ],
        STYLE,
        false
      )
      expect(calls.filter(({ op }) => op === 'fillText').map(({ args }) => args[0])).toEqual([
        'Lyon',
        'Zadar',
      ])
    })
  })

  // The dev, 2026-11-05: as points, each city a dot in its holder's colour, ringed, no name.
  describe('as points', () => {
    it('paints a dot in the holder’s colour inside a dark ring and a light one, and no name', () => {
      const { ctx, calls } = recorder()
      paintCities(
        ctx,
        [{ name: 'Lyon', at: [100, 50], colour: '#3355aa', alert: null }],
        STYLE,
        true
      )

      expect(calls.map(({ op }) => op)).toEqual(['arc', 'fill', 'arc', 'fill', 'arc', 'fill'])
      expect(calls.filter(({ op }) => op === 'fill').map(({ fill }) => fill)).toEqual([
        '#5c3a2e',
        '#f3e7cd',
        '#3355aa',
      ])
      expect(calls[4]?.args.slice(0, 3)).toEqual([100, 50, 3])
      expect(calls[0]?.args.slice(0, 3)).toEqual([100, 50, 5])
    })

    it('paints a city whose holder is unknown as a hollow ring, coloured by nothing', () => {
      const { ctx, calls } = recorder()
      paintCities(ctx, [{ name: 'Lyon', at: [100, 50], colour: null, alert: null }], STYLE, true)

      expect(calls.map(({ op }) => op)).toEqual(['arc', 'fill', 'arc', 'fill', 'arc', 'stroke'])
    })
  })

  // CARTO-389, the dev, 2026-11-08: the city's status on its point — its colour, a white stroke, a thick status stroke,
  // a black stroke.
  describe('the status on the point', () => {
    it('rings Valencia, with no holder entered, in a thick red ring between the light ring and the dark one', () => {
      const { ctx, calls } = recorder()
      paintCities(
        ctx,
        [{ name: 'Valencia', at: [100, 50], colour: '#3355aa', alert: 'missing' }],
        STYLE,
        true
      )

      expect(calls.filter(({ op }) => op === 'fill').map(({ fill }) => fill)).toEqual([
        '#5c3a2e',
        '#c86a52',
        '#f3e7cd',
        '#3355aa',
      ])
      expect(calls.filter(({ op }) => op === 'arc').map(({ args }) => args[2])).toEqual([
        8, 7, 4, 3,
      ])
    })

    it('rings a city to correct in yellow', () => {
      const { ctx, calls } = recorder()
      paintCities(
        ctx,
        [{ name: 'Metz', at: [100, 50], colour: '#3355aa', alert: 'toCorrect' }],
        STYLE,
        true
      )

      expect(calls.filter(({ op }) => op === 'fill')[1]?.fill).toBe('#d9b44a')
    })

    it('keeps a city where all is well as it was: the dark ring and the light one, no status ring', () => {
      const { ctx, calls } = recorder()
      paintCities(
        ctx,
        [{ name: 'Toledo', at: [100, 50], colour: '#3355aa', alert: null }],
        STYLE,
        true
      )

      const fills = calls.filter(({ op }) => op === 'fill').map(({ fill }) => fill)
      expect(fills).toEqual(['#5c3a2e', '#f3e7cd', '#3355aa'])
    })

    it('rings a city with no holder in red even when it has no colour, its centre hollow', () => {
      const { ctx, calls } = recorder()
      paintCities(
        ctx,
        [{ name: 'Caspe', at: [100, 50], colour: null, alert: 'missing' }],
        STYLE,
        true
      )

      expect(calls.map(({ op }) => op)).toEqual([
        'arc',
        'fill',
        'arc',
        'fill',
        'arc',
        'fill',
        'arc',
        'stroke',
      ])
      expect(calls[3]?.fill).toBe('#c86a52')
    })
  })

  // L3, L4: N/A — drawing literals.

  describe('edge cases', () => {
    it('paints nothing and sets no face when no city is shown', () => {
      const { ctx, calls } = recorder()
      paintCities(ctx, [], STYLE, false)
      expect([calls.length, ctx.font]).toEqual([0, ''])
    })
  })
})
