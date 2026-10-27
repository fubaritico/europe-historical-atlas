/**
 * The tribes' test fixtures: a small relief whose height is its own coordinates, one patch laid on it, the options, a uniform read back.
 */

import { DataTexture } from 'three'

import { createTribeLayer } from '../tribeLayer'

import type { TribeLayerOptions } from '../tribeLayer'

/** A grid of four cells by four. */
export const GRID = { segX: 4, segY: 4 }

/**
 * A relief whose height at a node is its column plus ten times its row: no two planes agree.
 * @param ix - the node's column
 * @param iy - the node's row
 * @returns its height
 */
export const nodeY = (ix: number, iy: number): number => ix + 10 * iy

/** Two triangles, six vertices, with a distance each: inside, on the outline, outside. */
export const PATCH = {
  tint: { r: 65, g: 88, b: 11 },
  triangles: Float32Array.from([0.1, 0.1, 0.3, 0.1, 0.1, 0.3, 0.6, 0.6, 0.9, 0.6, 0.6, 0.9]),
  distances: Float32Array.from([-20, -10, 0, 5, 10, 30]),
  claimed: Float32Array.from([40, 40, 40, 40, -3, 40]),
  land: Float32Array.from([1, 1, 1, 1, 1, 0]),
}

/**
 * Options over the patch, overridable.
 * @param over - what to change
 * @returns the options
 */
export const options = (over: Partial<TribeLayerOptions> = {}): TribeLayerOptions => ({
  patches: [PATCH],
  grid: GRID,
  nodeY,
  worldWidth: 4,
  worldDepth: 2,
  map: new DataTexture(new Uint8Array(16), 2, 2),
  mode: 'overlay',
  strength: 0.8,
  feather: { mode: 'inset', widthKm: 15 },
  ...over,
})

/**
 * The value of one of the layer's uniforms.
 * @param layer - the layer
 * @param name - the uniform
 * @returns its value
 */
export const uniform = (layer: ReturnType<typeof createTribeLayer>, name: string): unknown =>
  layer.object.material.uniforms[name]?.value
