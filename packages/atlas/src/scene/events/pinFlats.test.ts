import { Matrix4, Quaternion, ShaderLib, Texture, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { DEPTH_BIAS_UNIFORM } from '../depthBias'
import { compileHook } from '../testing/compileHook'

import { FLAT_HALO_SPAN, ICON_DEPTH_PULL } from './icons/settings'
import { EVENT_RENDER_ORDER, HALO_RENDER_ORDER } from './markers'
import { createPinFlats } from './pinFlats'

import type { InstancedMesh, Material, MeshBasicMaterial, Object3D } from 'three'

/**
 * The drawings' instanced mesh — first in the group they share with their halos.
 * @param object - the drawings' group
 * @returns the mesh
 */
function squares(object: Object3D): InstancedMesh {
  return object.children[0]?.children[0]?.children[0] as InstancedMesh
}

/**
 * The halos' instanced mesh, behind the drawings in their group.
 * @param object - the drawings' group
 * @returns the mesh
 */
function halos(object: Object3D): InstancedMesh {
  return object.children[0]?.children[1]?.children[0] as InstancedMesh
}

/**
 * How far a material pulls toward the camera once compiled.
 * @param material - the material
 * @returns the pull's uniform
 */
function pulled(material: Material | Material[]): unknown {
  return compileHook(material as Material, ShaderLib.basic.vertexShader).uniforms[
    DEPTH_BIAS_UNIFORM
  ]
}

/**
 * Where a square stands.
 * @param mesh - the squares
 * @param index - which one
 * @returns its position
 */
function at(mesh: InstancedMesh, index: number): Vector3 {
  const matrix = new Matrix4()
  mesh.getMatrixAt(index, matrix)
  return new Vector3().setFromMatrixPosition(matrix)
}

describe('createPinFlats', () => {
  describe('happy path', () => {
    it('stands each drawing at its pin’s middle', () => {
      const flats = createPinFlats([[1, 0.2, 3]], 0.06, () => new Texture())
      flats.pose(new Quaternion(), 0.05)
      const [x, y, z] = at(squares(flats.object), 0).toArray()
      expect([x, z]).toEqual([1, 3])
      expect(y).toBeCloseTo(0.2 + 0.03)
    })
  })

  describe('variants', () => {
    it('fades the drawings and their halos', () => {
      const flats = createPinFlats([[0, 0, 0]], 0.06, () => new Texture())
      flats.setOpacity(0.25)
      expect([
        (squares(flats.object).material as MeshBasicMaterial).opacity,
        (halos(flats.object).material as MeshBasicMaterial).opacity,
      ]).toEqual([0.25, 0.25])
    })

    // ATLAS-306: the icons' halo behind the pin's drawing too.
    it('sets a halo behind each drawing, where it stands, its span times as wide', () => {
      const flats = createPinFlats([[1, 0.2, 3]], 0.06, () => new Texture())
      flats.pose(new Quaternion(), 0.05)
      const matrix = new Matrix4()
      halos(flats.object).getMatrixAt(0, matrix)
      const scale = new Vector3().setFromMatrixScale(matrix)
      expect(at(halos(flats.object), 0).toArray()).toEqual(at(squares(flats.object), 0).toArray())
      expect(scale.x).toBeCloseTo(0.05 * FLAT_HALO_SPAN)
    })
  })

  // L3: N/A — nothing is refused: the places come already on the map
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('keeps each drawing at its pin’s middle when the relief is exaggerated', () => {
      const flats = createPinFlats([[0, 0.2, 0]], 0.06, () => new Texture())
      flats.standAt(3)
      expect(at(squares(flats.object), 0).y).toBeCloseTo(0.6 + 0.03)
    })

    it('draws the halos just before the drawings, pulled toward the camera with them', () => {
      const flats = createPinFlats([[0, 0, 0]], 0.06, () => new Texture())
      const [halo, drawing] = [halos(flats.object), squares(flats.object)]
      flats.pose(new Quaternion(), 0.05)
      expect([halo.parent?.renderOrder, drawing.parent?.renderOrder]).toEqual([
        HALO_RENDER_ORDER,
        EVENT_RENDER_ORDER,
      ])
      expect(pulled(halo.material)).toEqual(pulled(drawing.material))
      expect(pulled(halo.material)).toEqual({ value: 0.05 * ICON_DEPTH_PULL })
    })

    it('frees the halos’ squares, material and texture on dispose', () => {
      const flats = createPinFlats([[0, 0, 0]], 0.06, () => new Texture())
      const halo = halos(flats.object)
      const material = halo.material as MeshBasicMaterial
      const { map } = material
      if (map === null) throw new Error('the halo has no texture')
      const spies = [
        vi.spyOn(halo, 'dispose'),
        vi.spyOn(material, 'dispose'),
        vi.spyOn(map, 'dispose'),
      ]
      flats.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })

    it('frees the squares, the material and its texture on dispose', () => {
      const texture = new Texture()
      const flats = createPinFlats([[0, 0, 0]], 0.06, () => texture)
      const material = squares(flats.object).material as MeshBasicMaterial
      const spies = [vi.spyOn(texture, 'dispose'), vi.spyOn(material, 'dispose')]
      flats.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
