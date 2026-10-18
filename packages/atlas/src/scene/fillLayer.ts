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
 *
 * **Homage as a level of detail** (ATLAS-253): each vertex carries one tint per display level — level `k`
 * the colour of its polity's ancestor at depth `min(k, depth)` — and the vertex stage mixes the two levels
 * around a `detail` uniform the zoom sets. Zooming writes one float; no buffer is rewritten and no triangle
 * recut. The tint is constant over a polity, so mixing per vertex is exact. The level count is compiled
 * into the shader; each level costs one attribute, against WebGL's floor of 16 per vertex.
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
  /**
   * Each display level's tints, level 0 first, each one per polity in the fills' order. The last level
   * decides what is filled: `null` there leaves the polity unfilled at every level. A year with no homage
   * to reveal — a payload year — has one level.
   */
  tintLevels: readonly (readonly (RgbColor | null)[])[]
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
   * Show the levels of homage the zoom calls for, which needs no rebuild.
   * @param detail - the display level, continuous: `1.5` is halfway from level 1 to level 2
   * @returns nothing
   */
  setDetail: (detail: number) => void
  /**
   * Free the geometry and the material; the texture is the caller's and is left alone. Remove the object
   * from the scene first.
   * @returns nothing
   */
  dispose: () => void
}

/** The surface the fills are laid on — what placing one vertex reads. */
type FillSurface = Pick<FillLayerOptions, 'grid' | 'nodeY' | 'worldWidth' | 'worldDepth'>

/**
 * The positions and per-level tints of every filled triangle, in world space.
 *
 * Two passes: the first counts the vertices of the filled polities, so every buffer is allocated once at
 * its exact size; the second resolves each polity's tints and writes its vertices.
 * @param options - the fills, their tints by level and the surface
 * @returns three floats per vertex, and three bytes per vertex for each level
 * @throws when no level is given, or when a filled polity has no tint at a lower level — the levels are
 *   built from one registry, so either is a defect, and a guessed colour would paint a vassal in nobody's
 */
export function fillBuffers(
  options: Pick<
    FillLayerOptions,
    'fills' | 'tintLevels' | 'grid' | 'nodeY' | 'worldWidth' | 'worldDepth'
  >
): { positions: Float32Array; tints: Uint8Array[] } {
  const levels = options.tintLevels
  const deepest = levels[levels.length - 1]
  if (deepest === undefined) throw new Error('fill layer: no tint level given')
  let vertices = 0
  options.fills.forEach((fill, i) => {
    if (deepest[i]) vertices += Math.floor(fill.length / 2)
  })
  const positions = new Float32Array(vertices * 3)
  const tints = levels.map(() => new Uint8Array(vertices * 3))
  let at = 0
  options.fills.forEach((fill, i) => {
    if (!deepest[i]) return
    at = writeFill(fill, polityTints(levels, i), { positions, tints }, at, options)
  })
  return { positions, tints }
}

/**
 * One filled polity's tint at every level.
 * @param levels - each level's tints, one per polity
 * @param polity - the polity's index in the fills
 * @returns its tint at each level, level 0 first
 * @throws when it has no tint at some level — the levels are built from one registry, so a defect
 */
function polityTints(levels: FillLayerOptions['tintLevels'], polity: number): RgbColor[] {
  return levels.map((level, k) => {
    const tint = level[polity]
    if (!tint)
      throw new Error(
        `fill layer: polity ${String(polity)} is filled but has no tint at level ${String(k)}`
      )
    return tint
  })
}

/**
 * Write one polity's vertices: each placed on the relief, and its tint at every level beside it.
 * @param fill - the polity's triangles, flat `u, v`
 * @param own - its tint at every level
 * @param buffers - the buffers, written in place
 * @param buffers.positions - three floats per vertex
 * @param buffers.tints - three bytes per vertex, one array per level
 * @param at - the first vertex to write
 * @param surface - the surface the vertices are laid on
 * @returns the vertex after the last one written
 */
function writeFill(
  fill: Float32Array,
  own: readonly RgbColor[],
  buffers: { positions: Float32Array; tints: readonly Uint8Array[] },
  at: number,
  surface: FillSurface
): number {
  const { positions, tints } = buffers
  let vertex = at
  // `k + 1 < length`: an odd tail would be half a vertex, and is never read as the north-west corner.
  for (let k = 0; k + 1 < fill.length; k += 2) {
    const u = fill[k] ?? 0
    const v = fill[k + 1] ?? 0
    positions[3 * vertex] = (u - 0.5) * surface.worldWidth
    positions[3 * vertex + 1] = planeHeight(u, v, surface.grid, surface.nodeY)
    positions[3 * vertex + 2] = (v - 0.5) * surface.worldDepth
    own.forEach((tint, level) => {
      const bytes = tints[level]
      if (!bytes) return
      bytes[3 * vertex] = tint.r
      bytes[3 * vertex + 1] = tint.g
      bytes[3 * vertex + 2] = tint.b
    })
    vertex += 1
  }
  return vertex
}

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
  const count = Math.max(1, Math.floor(levels))
  const names = Array.from({ length: count }, (_, level) => tintAttribute(level))
  const last = names[names.length - 1] ?? tintAttribute(0)
  return /* glsl */ `
  #define LEVELS ${String(count)}
  ${names.map((name) => `attribute vec3 ${name};`).join('\n  ')}
  uniform vec2 plane;
  uniform float detail;
  varying vec2 vUv;
  varying vec3 vTint;
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
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
}

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
  tints.forEach((bytes, level) => {
    geometry.setAttribute(tintAttribute(level), new Uint8BufferAttribute(bytes, 3, true))
  })
  const material = new ShaderMaterial({
    uniforms: {
      map: { value: options.map },
      strength: { value: options.strength },
      mode: { value: MODE_INDEX[options.mode] },
      plane: { value: [options.worldWidth, options.worldDepth] },
      // The deepest level until the zoom says otherwise: every polity in its own colour, as before levels.
      detail: { value: tints.length - 1 },
    },
    vertexShader: fillVertexShader(tints.length),
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
    setDetail(detail: number): void {
      setUniform(material, 'detail', detail)
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
