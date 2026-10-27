/**
 * The markers' cast shadows (ATLAS-298): each one a small grid laid on the relief — every vertex at the ground's own
 * height, so the shadow follows a slope instead of floating over it or sinking into it — textured with the
 * footprint's image and pulled a hair toward the camera so the surface it lies on never wins the depth test. Fixed in
 * the world, as a shadow is: the sun does not turn with the camera.
 */

import {
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
} from 'three'

import { applyDepthBias } from '../../depthBias'
import { iconCrossFade } from '../icons/crossFade'
import { EVENT_RENDER_ORDER } from '../markers'

import { shadowAlpha, shadowFrame } from './shadowAlpha'
import { SHADOW_OPACITY, SHADOW_SUN, shadowDirection } from './shadowFootprint'

import type { WorldPoint } from '../../relief/drapeProjection'
import type { EventMarkers } from '../markers'
import type { ShadowFrame } from './shadowAlpha'
import type { ShadowFootprint, ShadowSun } from './shadowFootprint'

/**
 * The relief's height at a point of the world, before exaggeration.
 * @param x - west→east, in world units
 * @param z - north→south, in world units
 * @returns the height, in world units
 */
export type GroundAt = (x: number, z: number) => number

/** How the shadows are drawn. */
export interface GroundShadowOptions {
  /** Where the light comes from. */
  sun: ShadowSun
  /** How dark a shadow is at its darkest, 0 to 1. */
  opacity: number
  /** Vertices along the axis and across it, less one: enough for a shadow to follow a slope. */
  grid: { along: number; across: number }
  /** The footprint's image, in pixels along the axis and across it. */
  image: { along: number; across: number }
  /** How far a shadow is pulled toward the camera, in world units, to stay over the surface it lies on. */
  depthPull: number
}

/** The default: a soft shadow from the north-west sun, as dark as every marker's (`SHADOW_OPACITY`). */
export const GROUND_SHADOW_OPTIONS: GroundShadowOptions = {
  sun: SHADOW_SUN,
  opacity: SHADOW_OPACITY,
  grid: { along: 12, across: 4 },
  image: { along: 128, across: 32 },
  depthPull: 0.004,
}

/**
 * The footprint's image as a texture, smoothed between its pixels.
 * @param footprint - the shadow's shape
 * @param frame - the rectangle it covers
 * @param image - its size in pixels
 * @returns the texture
 */
