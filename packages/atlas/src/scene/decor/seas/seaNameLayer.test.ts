// @vitest-environment jsdom
import { Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createSeaNameLayer, ribbonGeometry } from './seaNameLayer'

import type { PlacedSeaName } from './seaNameLayer'
import type { Mesh, MeshBasicMaterial } from 'three'

/** A name read west to east along a straight arc of length 4, four times as long as it is high. */
const NAME: PlacedSeaName = {
  label: { canvas: document.createElement('canvas'), aspect: 4 },
  arc: [
    [0, 0],
    [2, 0],
    [4, 0],
  ],
  y: 0.01,
}

describe('createSeaNameLayer', () => {
  describe('happy path', () => {
    it('lays each name see-through, never hidden by the relief', () => {
      const layer = createSeaNameLayer([NAME], 0.28, () => new Texture())
      const mesh = layer.object.children[0] as Mesh<
        ReturnType<typeof ribbonGeometry>,
        MeshBasicMaterial
      >
      expect([mesh.material.opacity, mesh.material.depthTest, mesh.material.depthWrite]).toEqual([
        0.28,
        false,
        false,
      ])
    })
  })

  describe('variants', () => {
    it('lays the ribbon along its arc, its height from the name’s proportions, its top on the north side', () => {
      const geometry = ribbonGeometry(NAME.arc, 1, 0.01)
      const position = geometry.getAttribute('position')
      const uv = geometry.getAttribute('uv')
      // The first point's two vertices: v = 1 at z = −0.5 (north), v = 0 at z = +0.5.
      expect([position.getZ(0), uv.getY(0), position.getZ(1), uv.getY(1)]).toEqual([
        -0.5, 1, 0.5, 0,
      ])
      expect([uv.getX(0), uv.getX(2), uv.getX(4)]).toEqual([0, 0.5, 1])
    })

    it('follows a bent arc: the middle of the ribbon sits on the arc’s middle point', () => {
      const bent: [number, number][] = [
        [0, 0],
        [2, -1],
        [4, 0],
      ]
      const position = ribbonGeometry(bent, 0.2, 0).getAttribute('position')
      expect((position.getZ(2) + position.getZ(3)) / 2).toBeCloseTo(-1, 9)
    })
  })

  // L3–L4: N/A — nothing refused, nothing awaited.

  describe('edge cases', () => {
    it('frees every texture it was handed on teardown', () => {
      const texture = new Texture()
      const dispose = vi.spyOn(texture, 'dispose')
      createSeaNameLayer([NAME, NAME], 0.28, () => texture).dispose()
      expect(dispose).toHaveBeenCalledTimes(2)
    })
  })
})
