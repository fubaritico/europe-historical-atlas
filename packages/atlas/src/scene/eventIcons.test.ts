import { Box3, Mesh } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { EVENT_ICON_PALETTE, createEventIcon, createIconLights } from './eventIcons'

import type { EventIconKind } from './eventIcons'
import type { DirectionalLight, Material, Object3D } from 'three'

const KINDS: EventIconKind[] = ['swords', 'tower', 'crown']

/**
 * The meshes of an icon.
 * @param object - the icon's group
 * @returns its meshes
 */
function meshes(object: Object3D): Mesh[] {
  return object.children.filter((child): child is Mesh => child instanceof Mesh)
}

describe('createEventIcon', () => {
  describe('happy path', () => {
    it.each(KINDS)('stands the %s one unit high on the origin', (kind) => {
      const box = new Box3().setFromObject(createEventIcon(kind).object)
      expect(box.min.y).toBeCloseTo(0, 5)
      expect(box.max.y).toBeCloseTo(1, 5)
    })
  })

  describe('variants', () => {
    it('fits the crossed swords in a square seen from the front', () => {
      const box = new Box3().setFromObject(createEventIcon('swords').object)
      const width = box.max.x - box.min.x
      expect(width).toBeCloseTo(box.max.y - box.min.y, 1)
    })

    it('passes one blade in front of the other where they cross, never through it', () => {
      // The blade is each sword's first part; the guards and pommels are thicker than the gap, but they stand apart
      // sideways and never meet — only the blades cross.
      const parts = meshes(createEventIcon('swords').object)
      const [front, back] = [parts[0], parts[parts.length / 2]]
      if (front === undefined || back === undefined) throw new Error('no blades')
      expect(new Box3().setFromObject(back).max.z).toBeLessThan(
        new Box3().setFromObject(front).min.z
      )
    })

    it('paints the icon in the palette given', () => {
      const icon = createEventIcon('crown', { ...EVENT_ICON_PALETTE, gold: '#00ff00' })
      const colours = meshes(icon.object).map((mesh) =>
        (mesh.material as Material & { color: { getHexString: () => string } }).color.getHexString()
      )
      expect(colours).toContain('00ff00')
    })

    it('draws in the transparent pass, after the borders', () => {
      for (const mesh of meshes(createEventIcon('tower').object)) {
        expect((mesh.material as Material).transparent).toBe(true)
      }
    })
  })

  // L3: N/A — every kind is a member of a closed union; nothing is refused
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('shares one material per colour, and frees every geometry and material on dispose', () => {
      const icon = createEventIcon('crown')
      const parts = meshes(icon.object)
      const materials = new Set(parts.map((mesh) => mesh.material as Material))
      expect(materials.size).toBeLessThan(parts.length)
      const spies = [
        ...parts.map((mesh) => vi.spyOn(mesh.geometry, 'dispose')),
        ...[...materials].map((material) => vi.spyOn(material, 'dispose')),
      ]
      icon.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})

describe('createIconLights', () => {
  it('puts the rim behind the icon and the key on the reader’s side, in the camera’s frame', () => {
    const [rim, key] = createIconLights().children
    expect(rim?.position.z).toBeLessThan(0)
    expect(key?.position.z).toBeGreaterThan(0)
  })

  it('makes the rim the strongest light, as against the light wants', () => {
    const [rim, key, sky] = createIconLights().children as DirectionalLight[]
    expect(rim?.intensity).toBeGreaterThan(key?.intensity ?? Infinity)
    expect(rim?.intensity).toBeGreaterThan(sky?.intensity ?? Infinity)
  })

  it('takes the brightness of each light from the lighting given', () => {
    const lights = createIconLights({ rim: 1, key: 2, sky: 3 }).children
    expect(lights.map((light) => (light as DirectionalLight).intensity)).toEqual([1, 2, 3])
  })
})
