/**
 * The fills' shaders: the vertex stage mixes the two levels of homage the zoom stands between, the fragment stage
 * blends the tint over the baked terrain as the bake does — **a vassal's at half within its band** (ATLAS-398,
 * `core/data/vassalBand`), the band revealed as its colour is.
 */

import {
  VASSAL_BAND_SHARE,
  VASSAL_BAND_WIDTH_KM,
} from '@europe-historical-atlas/core/data/vassalBand'
import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import { BLEND_GLSL } from '../tintOnRelief'

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
  uniform vec2 plane;
  uniform float detail;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vBandKm;
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
    // The vassal's band, shown as its own colour is: nothing at the level above its own, whole from its own on.
    vBandKm = bandKm;
    vBandReveal = step(0.5, bandDepth) * clamp(detail - (bandDepth - 1.0), 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
}

/**
 * The share of the colour a fragment keeps — `vassalBandOpacity` in GLSL, `VASSAL_BAND_SHARE` within core's
 * `VASSAL_BAND_WIDTH_KM` of the vassal's outline (written in from the constant) and `1` deeper, then mixed from `1` by the band's reveal. **Mirrored on the CPU by
 * {@link shaderBandOpacity}**, expression for expression, which a test compares with core; its own test pins this text.
 */
export const BAND_OPACITY_GLSL = /* glsl */ `
    float banded = mix(1.0, ${VASSAL_BAND_SHARE.toFixed(3)}, step(${(-VASSAL_BAND_WIDTH_KM).toFixed(3)}, vBandKm));
    float bandOpacity = mix(1.0, banded, vBandReveal);
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
 * on the CPU, so the shader's band can be compared with core's `vassalBandOpacity` without a GPU.
 * @param at - what one fragment reads
 * @param at.bandKm - the signed distance to its vassal's outline, km; anything for a sovereign
 * @param at.bandDepth - its polity's depth of homage when it wears the band, `0` otherwise
 * @param detail - the display level, continuous
 * @returns the share, `VASSAL_BAND_SHARE` to `1`
 */
export function shaderBandOpacity(
  at: { bandKm: number; bandDepth: number },
  detail: number
): number {
  const reveal = glslStep(0.5, at.bandDepth) * clamp01(detail - (at.bandDepth - 1))
  const banded = 1 + (VASSAL_BAND_SHARE - 1) * glslStep(-VASSAL_BAND_WIDTH_KM, at.bandKm)
  return 1 + (banded - 1) * reveal
}

/** The fragment stage: the bake's blend, in sRGB as the bake does it, then back to linear for output. */
export const FILL_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform float strength;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vBandKm;
  varying float vBandReveal;
  ${BLEND_GLSL}
  void main() {
    vec3 base = toSrgb(texture2D(map, vUv).rgb);
    ${BAND_OPACITY_GLSL}
    // The band lays the colour at its share over the terrain the fragment reads — the blend an alpha would make, with
    // no transparency to sort.
    vec3 tinted = base + (blend(base, vTint) - base) * strength * bandOpacity;
    gl_FragColor = vec4(toLinear(tinted), 1.0);
    #include <colorspace_fragment>
  }
`
