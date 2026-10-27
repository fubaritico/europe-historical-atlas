import { Euler, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createBillboards } from './billboards'

/**
 * The instanced meshes of a set of squares.
 * @param object - the set's group
 * @param object.children - its children
 * @returns them
 */
function meshes(object: { children: unknown[] }): InstancedMesh[] {
  return object.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh)
}

/**
 * A square's pose, read back from its mesh.
 * @param mesh - the instanced mesh
 * @param slot - the square's rank in it
 * @returns its position, orientation and scale
 */
function poseOf(
  mesh: InstancedMesh | undefined,
  slot: number
): { position: Vector3; quaternion: Quaternion; scale: Vector3 } {
  const matrix = new Matrix4()
  mesh?.getMatrixAt(slot, matrix)
  const pose = { position: new Vector3(), quaternion: new Quaternion(), scale: new Vector3() }
  matrix.decompose(pose.position, pose.quaternion, pose.scale)
  return pose
}

const A = new MeshBasicMaterial()
const B = new MeshBasicMaterial()
const materialOf = (key: 'a' | 'b'): MeshBasicMaterial => (key === 'a' ? A : B)

describe('createBillboards', () => {
  describe('happy path', () => {
    it('builds one instanced mesh per material, sized to its squares', () => {
      const squares = createBillboards(['a', 'b', 'a'], materialOf, 7)
      expect(meshes(squares.object).map((mesh) => [mesh.name, mesh.count])).toEqual([
        ['a', 2],
        ['b', 1],
      ])
    })

    it('places each square at its slot, turned as the camera is, at the size given', () => {
      const squares = createBillboards(['a', 'b', 'a'], materialOf, 7)
      const facing = new Quaternion().setFromEuler(new Euler(-0.7, 0.3, 0))
      squares.poseAll(
        [new Vector3(1, 0, 0), new Vector3(5, 0, 0), new Vector3(3, 0, 0)],
        facing,
        0.2
      )
      const [a] = meshes(squares.object)
      const second = poseOf(a, 1)
      expect(second.position.x).toBeCloseTo(3)
      expect(second.quaternion.angleTo(facing)).toBeCloseTo(0)
      expect(second.scale.x).toBeCloseTo(0.2)
    })
  })

  describe('variants', () => {
    it('hands every pose to the GPU in the same step', () => {
      const squares = createBillboards(['a', 'b'], materialOf, 7)
      const before = meshes(squares.object).map((mesh) => mesh.instanceMatrix.version)
      squares.poseAll([new Vector3(), new Vector3()], new Quaternion(), 1)
      meshes(squares.object).forEach((mesh, i) => {
        expect(mesh.instanceMatrix.version).toBeGreaterThan(before[i] ?? Infinity)
      })
    })

    it('sets its draw order on its group, where three reads it', () => {
      expect(createBillboards(['a'], materialOf, 999).object.renderOrder).toBe(999)
    })
  })

  describe('managed errors', () => {
    it('refuses positions that are not one per square', () => {
      const squares = createBillboards(['a', 'b'], materialOf, 7)
      expect(() => {
        squares.poseAll([new Vector3()], new Quaternion(), 1)
      }).toThrow(/1 positions for 2 billboards/)
    })
  })

  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('builds nothing for no squares', () => {
      expect(meshes(createBillboards([], materialOf, 7).object)).toHaveLength(0)
    })

    it('frees its square and its instance buffers on dispose, never the materials it was handed', () => {
      const squares = createBillboards(['a', 'b'], materialOf, 7)
      const [first] = meshes(squares.object)
      if (first === undefined) throw new Error('no squares')
      const geometry = vi.spyOn(first.geometry, 'dispose')
      const buffers = meshes(squares.object).map((mesh) => vi.spyOn(mesh, 'dispose'))
      const material = vi.spyOn(A, 'dispose')
      squares.dispose()
      expect(geometry).toHaveBeenCalledTimes(1)
      for (const spy of buffers) expect(spy).toHaveBeenCalledTimes(1)
      expect(material).not.toHaveBeenCalled()
    })
  })
})
