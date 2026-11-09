import { describe, expect, it } from 'vitest'

import { signedDistanceField } from '../geo/signedDistance'

import { fillTriangles } from './fillTriangles'
import { indexFill } from './indexFill'
import { cutYearFills, measureVassalBands } from './vassalBands'

const BOUNDS = { west: 0, south: 40, east: 10, north: 50 }
const BAND = { bounds: BOUNDS, reachKm: 20 }
const GRID = { segX: 16, segY: 16 }

/**
 * A square of the grid.
 * @param u0 - its western edge
 * @param v0 - its northern edge
 * @param side - its side
 * @returns its ring
 */
function square(u0: number, v0: number, side: number): { u: number; v: number }[] {
  return [
    { u: u0, v: v0 },
    { u: u0 + side, v: v0 },
    { u: u0 + side, v: v0 + side },
    { u: u0, v: v0 + side },
  ]
}

const SOVEREIGN = { rings: [square(0.1, 0.1, 0.4)] }
const VASSAL = { rings: [square(0.5, 0.1, 0.4)], banded: true }

describe('vassalBands', () => {
  describe('happy path', () => {
    it('measures each of a vassal’s vertices against its own outline, as the signed distance does', () => {
      const [, vassal] = cutYearFills([SOVEREIGN, VASSAL], GRID, BAND)
      const distance = signedDistanceField(VASSAL.rings, BOUNDS, BAND.reachKm)
      const bandKm = vassal?.bandKm
      expect(bandKm?.length).toBe((vassal?.vertices.length ?? 0) / 2)
      bandKm?.forEach((km, vertex) => {
        const u = vassal?.vertices[2 * vertex] ?? Number.NaN
        const v = vassal?.vertices[2 * vertex + 1] ?? Number.NaN
        expect(km).toBeCloseTo(distance(u, v), 3)
      })
    })
  })

  describe('variants', () => {
    // Mutation: measuring every region costs the sovereigns' distances for nothing.
    it('measures no sovereign', () => {
      const [sovereign] = cutYearFills([SOVEREIGN, VASSAL], GRID, BAND)
      expect(sovereign?.bandKm).toBeUndefined()
    })

    it('measures nobody without a band, and cuts the same triangles', () => {
      const cut = cutYearFills([SOVEREIGN, VASSAL], GRID, null)
      expect(cut.every((fill) => fill.bandKm === undefined)).toBe(true)
      expect(cut).toEqual(fillTriangles([SOVEREIGN, VASSAL], GRID).map((fill) => indexFill(fill)))
    })

    it('reaches no deeper than the reach, and no point of the vassal lies outside it', () => {
      const [, vassal] = cutYearFills([SOVEREIGN, VASSAL], GRID, BAND)
      for (const km of vassal?.bandKm ?? []) {
        expect(km).toBeGreaterThanOrEqual(-BAND.reachKm)
        expect(km).toBeLessThan(1e-3)
      }
      // The square is ~300 km across: its heart lies deeper than the reach.
      expect(Math.min(...(vassal?.bandKm ?? []))).toBe(-BAND.reachKm)
    })
  })

  describe('managed errors', () => {
    it('refuses fills and regions that do not pair up — the cut’s contract broken', () => {
      const fills = cutYearFills([SOVEREIGN], GRID, null)
      expect(() => measureVassalBands(fills, [SOVEREIGN, VASSAL], BAND)).toThrow(
        /1 fills for 2 regions/
      )
    })
  })

  describe('unmanaged errors', () => {
    it('throws on a reach that is not a positive number, as the signed distance refuses it', () => {
      expect(() => cutYearFills([VASSAL], GRID, { bounds: BOUNDS, reachKm: 0 })).toThrow(/reach/)
    })
  })

  describe('edge cases', () => {
    it('gives a vassal with no triangle an empty measure', () => {
      const tiny = { rings: [square(0.5, 0.5, 1e-6)], banded: true }
      const [fill] = cutYearFills([tiny], GRID, BAND)
      expect(fill?.bandKm?.length).toBe((fill?.vertices.length ?? 0) / 2)
    })
  })
})
