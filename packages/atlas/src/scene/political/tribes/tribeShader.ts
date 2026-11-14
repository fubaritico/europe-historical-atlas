/**
 * The tribes' shaders: the fills' blend over the terrain, faded toward the tribe's limit and cut over anyone else's
 * ground and over the sea — and the fade's mirror on the CPU, so a test can hold it against core.
 */

import {
  BAND_KM_PER_UNIT,
  BAND_SHARE,
  BAND_WAVE_KM,
  BEYOND_OUTLINE_KM,
  TRIBE_FEATHER_REACH_KM,
  TRIBE_MARGIN_FEATHER,
  TRIBE_OUTLINED_FEATHER,
  bandWave,
  featherShiftKm,
} from '@europe-historical-atlas/core/editor/tribeFeather'

import { BLEND_GLSL, LAND_GLSL } from '../tintOnRelief'

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
  attribute float tribeStyle;
  uniform vec2 plane;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vDistance;
  varying float vClaimed;
  varying float vLand;
  varying float vStyle;
  void main() {
    // The relief's uv: u west→east, v = 1 at the north edge (z = -depth/2), the texture flipped to match.
    vUv = vec2(position.x / plane.x + 0.5, 0.5 - position.z / plane.y);
    vTint = tint;
    vDistance = edgeDistance;
    vClaimed = claimedDistance;
    vLand = land;
    vStyle = tribeStyle;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * The uniforms a feather sets.
 * @param feather - the band, inset or outset, and the width
 * @returns the width the shader divides by, the shift, `1` for the band or `0` for a fade, the band's irregularity and
 *   its wavelength
 */
export function featherUniforms(feather: TribeFeather): {
  width: number
  shift: number
  band: number
  irregularity: number
  wave: number
} {
  return {
    width: Math.max(MIN_SHADER_WIDTH_KM, feather.widthKm),
    shift: featherShiftKm(feather.mode, Math.max(0, feather.widthKm)),
    band: feather.mode === 'band' ? 1 : 0,
    irregularity: feather.irregularity ?? 0,
    wave: Math.max(1, feather.waveKm ?? BAND_WAVE_KM),
  }
}

/**
 * `bandWave` in GLSL, term for term — at the fragment's frame position: `u` as the relief's, `v` turned to run north to
 * south as the frame's does (the relief's `vUv.y` is `1` at the north edge).
 */
export const BAND_WAVE_GLSL = /* glsl */ `
  float bandWave(vec2 at, float waveKm) {
    float k = 6.283185307179586 / waveKm;
    float x = at.x * ${BAND_KM_PER_UNIT.toFixed(1)};
    float y = at.y * ${BAND_KM_PER_UNIT.toFixed(1)};
    return (sin(k * (0.83 * x + 0.56 * y) + 1.3)
      + sin(1.37 * k * (-0.41 * x + 0.91 * y) + 4.1)
      + sin(0.71 * k * (0.97 * x - 0.24 * y) + 2.7)) / 3.0;
  }
`

/**
 * The fragment's opacity — `tribeOpacity` in GLSL: `smoothstep(0, 1, clamp((shift − d) / width, 0, 1))` for a fade, or
 * for the band `BAND_SHARE` inside the outline and `1` deeper than the width (`featherBand` choosing), then
 * nothing where `d ≥ BEYOND_OUTLINE_KM` (core's threshold, written in from the constant) and the ground is
 * claimed (`c < 0`) or wet. The band is a confederation's; an outlined tribe's vertex (`vStyle` 1, CARTO-439) takes
 * core's outlined rule instead, a tribe's (`vStyle` 2, CARTO-447) the margin's — their widths and wave written in from
 * `TRIBE_OUTLINED_FEATHER` and `TRIBE_MARGIN_FEATHER`. **Mirrored on the CPU by {@link shaderOpacity}**, line for line, which is what a
 * test compares with core; its own test pins this text, so an edit here fails until the mirror follows.
 */
export const TRIBE_OPACITY_GLSL = /* glsl */ `
    float fade = smoothstep(0.0, 1.0, clamp((featherShift - vDistance) / featherWidth, 0.0, 1.0));
    float inside = 1.0 - step(0.0, vDistance);
    vec2 framed = vec2(vUv.x, 1.0 - vUv.y);
    float bandWidth = clamp(
      featherWidth * (1.0 + featherIrregularity * bandWave(framed, featherWave)),
      0.0,
      ${TRIBE_FEATHER_REACH_KM.toFixed(1)}
    );
    float band = inside * mix(${BAND_SHARE.toFixed(3)}, 1.0, step(bandWidth, -vDistance));
    float opacity = mix(fade, band, featherBand);
    // An outlined tribe (CARTO-439), core's TRIBE_OUTLINED_FEATHER written in: full within the rim, half to the width,
    // nothing deeper — both limits undulating by its own wave, as the Cartographer draws it.
    float rimWave = 1.0 + ${TRIBE_OUTLINED_FEATHER.irregularity.toFixed(3)} * bandWave(framed, ${TRIBE_OUTLINED_FEATHER.waveKm.toFixed(1)});
    float rimInner = clamp(${TRIBE_OUTLINED_FEATHER.innerKm.toFixed(1)} * rimWave, 0.0, ${TRIBE_FEATHER_REACH_KM.toFixed(1)});
    float rimOuter = clamp(${TRIBE_OUTLINED_FEATHER.widthKm.toFixed(1)} * rimWave, 0.0, ${TRIBE_FEATHER_REACH_KM.toFixed(1)});
    float rim = inside * mix(1.0, ${BAND_SHARE.toFixed(3)} * (1.0 - step(rimOuter, -vDistance)), step(rimInner, -vDistance));
    // A tribe's margin (CARTO-447), core's TRIBE_MARGIN_FEATHER written in: nothing within the rim, half to the width,
    // full deeper — both limits undulating by its own wave.
    float marginWave = 1.0 + ${TRIBE_MARGIN_FEATHER.irregularity.toFixed(3)} * bandWave(framed, ${TRIBE_MARGIN_FEATHER.waveKm.toFixed(1)});
    float marginInner = clamp(${TRIBE_MARGIN_FEATHER.innerKm.toFixed(1)} * marginWave, 0.0, ${TRIBE_FEATHER_REACH_KM.toFixed(1)});
    float marginOuter = clamp(${TRIBE_MARGIN_FEATHER.widthKm.toFixed(1)} * marginWave, 0.0, ${TRIBE_FEATHER_REACH_KM.toFixed(1)});
    float margin = inside * step(marginInner, -vDistance) * mix(${BAND_SHARE.toFixed(3)}, 1.0, step(marginOuter, -vDistance));
    // The style's number (TRIBE_STYLE_CODES): 0 the band, 1 the outlined rim, 2 the margin.
    opacity = mix(opacity, rim, step(0.5, vStyle) * (1.0 - step(1.5, vStyle)));
    opacity = mix(opacity, margin, step(1.5, vStyle));
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
 * A flat style's two limits at a fragment, as the GLSL writes them in: the rim and the width, each times the same wave,
 * held within the reach — the outlined tribe's (CARTO-439) or the margin's (CARTO-447).
 * @param feather - the style's feather, core's
 * @param at - the fragment's frame position
 * @param at.u - across the frame
 * @param at.v - down the frame, north to south
 * @returns the inner limit (the rim) and the outer (the width), km
 */
function flatLimits(
  feather: Readonly<Required<TribeFeather>>,
  at: { u?: number; v?: number }
): { inner: number; outer: number } {
  const wave = 1 + feather.irregularity * bandWave(at.u ?? 0, at.v ?? 0, feather.waveKm)
  return {
    inner: Math.min(TRIBE_FEATHER_REACH_KM, Math.max(0, feather.innerKm * wave)),
    outer: Math.min(TRIBE_FEATHER_REACH_KM, Math.max(0, feather.widthKm * wave)),
  }
}

/**
 * The fragment's opacity as {@link TRIBE_OPACITY_GLSL} computes it, on the CPU — its mirror, expression for
 * expression, so the shader's cut can be compared with core's `tribeOpacity` without a GPU (QUAL-004).
 * @param at - what one fragment reads: its distance, its neighbours' distance and its land, `1` dry
 * @param at.distance - the signed distance to the tribe's outline, km
 * @param at.claimed - the signed distance to every other polity's ground, km
 * @param at.land - `1` dry, `0` wet, as the interpolated attribute
 * @param at.u - the fragment's frame `u`, for the band's undulation
 * @param at.v - the fragment's frame `v`, north to south
 * @param at.style - the vertex's style number: `1` an outlined tribe (CARTO-439), `2` a tribe (CARTO-447), `0` or absent
 *   a confederation
 * @param feather - inset or outset, and the width, turned into uniforms as the material does
 * @returns the opacity
 */
export function shaderOpacity(
  at: {
    distance: number
    claimed: number
    land: number
    u?: number
    v?: number
    style?: number
  },
  feather: TribeFeather
): number {
  // The fade: how far inside the shifted outline the point lies, as a share of the width, eased.
  const { width, shift, band, irregularity, wave } = featherUniforms(feather)
  const t = Math.min(1, Math.max(0, (shift - at.distance) / width))
  const fade = t * t * (3 - 2 * t)
  // The band: half the colour within the width inside the outline, the full colour deeper, nothing past it.
  const inside = 1 - glslStep(0, at.distance)
  const undulation = irregularity === 0 ? 0 : irregularity * bandWave(at.u ?? 0, at.v ?? 0, wave)
  const bandWidth = Math.min(TRIBE_FEATHER_REACH_KM, Math.max(0, width * (1 + undulation)))
  const banded = inside * (BAND_SHARE + (1 - BAND_SHARE) * glslStep(bandWidth, -at.distance))
  const tribal = fade + (banded - fade) * band
  // The outlined tribe and the tribe's margin: two flat tones between undulating limits — their own widths and wave.
  const depth = -at.distance
  const rim = flatLimits(TRIBE_OUTLINED_FEATHER, at)
  const outlined =
    inside * (1 + (BAND_SHARE * (1 - glslStep(rim.outer, depth)) - 1) * glslStep(rim.inner, depth))
  const edge = flatLimits(TRIBE_MARGIN_FEATHER, at)
  const margin =
    inside *
    glslStep(edge.inner, depth) *
    (BAND_SHARE + (1 - BAND_SHARE) * glslStep(edge.outer, depth))
  const style = at.style ?? 0
  const outlinedShare = glslStep(0.5, style) * (1 - glslStep(1.5, style))
  const withRim = tribal + (outlined - tribal) * outlinedShare
  const ramp = withRim + (margin - withRim) * glslStep(1.5, style)
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
  uniform float featherBand;
  uniform float featherIrregularity;
  uniform float featherWave;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vDistance;
  varying float vClaimed;
  varying float vLand;
  varying float vStyle;
  ${BLEND_GLSL}
  ${LAND_GLSL}
  ${BAND_WAVE_GLSL}
  void main() {
    // Over water nothing is drawn: the colour stops on the land mask's coast (CORE-421).
    if (overWater(vUv)) discard;
    vec3 base = toSrgb(texture2D(map, vUv).rgb);
    vec3 tinted = base + (blend(base, vTint) - base) * strength;
    ${TRIBE_OPACITY_GLSL}
    gl_FragColor = vec4(toLinear(tinted), opacity);
    #include <colorspace_fragment>
  }
`
