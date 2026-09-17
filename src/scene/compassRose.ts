import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, Texture } from 'three'

import { buildCompassRoseSvg } from './compassRoseSvg'
import { svgToTexture } from './svgTexture'

import type { CompassRoseSvgOptions } from './compassRoseSvg'

/** Options for the compass-rose scene object. */
export interface CompassRoseOptions extends CompassRoseSvgOptions {
  /** Side length of the rose quad in world units. */
  size: number
  /** Overall opacity `[0, 1]` (default 1). */
  opacity?: number
  /** World position `[x, y, z]` (place it on a sea, at the rhumb-network centre). */
  position: [number, number, number]
  /**
   * Rasterise an SVG string into a texture. Injected for testability; defaults to a {@link TextureLoader}
   * over an `image/svg+xml` data URL.
   * @param svg - the SVG markup
   * @returns the texture
   */
  loadTexture?: (svg: string) => Texture
}

/** A renderable compass rose plus its teardown. */
export interface CompassRose {
  /** The renderable mesh to add to the scene. */
  readonly object: Mesh<PlaneGeometry, MeshBasicMaterial>
  /** Free the GPU resources (geometry + material + texture). */
  dispose(): void
}

/**
 * Build a {@link CompassRose} scene object: the procedural rose (see {@link buildCompassRoseSvg})
 * rasterised onto a flat quad in the XZ plane (north = −Z, matching the relief), unlit and transparent so
 * it sits on the parchment sea.
 * @param options - colours, labels, size, opacity, world position, and an optional texture rasteriser (mock in tests)
 * @returns the compass-rose handle
 */
export function createCompassRose(options: CompassRoseOptions): CompassRose {
  const svg = buildCompassRoseSvg({ colors: options.colors, labels: options.labels })
  const load = options.loadTexture ?? svgToTexture
  const texture = load(svg)
  const geometry = new PlaneGeometry(options.size, options.size)
  geometry.rotateX(-Math.PI / 2) // lie flat in XZ, texture top → −Z (north)
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: options.opacity ?? 1,
    depthWrite: false,
    side: DoubleSide,
  })
  const object = new Mesh(geometry, material)
  object.position.set(options.position[0], options.position[1], options.position[2])
  return {
    object,
    dispose(): void {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
