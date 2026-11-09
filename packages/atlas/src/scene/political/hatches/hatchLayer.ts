/**
 * The hatches as one renderable (ATLAS-399): every piece of common ground, striped in its polities' colours, blended over
 * the baked terrain as the fills are.
 *
 * **Laid over the fills and the tribes**, so neither shows through it: two states no longer hide one another, a tribe's
 * colour no longer mixes into a state's. Drawn in the transparent pass after the tribes, opaque in what it writes, and
 * pulled forward in depth past the fills it covers. Before every line, which it never hides.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
  Uint32BufferAttribute,
  Uint8BufferAttribute,
} from 'three'

import { FILL_POLYGON_OFFSET, MODE_INDEX, setUniform } from '../tintOnRelief'
import { TRIBE_RENDER_ORDER } from '../tribes/tribeLayer'

import { HATCH_FRAGMENT_SHADER, HATCH_VERTEX_SHADER, hatchColourAttribute } from './hatchShader'
import { createHatchTextures } from './hatchTextures'

import type { TintLook } from '../tintOnRelief'
import type { HatchArrays } from '@europe-historical-atlas/core/pipeline/hatchBuffers'
import type { BlendMode } from '@europe-historical-atlas/core/pipeline/terrainOptions'
import type { Texture } from 'three'

/** Draw order of the hatches: after the tribes, whose colour they cover, and before every line (`0` and up). */
export const HATCH_RENDER_ORDER = TRIBE_RENDER_ORDER + 0.5

/**
 * How far the hatches are pulled toward the camera: past the fills, which they lie on, by as much again — the fills'
 * own pull is what they win the relief with.
 */
export const HATCH_POLYGON_OFFSET = {
  factor: FILL_POLYGON_OFFSET.factor,
  units: 2 * FILL_POLYGON_OFFSET.units,
} as const

/** What the hatch layer is built from. */
export interface HatchLayerOptions extends TintLook {
  /** The hatches laid on the relief. */
  arrays: HatchArrays
  /** World-space width of the map plane on X. */
  worldWidth: number
  /** World-space depth of the map plane on Z. */
  worldDepth: number
  /** One stripe's width in world units (`hatchStripeWorld`). */
  stripeWorld: number
}

/** The hatches as one renderable, and what can change on it without a rebuild. */
export interface HatchLayer {
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
   * @param mode - how the colour blends over the terrain
   * @param strength - how much of the blended colour is kept
   * @returns nothing
   */
  setLook: (mode: BlendMode, strength: number) => void
  /**
   * Reveal a contested vassal's band as the zoom reveals the vassals, which needs no rebuild.
   * @param detail - the display level, continuous — the fills'
   * @returns nothing
   */
  setDetail: (detail: number) => void
  /**
   * Free the geometry, the material and the stripe images; the terrain is the caller's. Remove the object first.
   * @returns nothing
   */
  dispose: () => void
}

/**
 * The hatches' geometry: positions, triangles, each piece's colours and their count, and a contested vassal's band.
 * @param arrays - the hatches laid on the relief
 * @returns the geometry
 */
function hatchGeometry(arrays: HatchArrays): BufferGeometry {
  const { positions, colours, counts, bandDepth, bandKm, realmKm, indices } = arrays
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(new Uint32BufferAttribute(indices, 1))
  colours.forEach((bytes, rank) => {
    geometry.setAttribute(hatchColourAttribute(rank), new Uint8BufferAttribute(bytes, 3, true))
  })
  geometry.setAttribute('count', new Uint8BufferAttribute(counts, 1, false))
  // A contested vassal's band (ATLAS-398): its depth of homage, read as a number, and each vertex's distance to the edge.
  geometry.setAttribute('bandDepth', new Uint8BufferAttribute(bandDepth, 1, false))
  geometry.setAttribute('bandKm', new Float32BufferAttribute(bandKm, 1))
  geometry.setAttribute('realmKm', new Float32BufferAttribute(realmKm, 1))
  return geometry
}

/**
 * Build the hatch layer.
 * @param options - the hatches' arrays, the look, the plane and the stripes' width
 * @returns the layer
 */
export function createHatchLayer(options: HatchLayerOptions): HatchLayer {
  const geometry = hatchGeometry(options.arrays)
  const stripes = createHatchTextures()
  const material = new ShaderMaterial({
    uniforms: {
      map: { value: options.map },
      strength: { value: options.strength },
      mode: { value: MODE_INDEX[options.mode] },
      plane: { value: [options.worldWidth, options.worldDepth] },
      stripeWorld: { value: options.stripeWorld },
      // The deepest level until the zoom says otherwise, as the fills open.
      detail: { value: Number.MAX_SAFE_INTEGER },
      stripes2: { value: stripes.two },
      stripes3: { value: stripes.three },
      stripes4: { value: stripes.four },
    },
    vertexShader: HATCH_VERTEX_SHADER,
    fragmentShader: HATCH_FRAGMENT_SHADER,
    // In the transparent pass, after the tribes; it writes an opaque colour all the same.
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: HATCH_POLYGON_OFFSET.factor,
    polygonOffsetUnits: HATCH_POLYGON_OFFSET.units,
  })
  const object = new Mesh(geometry, material)
  object.renderOrder = HATCH_RENDER_ORDER
  return {
    object,
    setMap(map: Texture): void {
      setUniform(material, 'map', map, 'hatch layer')
    },
    setLook(mode: BlendMode, strength: number): void {
      setUniform(material, 'mode', MODE_INDEX[mode], 'hatch layer')
      setUniform(material, 'strength', strength, 'hatch layer')
    },
    setDetail(detail: number): void {
      setUniform(material, 'detail', detail, 'hatch layer')
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      stripes.dispose()
    },
  }
}
