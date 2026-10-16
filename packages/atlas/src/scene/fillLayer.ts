/**
 * The polities' colour laid on the relief as geometry, cut from the same outlines as the border lines.
 *
 * Until 2026-10-16 an authored year's colour went through a 1.9 km grid baked into the terrain texture,
 * and at close zoom it missed the border line by a cell. This layer draws the triangles of
 * `core/pipeline/fillTriangles` instead: each lies in one plane of the relief, so it is lifted onto the
 * terrain plane by plane — never bilinearly, which would float it over a valley or sink it under a ridge.
 *
 * The colour is composited onto the baked terrain *in the shader*: the fragment reads the texture under it
 * and blends the polity's tint over it with the bake's own four formulas (`blendChannel`, copied below —
 * GLSL cannot import it), in sRGB as the bake does.
 *
 * **The base is the finished terrain, hillshade included** — the bake used to put the tint *under* the
 * hillshade. Over the shading is what the Cartographer does with its own fills on the same backdrop, so the
 * two applications now agree; the price is that `normal` paints the shading out, and that `overlay` reads
 * a little stronger in the valleys. Chosen 2026-10-16, to be judged by the dev on screen.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
  Uint8BufferAttribute,
} from 'three'

import { planeHeight } from '@europe-historical-atlas/core/pipeline/gridDrape'

import type { FillGrid } from '@europe-historical-atlas/core/pipeline/fillTriangles'
import type { BlendMode } from '@europe-historical-atlas/core/pipeline/terrainOptions'
import type { RgbColor } from '@europe-historical-atlas/core/utils/color'
import type { Texture } from 'three'

/** The blend modes, numbered as the shader switches on them — `blend()` below reads these numbers. */
export const MODE_INDEX: Readonly<Record<BlendMode, number>> = {
  normal: 0,
  multiply: 1,
  overlay: 2,
  softLight: 3,
}

/**
 * Draw order of the fills: after the relief (0), whose depth they test against, and before every line —
 * the borders' order starts at `BORDER_RENDER_ORDER`.
 */
export const FILL_RENDER_ORDER = 1

/**
 * How far the fills are pulled toward the camera in depth, as `polygonOffset` factor and units. Coplanar
 * with the relief by construction, so the slope term (factor) does the work and one step is enough; the
 * units add a constant few depth steps for flat ground. Larger would push the fills in front of the
 * rivers and the coast, which win the depth test by their own bias.
 */
export const FILL_POLYGON_OFFSET = { factor: -1, units: -4 } as const

/** What the fill layer is built from. */
export interface FillLayerOptions {
  /** Each polity's triangles, flat `u, v`, three vertices each — `fillTriangles`' output. */
  fills: readonly Float32Array[]
  /** Each polity's tint, in the same order; `null` leaves it unfilled. */
  tints: readonly (RgbColor | null)[]
  /** The relief's subdivision — the one the fills were cut against. */
  grid: FillGrid
  /**
   * The relief's height at grid node `(ix, iy)`, in world units before the exaggeration — read off the
   * relief mesh itself, so the fill lies on the very surface drawn.
   * @param ix - the node's column, `0..segX`
   * @param iy - the node's row, `0..segY`, north→south
   * @returns the height
   */
  nodeY: (ix: number, iy: number) => number
  /** World-space width of the map plane on X. */
  worldWidth: number
  /** World-space depth of the map plane on Z. */
  worldDepth: number
  /** The baked terrain the colour is composited onto. */
  map: Texture
  /** How the tint blends over the terrain — the bake's `politicalMode`. */
  mode: BlendMode
  /** How much of the blended colour is kept, `[0, 1]` — the bake's `politicalStrength`. */
  strength: number
}

/** The fill as one renderable, and what can change on it without a rebuild. */
export interface FillLayer {
  /** The mesh to add to the scene; scale it with the relief's exaggeration. */
  readonly object: Mesh<BufferGeometry, ShaderMaterial>
  /**
   * Composite onto a freshly baked terrain.
   * @param map - the new texture
   * @returns nothing
   */
  setMap: (map: Texture) => void
  /**
   * Retune the blend, which needs no rebuild.
   * @param mode - how the tint blends over the terrain
   * @param strength - how much of the blended colour is kept
   * @returns nothing
   */
  setLook: (mode: BlendMode, strength: number) => void
  /**
   * Free the geometry and the material; the texture is the caller's and is left alone. Remove the object
   * from the scene first.
   * @returns nothing
   */
  dispose: () => void
}

