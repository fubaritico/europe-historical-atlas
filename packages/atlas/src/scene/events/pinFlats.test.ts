import { Matrix4, Quaternion, Texture, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createPinFlats } from './pinFlats'

import type { InstancedMesh, MeshBasicMaterial } from 'three'

/**
 * The squares' instanced mesh.
 * @param object - the drawings' group
 * @returns the mesh
 */
function squares(object: { children: { children: unknown[] }[] }): InstancedMesh {
  return object.children[0]?.children[0] as InstancedMesh
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
    it('fades the drawings', () => {
      const flats = createPinFlats([[0, 0, 0]], 0.06, () => new Texture())
      flats.setOpacity(0.25)
      expect((squares(flats.object).material as MeshBasicMaterial).opacity).toBe(0.25)
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
