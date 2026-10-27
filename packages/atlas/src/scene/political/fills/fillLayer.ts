/**
 * The polities' colour laid on the relief as geometry, cut from the same outlines as the border lines.
 *
 * Until 2026-10-16 an authored year's colour went through a 1.9 km grid baked into the terrain texture,
 * and at close zoom it missed the border line by a cell. This layer draws the triangles of
 * `core/pipeline/fillTriangles` instead: each lies in one plane of the relief, so it is lifted onto the
 * terrain plane by plane — never bilinearly, which would float it over a valley or sink it under a ridge.
 *
 * The colour is composited onto the baked terrain *in the shader*: the fragment reads the texture under it
 * and blends the polity's tint over it with the bake's own four formulas (`BLEND_GLSL` in `../tintOnRelief`, the
 * bake's `blendChannel` rewritten in GLSL, which cannot import it), in sRGB as the bake does.
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

import { FILL_POLYGON_OFFSET, MODE_INDEX, setUniform } from '../tintOnRelief'

import { fillBuffers } from './fillBuffers'
import { FILL_FRAGMENT_SHADER, fillVertexShader, tintAttribute } from './fillShader'

import type { TintLook } from '../tintOnRelief'
import type { FillGeometry } from './fillBuffers'
import type { BlendMode } from '@europe-historical-atlas/core/pipeline/terrainOptions'
import type { Texture } from 'three'

/**
 * Draw order of the fills: after the relief (0), whose depth they test against, and before every line —
 * the borders' order starts at `BORDER_RENDER_ORDER`.
 */
export const FILL_RENDER_ORDER = 1

/** What the fill layer is built from: its geometry, and the look it is blended with. */
export interface FillLayerOptions extends FillGeometry, TintLook {}

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

/**
 * Build the fill layer.
 * @param options - the fills, their tints, the surface and the look
 * @returns the layer
 */
export function createFillLayer(options: FillLayerOptions): FillLayer {
  // The geometry: the positions, and one tint attribute per level of homage.
  const { positions, tints } = fillBuffers(options)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  tints.forEach((bytes, level) => {
    geometry.setAttribute(tintAttribute(level), new Uint8BufferAttribute(bytes, 3, true))
  })
  // The material blends the tint over the baked terrain, with the bake's own mode and strength.
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
    fragmentShader: FILL_FRAGMENT_SHADER,
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
  // The handle: every setter only writes a uniform, so nothing is rebuilt.
  return {
    object,
    setMap(map: Texture): void {
      setUniform(material, 'map', map, 'fill layer')
    },
    setLook(mode: BlendMode, strength: number): void {
      setUniform(material, 'mode', MODE_INDEX[mode], 'fill layer')
      setUniform(material, 'strength', strength, 'fill layer')
    },
    setDetail(detail: number): void {
      setUniform(material, 'detail', detail, 'fill layer')
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
    },
  }
}
