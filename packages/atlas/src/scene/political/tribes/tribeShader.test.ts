// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  BEYOND_OUTLINE_KM,
  featherOpacity,
  tribeOpacity,
  tribeOpacityAt,
} from '@europe-historical-atlas/core/editor/tribeFeather'

import { shaderOpacity } from './tribeShader'

describe('shaderOpacity', () => {
  /** Distances across both ramps, the outline and core's threshold either side of it included. */
  const DISTANCES = [
    -45,
    -30,
    -15,
    -3.75,
    -1e-3,
    0,
    BEYOND_OUTLINE_KM / 2,
    BEYOND_OUTLINE_KM,
    1e-3,
    10,
    29.9,
    30,
    45,
  ]
  const CLAIMED = [-5, -1e-6, 0, 5]
  const LAND = [true, false]
  const FEATHERS = [
    { mode: 'band', widthKm: 30 },
    { mode: 'band', widthKm: 15 },
    { mode: 'inset', widthKm: 30 },
    { mode: 'outset', widthKm: 30 },
    { mode: 'outset', widthKm: 15 },
  ] as const

  describe('happy path', () => {
    // QUAL-004: the outset spill cut lived only in GLSL; its mirror answers as core over every combination.
    it('answers as core’s tribeOpacity over a table of distance, neighbour and land, every mode', () => {
      for (const feather of FEATHERS)
        for (const signedKm of DISTANCES)
          for (const claimedKm of CLAIMED)
            for (const land of LAND)
              expect(
                shaderOpacity(
                  { distance: signedKm, claimed: claimedKm, land: land ? 1 : 0 },
                  feather
                ),
                `${feather.mode} ${String(feather.widthKm)} d=${String(signedKm)} c=${String(claimedKm)} land=${String(land)}`
              ).toBeCloseTo(tribeOpacity({ signedKm, claimedKm, land }, feather), 9)
    })
  })

  describe('variants', () => {
    // The dev, 2026-11-02: the band's irregular offset, the shader's width at each fragment as core's at the point.
    it('answers as core over the irregular band, point by point across the frame', () => {
      const uneven = { mode: 'band', widthKm: 30, irregularity: 0.5, waveKm: 150 } as const
      for (const [u, v] of [
        [0.1, 0.2],
        [0.37, 0.61],
        [0.72, 0.05],
        [0.9, 0.88],
      ] as const)
        for (const signedKm of [-50, -40, -30, -20, -10, -1, 0, 5])
          expect(
            shaderOpacity({ distance: signedKm, claimed: 5, land: 1, u, v }, uneven),
            `u=${String(u)} v=${String(v)} d=${String(signedKm)}`
          ).toBe(tribeOpacityAt(signedKm, uneven, () => ({ claimedKm: 5, land: true }), { u, v }))
    })

    it('reads the ramp as core’s smoothstep of (shift − d) / width', () => {
      const t = (0 - -3.75) / 15
      expect(
        shaderOpacity({ distance: -3.75, claimed: 5, land: 1 }, { mode: 'inset', widthKm: 15 })
      ).toBeCloseTo(t * t * (3 - 2 * t), 12)
      expect(featherOpacity(-3.75, 15, 'inset')).toBeCloseTo(t * t * (3 - 2 * t), 12)
    })
  })

  describe('managed errors', () => {
    it('cuts an outset spill over a neighbour and over the sea, and keeps it over free land', () => {
      const outset = { mode: 'outset', widthKm: 30 } as const
      expect(shaderOpacity({ distance: 10, claimed: -3, land: 1 }, outset)).toBe(0)
      expect(shaderOpacity({ distance: 10, claimed: 40, land: 0 }, outset)).toBe(0)
      expect(shaderOpacity({ distance: 10, claimed: 40, land: 1 }, outset)).toBeGreaterThan(0)
    })
  })

  // L4: N/A — a NaN varying has no defined GLSL result to mirror; core's NaN answer is tested in core.

  describe('edge cases', () => {
    it('cuts from core’s threshold exactly, never below it', () => {
      const outset = { mode: 'outset', widthKm: 30 } as const
      expect(
        shaderOpacity({ distance: BEYOND_OUTLINE_KM / 2, claimed: -5, land: 1 }, outset)
      ).toBeCloseTo(1, 9)
      expect(shaderOpacity({ distance: BEYOND_OUTLINE_KM, claimed: -5, land: 1 }, outset)).toBe(0)
    })
  })
})
