import { describe, expect, it } from 'vitest'

import { fittingOf } from './nameFit'
import { OFFSET_REACH, offsetName } from './nameOffset'
import { widenedSpace } from './nameSpace'
import { piecesOf } from './testing/pieces'

import type { Fitting } from './nameFit'

/** The smallest size and the start, as the atlas gives them: the short name's smallest, the long name's. */
const SIZES = { minSize: 1.5, startSize: 4 }

/** A name of four letters, each a unit wide and tall. */
const FOUR = { length: 4, height: 1, letters: 4 }

/**
 * A realm of one owner on a grid, in a crop widened to hold a name beside it.
 * @param width - the grid's columns
 * @param height - its rows
 * @param ownerAt - the owner of each cell, negative for the sea
 * @param extra - how much wider the crop is than the realm's own
 * @returns owner 0's largest realm, prepared for fitting
 */
function besideRealm(
  width: number,
  height: number,
  ownerAt: (x: number, y: number) => number,
  extra = 20
): Fitting {
  const owners = new Int32Array(width * height)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) owners[y * width + x] = ownerAt(x, y)
  const space = piecesOf(owners, width, height, 1).get(0)?.[0]
  if (space === undefined) throw new Error('no realm')
  return fittingOf(widenedSpace(space, 0, { owners, width, height }, extra))
}

/**
 * How far a set name's middle lies from the nearest cell of a square realm.
 * @param fitting - the realm
 * @param middle - the middle, in the crop's cells
 * @returns the distance, in cells
 */
function middleOf(fitting: Fitting, middle: readonly [number, number] | undefined): number {
  const { mask, width } = fitting.space
  let nearest = Infinity
  mask.forEach((inside, at) => {
    if (inside === 0 || middle === undefined) return
    nearest = Math.min(
      nearest,
      Math.hypot((at % width) - middle[0], Math.floor(at / width) - middle[1])
    )
  })
  return nearest
}

// ATLAS-315, the dev, 2026-10-29: the realms too small to hold their name — Naples, Amalfi, Ragusa — named beside them.
describe('offsetName', () => {
  describe('happy path', () => {
    it('writes the name of an islet beside it on the sea, straight, at the start size', () => {
      const islet = besideRealm(60, 60, (x, y) => (x >= 29 && x < 31 && y >= 29 && y < 31 ? 0 : -1))
      const set = offsetName(islet, FOUR, SIZES)
      const [first, last] = [set?.line.points[0], set?.line.points.at(-1)]
      expect([set?.size, set?.tracking, first?.[1] === last?.[1]]).toEqual([4, 0, true])
    })

    it('keeps the name’s middle within its reach of the land', () => {
      const islet = besideRealm(60, 60, (x, y) => (x >= 29 && x < 31 && y >= 29 && y < 31 ? 0 : -1))
      const set = offsetName(islet, FOUR, SIZES)
      const points = set?.line.points ?? []
      const middle = points[Math.floor(points.length / 2)]
      expect(middleOf(islet, middle)).toBeLessThanOrEqual(OFFSET_REACH * (set?.size ?? 0))
    })
  })

  describe('variants', () => {
    it('sets the name smaller where the sea beside the realm is narrow', () => {
      // A coastal realm on a channel four cells wide, a neighbour across it and all around.
      const channel = besideRealm(60, 40, (x, y) => {
        if (x >= 28 && x < 32 && y >= 18 && y < 20) return 0
        return y >= 20 && y < 24 ? -1 : 1
      })
      const set = offsetName(channel, FOUR, SIZES)
      expect(set === null ? 0 : set.size).toBeLessThan(SIZES.startSize)
    })

    it('writes no letter on a neighbour’s land past the bite', () => {
      const channel = besideRealm(60, 40, (x, y) => {
        if (x >= 28 && x < 32 && y >= 18 && y < 20) return 0
        return y >= 20 && y < 24 ? -1 : 1
      })
      const set = offsetName(channel, FOUR, SIZES)
      const top = channel.space.top
      expect(set?.line.points.every(([, y]) => y + top >= 18 && y + top < 24)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('writes nothing beside an enclave, whose name waits for a leader line', () => {
      const enclave = besideRealm(40, 40, (x, y) =>
        x >= 19 && x < 21 && y >= 19 && y < 21 ? 0 : 1
      )
      expect(offsetName(enclave, FOUR, SIZES)).toBeNull()
    })
  })

  // L4: N/A — a fitting `placeNames` builds, and a measure it checked.

  describe('edge cases', () => {
    it('writes nothing when only open ground far from the realm would hold the name — it would read as another’s', () => {
      // An islet in a pond two cells wide, ringed by a neighbour five cells thick, the open sea beyond.
      const pond = besideRealm(80, 80, (x, y) => {
        const ring = Math.max(Math.abs(x - 39.5), Math.abs(y - 39.5))
        if (ring < 1) return 0
        if (ring < 3) return -1
        return ring < 8 ? 1 : -1
      })
      expect(offsetName(pond, { length: 10, height: 1, letters: 10 }, SIZES)).toBeNull()
    })

    it('writes nothing when even the smallest size finds no room beside the realm', () => {
      const pinched = besideRealm(60, 40, (x, y) => {
        if (x >= 28 && x < 32 && y >= 18 && y < 20) return 0
        return y === 20 ? -1 : 1
      })
      expect(offsetName(pinched, { length: 20, height: 1, letters: 20 }, SIZES)).toBeNull()
    })
  })
})
