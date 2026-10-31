import { describe, expect, it } from 'vitest'

import { DETAIL_HYSTERESIS, DETAIL_LEVELS, levelAt, nameReachAt } from './detailLevels'
import { DETAIL_FADE_SECONDS, createDetailState, fadeView, viewOf } from './detailView'

import type { DetailLevel } from './detailLevels'

/**
 * A level of the pyramid.
 * @param index - furthest first
 * @returns it
 */
function entry(index: number): DetailLevel {
  const level = DETAIL_LEVELS[index]
  if (level === undefined) throw new Error(`no level ${String(index)}`)
  return level
}

describe('levelAt', () => {
  describe('happy path', () => {
    it('chooses the deepest level whose stop the zoom has passed', () => {
      expect([
        levelAt(0, 0, DETAIL_LEVELS),
        levelAt(0.5, 0, DETAIL_LEVELS),
        levelAt(0.7, 0, DETAIL_LEVELS),
        levelAt(0.9, 0, DETAIL_LEVELS),
      ]).toEqual([0, 1, 2, 3])
    })
  })

  describe('nameReachAt', () => {
    it('keeps every name at the levels with no reach', () => {
      expect(nameReachAt(DETAIL_LEVELS, 1, 0.5)).toBe(Number.POSITIVE_INFINITY)
    })

    it('tightens the reach across the last level, toward the closest zoom', () => {
      const last = DETAIL_LEVELS.length - 1
      const [start, end] = entry(last).nameReach
      const from = entry(last).from
      expect(nameReachAt(DETAIL_LEVELS, last, from)).toBeCloseTo(start)
      expect(nameReachAt(DETAIL_LEVELS, last, (from + 1) / 2)).toBeCloseTo((start + end) / 2)
      expect(nameReachAt(DETAIL_LEVELS, last, 1)).toBeCloseTo(end)
    })

    it('holds a level’s reach when its two ends are alike', () => {
      expect(nameReachAt(DETAIL_LEVELS, 2, 0.7)).toBe(entry(2).nameReach[0])
    })
  })

  describe('variants', () => {
    it('keeps a level just past its stop on the way back, by the hysteresis', () => {
      const stop = entry(1).from
      expect(levelAt(stop - DETAIL_HYSTERESIS / 2, 1, DETAIL_LEVELS)).toBe(1)
      expect(levelAt(stop - DETAIL_HYSTERESIS * 2, 1, DETAIL_LEVELS)).toBe(0)
    })

    it('enters a level only at its stop, not within the hysteresis below it', () => {
      expect(levelAt(entry(1).from - DETAIL_HYSTERESIS / 2, 0, DETAIL_LEVELS)).toBe(0)
    })

    it('takes a level inserted between two others as one more row', () => {
      const pyramid = [entry(0), { ...entry(1), from: 0.3 }, entry(1), entry(2)]
      expect(levelAt(0.35, 0, pyramid)).toBe(1)
      expect(levelAt(0.5, 0, pyramid)).toBe(2)
    })
  })

  // L3: N/A — every zoom chooses a level.
  // L4: N/A — pure arithmetic.

  describe('edge cases', () => {
    it('jumps across several stops at once on a fast zoom', () => {
      expect(levelAt(1, 0, DETAIL_LEVELS)).toBe(3)
    })
  })
})

describe('viewOf', () => {
  it('shows afar the capitals’ points, whole names and no vassal', () => {
    expect(viewOf(entry(0), 2, true)).toEqual({
      watermark: 1,
      vassals: 0,
      cityPoints: { capital: 1, 'large-city': 0, city: 0 },
      cityNames: { capital: 0, 'large-city': 0, city: 0 },
      nameReach: Number.POSITIVE_INFINITY,
      citiesOverNames: false,
    })
  })

  it('shows at the second level the names at 40 %, the direct vassals and the capitals’ names', () => {
    expect(viewOf(entry(1), 2, true)).toMatchObject({
      watermark: 0.4,
      vassals: 1,
      cityNames: { capital: 1, 'large-city': 0, city: 0 },
    })
  })

  it('shows close the names at 25 %, every vassal and every city with its name', () => {
    expect(viewOf(entry(2), 2, true)).toMatchObject({
      watermark: 0.25,
      vassals: 2,
      cityNames: { capital: 1, 'large-city': 1, city: 1 },
    })
  })

  it('shows every vassal at every level when the panel’s switch is off', () => {
    expect(viewOf(entry(0), 2, false).vassals).toBe(2)
  })

  it('shows no vassal in a year that has none, even close', () => {
    expect(viewOf(entry(2), 0, true).vassals).toBe(0)
  })
})

describe('fadeView', () => {
  it('moves every value toward its target at one range per fade length', () => {
    const from = viewOf(entry(0), 2, true)
    const to = viewOf(entry(2), 2, true)

    const half = fadeView(from, to, DETAIL_FADE_SECONDS / 2, 2)

    expect(half.watermark).toBeCloseTo(1 - 0.5)
    expect(half.vassals).toBeCloseTo(1)
    expect(half.cityNames.city).toBeCloseTo(0.5)
  })

  it('stops at the target, never past it', () => {
    const from = viewOf(entry(0), 2, true)
    const to = viewOf(entry(2), 2, true)

    expect(fadeView(from, to, 10, 2)).toEqual(to)
  })

  it('does not move when no time has passed, or a clock went back', () => {
    const from = viewOf(entry(0), 2, true)
    const to = viewOf(entry(2), 2, true)

    // The reach is not faded: it is the zoom's, taken at once.
    expect(fadeView(from, to, 0, 2)).toEqual({
      ...from,
      nameReach: to.nameReach,
      citiesOverNames: to.citiesOverNames,
    })
    expect(fadeView(from, to, -1, 2)).toEqual({
      ...from,
      nameReach: to.nameReach,
      citiesOverNames: to.citiesOverNames,
    })
  })
})

describe('createDetailState', () => {
  it('starts on the first frame’s level with no fade', () => {
    const state = createDetailState()

    expect(state.frame(0.9, 0, 1, true).watermark).toBe(0.25)
  })

  it('fades to a new level over time, whatever the zoom does meanwhile', () => {
    const state = createDetailState()
    state.frame(0, 0, 1, true)

    const mid = state.frame(0.9, DETAIL_FADE_SECONDS / 2, 1, true)
    const end = state.frame(0.95, DETAIL_FADE_SECONDS * 2, 1, true)

    expect(mid.cityNames.city).toBeCloseTo(0.5)
    expect(end.cityNames.city).toBe(1)
  })
})
