import { describe, expect, it } from 'vitest'

import { ownerRealms } from './nameRealm'

import type { RealmOptions } from './nameRealm'

/** Straits of four cells, a fifth of the largest for a far realm, none named by size alone, a ring of two. */
const OPTIONS: RealmOptions = { strait: 4, farShare: 0.2, farCells: 1e9, ring: 2 }

/**
 * A grid of owners from a function of each cell.
 * @param width - columns
 * @param height - rows
 * @param ownerAt - the owner of a cell, negative for none
 * @returns the owners, row-major
 */
function gridOf(
  width: number,
  height: number,
  ownerAt: (x: number, y: number) => number
): Int32Array {
  const owners = new Int32Array(width * height)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) owners[y * width + x] = ownerAt(x, y)
  return owners
}

/** One country in two blocks parted by a sea three cells wide, beside a neighbour. */
const PARTED = gridOf(40, 10, (x) => (x >= 17 && x <= 19 ? -1 : x >= 36 ? 1 : 0))

// Axis C of « The gap to the reference » (29/10): a country's land with its narrow seas is one place to name.
describe('ownerRealms', () => {
  describe('happy path', () => {
    it('gathers a country’s pieces across a strait into one realm, all its land in its mask', () => {
      const realms = ownerRealms(PARTED, 40, 10, OPTIONS).get(0) ?? []
      expect(realms).toHaveLength(1)
      expect(realms[0]?.cells).toBe(33 * 10)
    })

    it('keeps the strait open and the neighbour blocked in the realm’s crop', () => {
      const realm = ownerRealms(PARTED, 40, 10, OPTIONS).get(0)?.[0]
      if (realm === undefined) throw new Error('no realm')
      const at = (x: number, y: number): number => (y - realm.top) * realm.width + (x - realm.left)
      expect([realm.mask[at(18, 5)], realm.blocked[at(18, 5)], realm.blocked[at(36, 5)]]).toEqual([
        0, 0, 1,
      ])
    })
  })

  describe('variants', () => {
    it('parts a country across a strait wider than the widest spanned', () => {
      expect(ownerRealms(PARTED, 40, 10, { ...OPTIONS, strait: 2 }).get(0)).toHaveLength(2)
    })

    it('never spans a neighbour’s land, however narrow', () => {
      const fenced = gridOf(40, 10, (x) => (x === 18 ? 1 : 0))
      expect(ownerRealms(fenced, 40, 10, OPTIONS).get(0)).toHaveLength(2)
    })

    it('leaves out a far realm under its share of the largest', () => {
      const islet = gridOf(60, 20, (x, y) => (x < 30 ? 0 : x >= 50 && x < 53 && y < 3 ? 0 : -1))
      expect(ownerRealms(islet, 60, 20, OPTIONS).get(0)).toHaveLength(1)
    })

    it('keeps a far realm as large as a country of its own, whatever its share', () => {
      const far = gridOf(60, 20, (x, y) => (x < 30 ? 0 : x >= 50 && y < 5 ? 0 : -1))
      const realms = ownerRealms(far, 60, 20, { ...OPTIONS, farShare: 0.9, farCells: 40 }).get(0)
      expect(realms?.map(({ cells }) => cells)).toEqual([600, 50])
    })

    it('lists a country’s realms largest first', () => {
      const two = gridOf(60, 20, (x, y) => (x < 10 ? 0 : x >= 30 && y < 15 ? 0 : -1))
      expect(
        ownerRealms(two, 60, 20, OPTIONS)
          .get(0)
          ?.map(({ cells }) => cells)
      ).toEqual([450, 200])
    })
  })

  describe('managed errors', () => {
    it('refuses a grid whose size is not width × height', () => {
      expect(() => ownerRealms(PARTED, 41, 10, OPTIONS)).toThrow(/is not 41 × 10/)
    })

    it('refuses a strait below zero, or a ring of less than one whole cell', () => {
      expect(() => ownerRealms(PARTED, 40, 10, { ...OPTIONS, strait: -1 })).toThrow(/strait/)
      expect(() => ownerRealms(PARTED, 40, 10, { ...OPTIONS, ring: 0.5 })).toThrow(/ring/)
    })

    it('refuses a far share outside nought and one', () => {
      expect(() => ownerRealms(PARTED, 40, 10, { ...OPTIONS, farShare: 2 })).toThrow(/far share/)
    })
  })

  // L4: N/A — plain arithmetic over a checked grid.

  describe('edge cases', () => {
    it('gives no realm to a grid of sea alone', () => {
      expect(
        ownerRealms(
          gridOf(4, 4, () => -1),
          4,
          4,
          OPTIONS
        ).size
      ).toBe(0)
    })

    it('counts the map’s frame as a neighbour around a country filling the grid', () => {
      const realm = ownerRealms(
        gridOf(5, 5, () => 0),
        5,
        5,
        OPTIONS
      ).get(0)?.[0]
      expect(realm?.blocked[0]).toBe(1)
    })
  })
})
