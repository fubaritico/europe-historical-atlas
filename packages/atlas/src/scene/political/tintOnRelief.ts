/**
 * What every layer that tints the relief shares — the fills and the tribes: the surface it is laid on and the look it
 * is blended with, the bake's blend in GLSL, the pull forward in depth, and the writing of a uniform.
 */

import type { FillGrid } from '@europe-historical-atlas/core/pipeline/fillTriangles'
import type { BlendMode } from '@europe-historical-atlas/core/pipeline/terrainOptions'
import type { ShaderMaterial, Texture } from 'three'

/** The relief a tint is laid on, as a layer reads it. */
export interface TintSurface {
  /** The relief's subdivision — the one the triangles were cut against. */
  grid: FillGrid
  /**
   * The relief's height at grid node `(ix, iy)`, in world units before the exaggeration — read off the
   * relief mesh itself, so the tint lies on the very surface drawn.
   * @param ix - the node's column, `0..segX`
   * @param iy - the node's row, `0..segY`, north→south
   * @returns the height
   */
  nodeY: (ix: number, iy: number) => number
  /** World-space width of the map plane on X. */
  worldWidth: number
  /** World-space depth of the map plane on Z. */
  worldDepth: number
}

/** How a tint is blended over the terrain — the bake's own settings, so the two agree. */
export interface TintLook {
  /** The baked terrain the colour is composited onto. */
  map: Texture
  /** How the tint blends over the terrain — the bake's `politicalMode`. */
  mode: BlendMode
  /** How much of the blended colour is kept, `[0, 1]` — the bake's `politicalStrength`. */
  strength: number
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
