/**
 * The tribes' colour laid on the relief, full at the heart of their ground and vanishing toward its limit —
 * no fill edge and no stroke (ATLAS-258, `core/editor/tribeFeather`).
 *
 * **Laid on the relief as the fills are**: the patches are cut by the fills' cutting (`tribePatches`), so
 * each triangle lies in one plane of the relief and its vertices are lifted onto it with `planeHeight`.
 *
 * **Blended as the fills are, then faded**: the fragment reads the baked terrain under it and blends the
 * tribe's colour over it with the bake's formula and strength (`BLEND_GLSL`, shared with `fillLayer`) — then
 * the ramp's opacity becomes the fragment's alpha, so the colour mixes into what is already drawn. Over bare
 * terrain that is exactly the Cartographer's `overlay` composited at that alpha; over a neighbour's fill, an
 * outset spill would mix toward the tribe's colour over the terrain rather than over that fill — but the spill
 * is cut there (below), so the two applications agree.
 *
 * **Cut beyond the outline over anyone else's ground and over the sea** (`tribeOpacity`, the dev's *« si ça
 * déborde, c'est pas bon »*): each vertex carries its signed distance to the other polities' ground and its
 * land, and the fragment drops the colour where it lies beyond its own outline and either is claimed
 * (`step` on the interpolated distance, so the cut falls on the neighbour's outline, never a cell inside it)
 * or wet (`step(0.5, …)` on the interpolated land, so the cut falls half a cell either side of the mask's
 * coast at worst — under the coastline's own stroke).
 *
 * **The ramp runs per fragment, on the distance interpolated between vertices**: the distance is close to
 * linear between two vertices a DEM cell apart, so interpolating it is near exact, and easing it per fragment
 * keeps the fade smooth however few vertices span it. Mode and width are uniforms (`setFeather`): no rebuild.
 * The ease is GLSL's own `smoothstep(0, 1, t)` — the same curve as `featherOpacity` — and the mode's meaning
 * comes from core as a `shift` (`featherShiftKm`), never re-decided here.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
  Uint8BufferAttribute,
} from 'three'

import {
  BEYOND_OUTLINE_KM,
  featherShiftKm,
} from '@europe-historical-atlas/core/editor/tribeFeather'
import { planeHeight } from '@europe-historical-atlas/core/pipeline/gridDrape'

import { BLEND_GLSL, FILL_POLYGON_OFFSET, MODE_INDEX } from './fillLayer'

import type { FillLayerOptions } from './fillLayer'
import type { TribePatch } from '../tribePatches'
import type { TribeFeather } from '@europe-historical-atlas/core/editor/tribeFeather'
import type { BlendMode } from '@europe-historical-atlas/core/pipeline/terrainOptions'
import type { Texture } from 'three'

/**
 * Draw order of the tribes: **before every line** — the coastline, the rhumbs and the rivers at 0, the borders
 * from `BORDER_RENDER_ORDER` — and after the paper sheet (`PAPER_SHEET_RENDER_ORDER`, far below).
 *
 * **Below zero because the mesh is transparent** (QUAL-001, 2026-10-18): three sorts the transparent pass by
 * `renderOrder` before depth (`reversePainterSortStable`, `three/src/renderers/webgl/WebGLRenderLists.js`),
 * and the line layers are transparent too. At the fills' `FILL_RENDER_ORDER + 1` the tribes sorted after the
 * coast and the rivers and painted over them. The fills, opaque, are drawn in the pass before any of these,
 * so an outset fade still mixes into their colour.
 */
export const TRIBE_RENDER_ORDER = -1

/**
 * The narrowest width the shader divides by, in km — a guard against a division by zero, far below a DEM
 * cell, so a width of zero draws the hard edge `featherOpacity` gives it.
 */
const MIN_SHADER_WIDTH_KM = 1e-3

