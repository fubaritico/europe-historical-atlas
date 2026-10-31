/**
 * The levels of detail (ATLAS-295, `files/plans/atlas/detail-levels.md`): the zoom is a scroll with stops, not a slope.
 * A level is chosen by the zoom; at a stop, everything fades to the new level in time, never with the wheel (the dev,
 * 2026-10-31, after Europa Universalis). **One table**, a pyramid of stops: adding, removing or inserting a level is a
 * row — *« des scroll top »*.
 */

import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/** How deep the vassals a level shows go. */
export type VassalDepth = 'none' | 'direct' | 'all'

/** One stop of the pyramid: where it starts, and what it shows. */
export interface DetailLevel {
  /** The zoom, `0` furthest out, from which this level is entered (moving in). */
  readonly from: number
  /** The share of their opacity the countries' names keep: `1` whole, less as a watermark. */
  readonly watermark: number
  /** The vassals shown. */
  readonly vassals: VassalDepth
  /** The orders of cities whose point shows. */
  readonly cityPoints: readonly CityImportance[]
  /** The orders of cities whose name shows. */
  readonly cityNames: readonly CityImportance[]
  /**
   * How far from the camera a city's name still shows (`cities/nameReach`), as shares of the camera's distance to the
   * point it looks at: at this level's stop, and at the next one (or the closest zoom) — **progressive between the two**,
   * the one thing here that follows the zoom (the dev, 2026-10-31: *« ils se réduisent encore au fur et à mesure qu'on
   * s'approche du plus haut niveau de zoom »*). `Infinity`: every name shows.
   */
  readonly nameReach: readonly [number, number]
  /**
   * Whether the cities are drawn over the countries' names, or under them — the order of the layers, per level (the
   * dev, 2026-11-01: afar the capitals' points sit under the names still whole; from the next level on, over them, the
   * names gone to their watermark). The first piece of an order of the layers by level, widened at its second case.
   */
  readonly citiesOverNames: boolean
}

/** No reach: every name the level shows, wherever it stands. */
const EVERYWHERE = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY] as const

/** Every order of cities. */
const ALL_CITIES: readonly CityImportance[] = ['capital', 'large-city', 'city']

/**
 * The pyramid, furthest first (the dev, 2026-10-31): afar, the countries and the capitals' points; then the watermark at
 * 40 %, the direct vassals, the capitals' names and the large cities' points — **a city enters by its point, its name a
 * level later**; then the watermark at 25 %, every vassal and every city with its name, near enough to the camera;
 * closest, the same with a reach that tightens as the zoom closes in. The stops' zooms and the reaches are tuned on
 * sight; their history is in the plan.
 */
export const DETAIL_LEVELS: readonly DetailLevel[] = [
  {
    from: 0,
    watermark: 1,
    vassals: 'none',
    cityPoints: ['capital'],
    cityNames: [],
    nameReach: EVERYWHERE,
    citiesOverNames: false,
  },
  {
    from: 0.45,
    watermark: 0.4,
    vassals: 'direct',
    cityPoints: ['capital', 'large-city'],
    cityNames: ['capital'],
    nameReach: EVERYWHERE,
    citiesOverNames: true,
  },
  {
    from: 0.65,
    watermark: 0.25,
    vassals: 'all',
    cityPoints: ALL_CITIES,
    cityNames: ALL_CITIES,
    nameReach: [1.5, 1.5],
    citiesOverNames: true,
  },
  {
    from: 0.8,
    watermark: 0.25,
    vassals: 'all',
    cityPoints: ALL_CITIES,
    cityNames: ALL_CITIES,
    nameReach: [1.45, 1.25],
    citiesOverNames: true,
  },
]

/**
 * The names' reach at a zoom within a level: from its value at the level's stop to its value at the next stop, or at
 * the closest zoom for the last level — progressive, unlike everything else a level shows.
 * @param levels - the pyramid, furthest first
 * @param index - the level shown
 * @param zoom - the camera's zoom in `[0, 1]`
 * @returns the reach, as a share of the camera's distance to the point it looks at
 */
export function nameReachAt(levels: readonly DetailLevel[], index: number, zoom: number): number {
  const level = levels[index]
  if (level === undefined) throw new Error(`[Atlas] no level of detail ${String(index)}`)
  const [start, end] = level.nameReach
  if (start === end) return start
  const until = levels[index + 1]?.from ?? 1
  const t =
    until > level.from ? Math.min(1, Math.max(0, (zoom - level.from) / (until - level.from))) : 1
  return start + (end - start) * t
}

/**
 * How far back of a stop the camera must go to leave its level: a level is entered at its `from` and left
 * this much further out, so a camera resting on a stop never flickers between two levels.
 */
export const DETAIL_HYSTERESIS = 0.02

/**
 * The level a zoom shows, given the one shown so far: the deepest whose stop the zoom has passed moving in, kept until
 * the zoom has gone back past that stop by the hysteresis.
 * @param zoom - the camera's zoom in `[0, 1]`
 * @param current - the level shown so far, an index in `levels`
 * @param levels - the pyramid, furthest first, the first starting at `0`
 * @returns the level to show, an index in `levels`
 */
export function levelAt(zoom: number, current: number, levels: readonly DetailLevel[]): number {
  let level = 0
  levels.forEach((entry, index) => {
    // A level already shown is left only past its stop by the hysteresis; one not shown yet is entered at its stop.
    const threshold = index <= current ? entry.from - DETAIL_HYSTERESIS : entry.from
    if (index > 0 && zoom >= threshold) level = index
  })
  return level
}
