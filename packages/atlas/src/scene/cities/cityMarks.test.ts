import { describe, expect, it } from 'vitest'

import { CITY_IMPORTANCES } from '@europe-historical-atlas/core/data/cityImportance'

import {
  CITY_MARKS,
  CITY_MARK_INK,
  CITY_MARK_RIM,
  CITY_MARK_RIM_OPACITY,
  cityMarkSvg,
} from './cityMarks'

/** One shape of a mark: its colour, its opacity, and how far it reaches from the centre. */
interface Shape {
  colour: string
  opacity: number
  outer: number
  inner: number
}

/**
 * A mark's shapes, read from its SVG: a disc reaches from 0, a ring from its radius less half its width.
 * @param shapes - the SVG shapes
 * @returns each shape
 */
function read(shapes: string): Shape[] {
  return [...shapes.matchAll(/<circle [^>]*\/>/g)].map(([circle]) => {
    const attribute = (name: string): string | undefined =>
      new RegExp(`${name}="([^"]+)"`).exec(circle)?.[1]
    const r = Number(attribute('r'))
    const width = Number(attribute('stroke-width') ?? 0)
    const ringed = attribute('fill') === 'none'
    return {
      colour: (ringed ? attribute('stroke') : attribute('fill')) ?? '',
      opacity: Number(attribute(ringed ? 'stroke-opacity' : 'fill-opacity') ?? 1),
      outer: r + width / 2,
      inner: ringed ? r - width / 2 : 0,
    }
  })
}

describe('cityMarks', () => {
  describe('happy path', () => {
    it('has a mark for every order core knows', () => {
      expect(Object.keys(CITY_MARKS).sort()).toEqual([...CITY_IMPORTANCES].sort())
    })

    it('writes a whole SVG with its width and height, which a texture needs', () => {
      expect(cityMarkSvg('capital')).toBe(
        `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24">${CITY_MARKS.capital.shapes}</svg>`
      )
    })
  })

  describe('variants', () => {
    it('draws the orders larger first, so the size reads as an order', () => {
      expect(CITY_MARKS.capital.size).toBeGreaterThan(CITY_MARKS['large-city'].size)
      expect(CITY_MARKS['large-city'].size).toBeGreaterThan(CITY_MARKS.city.size)
    })

    it('draws a capital and a large city as a dark ring around a dark point', () => {
      for (const order of ['capital', 'large-city'] as const) {
        const ink = read(CITY_MARKS[order].shapes).filter((shape) => shape.colour === CITY_MARK_INK)
        expect(ink.map(({ inner }) => inner > 0)).toEqual([true, false])
      }
    })

    it('scales a mark from its map size', () => {
      expect(cityMarkSvg('city', 4)).toContain('width="24" height="24"')
    })
  })

  describe('managed errors', () => {
    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'refuses a scale of %s, which would draw nothing',
      (scale) => {
        expect(() => cityMarkSvg('city', scale)).toThrow(RangeError)
      }
    )
  })

  // L4: N/A — pure strings, no I/O.

  describe('edge cases', () => {
    it.each([...CITY_IMPORTANCES])(
      'puts the light of a %s only around it, never inside its ink',
      (order) => {
        const shapes = read(CITY_MARKS[order].shapes)
        const inkReach = Math.max(
          ...shapes.filter((shape) => shape.colour === CITY_MARK_INK).map(({ outer }) => outer)
        )
        for (const light of shapes.filter((shape) => shape.colour === CITY_MARK_RIM)) {
          expect(light.inner).toBeGreaterThanOrEqual(inkReach)
        }
      }
    )

    it.each([...CITY_IMPORTANCES])(
      'lays the rim of a %s at 60 %, so the country’s colour shows through',
      (order) => {
        const rims = read(CITY_MARKS[order].shapes).filter(
          (shape) => shape.colour === CITY_MARK_RIM
        )
        expect(rims).not.toEqual([])
        for (const rim of rims) expect(rim.opacity).toBe(CITY_MARK_RIM_OPACITY)
      }
    )
  })
})
