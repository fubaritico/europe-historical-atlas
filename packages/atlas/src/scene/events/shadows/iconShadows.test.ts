import { BufferAttribute, Matrix4, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { ICON_SHADOW_OPTIONS, createIconShadows, iconShadowFrame } from './iconShadows'
import { SHADOW_OPACITY, SHADOW_SUN, shadowReach } from './shadowFootprint'

import type { IconInstances } from '../icons/iconInstances'
import type { BufferGeometry, DataTexture, Mesh, MeshBasicMaterial } from 'three'

/** A square standing upright one unit tall at the origin of its icon: two triangles. */
const UPRIGHT = new BufferAttribute(
  new Float32Array([-0.3, 0, 0, 0.3, 0, 0, 0.3, 1, 0, -0.3, 0, 0, 0.3, 1, 0, -0.3, 1, 0]),
  3
)

/**
 * Icons whose one piece is the upright square, placed where each icon stands.
 * @param at - each icon's base
 * @returns the instances' visitor
 */
function standing(at: readonly Vector3[]): Pick<IconInstances, 'forEachPiece'> {
  return {
    forEachPiece(index, visit) {
      const base = at[index]
      if (base !== undefined) visit(UPRIGHT, new Matrix4().makeTranslation(base))
    },
  }
}

/**
 * The shadows' mesh.
 * @param object - the shadows' group
 * @returns the mesh
 */
function meshOf(object: { children: unknown[] }): Mesh<BufferGeometry, MeshBasicMaterial> {
  return object.children[0] as Mesh<BufferGeometry, MeshBasicMaterial>
}

/**
 * The alpha of every pixel of the shadows' texture.
 * @param mesh - the shadows' mesh
 * @returns the alphas
 */
function alphas(mesh: Mesh<BufferGeometry, MeshBasicMaterial>): number[] {
  const data = ((mesh.material.map as DataTexture).image as { data: Uint8Array }).data
  return Array.from(data).filter((_, k) => k % 4 === 3)
}

const ICON = { position: new Vector3(0, 0, 0), lift: 0, size: 1 }

describe('createIconShadows', () => {
  describe('happy path', () => {
    it('draws an icon’s shadow from its pose at the first frame', () => {
      const shadows = createIconShadows([ICON], standing([ICON.position]), () => 0)
      expect(alphas(meshOf(shadows.object)).some((value) => value > 0)).toBe(false)
      shadows.faceCamera({} as never, 0)
      expect(alphas(meshOf(shadows.object)).some((value) => value > 0)).toBe(true)
    })

    it('frames a shadow from behind the foot to past where the light lays the icon’s top', () => {
      const frame = iconShadowFrame({ lift: 0.5, size: 1 }, 0.7)
      expect(frame.sMin).toBeCloseTo(-0.7)
      expect(frame.sMax).toBeCloseTo(shadowReach(1.5, SHADOW_SUN) + 0.7)
      expect(frame.tHalf).toBeCloseTo(0.7)
    })
  })

  describe('variants', () => {
    it('draws every icon in one mesh, its tile in one texture', () => {
      const at = [new Vector3(0, 0, 0), new Vector3(3, 0, 0), new Vector3(6, 0, 0)]
      const icons = at.map((position) => ({ ...ICON, position }))
      const shadows = createIconShadows(icons, standing(at), () => 0)
      expect(shadows.object.children).toHaveLength(1)
      const map = meshOf(shadows.object).material.map as DataTexture
      // Three tiles in a two-by-two sheet.
      expect(map.image.width).toBe(2 * ICON_SHADOW_OPTIONS.tile.along)
      expect(map.image.height).toBe(2 * ICON_SHADOW_OPTIONS.tile.across)
    })

    it('writes each icon’s shadow into its own tile, never its neighbour’s', () => {
      // Two icons; only the second has a piece. The first tile (left) stays clear, the second (right) is drawn.
      const at = [new Vector3(0, 0, 0), new Vector3(3, 0, 0)]
      const icons = at.map((position) => ({ ...ICON, position }))
      const onlySecond: Pick<IconInstances, 'forEachPiece'> = {
        forEachPiece(index, visit) {
          if (index === 1) visit(UPRIGHT, new Matrix4().makeTranslation(at[1] ?? new Vector3()))
        },
      }
      const shadows = createIconShadows(icons, onlySecond, () => 0)
      shadows.faceCamera({} as never, 0)
      const { along, across } = ICON_SHADOW_OPTIONS.tile
      const all = alphas(meshOf(shadows.object))
      const tile = (left: number): number[] =>
        Array.from({ length: across }, (_, row) =>
          all.slice(row * 2 * along + left, row * 2 * along + left + along)
        ).flat()
      expect(tile(0).every((value) => value === 0)).toBe(true)
      expect(tile(along).some((value) => value > 0)).toBe(true)
    })

    it('fades with the 3D icons, from the markers’ darkness', () => {
      const shadows = createIconShadows([ICON], standing([ICON.position]), () => 0)
      shadows.setOpacity(0.5)
      expect(meshOf(shadows.object).material.opacity).toBeCloseTo(SHADOW_OPACITY * 0.5)
    })
  })

  // L3: N/A — nothing is refused: the icons come already placed
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('draws again no sooner than its interval', () => {
      const visit = vi.fn(standing([ICON.position]).forEachPiece)
      const shadows = createIconShadows([ICON], { forEachPiece: visit }, () => 0)
      shadows.faceCamera({} as never, 0)
      shadows.faceCamera({} as never, ICON_SHADOW_OPTIONS.interval / 2)
      expect(visit).toHaveBeenCalledTimes(1)
      shadows.faceCamera({} as never, ICON_SHADOW_OPTIONS.interval)
      expect(visit).toHaveBeenCalledTimes(2)
    })

    it('draws nothing while faded out, and draws at once when it comes back', () => {
      // From afar the 3D icons are gone: drawing their shadows there would cost every frame for nothing.
      const visit = vi.fn(standing([ICON.position]).forEachPiece)
      const shadows = createIconShadows([ICON], { forEachPiece: visit }, () => 0)
      shadows.setOpacity(0)
      shadows.faceCamera({} as never, 5)
      expect(visit).not.toHaveBeenCalled()
      shadows.setOpacity(1)
      shadows.faceCamera({} as never, 5)
      expect(visit).toHaveBeenCalledTimes(1)
    })

    it('keeps every vertex on the ground when the relief is exaggerated', () => {
      const shadows = createIconShadows([ICON], standing([ICON.position]), (x) => x)
      shadows.setReliefScale(2)
      const position = meshOf(shadows.object).geometry.getAttribute('position')
      for (let k = 0; k < position.count; k++)
        expect(position.getY(k)).toBeCloseTo(position.getX(k) * 2)
    })

    it('frees its geometry, material and texture on dispose', () => {
      const shadows = createIconShadows([ICON], standing([ICON.position]), () => 0)
      const mesh = meshOf(shadows.object)
      const spies = [mesh.geometry, mesh.material, mesh.material.map].map((resource) =>
        vi.spyOn(resource as { dispose: () => void }, 'dispose')
      )
      shadows.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