function footprintTexture(
  footprint: ShadowFootprint,
  frame: ShadowFrame,
  image: GroundShadowOptions['image']
): DataTexture {
  const texture = new DataTexture(
    shadowAlpha(footprint, frame, image.along, image.across),
    image.along,
    image.across
  )
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

/** Where one shadow is laid: its foot, the rectangle it covers, and the part of the texture it shows. */
export interface ShadowSpot {
  /** The foot's `x` in the world. */
  x: number
  /** The foot's `z` in the world. */
  z: number
  /** The rectangle it covers, along and across its axis. */
  frame: ShadowFrame
  /** The part of the texture it shows: its corner and its size, in texture fractions. */
  tile: { u: number; v: number; width: number; height: number }
}

/** The whole texture, for shadows that all show one image. */
export const WHOLE_TEXTURE: ShadowSpot['tile'] = { u: 0, v: 0, width: 1, height: 1 }

/**
 * Every shadow's grid in one geometry: each vertex placed along and across the axis from its foot, at the ground's
 * height there — so the shadow follows the relief instead of floating over it or sinking into it.
 * @param spots - where each shadow is laid
 * @param groundAt - the relief's height under any point
 * @param options - the sun and the grid's density
 * @returns the geometry, and each vertex's ground height before exaggeration
 */
export function shadowGrids(
  spots: readonly ShadowSpot[],
  groundAt: GroundAt,
  options: Pick<GroundShadowOptions, 'sun' | 'grid'>
): { geometry: BufferGeometry; grounds: number[] } {
  const { along, across } = options.grid
  const [ax, az] = shadowDirection(options.sun)
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const grounds: number[] = []
  for (const { x: bx, z: bz, frame, tile } of spots) {
    const first = positions.length / 3
    for (let j = 0; j <= across; j++) {
      const t = -frame.tHalf + (j / across) * 2 * frame.tHalf
      for (let i = 0; i <= along; i++) {
        const s = frame.sMin + (i / along) * (frame.sMax - frame.sMin)
        // Along the axis by s, across it by t — the across is the axis turned a quarter.
        const x = bx + ax * s - az * t
        const z = bz + az * s + ax * t
        const y = groundAt(x, z)
        positions.push(x, y, z)
        grounds.push(y)
        uvs.push(tile.u + (i / along) * tile.width, tile.v + (j / across) * tile.height)
      }
    }
    // Two triangles per cell of the grid.
    for (let j = 0; j < across; j++) {
      for (let i = 0; i < along; i++) {
        const a = first + j * (along + 1) + i
        const b = a + along + 1
        indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return { geometry, grounds }
}

/**
 * Lay every vertex of the shadows' grids back on the relief, scaled as it is — as the markers' feet are.
 * @param geometry - the grids, as `shadowGrids` built them
 * @param grounds - each vertex's ground height before exaggeration, as `shadowGrids` gave them
 * @param scale - the relief's `scale.y`
 * @returns nothing
 */
export function restOnRelief(
  geometry: BufferGeometry,
  grounds: readonly number[],
  scale: number
): void {
  const position = geometry.getAttribute('position')
  grounds.forEach((ground, k) => {
    position.setY(k, ground * scale)
  })
  position.needsUpdate = true
}

/**
 * The shadows' mesh: black, its darkness in the texture's alpha, drawn after the borders and before the markers, pulled
 * toward the camera so the surface it lies on never wins the depth test.
 * @param geometry - the shadows' grids
 * @param texture - their image
 * @param options - how dark, how far pulled
 * @returns the group to add to the scene — its order is what three sorts the transparent pass by — and the material
 */
export function shadowMesh(
  geometry: BufferGeometry,
  texture: DataTexture,
  options: Pick<GroundShadowOptions, 'opacity' | 'depthPull'>
): { object: Group; material: MeshBasicMaterial } {
  const material = new MeshBasicMaterial({
    color: '#000000',
    map: texture,
    transparent: true,
    opacity: options.opacity,
    depthWrite: false,
  })
  applyDepthBias(material, 'built-in', options.depthPull)
  const object = new Group()
  object.renderOrder = EVENT_RENDER_ORDER - 2
  object.add(new Mesh(geometry, material))
  return { object, material }
}

/**
 * Lay one shadow per base on the relief, all in one geometry and one draw.
 * @param bases - each marker's foot, on the relief before exaggeration
 * @param footprint - the shadow's shape
 * @param groundAt - the relief's height under any point
 * @param options - how they are drawn
 * @returns the shadows, shaped like the markers' handle
 */
export function createGroundShadows(
  bases: readonly WorldPoint[],
  footprint: ShadowFootprint,
  groundAt: GroundAt,
  options: GroundShadowOptions = GROUND_SHADOW_OPTIONS
): EventMarkers {
  // 1. The footprint's frame and image, and every shadow's grid laid on the relief.
  const frame = shadowFrame(footprint)
  const texture = footprintTexture(footprint, frame, options.image)
  const spots = bases.map(([x, , z]) => ({ x, z, frame, tile: WHOLE_TEXTURE }))
  const { geometry, grounds } = shadowGrids(spots, groundAt, options)

  // 2. Black, its darkness in the image's alpha; drawn before the markers, pulled toward the camera.
  const { object, material } = shadowMesh(geometry, texture, options)

  return {
    object,
    setReliefScale(scale: number): void {
      restOnRelief(geometry, grounds, scale)
    },
    setZoom(zoom: number): void {
      // A shadow fades with the 3D pins that cast it: from afar they are flat drawings, which cast none.
      material.opacity = options.opacity * iconCrossFade(zoom)
    },
    faceCamera(): void {
      // A shadow is fixed in the world: the sun does not turn with the camera.
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
