import { describe, expect, it, vi } from 'vitest'

import { BAND_REACH_KM } from '../data/vassalBand'

import {
  BAND_STEPS_PER_KM,
  applyBakedBands,
  bakedBandsPath,
  encodeBakedBands,
  readBakedBands,
} from './bakedBands'
import { cutYearFills } from './vassalBands'

import type { IndexedFill } from './indexFill'
import type { FillBand, FillRegion } from './vassalBands'

// ATLAS-407: the bands' distances measured by the build, read back by the page instead of measured.

/** A frame of ten degrees, the reach of the atlas's cut. */
const BAND: FillBand = { bounds: { west: 0, east: 10, south: 40, north: 50 }, reachKm: 40 }

/** The grid the fills are cut on. */
const GRID = { segX: 40, segY: 40 }

/**
 * A square, in `(u, v)`.
 * @param u0 - west
 * @param v0 - north
 * @param side - its side
 * @returns its one ring
 */
function square(u0: number, v0: number, side: number): FillRegion['rings'] {
  return [
    [
      { u: u0, v: v0 },
      { u: u0 + side, v: v0 },
      { u: u0 + side, v: v0 + side },
      { u: u0, v: v0 + side },
    ],
  ]
}

/** A sovereign and its vassal side by side (one realm of two), a lone sovereign, and a tribe, unbanded. */
const REGIONS: FillRegion[] = [
  { rings: square(0.1, 0.1, 0.3), banded: true, realm: 'king' },
  { rings: square(0.4, 0.1, 0.3), banded: true, realm: 'king' },
  { rings: square(0.1, 0.6, 0.3), banded: true, realm: 'alone' },
  { rings: square(0.6, 0.6, 0.3) },
]

/**
 * The largest gap between two fills' distances, over every banded vertex.
 * @param a - one cut
 * @param b - the other
 * @param key - which distance
 * @returns the gap, km
 */
function widestGap(a: IndexedFill[], b: IndexedFill[], key: 'bandKm' | 'realmKm'): number {
  let gap = 0
  a.forEach((fill, index) => {
    const own = fill[key] ?? fill.bandKm
    const other = b[index]?.[key]
    if (own === undefined || other === undefined) return
    own.forEach((km, i) => (gap = Math.max(gap, Math.abs(km - (other[i] ?? Number.NaN)))))
  })
  return gap
}

/**
 * The year's fills, measured as the worker measures them.
 * @returns the fills
 */
function measured(): IndexedFill[] {
  return cutYearFills(REGIONS, GRID, BAND)
}

/**
 * The year's file as the build writes it, read back as the page reads it.
 * @returns the distances
 */
function bakedThenRead(): ReturnType<typeof readBakedBands> {
  const bytes = encodeBakedBands(measured(), GRID)
  return readBakedBands(bytes.slice().buffer, 'bands.bin')
}

