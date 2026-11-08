import { describe, expect, it, vi } from 'vitest'

import { homageLevels } from './homageLevels'

const p = (id: string, suzerain: string | null = null) => ({ id, suzerain })

/** France and its two dukes, the Empire and its duke, and a count under Burgundy. */
const YEAR = [
  p('france'),
  p('burgundy', 'france'),
  p('normandy', 'france'),
  p('hre'),
  p('saxony', 'hre'),
  p('nevers', 'burgundy'),
]

describe('homageLevels', () => {
  describe('happy path', () => {
    it('reads each chain from its root down to the polity', () => {
      const levels = homageLevels(YEAR)
      expect(levels.chainOf('france')).toEqual(['france'])
      expect(levels.chainOf('burgundy')).toEqual(['france', 'burgundy'])
      expect(levels.chainOf('nevers')).toEqual(['france', 'burgundy', 'nevers'])
    })

    it('answers the deepest depth of the year', () => {
      expect(homageLevels(YEAR).deepest).toBe(2)
    })

    it('splits two independent realms at level 0', () => {
      expect(homageLevels(YEAR).splitLevel('france', 'hre')).toBe(0)
    })
  })

  describe('variants', () => {
    it('splits two vassals of one king at level 1', () => {
      expect(homageLevels(YEAR).splitLevel('burgundy', 'normandy')).toBe(1)
    })

    // Guard against a split read off the depths alone: both sides sit at depth 1, yet they wear France's
    // and the Empire's colours from the first level, so the border is there from the start.
    it('splits two vassals of different kings at level 0', () => {
      expect(homageLevels(YEAR).splitLevel('burgundy', 'saxony')).toBe(0)
    })

    it('splits a vassal from its own suzerain one level below the suzerain', () => {
      const levels = homageLevels(YEAR)
      expect(levels.splitLevel('burgundy', 'france')).toBe(1)
      expect(levels.splitLevel('nevers', 'burgundy')).toBe(2)
      expect(levels.splitLevel('france', 'nevers')).toBe(1)
    })

    it('splits a sub-vassal from its uncle at level 1', () => {
      expect(homageLevels(YEAR).splitLevel('nevers', 'normandy')).toBe(1)
    })

    // Guard against a sub-vassal jumping from the root's colour to its own: at level 1 it wears its
    // direct suzerain's.
    it('dresses a sub-vassal in its direct suzerain before its own colour', () => {
      const levels = homageLevels(YEAR)
      expect([0, 1, 2, 3].map((level) => levels.ancestorAt('nevers', level))).toEqual([
        'france',
        'burgundy',
        'nevers',
        'nevers',
      ])
    })

    it('dresses a root in its own colour at every level', () => {
      const levels = homageLevels(YEAR)
      expect([0, 1, 2].map((level) => levels.ancestorAt('hre', level))).toEqual([
        'hre',
        'hre',
        'hre',
      ])
    })

    it('reads a vassal listed before its suzerain', () => {
      const levels = homageLevels([p('anjou', 'france'), p('france')])
      expect(levels.chainOf('anjou')).toEqual(['france', 'anjou'])
    })
  })

  describe('managed errors', () => {
    it('breaks a loop of homage, each polity on it read as its own root, and says it once', () => {
      const report = vi.fn()
      const levels = homageLevels([p('a', 'b'), p('b', 'a'), p('c', 'a')], report)
      expect(levels.chainOf('a')).toEqual(['a'])
      expect(levels.chainOf('b')).toEqual(['b'])
      expect(levels.chainOf('c')).toEqual(['a', 'c'])
      expect(levels.splitLevel('a', 'b')).toBe(0)
      expect(report).toHaveBeenCalledTimes(1)
      expect(report.mock.calls[0]?.[0]).toMatch(/^\[atlas\] homage forms a loop through "a", "b"/)
    })

    it('reads a polity owing itself as its own root', () => {
      const report = vi.fn()
      expect(homageLevels([p('a', 'a')], report).chainOf('a')).toEqual(['a'])
      expect(report).toHaveBeenCalledTimes(1)
    })

    it('says nothing for a year with no loop', () => {
      const report = vi.fn()
      homageLevels(YEAR, report)
      expect(report).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('throws on an id that names no polity of the year', () => {
      expect(() => homageLevels(YEAR).chainOf('ghost')).toThrow(/"ghost" names no polity/)
    })

    // The reader refuses such a year (`checkRegistry`); asked anyway, nothing is guessed.
    it('throws on a suzerain the registry lacks', () => {
      expect(() => homageLevels([p('anjou', 'ghost')])).toThrow(/owes "ghost"/)
    })
  })

  describe('edge cases', () => {
    it('answers a deepest level of 0 for no polity at all', () => {
      expect(homageLevels([]).deepest).toBe(0)
    })

    it('clamps a negative or fractional level into the chain', () => {
      const levels = homageLevels(YEAR)
      expect(levels.ancestorAt('nevers', -3)).toBe('france')
      expect(levels.ancestorAt('nevers', 1.7)).toBe('burgundy')
    })

    it('reads a chain of a thousand links without overflowing', () => {
      const chain = Array.from({ length: 1000 }, (_, i) =>
        p(`p${String(i)}`, i === 0 ? null : `p${String(i - 1)}`)
      )
      const levels = homageLevels(chain.reverse())
      expect(levels.deepest).toBe(999)
      expect(levels.splitLevel('p999', 'p998')).toBe(999)
    })
  })
})
