/**
 * The tribes' shaders: the fills' blend over the terrain, faded toward the tribe's limit and cut over anyone else's
 * ground and over the sea — and the fade's mirror on the CPU, so a test can hold it against core.
 */

import {
  BEYOND_OUTLINE_KM,
  featherShiftKm,
} from '@europe-historical-atlas/core/editor/tribeFeather'

import { BLEND_GLSL } from '../tintOnRelief'

import type { TribeFeather } from '@europe-historical-atlas/core/editor/tribeFeather'

/**
 * The narrowest width the shader divides by, in km — a guard against a division by zero, far below a DEM
 * cell, so a width of zero draws the hard edge `featherOpacity` gives it.
 */
const MIN_SHADER_WIDTH_KM = 1e-3

/** The vertex stage: the relief's uv from the world position, the colour and the distance passed on. */
export const TRIBE_VERTEX_SHADER = /* glsl */ `
  attribute vec3 tint;
  attribute float edgeDistance;
  attribute float claimedDistance;
  attribute float land;
  uniform vec2 plane;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vDistance;
  varying float vClaimed;
  varying float vLand;
  void main() {
    // The relief's uv: u west→east, v = 1 at the north edge (z = -depth/2), the texture flipped to match.
    vUv = vec2(position.x / plane.x + 0.5, 0.5 - position.z / plane.y);
    vTint = tint;
    vDistance = edgeDistance;
    vClaimed = claimedDistance;
    vLand = land;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * The two uniforms a feather sets.
 * @param feather - inset or outset, and the width
 * @returns the width the shader divides by, and the shift
 */
export function featherUniforms(feather: TribeFeather): { width: number; shift: number } {
  return {
    width: Math.max(MIN_SHADER_WIDTH_KM, feather.widthKm),
    shift: featherShiftKm(feather.mode, Math.max(0, feather.widthKm)),
  }
}

/**
 * The fragment's opacity — `tribeOpacity` in GLSL: `smoothstep(0, 1, clamp((shift − d) / width, 0, 1))`, then
 * nothing where `d ≥ BEYOND_OUTLINE_KM` (core's threshold, written in from the constant) and the ground is
 * claimed (`c < 0`) or wet. **Mirrored on the CPU by {@link shaderOpacity}**, line for line, which is what a
 * test compares with core; its own test pins this text, so an edit here fails until the mirror follows.
 */
export const TRIBE_OPACITY_GLSL = /* glsl */ `
    float opacity = smoothstep(0.0, 1.0, clamp((featherShift - vDistance) / featherWidth, 0.0, 1.0));
    float beyond = step(${String(BEYOND_OUTLINE_KM)}, vDistance);
    float free = step(0.0, vClaimed) * step(0.5, vLand);
    opacity *= 1.0 - beyond * (1.0 - free);
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
 * The fragment's opacity as {@link TRIBE_OPACITY_GLSL} computes it, on the CPU — its mirror, expression for
 * expression, so the shader's cut can be compared with core's `tribeOpacity` without a GPU (QUAL-004).
 * @param at - what one fragment reads: its distance, its neighbours' distance and its land, `1` dry
 * @param at.distance - the signed distance to the tribe's outline, km
 * @param at.claimed - the signed distance to every other polity's ground, km
 * @param at.land - `1` dry, `0` wet, as the interpolated attribute
 * @param feather - inset or outset, and the width, turned into uniforms as the material does
 * @returns the opacity
 */
export function shaderOpacity(
  at: { distance: number; claimed: number; land: number },
  feather: TribeFeather
): number {
  // The fade: how far inside the shifted outline the point lies, as a share of the width, eased.
  const { width, shift } = featherUniforms(feather)
  const t = Math.min(1, Math.max(0, (shift - at.distance) / width))
  const ramp = t * t * (3 - 2 * t)
  // The cut: nothing beyond the outline, unless the ground there is both unclaimed and dry.
  const beyond = glslStep(BEYOND_OUTLINE_KM, at.distance)
  const free = glslStep(0, at.claimed) * glslStep(0.5, at.land)
  return ramp * (1 - beyond * (1 - free))
}

/** The fragment stage: the fills' blend over the terrain, faded and cut by {@link TRIBE_OPACITY_GLSL}. */
export const TRIBE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform float strength;
  uniform float featherWidth;
  uniform float featherShift;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vDistance;
  varying float vClaimed;
  varying float vLand;
  ${BLEND_GLSL}
  void main() {
    vec3 base = toSrgb(texture2D(map, vUv).rgb);
    vec3 tinted = base + (blend(base, vTint) - base) * strength;
    ${TRIBE_OPACITY_GLSL}
    gl_FragColor = vec4(toLinear(tinted), opacity);
    #include <colorspace_fragment>
  }
`