/** What the tribe layer is built from. */
export interface TribeLayerOptions extends Pick<
  FillLayerOptions,
  'grid' | 'nodeY' | 'worldWidth' | 'worldDepth' | 'map' | 'mode' | 'strength'
> {
  /** Each tribe's triangles, distances and colour — `tribePatches`' output. */
  patches: readonly TribePatch[]
  /** Where the fade sits and how wide it is. */
  feather: TribeFeather
}

/** The tribes as one renderable, and what can change on it without a rebuild. */
export interface TribeLayer {
  /** The mesh to add to the scene; scale it with the relief's exaggeration. */
  readonly object: Mesh<BufferGeometry, ShaderMaterial>
  /**
   * Composite onto a freshly baked terrain.
   * @param map - the new texture
   * @returns nothing
   */
  setMap: (map: Texture) => void
  /**
   * Retune the blend, the fills' own — which needs no rebuild.
   * @param mode - how the colour blends over the terrain
   * @param strength - how much of the blended colour is kept
   * @returns nothing
   */
  setLook: (mode: BlendMode, strength: number) => void
  /**
   * Move or widen the fade, which needs no rebuild.
   * @param feather - inset or outset, and the width in km
   * @returns nothing
   */
  setFeather: (feather: TribeFeather) => void
  /**
   * Free the geometry and the material; the texture is the caller's. Remove the object from the scene first.
   * @returns nothing
   */
  dispose: () => void
}

/** Every tribe's vertices, ready to upload: one array per attribute. */
export interface TribeBuffers {
  /** Three floats per vertex, in world space. */
  positions: Float32Array
  /** Three bytes per vertex: the tribe's colour. */
  tints: Uint8Array
  /** The signed distance to the tribe's outline, km. */
  distances: Float32Array
  /** The signed distance to every other polity's ground, km. */
  claimed: Float32Array
  /** `1` dry, `0` wet. */
  land: Float32Array
}

/**
 * How many vertices a patch has, checked against what it carries per vertex.
 * @param patch - the patch
 * @returns its vertex count
 * @throws when a per-vertex array is of another length — built together, so a mismatch is a defect, and a
 *   guessed distance would fade a tribe from a line nobody drew
 */
function vertexCount(patch: TribePatch): number {
  const count = Math.floor(patch.triangles.length / 2)
  for (const per of [patch.distances, patch.claimed, patch.land])
    if (per.length !== count)
      throw new Error(
        `tribe layer: ${String(count)} vertices but ${String(per.length)} distances or land values`
      )
  return count
}

/**
 * Write one patch's vertices, each laid on the relief plane under it.
 * @param patch - the patch
 * @param out - the buffers, written in place
 * @param at - the first vertex to write
 * @param surface - the surface the vertices are laid on
 * @returns the vertex after the last one written
 */
function writePatch(
  patch: TribePatch,
  out: TribeBuffers,
  at: number,
  surface: Pick<TribeLayerOptions, 'grid' | 'nodeY' | 'worldWidth' | 'worldDepth'>
): number {
  const { triangles, tint } = patch
  let vertex = at
  // The `?? 0` read indices the loop keeps in range (`noUncheckedIndexedAccess`); none stands in for a value
  // that failed to arrive — `vertexCount` checked every length.
  for (let k = 0; k < patch.distances.length; k++) {
    const u = triangles[2 * k] ?? 0
    const v = triangles[2 * k + 1] ?? 0
    out.positions.set(
      [
        (u - 0.5) * surface.worldWidth,
        planeHeight(u, v, surface.grid, surface.nodeY),
        (v - 0.5) * surface.worldDepth,
      ],
      3 * vertex
    )
    out.tints.set([tint.r, tint.g, tint.b], 3 * vertex)
    out.distances[vertex] = patch.distances[k] ?? 0
    out.claimed[vertex] = patch.claimed[k] ?? 0
    out.land[vertex] = patch.land[k] ?? 0
    vertex += 1
  }
  return vertex
}

