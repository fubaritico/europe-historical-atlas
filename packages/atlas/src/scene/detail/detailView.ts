/**
 * What the map shows for a level of detail, and the fade toward it in time (`files/plans/atlas/detail-levels.md`): at a
 * stop, every value slides to the new level's in {@link DETAIL_FADE_SECONDS}, whatever the wheel does meanwhile.
 */

import { CITY_IMPORTANCES } from '@europe-historical-atlas/core/data/cityImportance'

import { DETAIL_LEVELS, levelAt, nameReachAt } from './detailLevels'

import type { DetailLevel } from './detailLevels'
import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/** How long a change of level takes to fade in, in seconds: 0.35 first, then « un petit peu plus doux » (the dev, 31/10). */
export const DETAIL_FADE_SECONDS = 0.6

/** The values the layers read, each `0` hidden to whole. */
export interface DetailView {
  /** The share of their opacity the countries' names keep. */
  watermark: number
  /** The homage shown, in levels: `0` none, `1` the direct vassals, the year's deepest level for all. */
  vassals: number
  /** Each order's points, `0` to `1`. */
  cityPoints: Record<CityImportance, number>
  /** Each order's names, `0` to `1`. */
  cityNames: Record<CityImportance, number>
  /** How far from the point looked at a city's name shows, as a share of the camera's distance — not faded. */
  nameReach: number
  /** Whether the cities are drawn over the countries' names — an order, not faded: it turns at the level's change. */
  citiesOverNames: boolean
}

const share = (orders: readonly CityImportance[]): Record<CityImportance, number> =>
  Object.fromEntries(
    CITY_IMPORTANCES.map((order) => [order, orders.includes(order) ? 1 : 0])
  ) as Record<CityImportance, number>

/**
 * What a level shows, as values.
 * @param level - the level
 * @param deepest - the year's deepest level of homage
 * @param vassalsByLevel - the vassals revealed by level (the panel's switch); off, every vassal shows at every level
 * @returns its values
 */
export function viewOf(level: DetailLevel, deepest: number, vassalsByLevel: boolean): DetailView {
  const depth = Math.max(0, deepest)
  const vassals = !vassalsByLevel
    ? depth
    : { none: 0, direct: Math.min(1, depth), all: depth }[level.vassals]
  return {
    watermark: level.watermark,
    vassals,
    cityPoints: share(level.cityPoints),
    cityNames: share(level.cityNames),
    nameReach: level.nameReach[0],
    citiesOverNames: level.citiesOverNames,
  }
}

/**
 * One value moved toward its target by at most a step — a linear fade, so each change takes the same time. Shared by
 * the levels' fade and the cities' names' reach (`cities/cityMarkers`), which must keep one pace.
 * @param value - where it is
 * @param target - where it goes
 * @param step - how far it may move this frame
 * @returns where it is now
 */
export function toward(value: number, target: number, step: number): number {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step)
}

/**
 * A view moved toward another for a lapse of time: each value covers its whole range in {@link DETAIL_FADE_SECONDS}.
 * @param current - the view shown
 * @param target - the level's view
 * @param seconds - the time since the last frame
 * @param deepest - the year's deepest level of homage: the vassals' range
 * @returns the view to show
 */
export function fadeView(
  current: DetailView,
  target: DetailView,
  seconds: number,
  deepest: number
): DetailView {
  const step = Math.max(0, seconds) / DETAIL_FADE_SECONDS
  const each = (
    from: Record<CityImportance, number>,
    to: Record<CityImportance, number>
  ): Record<CityImportance, number> =>
    Object.fromEntries(
      CITY_IMPORTANCES.map((order) => [order, toward(from[order], to[order], step)])
    ) as Record<CityImportance, number>
  return {
    watermark: toward(current.watermark, target.watermark, step),
    vassals: toward(current.vassals, target.vassals, step * Math.max(1, deepest)),
    cityPoints: each(current.cityPoints, target.cityPoints),
    cityNames: each(current.cityNames, target.cityNames),
    // The reach is the zoom's, progressive within a level: it takes the target's at once.
    nameReach: target.nameReach,
    citiesOverNames: target.citiesOverNames,
  }
}

/** The level of detail across frames: the level chosen, and the view fading toward it. */
export interface DetailState {
  /**
   * The view for this frame: the level the zoom chooses, and how far the fade toward it has come.
   * @param zoom - the camera's zoom in `[0, 1]`
   * @param seconds - the time since the map started
   * @param deepest - the year's deepest level of homage
   * @param vassalsByLevel - the panel's switch for the vassals
   * @returns the view
   */
  frame(zoom: number, seconds: number, deepest: number, vassalsByLevel: boolean): DetailView
}

/**
 * The level of detail, starting on the first frame's level with no fade — the startup fades the map in by itself.
 * @param levels - the pyramid, furthest first
 * @returns its state
 */
export function createDetailState(levels: readonly DetailLevel[] = DETAIL_LEVELS): DetailState {
  let level = 0
  let view: DetailView | null = null
  let last = 0
  return {
    frame(zoom, seconds, deepest, vassalsByLevel) {
      level = levelAt(zoom, level, levels)
      const entry = levels[level]
      if (entry === undefined) throw new Error(`[Atlas] no level of detail ${String(level)}`)
      const target = {
        ...viewOf(entry, deepest, vassalsByLevel),
        nameReach: nameReachAt(levels, level, zoom),
      }
      view = view === null ? target : fadeView(view, target, seconds - last, deepest)
      last = seconds
      return view
    },
  }
}
