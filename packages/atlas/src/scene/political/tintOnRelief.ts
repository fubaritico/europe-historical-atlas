/**
 * What every layer that tints the relief shares — the fills, the tribes and the hatches: the surface it is laid on and the look it
 * is blended with, the bake's blend in GLSL, the pull forward in depth, and the writing of a uniform.
 */

import { COAST_COVERAGE } from '@europe-historical-atlas/core/data/landClip'

import type { LandTextures } from '../relief/landTextures'
import type { FillSurface } from '@europe-historical-atlas/core/pipeline/fillBuffers'
import type { BlendMode } from '@europe-historical-atlas/core/pipeline/terrainOptions'
import type { ShaderMaterial, Texture } from 'three'

/**
 * The relief a tint is laid on, as a layer reads it — core's fill surface (ATLAS-396): its node heights are the relief
 * mesh's own positions, read in place with no call per node (ATLAS-333), or a copy of their heights in the worker.
 */
export type TintSurface = FillSurface

/** How a tint is blended over the terrain — the bake's own settings, so the two agree. */
export interface TintLook {
  /** The baked terrain the colour is composited onto. */
  map: Texture
  /** How the tint blends over the terrain — the bake's `politicalMode`. */
  mode: BlendMode
  /** How much of the blended colour is kept, `[0, 1]` — the bake's `politicalStrength`. */
  strength: number
  /** The land mask, in two halves: a tint is drawn over land only, so it stops on the coast (CORE-421). */
  land: LandTextures
}

/**
 * The land test in GLSL, for every layer that tints the relief: `landAt(vUv)` reads the mask's half the fragment lies
 * in, one over land, nought over water; `overWater` thresholds it at core's `COAST_COVERAGE`, the coast the borders and
 * the Cartographer's sea are cut at — a fragment over water is discarded, so a colour stops on the coast.
 */
export const LAND_GLSL = /* glsl */ `
  uniform sampler2D landWest;
  uniform sampler2D landEast;
  uniform float landSplit;

  float landAt(vec2 uv) {
    if (uv.x < landSplit) return texture2D(landWest, vec2(uv.x / landSplit, uv.y)).r;
    return texture2D(landEast, vec2((uv.x - landSplit) / (1.0 - landSplit), uv.y)).r;
  }

  bool overWater(vec2 uv) {
    return landAt(uv) < ${COAST_COVERAGE.toFixed(2)};
  }
`

/**
 * The uniforms {@link LAND_GLSL} reads.
 * @param land - the mask's two halves
 * @returns the uniforms, by name
 */
export function landUniforms(land: LandTextures): Record<string, { value: unknown }> {
  return {
    landWest: { value: land.west },
    landEast: { value: land.east },
    landSplit: { value: land.split },
  }
}

/** The blend modes, numbered as the shader switches on them — `blend()` below reads these numbers. */
export const MODE_INDEX: Readonly<Record<BlendMode, number>> = {
  normal: 0,
  multiply: 1,
  overlay: 2,
  softLight: 3,
}

/**
 * The bake's blend in GLSL, for every layer that tints the terrain — the fills and the tribes: the sRGB
 * conversions, and the four formulas switched on a `mode` uniform numbered as {@link MODE_INDEX}. One chunk,
 * so the two layers cannot blend a colour two ways.
 */
export const BLEND_GLSL = /* glsl */ `
  uniform int mode;

  vec3 toSrgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }
  vec3 toLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
  }
  vec3 blend(vec3 base, vec3 top) {
    if (mode == 1) return base * top;
    if (mode == 2) return mix(2.0 * base * top, 1.0 - 2.0 * (1.0 - base) * (1.0 - top), step(0.5, base));
    if (mode == 3) return (1.0 - 2.0 * top) * base * base + 2.0 * top * base;
    return top;
  }
`

/**
 * How far the fills are pulled toward the camera in depth, as `polygonOffset` factor and units. Coplanar
 * with the relief by construction, so the slope term (factor) does the work and one step is enough; the
 * units add a constant few depth steps for flat ground. Larger would push the fills in front of the
 * rivers and the coast, which win the depth test by their own bias.
 */
export const FILL_POLYGON_OFFSET = { factor: -1, units: -4 } as const

/**
 * Write a uniform a tint material was built with.
 * @param material - the material
 * @param name - the uniform, one of those its layer declares
 * @param value - its new value
 * @param layer - the layer's name, for the message
 * @returns nothing
 * @throws when the uniform is missing — a renamed uniform would otherwise leave the layer frozen silently
 */
export function setUniform(
  material: ShaderMaterial,
  name: string,
  value: unknown,
  layer: string
): void {
  const uniform = material.uniforms[name]
  if (!uniform) throw new Error(`${layer}: no uniform "${name}"`)
  uniform.value = value
}
