import { Box3, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { crook, tiaraAloneParts, tiaraParts } from './tiara'

import type { Part } from './parts'

/**
 * The box around parts as they sit, each moved to its place.
 * @param parts - the parts
 * @returns the box
 */
function boxOf(parts: readonly Part[]): Box3 {
  const box = new Box3()
  for (const part of parts) {
    part.geometry.computeBoundingBox()
    const own = part.geometry.boundingBox?.clone()
    if (!own) continue
    box.union(own.translate(new Vector3(...(part.at ?? [0, 0, 0]))))
  }
  return box
}

describe('tiaraParts', () => {
  describe('happy path', () => {
    it('is a white cap and gold: its crowns, its orb and cross, the crozier', () => {
      expect(new Set(tiaraParts().map(({ colour }) => colour))).toEqual(new Set(['pearl', 'gold']))
      expect(tiaraParts().filter(({ colour }) => colour === 'pearl')).toHaveLength(1)
    })

    it('stands on the ground, the tiara alone taller than it is wide', () => {
      expect(boxOf(tiaraParts()).min.y).toBeCloseTo(0, 5)
      const alone = boxOf(tiaraAloneParts())
      expect(alone.max.y - alone.min.y).toBeGreaterThan(alone.max.x - alone.min.x)
    })
  })

  describe('variants', () => {
    it('wears three crowns: three circlets of eight beads each', () => {
      // A circlet is a band and its beads; the orb is the one other sphere of the tiara alone.
      const spheres = tiaraAloneParts().filter(({ geometry }) => geometry.type === 'SphereGeometry')
      expect(spheres).toHaveLength(3 * 8 + 1)
      const bands = tiaraAloneParts().filter(({ geometry }) => geometry.type === 'CylinderGeometry')
      expect(bands).toHaveLength(3)
    })

    it('adds the crozier beside the tiara, clear of its cap', () => {
      const alone = boxOf(tiaraAloneParts())
      const whole = boxOf(tiaraParts())
      expect(whole.max.x).toBeGreaterThan(alone.max.x + 0.2)
      expect(whole.min.x).toBeCloseTo(alone.min.x, 5)
    })

    it('curls the crook away from the tiara, not back over it', () => {
      // The dev, 2026-11-18: « pas dirigée vers le chapeau, mais vers l'extérieur ».
      const staff = 0.46
      const away = boxOf(crook([staff, 0, 0], 0.78, true))
      const over = boxOf(crook([staff, 0, 0], 0.78, false))
      // Away: the ring reaches right of the staff and never left of it; over the tiara, the reverse.
      expect(away.max.x).toBeGreaterThan(staff + 0.25)
      expect(away.min.x).toBeGreaterThan(staff - 0.07)
      expect(over.min.x).toBeLessThan(staff - 0.25)
      expect(over.max.x).toBeLessThan(staff + 0.07)
    })

    it('stands the map’s crook the way the dev chose: away', () => {
      const [, , ring] = tiaraParts().slice(-3)
      expect(ring?.at?.[0]).toBeGreaterThan(0.46)
    })
  })

  // L3: N/A — nothing is refused: the parts are built from constants
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('builds new geometries at each call, so a model freed leaves the next one whole', () => {
      const [first] = tiaraParts()
      const [second] = tiaraParts()
      expect(first?.geometry).not.toBe(second?.geometry)
    })
  })
})
