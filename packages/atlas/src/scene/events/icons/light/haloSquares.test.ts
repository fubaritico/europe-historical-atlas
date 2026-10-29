import { Matrix4, MeshBasicMaterial, Quaternion, ShaderLib, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { DEPTH_BIAS_UNIFORM } from '../../../depthBias'
import { compileHook } from '../../../testing/compileHook'
import { EVENT_RENDER_ORDER, HALO_RENDER_ORDER } from '../../markers'
import { createBillboards } from '../billboards'

import { HALO_NAMES, HALO_STYLES, createHaloSquares, withHalos } from './haloSquares'

import type { Group, InstancedMesh, Material } from 'three'

/**
 * The instanced mesh of a group of squares.
 * @param object - the squares' group
 * @returns the mesh
 */
function meshOf(object: Group): InstancedMesh {
  return object.children[0] as InstancedMesh
}

/**
 * Where a square stands and how wide it is.
 * @param mesh - the squares
 * @param slot - which one
 * @returns its position and scale
 */
function pose(mesh: InstancedMesh, slot: number): { position: Vector3; scale: Vector3 } {
  const matrix = new Matrix4()
  mesh.getMatrixAt(slot, matrix)
  const found = { position: new Vector3(), scale: new Vector3() }
  matrix.decompose(found.position, new Quaternion(), found.scale)
  return found
}

/**
 * How far a material pulls toward the camera once compiled.
 * @param material - the material
 * @returns the pull's uniform
 */
function pulled(material: Material): unknown {
  return compileHook(material, ShaderLib.basic.vertexShader).uniforms[DEPTH_BIAS_UNIFORM]
}

/**
 * Two drawings with their halos, twice as wide.
 * @returns the whole, the drawings, their halos, how the drawings were faded, and their pull
 */
function drawn() {
  const material = new MeshBasicMaterial()
  const pull = { value: 0.05 }
  const drawings = createBillboards(['swords', 'tower'], () => material, EVENT_RENDER_ORDER)
  const fade = vi.fn((opacity: number) => {
    material.opacity = opacity
  })
  const both = withHalos(drawings, { count: 2, fade, pull, span: 2 })
  const halos = both.object.children[1] as Group
  return { both, drawings, halos, fade, pull }
}

/**
 * How opaque a halo is at its middle.
 * @param behind - what the halo stands behind
 * @returns the middle pixel's alpha, 0 to 255
 */
function middleAlpha(behind: 'marker' | 'drawing'): number {
  const material = meshOf(createHaloSquares(1, behind, { value: 0 }).object)
    .material as MeshBasicMaterial
  const image = material.map?.image as { data: Uint8Array; width: number }
  const half = image.width / 2
  return image.data[(half * image.width + half) * 4 + 3] ?? 0
}

/** Two markers' middles. */
const MIDDLES = [new Vector3(1, 0.2, -1), new Vector3(3, 0.4, 2)]

// ATLAS-306: the 3D icons' halo, laid behind the pins and every flat drawing too.
describe('createHaloSquares', () => {
  describe('happy path', () => {
    it('draws one halo per marker, in one draw, just before the markers', () => {
      const halos = createHaloSquares(2, 'marker', { value: 0 })
      expect([
        halos.object.renderOrder,
        meshOf(halos.object).name,
        meshOf(halos.object).count,
      ]).toEqual([HALO_RENDER_ORDER, HALO_NAMES.marker, 2])
      expect(HALO_RENDER_ORDER).toBeLessThan(EVENT_RENDER_ORDER)
    })

    it('stands each halo at its marker’s middle, as wide as asked', () => {
      const halos = createHaloSquares(2, 'marker', { value: 0 })
      halos.poseAll(MIDDLES, new Quaternion(), 0.13)
      const second = pose(meshOf(halos.object), 1)
      expect([second.position.x, second.position.z]).toEqual([3, 2])
      expect(second.position.y).toBeCloseTo(0.4)
      expect(second.scale.x).toBeCloseTo(0.13)
    })

    it('draws as a sprite does: unlit, see-through, writing no depth', () => {
      const material = meshOf(createHaloSquares(1, 'marker', { value: 0 }).object)
        .material as MeshBasicMaterial
      expect([material.transparent, material.depthWrite, material.map !== null]).toEqual([
        true,
        false,
        true,
      ])
    })
  })

  describe('variants', () => {
    it('fades with its markers', () => {
      const halos = createHaloSquares(1, 'marker', { value: 0 })
      halos.setOpacity(0.25)
      expect((meshOf(halos.object).material as Material).opacity).toBe(0.25)
    })

    it('is pulled toward the camera by the markers’ own pull, read live', () => {
      const pull = { value: 0.05 }
      const material = meshOf(createHaloSquares(1, 'drawing', pull).object).material as Material
      expect(pulled(material)).toBe(pull)
    })

    // The dev, 2026-10-29: the halo close up was too strong; from afar it was right.
    it('is softer behind a 3D marker than behind a flat drawing', () => {
      expect(middleAlpha('marker')).toBeLessThan(middleAlpha('drawing'))
      expect(HALO_STYLES.marker.peak).toBeLessThan(HALO_STYLES.drawing.peak)
    })

    it('names its squares by what they stand behind', () => {
      const halos = createHaloSquares(1, 'drawing', { value: 0 })
      expect(meshOf(halos.object).name).toBe(HALO_NAMES.drawing)
    })
  })

  // L3: N/A — nothing is refused.
  // L4: N/A — no async work, nothing external.

  describe('edge cases', () => {
    it('frees its squares, its material and its texture', () => {
      const halos = createHaloSquares(1, 'marker', { value: 0 })
      const material = meshOf(halos.object).material as MeshBasicMaterial
      const { map } = material
      if (map === null) throw new Error('the halo has no texture')
      const spies = [
        vi.spyOn(material, 'dispose'),
        vi.spyOn(map, 'dispose'),
        vi.spyOn(meshOf(halos.object), 'dispose'),
      ]
      halos.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})

describe('withHalos', () => {
  describe('happy path', () => {
    it('stands each halo where its drawing stands, twice as wide', () => {
      const { both, drawings, halos } = drawn()
      both.poseAll(MIDDLES, new Quaternion(), 0.05)
      const drawing = pose(drawings.object.children[1] as InstancedMesh, 0)
      const halo = pose(meshOf(halos), 1)
      expect(halo.position.toArray()).toEqual(drawing.position.toArray())
      expect(drawing.scale.x).toBeCloseTo(0.05)
      expect(halo.scale.x).toBeCloseTo(0.1)
    })

    it('keeps the drawings first among its children, their halos drawn before them by order', () => {
      const { both, drawings, halos } = drawn()
      expect(both.object.children[0]).toBe(drawings.object)
      expect(halos.renderOrder).toBeLessThan(drawings.object.renderOrder)
    })
  })

  describe('variants', () => {
    it('fades the drawings and their halos together', () => {
      const { both, halos, fade } = drawn()
      both.setOpacity(0.3)
      expect([fade.mock.calls[0]?.[0], (meshOf(halos).material as Material).opacity]).toEqual([
        0.3, 0.3,
      ])
    })

    it('pulls the halos with the drawings', () => {
      const { halos, pull } = drawn()
      expect(pulled(meshOf(halos).material as Material)).toBe(pull)
    })
  })

  // L3: N/A — nothing is refused.
  // L4: N/A — no async work, nothing external.

  describe('edge cases', () => {
    it('frees the drawings and their halos together', () => {
      const { both, drawings, halos } = drawn()
      const haloMaterial = meshOf(halos).material as MeshBasicMaterial
      const spies = [vi.spyOn(drawings, 'dispose'), vi.spyOn(haloMaterial, 'dispose')]
      both.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
