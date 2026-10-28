/**
 * Whose name each region carries at each display level (ATLAS-301, `files/plans/atlas/country-names.md`): the
 * polity whose colour it wears there — its own, or its suzerain's from afar (ATLAS-253, `homageLevels`).
 *
 * The half of the names' owners that reads the homage, so it lives here; the other half, which turns these
 * into a grid of owners, is `pipeline/ownerGrid` — the worker computes a finished year and never reads the
 * document's homage itself, so the page hands it these lists.
 */

import type { HomageLevels } from './homageLevels'

/**
 * The polity each region's colour belongs to at one display level.
 * @param regionPolities - each region's polity id, in the regions' order
 * @param homage - the year's homage
 * @param level - the display level, `0` and up
 * @returns the bearer of each region, in the regions' order
 * @throws when a region names no polity of the year — the homage refuses it, a defect
 */
export function regionBearers(
  regionPolities: readonly string[],
  homage: HomageLevels,
  level: number
): string[] {
  return regionPolities.map((id) => homage.ancestorAt(id, level))
}

/**
 * The bearers of each region at every display level of the year, from the sovereigns alone to the deepest.
 * @param regionPolities - each region's polity id, in the regions' order
 * @param homage - the year's homage
 * @returns one list per level, `0` to `homage.deepest`
 */
export function bearersByLevel(
  regionPolities: readonly string[],
  homage: HomageLevels
): string[][] {
  return Array.from({ length: homage.deepest + 1 }, (_, level) =>
    regionBearers(regionPolities, homage, level)
  )
}
