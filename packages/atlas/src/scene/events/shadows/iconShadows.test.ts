import { BufferAttribute, Matrix4, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { ICON_SHADOW_OPTIONS, createIconShadows, iconShadowFrame, modelExtent } from './iconShadows'
import { SHADOW_OPACITY, SHADOW_SUN, shadowReach } from './shadowFootprint'
import { SOIL_OPACITY } from './soil'

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
function standing(at: readonly Vector3[]): Pick<IconInstances, 'forEachPiece' | 'movesAlone'> {
  return {
    movesAlone: () => false,
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

/** An icon that stands still, one unit tall, its model's unit the world's. */
const ICON = {
  position: new Vector3(0, 0, 0),
  lift: 0,
  size: 1,
  unit: 1,
  turns: false,
  sways: false,
}
/** The same, swaying: its shadow changes by itself. */
const SWAYING = { ...ICON, sways: true }

/**
 * Shadows over icons, counting the drawings of each.
 * @param icons - the icons
 * @param movesAlone - whether each one's model moves by itself
 * @returns the shadows, each icon's count of drawings, and the texture
 */
function counted(icons: (typeof ICON)[], movesAlone: (index: number) => boolean = () => false) {
  const drawn = icons.map(() => 0)
  const pieces = standing(icons.map(({ position }) => position))
  const shadows = createIconShadows(
    icons,
    {
      movesAlone,
      forEachPiece(index, visit) {
        drawn[index] = (drawn[index] ?? 0) + 1
        pieces.forEachPiece(index, visit)
      },
    },
    () => 0
  )
  // Each model is read once as the shadows are built, to frame it: what is counted is the drawings after.
  drawn.fill(0)
  return { shadows, drawn, texture: meshOf(shadows.object).material.map as DataTexture }
}

/** A moment well past one interval after the first drawing. */
const LATER = ICON_SHADOW_OPTIONS.interval * 2

describe('createIconShadows', () => {
  describe('happy path', () => {
    it('draws an icon’s shadow from its pose at the first frame', () => {
      const shadows = createIconShadows([ICON], standing([ICON.position]), () => 0)
      expect(alphas(meshOf(shadows.object)).some((value) => value > 0)).toBe(false)
      shadows.faceCamera({} as never, 0)
      expect(alphas(meshOf(shadows.object)).some((value) => value > 0)).toBe(true)
    })

    it('frames a shadow from behind the foot to past where the light lays the icon’s top', () => {
      const frame = iconShadowFrame({ lift: 0.5, size: 1, unit: 1 }, 0.7)
      expect(frame.sMin).toBeCloseTo(-0.7)
      expect(frame.sMax).toBeCloseTo(shadowReach(1.5, SHADOW_SUN) + 0.7)
      expect(frame.tHalf).toBeCloseTo(0.7)
    })
  })

  describe('the soiled ground', () => {
    // The dev, 2026-11-17, of the cathedral: « une texture un peu noircie […] pour voir qu'elle est dans le sol ».
    it('keeps a cast shadow as dark as every marker’s, in an image drawn dark enough for the soil', () => {
      const shadows = createIconShadows([ICON], standing([ICON.position]), () => 0)
      shadows.faceCamera({} as never, 0)
      const mesh = meshOf(shadows.object)

      const darkest = (Math.max(...alphas(mesh)) / 255) * mesh.material.opacity

      expect(darkest).toBeCloseTo(SHADOW_OPACITY, 2)
    })

    it('keeps room in the frame for the soil and its soft end, so it never stops in a straight edge', () => {
      // The dev, 2026-11-17: « on voit un bord droit ».
      const bare = iconShadowFrame({ lift: 0, size: 1, unit: 1 }, 0.7, { radius: 1, top: 1 })
      const soiled = iconShadowFrame({ lift: 0, size: 1, unit: 1 }, 0.7, {
        radius: 1,
        top: 1,
        soilReach: 0.2,
      })

      expect(soiled.tHalf - bare.tHalf).toBeGreaterThan(0.2 * 1.5)
      expect(bare.sMin - soiled.sMin).toBeGreaterThan(0.2 * 1.5)
    })

    it('fades the soil out before the edges of its image', () => {
      const flat = [
        -0.3, 0.1, -0.3, 0.3, 0.1, -0.3, 0.3, 0.1, 0.3, -0.3, 0.1, -0.3, 0.3, 0.1, 0.3, -0.3, 0.1,
        0.3,
      ]
      const slab = new BufferAttribute(new Float32Array(flat), 3)
      const lying: Pick<IconInstances, 'forEachPiece' | 'movesAlone'> = {
        movesAlone: () => false,
        forEachPiece(_index, visit) {
          visit(slab, new Matrix4())
        },
      }
      const shadows = createIconShadows([{ ...ICON, soil: 1 }], lying, () => 0)
      shadows.faceCamera({} as never, 0)

      const { along, across } = ICON_SHADOW_OPTIONS.tile
      const all = alphas(meshOf(shadows.object))
      const firstRow = all.slice(0, along)
      const lastRow = all.slice((across - 1) * along, across * along)
      const firstColumn = Array.from({ length: across }, (_, row) => all[row * along] ?? Number.NaN)
      // Of 255: under three hundredths of the soil's darkest, nothing the eye reads as an edge.
      expect(Math.max(...firstRow, ...lastRow, ...firstColumn)).toBeLessThan(8)
    })

    it('spreads the soil further the further its reach is set', () => {
      const flat = [
        -0.3, 0.1, -0.3, 0.3, 0.1, -0.3, 0.3, 0.1, 0.3, -0.3, 0.1, -0.3, 0.3, 0.1, 0.3, -0.3, 0.1,
        0.3,
      ]
      const slab = new BufferAttribute(new Float32Array(flat), 3)
      const lying: Pick<IconInstances, 'forEachPiece' | 'movesAlone'> = {
        movesAlone: () => false,
        forEachPiece(_index, visit) {
          visit(slab, new Matrix4())
        },
      }
      // How much of the ground the soil reaches, as a share of the world: the frame grows with the reach, so pixels
      // are counted in the world's units, not the image's.
      const ground = (soilReach: number): number => {
        const shadows = createIconShadows([{ ...ICON, soil: 1 }], lying, () => 0, {
          ...ICON_SHADOW_OPTIONS,
          soilReach,
        })
        shadows.faceCamera({} as never, 0)
        const all = alphas(meshOf(shadows.object))
        const frame = iconShadowFrame(ICON, ICON_SHADOW_OPTIONS.margin, {
          radius: 0.43,
          top: 0.1,
          soilReach,
        })
        const area = (frame.sMax - frame.sMin) * 2 * frame.tHalf
        // Darker than a cast shadow can be: the soil alone.
        const cast = (SHADOW_OPACITY / SOIL_OPACITY) * 255
        return (all.filter((value) => value > cast + 4).length / all.length) * area
      }

      expect(ground(0.4)).toBeGreaterThan(ground(0.05) * 1.5)
    })

    it('darkens the ground about a soiled icon’s foot past its cast shadow', () => {
      // A slab lying flat a little over the ground: unlike the upright square, it has a footprint.
      const flat = [
        -0.3, 0.1, -0.3, 0.3, 0.1, -0.3, 0.3, 0.1, 0.3, -0.3, 0.1, -0.3, 0.3, 0.1, 0.3, -0.3, 0.1,
        0.3,
      ]
      const slab = new BufferAttribute(new Float32Array(flat), 3)
      const lying: Pick<IconInstances, 'forEachPiece' | 'movesAlone'> = {
        movesAlone: () => false,
        forEachPiece(_index, visit) {
          visit(slab, new Matrix4())
        },
      }
      const soiled = createIconShadows([{ ...ICON, soil: 1 }], lying, () => 0)
      soiled.faceCamera({} as never, 0)
      const mesh = meshOf(soiled.object)

      const darkest = (Math.max(...alphas(mesh)) / 255) * mesh.material.opacity

      expect(darkest).toBeGreaterThan(SHADOW_OPACITY * 1.2)
    })
  })

  describe('a model wider than it is tall', () => {
    // The dev, 2026-11-17, of a cathedral twice as long as it is tall: « l'ombre ne fait pas la bonne taille ».
    it('reads how far a model reaches from its pieces as built, whatever its pose', () => {
      const extent = modelExtent(standing([new Vector3(9, 0, 9)]), 0)
      expect(extent.radius).toBeCloseTo(0.3)
      expect(extent.top).toBeCloseTo(1)
    })

    it('widens the frame to a model reaching past its size, across and along', () => {
      const frame = iconShadowFrame({ lift: 0, size: 2, unit: 2 }, 0.7, { radius: 1, top: 1 })
      // One unit of its model from its upright — two of the world's — and the room past it: more than the 0.7 of its size kept by default.
      expect(frame.tHalf).toBeCloseTo(2 * 1.15)
      expect(frame.sMin).toBeCloseTo(-2 * 1.15)
      expect(frame.sMax).toBeCloseTo(shadowReach(2, SHADOW_SUN) + 2 * 1.15)
    })

    it('reaches past the top of a model taller than its size', () => {
      const frame = iconShadowFrame({ lift: 0, size: 1, unit: 1 }, 0.7, { radius: 0.3, top: 1.5 })
      expect(frame.sMax).toBeCloseTo(shadowReach(1.5, SHADOW_SUN) + 0.7)
    })

    it('keeps the frame its size gives for a model that stays within it', () => {
      expect(
        iconShadowFrame({ lift: 0.5, size: 1, unit: 1 }, 0.7, { radius: 0.3, top: 1 })
      ).toEqual(iconShadowFrame({ lift: 0.5, size: 1, unit: 1 }, 0.7))
    })
  })

  describe('only what moves is drawn again', () => {
    // The dev's worry for the frame rate, 2026-11-17 (ATLAS-469): a cathedral's shadow never changes.

    it('draws a still icon once, and never again as the frames go by', () => {
      const { shadows, drawn } = counted([ICON])
      shadows.faceCamera({} as never, 0)
      shadows.faceCamera({} as never, LATER)
      shadows.faceCamera({} as never, 2 * LATER)
      expect(drawn).toEqual([1])
    })

    it('draws again, of a still icon and one that sways, the swaying one alone', () => {
      const { shadows, drawn } = counted([ICON, { ...SWAYING, position: new Vector3(3, 0, 0) }])
      shadows.faceCamera({} as never, 0)
      shadows.faceCamera({} as never, LATER)
      expect(drawn).toEqual([1, 2])
    })

    it('draws again an icon that turns to the camera, and one whose model moves by itself', () => {
      const turning = { ...ICON, turns: true }
      const { shadows, drawn } = counted(
        [turning, { ...ICON, position: new Vector3(3, 0, 0) }],
        (index) => index === 1
      )
      shadows.faceCamera({} as never, 0)
      shadows.faceCamera({} as never, LATER)
      expect(drawn).toEqual([2, 2])
    })

    it('hands the texture to the GPU only when a tile was drawn', () => {
      const { shadows, texture } = counted([ICON])
      shadows.faceCamera({} as never, 0)
      const version = texture.version
      shadows.faceCamera({} as never, LATER)
      expect(texture.version).toBe(version)
    })

    it('draws a still icon again once the relief is rescaled', () => {
      const { shadows, drawn } = counted([ICON])
      shadows.faceCamera({} as never, 0)
      shadows.setReliefScale(2)
      shadows.faceCamera({} as never, LATER)
      expect(drawn).toEqual([2])
    })

    it('draws a still icon at once when the relief is rescaled between two intervals', () => {
      // Its drawing does not wait for the moving icons' interval: it would show the old ground until then.
      const { shadows, drawn } = counted([ICON])
      shadows.faceCamera({} as never, 0)
      shadows.setReliefScale(2)
      shadows.faceCamera({} as never, ICON_SHADOW_OPTIONS.interval / 2)
      expect(drawn).toEqual([2])
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
      const onlySecond: Pick<IconInstances, 'forEachPiece' | 'movesAlone'> = {
        movesAlone: () => false,
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
      expect(meshOf(shadows.object).material.opacity).toBeCloseTo(SOIL_OPACITY * 0.5)
    })
  })

  // L3: N/A — nothing is refused: the icons come already placed
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('draws an icon that sways again no sooner than its interval', () => {
      const visit = vi.fn(standing([ICON.position]).forEachPiece)
      const shadows = createIconShadows(
        [SWAYING],
        { forEachPiece: visit, movesAlone: () => false },
        () => 0
      )
      // Its model is read once as the shadows are built, to frame it: what is counted is the drawings after.
      visit.mockClear()
      shadows.faceCamera({} as never, 0)
      shadows.faceCamera({} as never, ICON_SHADOW_OPTIONS.interval / 2)
      expect(visit).toHaveBeenCalledTimes(1)
      shadows.faceCamera({} as never, ICON_SHADOW_OPTIONS.interval)
      expect(visit).toHaveBeenCalledTimes(2)
    })

    it('draws nothing while faded out, and draws at once when it comes back', () => {
      // From afar the 3D icons are gone: drawing their shadows there would cost every frame for nothing.
      const visit = vi.fn(standing([ICON.position]).forEachPiece)
      const shadows = createIconShadows(
        [ICON],
        { forEachPiece: visit, movesAlone: () => false },
        () => 0
      )
      // Its model is read once as the shadows are built, to frame it: what is counted is the drawings after.
      visit.mockClear()
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
