/**
 * The fills' shaders: the vertex stage mixes the two levels of homage the zoom stands between, the fragment stage
 * blends the tint over the baked terrain as the bake does — **within a band at the polity's edge** (ATLAS-398 and the
 * trial of 2026-11-09, `core/data/vassalBand`): from afar the realm's, on its sovereign and vassals' outline together;
 * as a polity's colour comes, its own — a vassal's regular, a sovereign's undulating.
 */

import {
  SOVEREIGN_BAND_IRREGULARITY,
  SOVEREIGN_BAND_SHARE,
  SOVEREIGN_BAND_WAVE_KM,
  SOVEREIGN_BAND_WIDTH_KM,
  VASSAL_BAND_SHARE,
  VASSAL_BAND_WIDTH_KM,
  sovereignBandWidthKm,
} from '@europe-historical-atlas/core/data/vassalBand'
import { bandWave } from '@europe-historical-atlas/core/editor/tribeFeather'
import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import { BLEND_GLSL, LAND_GLSL } from '../tintOnRelief'
import { BAND_WAVE_GLSL } from '../tribes/tribeShader'

/**
 * The name of a level's tint attribute.
 * @param level - the display level
 * @returns `tint0`, `tint1`…
 */
export function tintAttribute(level: number): string {
  return `tint${String(level)}`
}

/**
 * The vertex stage for a number of levels: the texture coordinate comes from the world position, as the
 * relief's does, and the tint is the mix of the two levels around `detail`.
 * @param levels - how many tint levels the geometry carries, at least one
 * @returns the GLSL source
 */
