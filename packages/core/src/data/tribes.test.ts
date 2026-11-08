import { describe, expect, it } from 'vitest'

import { asSeenAcrossTribes, isTribe, isTribeEdge, tribeIds } from './tribes'

const POLITIES = [
  { id: 'prussians', rank: 'tribe' },
  { id: 'franks', rank: 'kingdom' },
  { id: 'cumans', rank: 'tribe' },
  { id: 'nobody', rank: null },
]

describe('tribes', () => {
  describe('happy path', () => {
    it('reads a polity ranked tribe as a tribe', () => {
      expect(isTribe({ rank: 'tribe' })).toBe(true)
    })

    it('collects the ids of every tribe of the registry', () => {
      expect([...tribeIds(POLITIES)]).toEqual(['prussians', 'cumans'])
    })
  })

  describe('variants', () => {
    it('reads a kingdom as no tribe', () => {
      expect(isTribe({ rank: 'kingdom' })).toBe(false)
    })

    it('reads a border between a tribe and a kingdom as the kingdom’s, not a tribe’s edge', () => {
      expect(isTribeEdge({ between: ['franks', 'prussians'] }, tribeIds(POLITIES))).toBe(false)
    })

    it('reads a border between two tribes as a tribe’s edge', () => {
      expect(isTribeEdge({ between: ['prussians', 'cumans'] }, tribeIds(POLITIES))).toBe(true)
    })

    it('reads a tribe alone against the sea as a tribe’s edge', () => {
      expect(isTribeEdge({ between: ['cumans'] }, tribeIds(POLITIES))).toBe(true)
    })

    it('reads a border between two kingdoms as no tribe’s edge', () => {
      expect(isTribeEdge({ between: ['franks', 'nobody'] }, tribeIds(POLITIES))).toBe(false)
    })
  })

  describe('managed errors', () => {
    // L3: N/A — nothing is refused; a rank is a free text and any value is an answer.
    it('reads a polity with no rank as no tribe', () => {
      expect(isTribe({ rank: null })).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — pure reads over arrays.
    it('reads a border naming nobody as no tribe’s edge', () => {
      expect(isTribeEdge({ between: [] }, tribeIds(POLITIES))).toBe(false)
    })
  })

  describe('edge cases', () => {
    // The rank is compared exactly: the night of 2026-10-14 wrote `people`, which is not a tribe until renamed.
    it('does not read the rank people as a tribe', () => {
      expect(isTribe({ rank: 'people' })).toBe(false)
    })

    it('does not read a capitalised Tribe as a tribe', () => {
      expect(isTribe({ rank: 'Tribe' })).toBe(false)
    })
  })
})

/** Two tribes of the Baltic. */
const TRIBES = new Set(['prussians', 'curonians'])

/**
 * A border as `asSeenAcrossTribes` reads it.
 * @param between - who it separates
 * @param relation - its relation, read off the chain of homage
 * @returns the border, no authored hand
 */
const border = (between: string[], relation: 'sovereign' | 'vassal' = 'sovereign') => ({
  between,
  relation,
  hand: null as string | null,
})

// The dev, 2026-10-18: across a tribe a state shows its frontier — « on ne peut pas considérer une tribu
// comme un état ».
describe('asSeenAcrossTribes', () => {
  describe('happy path', () => {
    it('reads a border between a tribe and a kingdom as a frontier against unclaimed ground', () => {
      expect(asSeenAcrossTribes(border(['poland', 'prussians']), TRIBES)).toEqual({
        between: ['poland', 'prussians'],
        relation: 'unclaimed',
        hand: null,
      })
    })
  })

  describe('variants', () => {
    it('reads a tribe vassal of the kingdom it borders as that kingdom’s frontier, not the vassal hand', () => {
      expect(asSeenAcrossTribes(border(['poland', 'prussians'], 'vassal'), TRIBES).relation).toBe(
        'unclaimed'
      )
    })

    it('sets an authored hand aside across a tribe', () => {
      expect(
        asSeenAcrossTribes({ ...border(['prussians', 'poland']), hand: 'double' }, TRIBES).hand
      ).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('returns a border between two states as it was, the same object', () => {
      const between = border(['poland', 'hungary'])
      expect(asSeenAcrossTribes(between, TRIBES)).toBe(between)
    })
  })

  // L4: N/A — a pure reading of three fields, nothing thrown.

  describe('edge cases', () => {
    it('returns every border as it was when the year has no tribe', () => {
      const between = border(['poland', 'prussians'])
      expect(asSeenAcrossTribes(between, new Set())).toBe(between)
    })
  })
})
