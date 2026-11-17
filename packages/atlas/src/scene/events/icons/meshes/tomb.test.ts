import { describe, expect, it } from 'vitest'

import { crescentSign, crossSign, engraved, starSign, tombParts } from './tomb'

import type { Part } from './parts'
import type { Sign } from './tomb'

/** The three signs, by the faith each is cut for. */
const SIGNS: [string, () => Sign][] = [
  ['cross', crossSign],
  ['crescent', crescentSign],
  ['star', starSign],
]

/**
 * How many corners a part's geometry holds.
 * @param part - the part
 * @returns the count
 */
function corners(part: Part | undefined): number {
  return part?.geometry.getAttribute('position').count ?? 0
}

/**
 * The box a sign's outline fills, about its middle.
 * @param sign - the sign
 * @returns its least and greatest `x` and `y`, and its points
 */
function extent(sign: Sign): {
  minX: number
  maxX: number
  minY: number
  maxY: number
  xs: number[]
} {
  const points = sign.outline.getPoints(24)
  const xs = points.map(({ x }) => x)
  const ys = points.map(({ y }) => y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    xs,
  }
}

describe('engraved', () => {
  describe('happy path', () => {
    it.each(SIGNS)(
      'cuts the %s through the face: a plinth, the body, the hollow’s floor, the face',
      (_name, sign) => {
        const parts = engraved(sign())

        expect(parts.map(({ colour }) => colour)).toEqual([
          'rock',
          'limestoneShade',
          'door',
          'limestone',
        ])
        // The face is the body's own outline with the sign cut out of it: more corners than the uncut body.
        expect(corners(parts[3])).toBeGreaterThan(corners(parts[1]))
      }
    )

    it.each(SIGNS)('sinks the %s: the hollow’s floor behind the face’s front', (_name, sign) => {
      const [, , floor, face] = engraved(sign())
      if (floor?.at === undefined || face?.at === undefined) throw new Error('a part has no place')
      face.geometry.computeBoundingBox()
      const reach = face.geometry.boundingBox
      if (reach === null) throw new Error('the face has no box')

      expect(floor.at[2]).toBeLessThan(face.at[2] + reach.max.z)
      // And it is at the height the sign is cut at.
      expect(floor.at[1]).toBeGreaterThan(0.3)
    })
  })

  describe('variants', () => {
    it.each(SIGNS)(
      'gives the %s a floor wide and tall enough to lie under the whole sign',
      (_name, sign) => {
        const cut = sign()
        const { minX, maxX, minY, maxY } = extent(cut)

        expect(maxX - minX).toBeLessThanOrEqual(cut.floor[0])
        expect(maxY - minY).toBeLessThanOrEqual(cut.floor[1])
      }
    )

    it('opens the crescent to the right: its horns reach further right than its middle does', () => {
      const points = crescentSign().outline.getPoints(24)
      const rightmost = Math.max(...points.map(({ x }) => x))
      // About its middle line, the outline's right edge is the hollow between the horns.
      const middle = Math.max(...points.filter(({ y }) => Math.abs(y) < 0.03).map(({ x }) => x))

      expect(middle).toBeLessThan(rightmost - 0.03)
    })

    it('gives the star six tips, one straight up, and six notches between them', () => {
      const points = starSign().outline.getPoints(1)
      const reaches = points.slice(0, 12).map(({ x, y }) => Math.hypot(x, y))
      const tip = Math.max(...reaches)

      expect(reaches.filter((reach) => Math.abs(reach - tip) < 1e-9)).toHaveLength(6)
      expect(points[0]?.x).toBeCloseTo(0)
      expect(points[0]?.y).toBeCloseTo(tip)
    })

    it('stands the cross upright, taller than it is wide, its arms above its middle', () => {
      const { minX, maxX, minY, maxY } = extent(crossSign())

      expect(maxY - minY).toBeGreaterThan(maxX - minX)
      expect(minX).toBeCloseTo(-maxX)
    })
  })

  // L3: N/A — a sign is built from constants; nothing is refused
  // L4: N/A — no async work, nothing external
})

describe('tombParts', () => {
  it('is the stone cut with a cross: the map’s grave', () => {
    const map = tombParts()
    const cross = engraved(crossSign())

    expect(map.map(corners)).toEqual(cross.map(corners))
  })
})
