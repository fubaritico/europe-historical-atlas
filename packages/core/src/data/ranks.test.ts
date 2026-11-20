import { describe, expect, it } from 'vitest'

import { POLITY_RANKS, RANK_SCORES, outranks, rankScore } from './ranks'
import { isTribe, isUnfilled, tribeStyleOf } from './tribes'

describe('POLITY_RANKS', () => {
  describe('happy path', () => {
    it('offers the ranks the dev named on 2026-11-20, beside the ones the form had', () => {
      for (const rank of [
        'empire',
        'kingdom',
        'principality',
        'duchy',
        'county',
        'caliphate',
        'emirate',
        'imamate',
        'lordship',
        'archiepiscopal_lordship',
        'sultanate',
        'republic',
        'march',
        'viscounty',
        'khanate',
        'despotate',
        'people',
      ])
        expect(POLITY_RANKS).toContain(rank)
    })

    it('starts with the empire and ends with the two ranks of no importance', () => {
      expect(POLITY_RANKS[0]).toBe('empire')
      expect(POLITY_RANKS.slice(-2)).toEqual(['people', 'distant'])
    })
  })

  describe('variants', () => {
    it('holds the ranks the map draws with no fill under the very words core draws them by', () => {
      for (const rank of ['confederation', 'tribe', 'tribe_outlined', 'distant', 'people']) {
        expect(POLITY_RANKS).toContain(rank)
        expect(isUnfilled({ rank })).toBe(true)
      }
    })

    it('draws a people as a tribe: no border against another people, a tribe’s margin', () => {
      expect(isTribe({ rank: 'people' })).toBe(true)
      expect(tribeStyleOf({ rank: 'people' })).toBe('margin')
    })

    it('draws every other rank as a state, filled', () => {
      const unfilled = new Set(['confederation', 'tribe', 'tribe_outlined', 'distant', 'people'])
      for (const rank of POLITY_RANKS.filter((each) => !unfilled.has(each)))
        expect(isUnfilled({ rank })).toBe(false)
    })
  })

  // L3: N/A — a constant: nothing is refused
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('names no rank twice', () => {
      expect(new Set(POLITY_RANKS).size).toBe(POLITY_RANKS.length)
    })

    it('no longer offers « state », which is no rank', () => {
      expect(POLITY_RANKS).not.toContain('state')
    })
  })
})

describe('rankScore', () => {
  describe('happy path', () => {
    it('gives each rank the score the dev gave it on 2026-11-20', () => {
      expect(RANK_SCORES).toEqual({
        distant: 0,
        people: 0,
        tribe: 1,
        tribe_outlined: 1,
        confederation: 2,
        viscounty: 2,
        march: 3,
        principality: 3,
        county: 3,
        emirate: 3,
        lordship: 3,
        duchy: 4,
        republic: 4,
        imamate: 4,
        archiepiscopal_lordship: 4,
        khanate: 4,
        sultanate: 5,
        kingdom: 5,
        caliphate: 6,
        empire: 6,
        despotate: null,
      })
    })

    it('lists the ranks from the greatest score down, the unscored despotate left where it stands', () => {
      const scores = POLITY_RANKS.map(rankScore).filter((score) => score !== null)
      expect(scores).toEqual([...scores].sort((a, b) => b - a))
    })
  })

  describe('variants', () => {
    it('has no score for no rank, for a rank outside the list, for the despotate', () => {
      expect(rankScore(null)).toBeNull()
      expect(rankScore('city')).toBeNull()
      expect(rankScore('state')).toBeNull()
      expect(rankScore('despotate')).toBeNull()
    })
  })

  // L3: N/A — nothing is refused: a rank with no score is said as `null`
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('does not take a word every object answers to for a rank', () => {
      expect(rankScore('toString')).toBeNull()
      expect(rankScore('constructor')).toBeNull()
    })
  })
})

describe('outranks', () => {
  it('says nothing of a count under a march: the march scores as the county does', () => {
    // The dev, 2026-11-20: the nine counts under the marches of Tuscany, Verona and Styria are no fault.
    expect(outranks('county', 'march')).toBe(false)
    expect(outranks('march', 'county')).toBe(false)
  })

  it('still says a duchy under a march', () => {
    expect(outranks('duchy', 'march')).toBe(true)
  })

  it('says a kingdom under a county', () => {
    expect(outranks('kingdom', 'county')).toBe(true)
  })

  it('says nothing of a county under a kingdom', () => {
    expect(outranks('county', 'kingdom')).toBe(false)
  })

  it('says nothing of two equal scores: a principality under a county', () => {
    expect(outranks('principality', 'county')).toBe(false)
  })

  it('says nothing where one of the two has no score', () => {
    expect(outranks('empire', 'despotate')).toBe(false)
    expect(outranks('empire', null)).toBe(false)
    expect(outranks(null, 'tribe')).toBe(false)
    expect(outranks('empire', 'abbey')).toBe(false)
  })
})
