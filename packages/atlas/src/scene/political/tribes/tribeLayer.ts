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

import { FILL_POLYGON_OFFSET, MODE_INDEX, setUniform } from '../tintOnRelief'

import { tribeBuffers } from './tribeBuffers'
import { TRIBE_FRAGMENT_SHADER, TRIBE_VERTEX_SHADER, featherUniforms } from './tribeShader'

import type { TintLook } from '../tintOnRelief'
import type { TribeGeometry } from './tribeBuffers'
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

/** What the tribe layer is built from: its geometry, the look it is blended with, and its fade. */
export interface TribeLayerOptions extends TribeGeometry, TintLook {
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

/**
 * Build the tribe layer.
 * @param options - the patches, the surface, the look and the fade
 * @returns the layer
 */
export function createTribeLayer(options: TribeLayerOptions): TribeLayer {
  // The geometry: positions, the tribe's colour, and what the shader fades and cuts by, per vertex.
  const { positions, tints, distances, claimed, land } = tribeBuffers(options)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('tint', new Uint8BufferAttribute(tints, 3, true))
  // Not `distance`: that is a GLSL built-in function, which an attribute of the name would hide.
  geometry.setAttribute('edgeDistance', new Float32BufferAttribute(distances, 1))
  geometry.setAttribute('claimedDistance', new Float32BufferAttribute(claimed, 1))
  geometry.setAttribute('land', new Float32BufferAttribute(land, 1))
  // The material blends as the fills do, with the feather's width and shift as uniforms.
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
    vertexShader: TRIBE_VERTEX_SHADER,
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
  // The handle: every setter only writes uniforms, so nothing is rebuilt.
  return {
    object,
    setMap(map: Texture): void {
      setUniform(material, 'map', map, 'tribe layer')
    },
    setLook(mode: BlendMode, strength: number): void {
      setUniform(material, 'mode', MODE_INDEX[mode], 'tribe layer')
      setUniform(material, 'strength', strength, 'tribe layer')
    },
    setFeather(next: TribeFeather): void {
      const { width, shift } = featherUniforms(next)
      setUniform(material, 'featherWidth', width, 'tribe layer')
      setUniform(material, 'featherShift', shift, 'tribe layer')
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
