// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  VASSAL_BAND_SHARE,
  VASSAL_BAND_WIDTH_KM,
  vassalBandOpacity,
} from '@europe-historical-atlas/core/data/vassalBand'

import { levelOpacity } from '../homageReveal'

import {
  BAND_OPACITY_GLSL,
  FILL_FRAGMENT_SHADER,
  fillVertexShader,
  shaderBandOpacity,
  tintAttribute,
} from './fillShader'

describe('fillVertexShader', () => {
  it('declares one tint attribute per level and compiles the count in', () => {
    const source = fillVertexShader(3)
    expect(source).toContain('#define LEVELS 3')
    for (const level of [0, 1, 2])
      expect(source).toContain(`attribute vec3 ${tintAttribute(level)};`)
    expect(source).not.toContain('tint3')
  })

  it('mixes the two levels around the detail uniform', () => {
    expect(fillVertexShader(2)).toMatch(
      /mix\(tintAt\(below\), tintAt\(min\(below \+ 1\.0, top\)\), d - below\)/
    )
  })

  it('reads one level as a single attribute', () => {
    const source = fillVertexShader(1)
    expect(source).toContain('#define LEVELS 1')
    expect(source).toContain('return tint0;')
    expect(source).not.toContain('tint1')
  })
})

// ATLAS-398: the vassals' band, as the GPU computes it, held against core's rule and the vassal's own reveal.
describe('shaderBandOpacity', () => {
  describe('happy path', () => {
    it('agrees with core’s band once the vassal is revealed, on either side of the width', () => {
      for (const km of [0, -1, -VASSAL_BAND_WIDTH_KM, -VASSAL_BAND_WIDTH_KM - 0.01, -15, -20])
        expect(shaderBandOpacity({ bandKm: km, bandDepth: 1 }, 1)).toBe(
          vassalBandOpacity(km, VASSAL_BAND_WIDTH_KM)
        )
    })
  })

  describe('variants', () => {
    // Mutation: a band drawn at every zoom would mark the vassal from afar, where it wears its suzerain's colour whole.
    it('reveals the band as the vassal’s colour is revealed: nothing from afar, half way at half the level', () => {
      for (const detail of [0, 0.25, 0.5, 1, 2]) {
        const share = shaderBandOpacity({ bandKm: -2, bandDepth: 1 }, detail)
        expect(share).toBeCloseTo(1 + (VASSAL_BAND_SHARE - 1) * levelOpacity(detail, 1), 9)
      }
    })

    it('reveals a sub-vassal’s band only past its suzerain’s level', () => {
      expect(shaderBandOpacity({ bandKm: -2, bandDepth: 2 }, 1)).toBe(1)
      expect(shaderBandOpacity({ bandKm: -2, bandDepth: 2 }, 2)).toBe(VASSAL_BAND_SHARE)
    })

    it('draws a sovereign whole at every level, whatever its distance reads', () => {
      for (const detail of [0, 1, 3])
        expect(shaderBandOpacity({ bandKm: 0, bandDepth: 0 }, detail)).toBe(1)
    })
  })

  // L3: N/A — a formula over numbers, nothing to refuse.

  describe('unmanaged errors', () => {
    it('pins the GLSL to the core constants, so the mirror cannot drift from the text', () => {
      expect(BAND_OPACITY_GLSL).toContain(`step(${(-VASSAL_BAND_WIDTH_KM).toFixed(3)}, vBandKm)`)
      expect(BAND_OPACITY_GLSL).toContain(`mix(1.0, ${VASSAL_BAND_SHARE.toFixed(3)},`)
      expect(FILL_FRAGMENT_SHADER).toContain('* strength * bandOpacity')
      expect(fillVertexShader(2)).toContain(
        'vBandReveal = step(0.5, bandDepth) * clamp(detail - (bandDepth - 1.0), 0.0, 1.0);'
      )
    })
  })

  describe('edge cases', () => {
    it('keeps the outline itself, and a hair past it, in the band', () => {
      expect(shaderBandOpacity({ bandKm: 0, bandDepth: 1 }, 1)).toBe(VASSAL_BAND_SHARE)
      expect(shaderBandOpacity({ bandKm: 1e-4, bandDepth: 1 }, 1)).toBe(VASSAL_BAND_SHARE)
    })

    it('holds the band whole past the deepest level', () => {
      expect(shaderBandOpacity({ bandKm: -2, bandDepth: 1 }, 5)).toBe(VASSAL_BAND_SHARE)
    })
  })
})
