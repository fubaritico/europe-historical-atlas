import { describe, expect, it } from 'vitest'

import { homageLevels } from './homageLevels'
import {
  VASSAL_BAND_REACH_KM,
  VASSAL_BAND_SHARE,
  VASSAL_BAND_WIDTH_KM,
  bandedVassalIds,
  isBandedVassal,
  regionBandDepths,
  vassalBandOpacity,
} from './vassalBand'

/** A small registry: a crown, its vassal, its sub-vassal, a vassal tribe and an independent realm. */
const POLITIES = [
  { id: 'crown', suzerain: null, rank: 'kingdom' },
  { id: 'duchy', suzerain: 'crown', rank: 'duchy' },
  { id: 'county', suzerain: 'duchy', rank: 'county' },
  { id: 'people', suzerain: 'crown', rank: 'tribe' },
  { id: 'realm', suzerain: null, rank: 'kingdom' },
]

describe('vassalBand', () => {
  describe('happy path', () => {
    it('gives half the colour within the width of the outline and the full colour deeper', () => {
      expect(vassalBandOpacity(-4, 10)).toBe(VASSAL_BAND_SHARE)
      expect(vassalBandOpacity(-25, 10)).toBe(1)
    })

    it('bands a vassal and not a sovereign', () => {
      expect(isBandedVassal({ suzerain: 'crown', rank: 'duchy' })).toBe(true)
      expect(isBandedVassal({ suzerain: null, rank: 'kingdom' })).toBe(false)
    })

    it('gives each region its polity’s depth when banded, nought otherwise', () => {
      const regions = [{ polityId: 'crown' }, { polityId: 'duchy' }, { polityId: 'county' }]
      expect(regionBandDepths(regions, bandedVassalIds(POLITIES), homageLevels(POLITIES))).toEqual([
        0, 1, 2,
      ])
    })
  })

  describe('variants', () => {
    it('lists every vassal of a registry but the tribe', () => {
      expect([...bandedVassalIds(POLITIES)].sort()).toEqual(['county', 'duchy'])
    })

    // The distance reaches past the band, or nothing reads deeper. Held against the tribes' band in its own suite.
    it('is under the reach the distance is computed to', () => {
      expect(VASSAL_BAND_WIDTH_KM).toBeGreaterThan(0)
      expect(VASSAL_BAND_WIDTH_KM).toBeLessThan(VASSAL_BAND_REACH_KM)
    })
  })

  describe('managed errors', () => {
    // Mutation: a tribe read as a vassal (the suzerain alone) bands the people.
    it('leaves a vassal that is a tribe to the tribe’s look', () => {
      expect(isBandedVassal({ suzerain: 'crown', rank: 'tribe' })).toBe(false)
    })

    it('gives a region that names no polity no band', () => {
      expect(regionBandDepths([{}], bandedVassalIds(POLITIES), homageLevels(POLITIES))).toEqual([0])
    })
  })

  describe('unmanaged errors', () => {
    it('keeps a NaN distance or width NaN, never a plausible share', () => {
      expect(vassalBandOpacity(Number.NaN, 10)).toBeNaN()
      expect(vassalBandOpacity(-4, Number.NaN)).toBeNaN()
    })

    it('throws for a banded polity the homage does not hold — a defect, never depth nought', () => {
      expect(() =>
        regionBandDepths([{ polityId: 'ghost' }], new Set(['ghost']), homageLevels(POLITIES))
      ).toThrow(/names no polity/)
    })
  })

  describe('edge cases', () => {
    // Mutation: a cut at the outline, as the tribes' band has (`>= 0 → 0`), would empty a fill's edge vertices.
    it('keeps the band on the outline and a hair past it — a fill’s own edge stops the colour', () => {
      expect(vassalBandOpacity(0, 10)).toBe(VASSAL_BAND_SHARE)
      expect(vassalBandOpacity(1e-6, 10)).toBe(VASSAL_BAND_SHARE)
    })

    it('puts the width itself in the band', () => {
      expect(vassalBandOpacity(-10, 10)).toBe(VASSAL_BAND_SHARE)
      expect(vassalBandOpacity(-10.001, 10)).toBe(1)
    })

    it('leaves only the outline at half for a width of nought', () => {
      expect(vassalBandOpacity(-0.001, 0)).toBe(1)
    })
  })
})
