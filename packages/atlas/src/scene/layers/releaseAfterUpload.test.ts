import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Mesh,
} from 'three'
import { describe, expect, it } from 'vitest'

import { releaseAfterUpload } from './releaseAfterUpload'

/**
 * A mesh with a position attribute and an index.
 * @returns the mesh and its buffers
 */
function indexedMesh(): { mesh: Mesh; position: Float32BufferAttribute; geometry: BufferGeometry } {
  const geometry = new BufferGeometry()
  const position = new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
  geometry.setAttribute('position', position)
  geometry.setIndex([0, 1, 2])
  return { mesh: new Mesh(geometry), position, geometry }
}

// ATLAS-333: the page's copy of a year layer's buffers let go once the GPU holds them.
describe('releaseAfterUpload', () => {
  describe('happy path', () => {
    it('lets an attribute’s array go once it is uploaded, never before', () => {
      const { mesh, position } = indexedMesh()
      releaseAfterUpload(mesh)
      expect(position.array).not.toBeNull()
      // What three's WebGLAttributes calls right after gl.bufferData.
      position.onUploadCallback()
      expect(position.array).toBeNull()
    })
  })

  describe('variants', () => {
    // The dev, 2026-11-08: « Cannot read properties of null (reading '0') » — three computing the bounds of an object it
    // does not cull after the upload, the positions gone.
    it('computes the bounds before anything is let go, so three never reads the positions for them after', () => {
      const { mesh, position, geometry } = indexedMesh()
      releaseAfterUpload(mesh)
      position.onUploadCallback()
      expect(geometry.boundingSphere?.radius).toBeGreaterThan(0)
      expect(geometry.boundingBox?.max.x).toBe(1)
    })

    it('lets the index go too', () => {
      const { mesh, geometry } = indexedMesh()
      releaseAfterUpload(mesh)
      geometry.index?.onUploadCallback()
      expect(geometry.index?.array).toBeNull()
    })

    it('lets an interleaved buffer go by its shared buffer, as the border lines hold theirs', () => {
      const shared = new InstancedInterleavedBuffer(new Float32Array(12), 6, 1)
      const geometry = new BufferGeometry()
      geometry.setAttribute('instanceStart', new InterleavedBufferAttribute(shared, 3, 0))
      geometry.setAttribute('instanceEnd', new InterleavedBufferAttribute(shared, 3, 3))
      releaseAfterUpload(new Mesh(geometry))
      shared.onUploadCallback()
      expect(shared.array).toBeNull()
    })

    it('reaches every geometry under a group', () => {
      const group = new Group()
      const [first, second] = [indexedMesh(), indexedMesh()]
      group.add(first.mesh, second.mesh)
      releaseAfterUpload(group)
      second.position.onUploadCallback()
      expect(second.position.array).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('passes over an object with no geometry', () => {
      expect(() => {
        releaseAfterUpload(new Group())
      }).not.toThrow()
    })
  })

  // L3, L4: N/A — nothing is refused; three calls the callback.
})