describe('the bands baked at the build', () => {
  describe('happy path', () => {
    it('lays each vertex within half a step of what the cut measures, own and realm', () => {
      const laid = cutYearFills(REGIONS, GRID, BAND, bakedThenRead())
      const halfStep = 0.5 / BAND_STEPS_PER_KM + 1e-6
      expect([
        widestGap(measured(), laid, 'bandKm') <= halfStep,
        widestGap(measured(), laid, 'realmKm') <= halfStep,
      ]).toEqual([true, true])
    })
  })

  describe('variants', () => {
    it('writes the file where the page fetches it, whatever the trailing slash', () => {
      expect([bakedBandsPath('/years/', 1100), bakedBandsPath('years', 1200)]).toEqual([
        '/years/1100/bands.bin',
        'years/1200/bands.bin',
      ])
    })

    it('gives the lone sovereign its own distance as its realm’s, and leaves the tribe unmeasured', () => {
      const laid = cutYearFills(REGIONS, GRID, BAND, bakedThenRead())
      expect([
        [...(laid[2]?.realmKm ?? [])].join() === [...(laid[2]?.bandKm ?? [])].join(),
        laid[3]?.bandKm,
      ]).toEqual([true, undefined])
    })
  })

  describe('edge cases', () => {
    // The byte must hold the cut's whole reach, or a widened band would be cut short in the file with nothing said.
    it('holds the cut’s reach within a byte', () => {
      expect(BAND_REACH_KM * BAND_STEPS_PER_KM).toBeLessThanOrEqual(127)
    })

    it('clamps a distance past the byte to 127 steps', () => {
      const far: IndexedFill = {
        vertices: [0.5, 0.5],
        indices: [],
        bandKm: new Float32Array([-1e6]),
      } as unknown as IndexedFill
      const read = readBakedBands(encodeBakedBands([far], GRID).slice().buffer, 'bands.bin')
      expect([read.own[0], read.realm[0]]).toEqual([-127, -127])
    })
  })

  describe('managed errors', () => {
    it('refuses a file written for another grid', () => {
      const fills = cutYearFills(REGIONS, GRID, null)
      expect(() =>
        applyBakedBands(fills, REGIONS, { segX: 41, segY: 40 }, bakedThenRead())
      ).toThrow(/grid of 40×40, cut on 41×40/)
    })

    it('refuses a file written for another count of polities', () => {
      const fills = cutYearFills(REGIONS.slice(0, 3), GRID, null)
      expect(() => applyBakedBands(fills, REGIONS.slice(0, 3), GRID, bakedThenRead())).toThrow(
        /written for 4 polities, 3 cut/
      )
    })

    // Node and the browser round the projection apart in its last digit, which moves a vertex of the cut (1100: four).
    it('measures here, it alone, a polity whose cut differs from the build’s, the others laid from the file', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      // The lone sovereign's corner moved by a fifth of a cell: its cut gains vertices the file does not hold.
      const moved = REGIONS.map((region, index) =>
        index === 2
          ? { ...region, rings: [[{ u: 0.105, v: 0.6 }, ...(region.rings[0] ?? []).slice(1)]] }
          : region
      )
      const laid = cutYearFills(moved, GRID, BAND, bakedThenRead())
      const exact = cutYearFills(moved, GRID, BAND)
      // The moved polity measured here to the float, the others laid from the file to the step.
      const fromFile = (index: number): boolean =>
        [...(laid[index]?.bandKm ?? [])].every(
          (km) => Math.abs(km * BAND_STEPS_PER_KM - Math.round(km * BAND_STEPS_PER_KM)) < 1e-4
        )
      expect([
        [0, 1, 2].map(fromFile),
        widestGap(exact, laid, 'bandKm') <= 0.5 / BAND_STEPS_PER_KM + 1e-6,
        warn.mock.calls.map(([message]) => String(message)),
      ]).toEqual([
        [true, true, false],
        true,
        [
          "[atlas] bands: 1 of 3 polities measured here — their cut differs from the build's by a rounding",
        ],
      ])
    })

    it('refuses to write a distance that is not a number', () => {
      const broken = { vertices: [0.5, 0.5], indices: [], bandKm: new Float32Array([Number.NaN]) }
      expect(() => encodeBakedBands([broken as unknown as IndexedFill], GRID)).toThrow(
        /not a number/
      )
    })

    it('refuses bytes that are not a year’s distances', () => {
      const good = encodeBakedBands(measured(), GRID)
      const otherMagic = good.slice()
      otherMagic[0] = 0
      const otherVersion = good.slice()
      otherVersion[4] = 9
      const otherSteps = good.slice()
      otherSteps[5] = 2
      const cut = good.slice(0, good.length - 1)
      expect(
        [new Uint8Array(3), otherMagic, otherVersion, otherSteps, cut].map((bytes) => {
          try {
            readBakedBands(bytes.buffer, 'bands.bin')
            return 'read'
          } catch (error: unknown) {
            return (error as Error).message.replace(
              /^bands\.bin is not a year's baked distances: /,
              ''
            )
          }
        })
      ).toEqual([
        '3 bytes',
        'not opened by EHAB',
        'version 9, 2 expected',
        '2 steps a km, 3 expected',
        `${String(good.length - 1)} bytes for 4 polities and ${String((good.length - 24 - 32) / 2)} vertices`,
      ])
    })
  })
})
