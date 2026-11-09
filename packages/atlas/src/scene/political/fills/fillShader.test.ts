// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  SOVEREIGN_BAND_IRREGULARITY,
  SOVEREIGN_BAND_SHARE,
  SOVEREIGN_BAND_WAVE_KM,
  SOVEREIGN_BAND_WIDTH_KM,
  VASSAL_BAND_SHARE,
  VASSAL_BAND_WIDTH_KM,
  sovereignBandWidthKm,
  vassalBandOpacity,
} from '@europe-historical-atlas/core/data/vassalBand'
import { bandWave } from '@europe-historical-atlas/core/editor/tribeFeather'

import { levelOpacity } from '../homageReveal'

import {
  BAND_OPACITY_GLSL,
  BAND_VERTEX_GLSL,
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

// ATLAS-398 and the dev's trial of 2026-11-09: the bands as the GPU computes them, held against core's rules.

/** A point of the frame, for the sovereigns' undulation. */
const AT = { u: 0.4, v: 0.3 }

/** A sovereign's band width at {@link AT}: the undulation read there, at most the band's width. */
const SOVEREIGN_WIDTH = sovereignBandWidthKm(bandWave(AT.u, AT.v, SOVEREIGN_BAND_WAVE_KM))

/**
 * One fragment, alone in its realm unless its realm's distance is given.
 * @param bandKm - the distance to its polity's outline
 * @param bandDepth - its depth of homage
 * @param realmKm - the distance to its realm's outline
 * @returns what the fragment reads
 */
function fragment(bandKm: number, bandDepth: number, realmKm = bandKm) {
  return { ...AT, bandKm, realmKm, bandDepth }
}

describe('shaderBandOpacity', () => {
  describe('happy path', () => {
    it('agrees with core’s band once the vassal is revealed, on either side of the width', () => {
      for (const km of [0, -1, -VASSAL_BAND_WIDTH_KM, -VASSAL_BAND_WIDTH_KM - 0.01, -15])
        expect(shaderBandOpacity(fragment(km, 1, -100), 1)).toBe(
          vassalBandOpacity(km, VASSAL_BAND_WIDTH_KM)
        )
    })

    // The dev, 2026-11-09: from afar France is one block — its band on the realm's outline, nothing inside it.
    it('bands a realm from afar on its outline, never along a vassal’s inside it', () => {
      expect([
        shaderBandOpacity(fragment(-1, 1, -100), 0),
        shaderBandOpacity(fragment(-1, 0, -100), 0),
        shaderBandOpacity(fragment(-100, 1, -1), 0),
      ]).toEqual([1, 1, SOVEREIGN_BAND_SHARE])
    })
  })

  describe('variants', () => {
    it('hands the vassal its own band as its colour comes, half way at half the level', () => {
      for (const detail of [0, 0.25, 0.5, 1, 2]) {
        const share = shaderBandOpacity(fragment(-2, 1, -100), detail)
        expect(share).toBeCloseTo(1 + (VASSAL_BAND_SHARE - 1) * levelOpacity(detail, 1), 9)
      }
    })

    it('reveals a sub-vassal’s band only past its suzerain’s level', () => {
      expect(shaderBandOpacity(fragment(-2, 2, -100), 1)).toBe(1)
      expect(shaderBandOpacity(fragment(-2, 2, -100), 2)).toBe(VASSAL_BAND_SHARE)
    })

    it('bands a sovereign alone in its realm at every level, inside its undulating width, whole deeper', () => {
      for (const detail of [0, 1, 3])
        expect([
          shaderBandOpacity(fragment(-SOVEREIGN_WIDTH + 0.1, 0), detail),
          shaderBandOpacity(fragment(-SOVEREIGN_WIDTH - 0.1, 0), detail),
        ]).toEqual([SOVEREIGN_BAND_SHARE, 1])
    })

    it('never widens a sovereign’s band past its width, nor narrows it below a third of it', () => {
      for (const wave of [-1, -0.5, 0, 0.5, 1]) {
        const width = sovereignBandWidthKm(wave)
        expect(
          width <= SOVEREIGN_BAND_WIDTH_KM + 1e-9 && width >= SOVEREIGN_BAND_WIDTH_KM / 3 - 1e-9
        ).toBe(true)
      }
      expect(sovereignBandWidthKm(1)).toBeCloseTo(SOVEREIGN_BAND_WIDTH_KM, 9)
    })
  })

  // L3: N/A — a formula over numbers, nothing to refuse.

  describe('unmanaged errors', () => {
    it('pins the GLSL to the core constants, so the mirror cannot drift from the text', () => {
      expect(BAND_VERTEX_GLSL).toContain(
        `vBandWidth = bandDepth < 0.5 ? ${SOVEREIGN_BAND_WIDTH_KM.toFixed(3)} : ${VASSAL_BAND_WIDTH_KM.toFixed(3)};`
      )
      expect(BAND_VERTEX_GLSL).toContain(
        `vBandShare = bandDepth < 0.5 ? ${SOVEREIGN_BAND_SHARE.toFixed(3)} : ${VASSAL_BAND_SHARE.toFixed(3)};`
      )
      expect(BAND_VERTEX_GLSL).toContain(
        'vBandReveal = clamp(detail - max(bandDepth - 1.0, 0.0), 0.0, 1.0);'
      )
      // The width's whole expression, built from the constants: a drift in the GLSL fails here, not only in the mirror.
      expect(BAND_OPACITY_GLSL.replace(/\s+/g, ' ')).toContain(
        `float sovereignWidth = ${SOVEREIGN_BAND_WIDTH_KM.toFixed(3)} * (1.0 + ${SOVEREIGN_BAND_IRREGULARITY.toFixed(3)} * bandWave(vec2(vUv.x, 1.0 - vUv.y), ${SOVEREIGN_BAND_WAVE_KM.toFixed(1)})) / ${(1 + SOVEREIGN_BAND_IRREGULARITY).toFixed(3)};`
      )
      expect(BAND_OPACITY_GLSL).toContain('step(-sovereignWidth, vRealmKm)')
      expect(BAND_OPACITY_GLSL).toContain('mix(realmBand, ownBand, vBandReveal)')
      expect(FILL_FRAGMENT_SHADER).toContain('* strength * bandOpacity')
    })
  })

  describe('edge cases', () => {
    it('keeps the outline itself, and a hair past it, in the band', () => {
      expect(shaderBandOpacity(fragment(0, 1, -100), 1)).toBe(VASSAL_BAND_SHARE)
      expect(shaderBandOpacity(fragment(1e-4, 1, -100), 1)).toBe(VASSAL_BAND_SHARE)
    })

    it('holds the band whole past the deepest level', () => {
      expect(shaderBandOpacity(fragment(-2, 1, -100), 5)).toBe(VASSAL_BAND_SHARE)
    })
  })
})
