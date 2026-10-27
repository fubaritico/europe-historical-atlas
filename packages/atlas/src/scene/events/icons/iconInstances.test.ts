import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  ShaderLib,
  Vector3,
} from 'three'
import { describe, expect, it, vi } from 'vitest'

import { DEPTH_BIAS_UNIFORM } from '../../depthBias'
import { compileHook } from '../../testing/compileHook'
import { EVENT_RENDER_ORDER } from '../markers'

import { createIconInstances } from './iconInstances'

import type { IconPose } from './iconInstances'
import type { Material } from 'three'

/**
 * A pose standing at a point, turned nowhere.
 * @param x - where on X
 * @returns the pose
 */
function at(x: number): IconPose {
  return { position: new Vector3(x, 0, 0), quaternion: new Quaternion() }
}

/**
 * The instanced meshes of a set of instances.
 * @param object - the instances' group
 * @returns them
 */
function meshes(object: { children: unknown[] }): InstancedMesh[] {
  return object.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh)
}

/**
 * A piece of a stand-in model: still, or following a motion by name.
 * @param motion - the motion's name, or `null` to stand still
 * @returns the piece
 */
function piece(motion: string | null) {
  return {
    colour: 'wood' as const,
    geometry: new BoxGeometry(0.1, 0.1, 0.1),
    material: new MeshStandardMaterial(),
    motion,
  }
}

/**
 * Where one piece's first instance stands, and how it is turned.
 * @param object - the instances' group
 * @param index - the piece's rank among the meshes
 * @returns its position and orientation
 */
function poseOf(
  object: { children: unknown[] },
  index: number
): { position: Vector3; quaternion: Quaternion } {
  const matrix = new Matrix4()
  meshes(object)[index]?.getMatrixAt(0, matrix)
  const pose = { position: new Vector3(), quaternion: new Quaternion() }
  matrix.decompose(pose.position, pose.quaternion, new Vector3())
  return pose
}

