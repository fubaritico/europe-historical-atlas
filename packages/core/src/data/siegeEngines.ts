/**
 * The artillery a siege is drawn with, in front of its tower — chosen by the siege's date from the periods the
 * contribution holds, each backed by sources (ATLAS-286, `files/plans/contribution/siege-engines.md`).
 *
 * Pure: the contribution's export asks it which engin goes with a siege, and the atlas only draws the answer.
 */

import { isAfter } from '../time/historicalDate'

import type { HistoricalDate, HistoricalMoment } from '../time/historicalDate'

/**
 * The engins the atlas knows how to draw: the traction trebuchet (the medieval *mangonel*, pulled by hand), the
 * counterweight trebuchet, the cannon. No catapult: the torsion engine is Roman (Purton, « The myth of the mangonel »,
 * 2006).
 */
export const SIEGE_ENGINES = ['traction-trebuchet', 'counterweight-trebuchet', 'cannon'] as const

/** One of {@link SIEGE_ENGINES}. */
export type SiegeEngine = (typeof SIEGE_ENGINES)[number]

/** When an engin was in use, as the sources give it. */
export interface SiegeEnginePeriod {
  /** The engin. */
  engine: SiegeEngine
  /** From when to when it was in use; an instant is a beginning with no end yet — still in use. */
  inUse: HistoricalDate
}

/**
 * Where a date begins: an instant's moment, an interval's first end.
 * @param date - the date
 * @returns its first moment
 */
function startOf(date: HistoricalDate): HistoricalMoment {
  return date.kind === 'instant' ? date.at : date.from
}

/**
 * Whether a moment falls within a period of use, both ends included, at the precision both share (`isAfter`). A
 * circa end is read at its best-estimate year, its margin aside.
 * @param period - the period
 * @param at - the moment
 * @returns `true` when the engin was in use then
 */
function inUseAt(period: SiegeEnginePeriod, at: HistoricalMoment): boolean {
  if (isAfter(startOf(period.inUse), at)) return false
  return period.inUse.kind === 'instant' || !isAfter(at, period.inUse.to)
}

/**
 * The engin a siege is drawn with: of those in use when it began, **the newest** — the one whose use began last (the
 * dev, 2026-10-27). Two that began at the same moment: the first given.
 * @param periods - every engin's period of use
 * @param date - the siege's date; its beginning decides
 * @returns the engin, or `null` when no period covers the date — the caller says so, the map shows the tower alone
 */
export function siegeEngineAt(
  periods: readonly SiegeEnginePeriod[],
  date: HistoricalDate
): SiegeEngine | null {
  const at = startOf(date)
  let newest: SiegeEnginePeriod | null = null
  for (const period of periods) {
    if (!inUseAt(period, at)) continue
    if (newest === null || isAfter(startOf(period.inUse), startOf(newest.inUse))) newest = period
  }
  return newest === null ? null : newest.engine
}
