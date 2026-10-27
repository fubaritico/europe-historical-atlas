import { Box3, Mesh } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { EVENT_ICON_PALETTE } from '../palette'

import { createEventIcon } from './eventIcons'
import { towerParts } from './tower'

import type { EventIconKind } from '../kinds'
import type { Material, Object3D } from 'three'

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

    it('turns the tower with at least 32 faces round its axis, round rather than octagonal', () => {
      const [body] = towerParts()
      const position = body?.geometry.getAttribute('position')
      if (position === undefined) throw new Error('no tower body')
      // Every direction round the axis a wall point stands in, to a tenth of a degree.
      const directions = new Set<number>()
      for (let index = 0; index < position.count; index++) {
        const x = position.getX(index)
        const z = position.getZ(index)
        if (Math.hypot(x, z) < 1e-6) continue
        const degrees = (Math.atan2(x, z) * 180) / Math.PI
        directions.add(Math.round(((degrees + 360) % 360) * 10))
      }
      expect(directions.size).toBeGreaterThanOrEqual(32)
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
    it('frees its model on dispose', () => {
      const icon = createEventIcon('crown')
      const spies = meshes(icon.object).flatMap((mesh) => [
        vi.spyOn(mesh.geometry, 'dispose'),
        vi.spyOn(mesh.material as Material, 'dispose'),
      ])
      icon.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