/**
 * The positions, colours, distances and land of every tribe's vertices, in world space.
 * @param options - the patches and the surface they are laid on
 * @returns the buffers, one entry per vertex in each
 * @throws when a patch carries a different number of distances or land values than vertices
 */
export function tribeBuffers(
  options: Pick<TribeLayerOptions, 'patches' | 'grid' | 'nodeY' | 'worldWidth' | 'worldDepth'>
): TribeBuffers {
  const vertices = options.patches.reduce((sum, patch) => sum + vertexCount(patch), 0)
  const out: TribeBuffers = {
    positions: new Float32Array(vertices * 3),
    tints: new Uint8Array(vertices * 3),
    distances: new Float32Array(vertices),
    claimed: new Float32Array(vertices),
    land: new Float32Array(vertices),
  }
  let at = 0
  for (const patch of options.patches) at = writePatch(patch, out, at, options)
  return out
}

/** The vertex stage: the relief's uv from the world position, the colour and the distance passed on. */
const VERTEX_SHADER = /* glsl */ `
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
  const { width, shift } = featherUniforms(feather)
  const t = Math.min(1, Math.max(0, (shift - at.distance) / width))
  const ramp = t * t * (3 - 2 * t)
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

/**
 * Write a uniform the material was built with.
 * @param material - the tribe material
 * @param name - the uniform, one of those `createTribeLayer` declares
 * @param value - its new value
 * @returns nothing
 * @throws when the uniform is missing — a renamed uniform would otherwise leave the fade frozen silently
 */
function setUniform(material: ShaderMaterial, name: string, value: unknown): void {
  const uniform = material.uniforms[name]
  if (!uniform) throw new Error(`tribe layer: no uniform "${name}"`)
  uniform.value = value
}

/**
 * Build the tribe layer.
 * @param options - the patches, the surface, the look and the fade
 * @returns the layer
 */
export function createTribeLayer(options: TribeLayerOptions): TribeLayer {
  const { positions, tints, distances, claimed, land } = tribeBuffers(options)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('tint', new Uint8BufferAttribute(tints, 3, true))
  // Not `distance`: that is a GLSL built-in function, which an attribute of the name would hide.
  geometry.setAttribute('edgeDistance', new Float32BufferAttribute(distances, 1))
  geometry.setAttribute('claimedDistance', new Float32BufferAttribute(claimed, 1))
  geometry.setAttribute('land', new Float32BufferAttribute(land, 1))
  const feather = featherUniforms(options.feather)
  const material = new ShaderMaterial({
    uniforms: {
      map: { value: options.map },
      strength: { value: options.strength },
      mode: { value: MODE_INDEX[options.mode] },
      plane: { value: [options.worldWidth, options.worldDepth] },
      featherWidth: { value: feather.width },
      featherShift: { value: feather.shift },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: TRIBE_FRAGMENT_SHADER,
    // The ramp's opacity is the alpha: the colour mixes into the terrain and the fills already drawn.
    transparent: true,
    // Coplanar with the relief, pulled forward in depth exactly as the fills are.
    polygonOffset: true,
    polygonOffsetFactor: FILL_POLYGON_OFFSET.factor,
    polygonOffsetUnits: FILL_POLYGON_OFFSET.units,
    depthWrite: false,
  })
  const object = new Mesh(geometry, material)
  object.renderOrder = TRIBE_RENDER_ORDER
  return {
    object,
    setMap(map: Texture): void {
      setUniform(material, 'map', map)
    },
    setLook(mode: BlendMode, strength: number): void {
      setUniform(material, 'mode', MODE_INDEX[mode])
      setUniform(material, 'strength', strength)
    },
    setFeather(next: TribeFeather): void {
      const { width, shift } = featherUniforms(next)
      setUniform(material, 'featherWidth', width)
      setUniform(material, 'featherShift', shift)
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
