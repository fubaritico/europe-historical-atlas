import { describe, expect, expectTypeOf, it } from 'vitest'

import { STATE_ORDER, isOfferedState, stateChoices } from './stateChoices'

import type { CityVerdict, CityVerdictKind } from './cityVerdict'
import type { CityMark } from '../../../../state/citiesSlice'

/**
 * Cities of 1100 and their verdicts.
 * @param kinds - each city's state, its id its index
 * @returns the cities and the verdicts by id
 */
function year(kinds: readonly CityVerdictKind[]): {
  cities: CityMark[]
  verdicts: ReadonlyMap<string, CityVerdict>
} {
  const cities = kinds.map((_, index): CityMark => ({
    id: String(index),
    name: String(index),
    lon: 0,
    lat: 0,
    date: {
      kind: 'instant',
      at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
    },
    holder: null,
    holderSources: [],
  }))
  const verdicts = new Map(
    kinds.map((kind, index): [string, CityVerdict] => [
      String(index),
      { onMap: null, bySources: null, kind },
    ])
  )
  return { cities, verdicts }
}

// CARTO-369, `s20`: « By state », the yellow ones first.
describe('stateChoices', () => {
  describe('happy path', () => {
    it('counts the cities of each state: two misplaced, one at the right place', () => {
      const { cities, verdicts } = year(['misplaced', 'agrees', 'misplaced'])
      expect(stateChoices(cities, verdicts)).toEqual([
        { kind: 'misplaced', count: 2 },
        { kind: 'toDeclare', count: 0 },
        { kind: 'cannotCompare', count: 0 },
        { kind: 'agrees', count: 1 },
      ])
    })
  })

  describe('variants', () => {
    it('leaves « not entered » out: it is the holders’ « No holder » box', () => {
      const { cities, verdicts } = year(['notEntered', 'toDeclare'])
      expect(stateChoices(cities, verdicts).map(({ kind }) => kind)).toEqual([...STATE_ORDER])
      expect(STATE_ORDER).not.toContain('notEntered')
    })
  })

  describe('managed errors', () => {
    // Review of CARTO-371: a state read back from the browser that no box stands for must not filter.
    it('offers « misplaced » and « agrees », not « notEntered » nor a name read back that is no state', () => {
      expect(['misplaced', 'agrees', 'notEntered', 'foo'].map(isOfferedState)).toEqual([
        true,
        true,
        false,
        false,
      ])
    })
  })

  describe('edge cases', () => {
    // Review ARCH-002: a new verdict added to cityVerdict must get its box, or be left out here on purpose.
    it('offers every state a verdict can be but « not entered », checked by the types', () => {
      expectTypeOf<
        Exclude<Exclude<CityVerdictKind, 'notEntered'>, (typeof STATE_ORDER)[number]>
      >().toEqualTypeOf<never>()
    })

    it('offers every state at 0 for a year with no city', () => {
      expect(stateChoices([], new Map()).every(({ count }) => count === 0)).toBe(true)
    })
  })

  // L3, L4: N/A — a count over values the verdicts already gave.
})