/**
 * The positions and tints of every filled triangle, in world space.
 * @param options - the fills, their tints and the surface
 * @returns three floats and three bytes per vertex
 */
export function fillBuffers(
  options: Pick<
    FillLayerOptions,
    'fills' | 'tints' | 'grid' | 'nodeY' | 'worldWidth' | 'worldDepth'
  >
): { positions: Float32Array; tints: Uint8Array } {
  let vertices = 0
  options.fills.forEach((fill, i) => {
    if (options.tints[i]) vertices += Math.floor(fill.length / 2)
  })
  const positions = new Float32Array(vertices * 3)
  const tints = new Uint8Array(vertices * 3)
  let at = 0
  options.fills.forEach((fill, i) => {
    const tint = options.tints[i]
    if (!tint) return
    // `k + 1 < length`: an odd tail would be half a vertex, and is never read as the north-west corner.
    for (let k = 0; k + 1 < fill.length; k += 2) {
      const u = fill[k] ?? 0
      const v = fill[k + 1] ?? 0
      positions[3 * at] = (u - 0.5) * options.worldWidth
      positions[3 * at + 1] = planeHeight(u, v, options.grid, options.nodeY)
      positions[3 * at + 2] = (v - 0.5) * options.worldDepth
      tints[3 * at] = tint.r
      tints[3 * at + 1] = tint.g
      tints[3 * at + 2] = tint.b
      at += 1
    }
  })
  return { positions, tints }
}

/** The vertex stage: the texture coordinate comes from the world position, as the relief's does. */
const VERTEX_SHADER = /* glsl */ `
  attribute vec3 tint;
  uniform vec2 plane;
  varying vec2 vUv;
  varying vec3 vTint;
  void main() {
    // The relief's uv: u west→east, v = 1 at the north edge (z = -depth/2), the texture flipped to match.
    vUv = vec2(position.x / plane.x + 0.5, 0.5 - position.z / plane.y);
    vTint = tint;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** The fragment stage: the bake's blend, in sRGB as the bake does it, then back to linear for output. */
const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform float strength;
  uniform int mode;
  varying vec2 vUv;
  varying vec3 vTint;

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
  void main() {
    vec3 base = toSrgb(texture2D(map, vUv).rgb);
    vec3 tinted = base + (blend(base, vTint) - base) * strength;
    gl_FragColor = vec4(toLinear(tinted), 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * Write a uniform the material was built with.
 * @param material - the fill material
 * @param name - the uniform, one of those `createFillLayer` declares
 * @param value - its new value
 * @returns nothing
 * @throws when the uniform is missing — a renamed uniform would otherwise leave the fill frozen silently
 */
function setUniform(material: ShaderMaterial, name: string, value: unknown): void {
  const uniform = material.uniforms[name]
  if (!uniform) throw new Error(`fill layer: no uniform "${name}"`)
  uniform.value = value
}

/**
 * Build the fill layer.
 * @param options - the fills, their tints, the surface and the look
 * @returns the layer
 */
export function createFillLayer(options: FillLayerOptions): FillLayer {
  const { positions, tints } = fillBuffers(options)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('tint', new Uint8BufferAttribute(tints, 3, true))
  const material = new ShaderMaterial({
    uniforms: {
      map: { value: options.map },
      strength: { value: options.strength },
      mode: { value: MODE_INDEX[options.mode] },
      plane: { value: [options.worldWidth, options.worldDepth] },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    // Coplanar with the relief by construction, so it is pulled forward in depth to win against it — a
    // slope-scaled offset, which is what a coplanar surface needs, not a lift that would show at an angle.
    polygonOffset: true,
    polygonOffsetFactor: FILL_POLYGON_OFFSET.factor,
    polygonOffsetUnits: FILL_POLYGON_OFFSET.units,
    depthWrite: false,
  })
  const object = new Mesh(geometry, material)
  // After the relief, so the depth it wrote is there to test against.
  object.renderOrder = FILL_RENDER_ORDER
  return {
    object,
    setMap(map: Texture): void {
      setUniform(material, 'map', map)
    },
    setLook(mode: BlendMode, strength: number): void {
      setUniform(material, 'mode', MODE_INDEX[mode])
      setUniform(material, 'strength', strength)
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
