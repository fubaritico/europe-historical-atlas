import { describe, expect, it } from 'vitest'

import { BAND_REACH_KM } from '../data/vassalBand'
import { signedDistanceField } from '../geo/signedDistance'

import { fillTriangles } from './fillTriangles'
import { indexFill } from './indexFill'
import { cutYearFills, measureVassalBands, vassalBandCut } from './vassalBands'

import type { YearPolity } from '../data/yearFormat'

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

const REGISTRY: Pick<YearPolity, 'id' | 'suzerain' | 'rank'>[] = [
  { id: 'crown', suzerain: null, rank: 'kingdom' },
  { id: 'duchy', suzerain: 'crown', rank: 'duchy' },
  { id: 'people', suzerain: 'crown', rank: 'tribe' },
]

describe('vassalBands', () => {
  // The dev, 2026-11-09: from afar France is one block — its vassals measured with it against the realm's frontier.
  describe('a realm of several regions', () => {
    it('measures the king and his vassal against their outline together: their shared limit is deep inside it', () => {
      // The two squares share the limit u = 0.5; a vertex on it lies on each one's own outline, deep in the realm's.
      const king = { ...SOVEREIGN, banded: true, realm: 'crown' }
      const duchy = { ...VASSAL, realm: 'crown' }
      const [, vassal] = cutYearFills([king, duchy], GRID, BAND)
      const onLimit = Array.from(
        { length: (vassal?.vertices.length ?? 0) / 2 },
        (_, k) => k
      ).filter(
        (k) =>
          Math.abs((vassal?.vertices[2 * k] ?? 0) - 0.5) < 1e-6 &&
          Math.abs((vassal?.vertices[2 * k + 1] ?? 0) - 0.3) < 0.05
      )
      const [k] = onLimit
      if (k === undefined) throw new Error('test: no vertex on the shared limit')
      expect([Math.abs(vassal?.bandKm?.[k] ?? 99) < 1, (vassal?.realmKm?.[k] ?? 0) < -10]).toEqual([
        true,
        true,
      ])
    })

    it('measures a polity alone in its realm against its own outline only', () => {
      const [alone] = cutYearFills([{ ...SOVEREIGN, banded: true, realm: 'crown' }], GRID, BAND)
      expect(alone?.realmKm).toBeUndefined()
    })
  })

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
    // Mutation: a cut that bands every region whose polity has a suzerain bands the tribe too, which keeps its own band.
    // The dev's trial, 2026-11-09: the sovereigns banded too.
    it('bands the sovereign and the vassal, never the tribe or a region of no polity', () => {
      const rings = SOVEREIGN.rings
      const cut = vassalBandCut(
        [
          { rings, polityId: 'crown' },
          { rings, polityId: 'duchy' },
          { rings, polityId: 'people' },
          { rings },
        ],
        REGISTRY,
        BOUNDS
      )
      expect(cut.regions).toEqual([
        { rings, banded: true, realm: 'crown' },
        { rings, banded: true, realm: 'crown' },
        { rings },
        { rings },
      ])
    })

    it('measures the band in the year’s frame, as deep as the widest band’s reach', () => {
      const { band } = vassalBandCut([], REGISTRY, BOUNDS)
      expect(band).toEqual({ bounds: BOUNDS, reachKm: BAND_REACH_KM })
    })

    // The cut measures what it is told to: the choice of who is banded is `vassalBandCut`'s (above).
    it('leaves a region not flagged banded as it came, unmeasured', () => {
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
      expect(fill?.vertices).toHaveLength(0)
      expect(fill?.bandKm).toEqual(new Float32Array(0))
    })
  })
})