export function fillVertexShader(levels: number): string {
  // One attribute name per level; the last one is what `tintAt` returns once every test has failed.
  const count = Math.max(1, Math.floor(levels))
  const names = Array.from({ length: count }, (_, level) => tintAttribute(level))
  const last = names[names.length - 1] ?? tintAttribute(0)
  return /* glsl */ `
  #define LEVELS ${String(count)}
  ${names.map((name) => `attribute vec3 ${name};`).join('\n  ')}
  attribute float bandDepth;
  attribute float bandKm;
  attribute float realmKm;
  uniform vec2 plane;
  uniform float detail;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vBandKm;
  varying float vBandShare;
  varying float vRealmKm;
  varying float vSovereign;
  varying float vBandWidth;
  varying float vBandReveal;
  vec3 tintAt(float level) {
    ${names
      .slice(0, -1)
      .map((name, level) => `if (level < ${String(level)}.5) return ${name};`)
      .join('\n    ')}
    return ${last};
  }
  void main() {
    // The relief's uv: u west→east, v = 1 at the north edge (z = -depth/2), the texture flipped to match.
    vUv = vec2(position.x / plane.x + 0.5, 0.5 - position.z / plane.y);
    float top = float(LEVELS - 1);
    float d = clamp(detail, 0.0, top);
    float below = floor(d);
    vTint = mix(tintAt(below), tintAt(min(below + 1.0, top)), d - below);
    ${BAND_VERTEX_GLSL}
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
}

/**
 * A polity's band read off its vertex (ATLAS-398, and the sovereigns' trial of 2026-11-09): a sovereign (depth nought)
 * keeps `SOVEREIGN_BAND_SHARE` at every zoom; a vassal keeps `VASSAL_BAND_SHARE`, shown as its own colour is —
 * nothing at the level above its own, whole from its own on. Read by the fills' and the hatches' vertex stages, which
 * declare `bandDepth`, `bandKm`, `realmKm`, `detail` and the six band varyings.
 */
export const BAND_VERTEX_GLSL = /* glsl */ `
    vBandKm = bandKm;
    vRealmKm = realmKm;
    vBandShare = bandDepth < 0.5 ? ${SOVEREIGN_BAND_SHARE.toFixed(3)} : ${VASSAL_BAND_SHARE.toFixed(3)};
    vBandWidth = bandDepth < 0.5 ? ${SOVEREIGN_BAND_WIDTH_KM.toFixed(3)} : ${VASSAL_BAND_WIDTH_KM.toFixed(3)};
    vSovereign = bandDepth < 0.5 ? 1.0 : 0.0;
    vBandReveal = clamp(detail - max(bandDepth - 1.0, 0.0), 0.0, 1.0);
`

/**
 * The share of the colour a fragment keeps: from afar the realm's band (the sovereigns' share, within an undulating
 * width of at most `SOVEREIGN_BAND_WIDTH_KM` of the realm's outline), mixed by the reveal into the polity's own (its
 * share within its width of its outline — a vassal's regular, as core's `vassalBandOpacity`). **Mirrored on the CPU by
 * {@link shaderBandOpacity}**, expression for expression, which a test compares with core; its own test pins this text.
 */
export const BAND_OPACITY_GLSL = /* glsl */ `
    // A sovereign's band undulates as a tribe's, at most its width (the dev, 2026-11-09); a vassal's stays regular.
    float sovereignWidth = ${SOVEREIGN_BAND_WIDTH_KM.toFixed(3)}
      * (1.0 + ${SOVEREIGN_BAND_IRREGULARITY.toFixed(3)} * bandWave(vec2(vUv.x, 1.0 - vUv.y), ${SOVEREIGN_BAND_WAVE_KM.toFixed(1)}))
      / ${(1 + SOVEREIGN_BAND_IRREGULARITY).toFixed(3)};
    float realmBand = mix(1.0, ${SOVEREIGN_BAND_SHARE.toFixed(3)}, step(-sovereignWidth, vRealmKm));
    float ownWidth = mix(vBandWidth, sovereignWidth, vSovereign);
    float ownBand = mix(1.0, vBandShare, step(-ownWidth, vBandKm));
    float bandOpacity = mix(realmBand, ownBand, vBandReveal);
`

/**
 * GLSL's `step(edge, x)`: `0` below the edge, `1` from it.
 * @param edge - the edge
 * @param x - the value
 * @returns `0` or `1`
 */
function glslStep(edge: number, x: number): number {
  return x < edge ? 0 : 1
}

/**
 * A fragment's share of its colour as {@link BAND_OPACITY_GLSL} computes it, with the reveal the vertex stage gives —
 * on the CPU, so the shader's band can be compared with core's without a GPU. From afar, the realm's band on the realm's
 * outline (a sovereign and its vassals together, the dev, 2026-11-09); as a polity's own colour comes, its own band on
 * its own outline. A sovereign's width undulates as a tribe's, at most `SOVEREIGN_BAND_WIDTH_KM`.
 * @param at - what one fragment reads
 * @param at.bandKm - the signed distance to its polity's outline, km
 * @param at.realmKm - the signed distance to its realm's outline, km — `bandKm` for a polity alone in its realm
 * @param at.bandDepth - its polity's depth of homage, `0` for a sovereign
 * @param at.u - the fragment's frame `u`, for the undulation
 * @param at.v - its frame `v`, north to south
 * @param detail - the display level, continuous
 * @returns the share, `VASSAL_BAND_SHARE` to `1`
 */
export function shaderBandOpacity(
  at: { bandKm: number; realmKm: number; bandDepth: number; u: number; v: number },
  detail: number
): number {
  const sovereign = at.bandDepth < 0.5
  const reveal = clamp01(detail - Math.max(at.bandDepth - 1, 0))
  const sovereignWidth = sovereignBandWidthKm(bandWave(at.u, at.v, SOVEREIGN_BAND_WAVE_KM))
  const realmBand = 1 + (SOVEREIGN_BAND_SHARE - 1) * glslStep(-sovereignWidth, at.realmKm)
  const share = sovereign ? SOVEREIGN_BAND_SHARE : VASSAL_BAND_SHARE
  const width = sovereign ? sovereignWidth : VASSAL_BAND_WIDTH_KM
  const ownBand = 1 + (share - 1) * glslStep(-width, at.bandKm)
  return realmBand + (ownBand - realmBand) * reveal
}

/** The fragment stage: the bake's blend, in sRGB as the bake does it, then back to linear for output. */
export const FILL_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform float strength;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vBandKm;
  varying float vBandShare;
  varying float vRealmKm;
  varying float vSovereign;
  varying float vBandWidth;
  varying float vBandReveal;
  ${BLEND_GLSL}
  ${LAND_GLSL}
  ${BAND_WAVE_GLSL}
  void main() {
    // Over water nothing is drawn: the colour stops on the land mask's coast (CORE-421).
    if (overWater(vUv)) discard;
    vec3 base = toSrgb(texture2D(map, vUv).rgb);
    ${BAND_OPACITY_GLSL}
    // The band lays the colour at its share over the terrain the fragment reads — the blend an alpha would make, with
    // no transparency to sort.
    vec3 tinted = base + (blend(base, vTint) - base) * strength * bandOpacity;
    gl_FragColor = vec4(toLinear(tinted), 1.0);
    #include <colorspace_fragment>
  }
`
