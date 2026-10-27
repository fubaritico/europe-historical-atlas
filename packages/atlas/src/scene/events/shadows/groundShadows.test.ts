import { describe, expect, it, vi } from 'vitest'

import { BORDER_RENDER_ORDER } from '../../political/borders/mapBorderLayer'
import { EVENT_RENDER_ORDER } from '../markers'

import { GROUND_SHADOW_OPTIONS, createGroundShadows } from './groundShadows'

import type { ShadowFootprint } from './shadowFootprint'
import type { BufferGeometry, Mesh, MeshBasicMaterial } from 'three'

const FOOTPRINT: ShadowFootprint = {
  capsules: [
    { from: 0, to: 1, radius: 0.1 },
    { from: 1, to: 1, radius: 0.3 },
  ],
  softness: 0.1,
}

/** A ground rising to the east: its height is x. */
const RISING_EAST = (x: number): number => x

/**
 * The shadows' one mesh.
 * @param object - the shadows' group
 * @returns its mesh
 */
function meshOf(object: { children: unknown[] }): Mesh<BufferGeometry, MeshBasicMaterial> {
  return object.children[0] as Mesh<BufferGeometry, MeshBasicMaterial>
}

/**
 * Every vertex of the shadows, as [x, y, z].
 * @param mesh - the shadows' mesh
 * @returns the vertices
 */
function vertices(mesh: Mesh): [number, number, number][] {
  const position = mesh.geometry.getAttribute('position')
  return Array.from({ length: position.count }, (_, k) => [
    position.getX(k),
    position.getY(k),
    position.getZ(k),
  ])
}

describe('createGroundShadows', () => {
  describe('happy path', () => {
    it('lays every vertex at the ground’s height under it, so the shadow follows a slope', () => {
      const shadows = createGroundShadows([[0, 0, 0]], FOOTPRINT, RISING_EAST)
      for (const [x, y] of vertices(meshOf(shadows.object))) expect(y).toBeCloseTo(x)
    })

    it('casts the shadow to the south-east of the foot', () => {
      const shadows = createGroundShadows([[2, 0, 3]], FOOTPRINT, () => 0)
      const all = vertices(meshOf(shadows.object))
      const mean = (axis: 0 | 2): number => all.reduce((sum, v) => sum + v[axis], 0) / all.length
      expect(mean(0)).toBeGreaterThan(2)
      expect(mean(2)).toBeGreaterThan(3)
    })
  })

  describe('variants', () => {
    it('draws every shadow in one mesh, one grid each', () => {
      const { along, across } = GROUND_SHADOW_OPTIONS.grid
      const one = (along + 1) * (across + 1)
      const shadows = createGroundShadows(
        [
          [0, 0, 0],
          [5, 0, 5],
        ],
        FOOTPRINT,
        () => 0
      )
      expect(shadows.object.children).toHaveLength(1)
      expect(vertices(meshOf(shadows.object))).toHaveLength(2 * one)
    })

    it('draws the shadows translucent, without writing depth, after the borders and before the markers', () => {
      // three sorts the transparent pass by the nearest group's order: set on the mesh alone, it was drawn under the
      // borders.
      const { object } = createGroundShadows([[0, 0, 0]], FOOTPRINT, () => 0)
      const mesh = meshOf(object)
      expect(mesh.material.opacity).toBe(GROUND_SHADOW_OPTIONS.opacity)
      expect(mesh.material.depthWrite).toBe(false)
      expect(object.renderOrder).toBeGreaterThan(BORDER_RENDER_ORDER)
      expect(object.renderOrder).toBeLessThan(EVENT_RENDER_ORDER)
    })
  })

  // L3: N/A — nothing is refused: the feet come already on the map
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('keeps every vertex on the ground when the relief is exaggerated', () => {
      const shadows = createGroundShadows([[1, 0, 0]], FOOTPRINT, RISING_EAST)
      shadows.setReliefScale(3)
      for (const [x, y] of vertices(meshOf(shadows.object))) expect(y).toBeCloseTo(x * 3)
    })

    it('stays where it is when the camera turns', () => {
      const shadows = createGroundShadows([[0, 0, 0]], FOOTPRINT, () => 0)
      const before = vertices(meshOf(shadows.object))
      shadows.faceCamera(
        { position: { x: 1, y: 1, z: 1 }, quaternion: { x: 0.3, y: 0.2, z: 0, w: 0.9 } } as never,
        5
      )
      expect(vertices(meshOf(shadows.object))).toEqual(before)
      expect(shadows.object.quaternion.w).toBe(1)
    })

    it('builds an empty geometry for no markers', () => {
      expect(vertices(meshOf(createGroundShadows([], FOOTPRINT, () => 0).object))).toHaveLength(0)
    })

    it('frees its geometry, material and texture on dispose', () => {
      const shadows = createGroundShadows([[0, 0, 0]], FOOTPRINT, () => 0)
      const mesh = meshOf(shadows.object)
      const spies = [mesh.geometry, mesh.material, mesh.material.map].map((resource) =>
        vi.spyOn(resource as { dispose: () => void }, 'dispose')
      )
      shadows.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