describe('createIconInstances', () => {
  describe('happy path', () => {
    it('builds one instanced mesh per piece of each kind present, sized to its icons', () => {
      const instances = createIconInstances(['swords', 'tower', 'swords'], 0.5, 0)
      const counts = meshes(instances.object).map((mesh) => [mesh.name, mesh.count])
      // The swords have three colours; the siege's trebuchet two that stand still and five that move.
      expect(counts).toEqual([
        ['swords steel', 2],
        ['swords brass', 2],
        ['swords leather', 2],
        ['tower wood', 1],
        ['tower steel', 1],
        ['tower wood arm', 1],
        ['tower stone ropes', 1],
        ['tower stone sling', 1],
        ['tower leather sling', 1],
        ['tower rock stone', 1],
      ])
    })

    it('writes each icon’s pose into every piece of its kind, at its slot, scaled to the height', () => {
      const instances = createIconInstances(['swords', 'tower', 'swords'], 0.5, 0)
      instances.poseAll([at(1), at(5), at(3)], 0)
      const read = (name: string, slot: number): Vector3 => {
        const mesh = meshes(instances.object).find((each) => each.name === name)
        const matrix = new Matrix4()
        mesh?.getMatrixAt(slot, matrix)
        return new Vector3().setFromMatrixPosition(matrix)
      }
      expect(read('swords leather', 1).x).toBe(3)
      expect(read('tower wood', 0).x).toBe(5)
      const scale = new Vector3()
      const matrix = new Matrix4()
      meshes(instances.object)[0]?.getMatrixAt(0, matrix)
      matrix.decompose(new Vector3(), new Quaternion(), scale)
      expect(scale.toArray()).toEqual([0.5, 0.5, 0.5])
    })
  })

  describe('variants', () => {
    it('places a moving piece by its model’s motion at the moment, composed with the icon’s pose, and fades it', () => {
      const fadeAt = vi.fn()
      const instances = createIconInstances(['crown'], 2, 0, () => ({
        pieces: [piece(null), piece('m')],
        placeAt: (_motion, seconds, into) => into.makeTranslation(seconds, 0, 0),
        fadeAt,
        setOpacity: vi.fn(),
        dispose: vi.fn(),
      }))
      instances.poseAll([at(5)], 3)
      // And what fades is faded as it is at the same moment.
      expect(fadeAt).toHaveBeenCalledWith(3)
      expect(poseOf(instances.object, 0).position.x).toBe(5)
      // The placement's 3 along X, scaled by the icon's 2, from where the icon stands.
      expect(poseOf(instances.object, 1).position.x).toBe(5 + 6)
    })

    it('moves the siege’s arm with the moment, and leaves its frame', () => {
      const instances = createIconInstances(['tower'], 1, 0)
      const turnOf = (name: string): number => {
        const index = meshes(instances.object).findIndex((each) => each.name === name)
        return poseOf(instances.object, index).quaternion.angleTo(new Quaternion())
      }
      // At rest, nothing is turned; at the end of the throw, the arm is and the frame is not.
      instances.poseAll([at(0)], 0)
      expect(turnOf('tower wood arm')).toBeCloseTo(0)
      instances.poseAll([at(0)], 3.1)
      expect(turnOf('tower wood arm')).toBeGreaterThan(1)
      expect(turnOf('tower wood')).toBeCloseTo(0)
    })

    it('hands every piece’s poses to the GPU in the same step', () => {
      const instances = createIconInstances(['swords', 'crown'], 1, 0)
      const before = meshes(instances.object).map((mesh) => mesh.instanceMatrix.version)
      instances.poseAll([at(0), at(1)], 0)
      const after = meshes(instances.object).map((mesh) => mesh.instanceMatrix.version)
      after.forEach((version, i) => {
        expect(version).toBeGreaterThan(before[i] ?? Infinity)
      })
    })

    it('fades every kind’s pieces together', () => {
      const instances = createIconInstances(['swords', 'tower'], 1, 0)
      instances.setOpacity(0.3)
      // Every piece but the trebuchet's stone, which fades on its own — gone at rest.
      for (const mesh of meshes(instances.object).filter(({ name }) => !name.endsWith(' stone')))
        expect((mesh.material as Material).opacity).toBe(0.3)
    })

    it('pulls every piece toward the camera by the pull given, so the relief does not cut it', () => {
      const instances = createIconInstances(['swords', 'tower'], 1, 0.07)
      for (const mesh of meshes(instances.object)) {
        const shader = compileHook(mesh.material as Material, ShaderLib.standard.vertexShader)
        expect(shader.uniforms[DEPTH_BIAS_UNIFORM]).toEqual({ value: 0.07 })
      }
    })

    it('leaves the pieces where they are with no pull', () => {
      const instances = createIconInstances(['swords'], 1, 0)
      for (const mesh of meshes(instances.object))
        expect(
          compileHook(mesh.material as Material, ShaderLib.standard.vertexShader).vertexShader
        ).toBe(ShaderLib.standard.vertexShader)
    })

    it('draws the instances after the borders, through their group', () => {
      expect(createIconInstances(['tower'], 1, 0).object.renderOrder).toBe(EVENT_RENDER_ORDER)
    })
  })

  describe('managed errors', () => {
    it('refuses poses that are not one per icon', () => {
      const instances = createIconInstances(['swords', 'tower'], 1, 0)
      expect(() => {
        instances.poseAll([at(0)], 0)
      }).toThrow(/1 poses for 2 icons/)
    })
  })

  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('builds nothing for no icons', () => {
      expect(meshes(createIconInstances([], 1, 0).object)).toHaveLength(0)
    })

    it('frees each instance buffer, and each model’s geometry and material once, on dispose', () => {
      const instances = createIconInstances(['crown', 'crown'], 1, 0)
      const spies = meshes(instances.object).flatMap((mesh) => [
        vi.spyOn(mesh, 'dispose'),
        vi.spyOn(mesh.geometry, 'dispose'),
        vi.spyOn(mesh.material as Material, 'dispose'),
      ])
      instances.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
