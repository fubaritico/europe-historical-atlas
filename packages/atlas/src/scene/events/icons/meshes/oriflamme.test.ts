import { Box3, Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  CLOTH_LENGTH,
  ORIFLAMME_MOTIONS,
  PERIOD,
  STAFF_HEIGHT,
  STRIPS,
  SWING,
  onWave,
  oriflammeParts,
  swallowTail,
} from './oriflamme'

import type { Part } from './parts'

/**
 * The box around parts as they sit, each moved to its place — a moving part where it rests.
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

/**
 * How far aside a strip's motion places it at a moment.
 * @param index - which strip, counted from the staff
 * @param seconds - the moment
 * @returns the placement's offset along the depth
 */
function asideOf(index: number, seconds: number): number {
  const placed = ORIFLAMME_MOTIONS[`strip${String(index)}`]?.place(seconds, new Matrix4())
  return placed?.elements[14] ?? Number.NaN
}

const pieces = (index: number): number =>
  oriflammeParts().filter(({ moves }) => moves === `strip${String(index)}`).length

const gap = (lower?: { to: number }, upper?: { from: number }): number =>
  (upper?.from ?? Number.NaN) - (lower?.to ?? Number.NaN)

/** Moments spread over one whole swing, close enough for the wave's crest to be met within a hundredth. */
const ONE_SWING = Array.from({ length: 48 }, (_, step) => (step * PERIOD) / 48)

/**
 * How far aside a point of the cloth goes over one swing.
 * @param distance - how far the point is from the staff
 * @returns its greatest offset
 */
function waveReach(distance: number): number {
  return Math.max(...ONE_SWING.map((seconds) => Math.abs(onWave(seconds, distance).aside)))
}

/**
 * How far aside a strip's motion places it over one swing.
 * @param index - which strip, counted from the staff
 * @returns its greatest offset
 */
function stripReach(index: number): number {
  return Math.max(...ONE_SWING.map((seconds) => Math.abs(asideOf(index, seconds))))
}

describe('oriflammeParts', () => {
  describe('happy path', () => {
    it('is gold and a red cloth: the staff, its ball and foot, the cloth and its edges', () => {
      expect(new Set(oriflammeParts().map(({ colour }) => colour))).toEqual(
        new Set(['gold', 'cloth'])
      )
    })

    it('stands on the ground, taller than its cloth is long', () => {
      const box = boxOf(oriflammeParts())
      expect(box.min.y).toBeCloseTo(0, 5)
      expect(box.max.y).toBeGreaterThan(STAFF_HEIGHT)
      expect(box.max.y - box.min.y).toBeGreaterThan(box.max.x - box.min.x)
    })

    it('leaves the staff, its ball and the two steps of its foot still', () => {
      const still = oriflammeParts().filter(({ moves }) => moves === undefined)
      expect(still).toHaveLength(4)
      expect(still.every(({ colour }) => colour === 'gold')).toBe(true)
    })
  })

  describe('variants', () => {
    it('cuts the cloth into 24 strips, each with a motion of its own', () => {
      const names = new Set(oriflammeParts().flatMap(({ moves }) => (moves ? [moves] : [])))
      expect(names.size).toBe(STRIPS)
      expect(STRIPS).toBe(24)
      expect([...names].every((name) => ORIFLAMME_MOTIONS[name] !== undefined)).toBe(true)
    })

    it('shows three pieces across a strip before the fork, four past it: two tongues', () => {
      expect(pieces(0)).toBe(3)
      expect(pieces(15)).toBe(3)
      expect(pieces(16)).toBe(4)
      expect(pieces(23)).toBe(4)
    })

    it('edges the whole cloth with gold above and below, and each tongue on its outer side', () => {
      expect(swallowTail(0.1).map(({ colour }) => colour)).toEqual(['gold', 'cloth', 'gold'])
      expect(swallowTail(0.8).map(({ colour }) => colour)).toEqual([
        'gold',
        'cloth',
        'cloth',
        'gold',
      ])
    })

    it('opens the notch between the tongues as the cloth runs to its points', () => {
      const [, lowerNear, upperNear] = swallowTail(0.65)
      const [, lowerFar, upperFar] = swallowTail(0.85)
      expect(gap(lowerFar, upperFar)).toBeGreaterThan(gap(lowerNear, upperNear))
    })

    it('holds the cloth still at the staff and swings its points the whole swing', () => {
      expect(waveReach(0)).toBe(0)
      expect(waveReach(CLOTH_LENGTH)).toBeCloseTo(SWING, 2)
      expect(waveReach(CLOTH_LENGTH / 2)).toBeCloseTo(SWING / 2, 2)
    })

    it('places each strip on the wave: the last one moves further aside than the first', () => {
      expect(stripReach(STRIPS - 1)).toBeGreaterThan(10 * stripReach(0))
      expect(stripReach(STRIPS - 1)).toBeLessThanOrEqual(SWING)
    })

    it('turns a strip so it runs along the wave: its run aside per run along is the wave’s slope', () => {
      // Turned the other way, each strip would lean against its wave and the cloth would kink at every joint.
      const last = STRIPS - 1
      const distance = ((last + 0.5) * CLOTH_LENGTH) / STRIPS
      // Read where the cloth leans plainly, one way and the other.
      const leaning = ONE_SWING.filter((seconds) => Math.abs(onWave(seconds, distance).slope) > 0.2)
      expect(leaning.some((seconds) => onWave(seconds, distance).slope > 0)).toBe(true)
      expect(leaning.some((seconds) => onWave(seconds, distance).slope < 0)).toBe(true)
      for (const seconds of leaning) {
        const placed = ORIFLAMME_MOTIONS[`strip${String(last)}`]?.place(seconds, new Matrix4())
        const along = new Vector3(1, 0, 0).transformDirection(placed ?? new Matrix4())
        expect(along.z / along.x).toBeCloseTo(onWave(seconds, distance).slope, 5)
      }
    })
  })

  // L3: N/A — the one refusal, a strip cut across the fork, cannot be reached: the cut is made from constants
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('builds new geometries at each call, so a model freed leaves the next one whole', () => {
      const [first] = oriflammeParts()
      const [second] = oriflammeParts()
      expect(first?.geometry).not.toBe(second?.geometry)
    })

    it('has no motion that no strip uses', () => {
      const names = new Set(oriflammeParts().flatMap(({ moves }) => (moves ? [moves] : [])))
      expect(Object.keys(ORIFLAMME_MOTIONS).sort()).toEqual([...names].sort())
    })

    it('ends each tongue on a point, never on nothing', () => {
      const [, lower, upper] = swallowTail(CLOTH_LENGTH)
      expect((lower?.to ?? 0) - (lower?.from ?? 0)).toBeGreaterThan(0)
      expect((upper?.to ?? 0) - (upper?.from ?? 0)).toBeGreaterThan(0)
    })
  })
})
