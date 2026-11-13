// @vitest-environment jsdom
import { Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createSeaNameLayer } from './seaNameLayer'

import type { PlacedSeaName } from './seaNameLayer'
import type { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'

/** One name, four times as long as it is high, laid at a known place and angle. */
const NAME: PlacedSeaName = {
  label: { canvas: document.createElement('canvas'), aspect: 4 },
  position: [1, 0.01, -2],
  angle: Math.PI / 2,
  length: 2,
}

describe('createSeaNameLayer', () => {
  describe('happy path', () => {
    it('lays each name flat at its place, see-through, never hidden by the relief', () => {
      const layer = createSeaNameLayer([NAME], 0.35, () => new Texture())
      const mesh = layer.object.children[0] as Mesh<PlaneGeometry, MeshBasicMaterial>
      expect([...mesh.position.toArray()]).toEqual([1, 0.01, -2])
      expect([mesh.material.opacity, mesh.material.depthTest, mesh.material.depthWrite]).toEqual([
        0.35,
        false,
        false,
      ])
    })
  })

  describe('variants', () => {
    it('turns a name to its axis: at a quarter turn it runs south to north', () => {
      const layer = createSeaNameLayer([NAME], 0.35, () => new Texture())
      const mesh = layer.object.children[0] as Mesh<PlaneGeometry, MeshBasicMaterial>
      mesh.geometry.computeBoundingBox()
      const box = mesh.geometry.boundingBox
      expect((box?.max.z ?? 0) - (box?.min.z ?? 0)).toBeCloseTo(2, 5)
    })
  })

  // L3–L4: N/A — nothing refused, nothing awaited.

  describe('edge cases', () => {
    it('frees every texture it was handed on teardown', () => {
      const texture = new Texture()
      const dispose = vi.spyOn(texture, 'dispose')
      createSeaNameLayer([NAME, NAME], 0.35, () => texture).dispose()
      expect(dispose).toHaveBeenCalledTimes(2)
    })
  })
})
