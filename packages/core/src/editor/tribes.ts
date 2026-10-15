import type { DerivedBorder } from './derivedBorders'
import type { YearPolity } from '../data/yearFormat'

/**
 * A **tribe** is a people not yet sovereign — the Prussians, the Cumans, the Obotrites — and it is drawn as
 * one: **no fill, its outline dashed in its colour** (the dev, 2026-10-15: *« quand une policy prend une
 * couleur, c'est qu'elle atteint une certaine souveraineté »*, and *« la couleur de remplissage sera plutôt
 * la couleur des traits en pointillés »*).
 *
 * **Read off the rank, a free text of the registry**: `tribe`, exactly. The rank is the author's word for
 * what a polity is, so it is also what decides how it is drawn; nothing else in the registry says it.
 *
 * **Its outline stands in for its borders**: a derived border with a tribe on either side is not drawn, the
 * tribe's own dashed contour being the line there. Two strokes along one stretch would read as two limits.
 * Claude's call, said to the dev the same evening, not yet walked in the application.
 */

/** The rank that makes a polity a tribe. */
export const TRIBE_RANK = 'tribe'

/**
 * Whether a polity is a tribe.
 * @param polity - the polity, its rank at least
 * @returns `true` when its rank is {@link TRIBE_RANK}
 */
export function isTribe(polity: Pick<YearPolity, 'rank'>): boolean {
  return polity.rank === TRIBE_RANK
}

/**
 * The ids of every tribe of a registry.
 * @param polities - the registry's polities
 * @returns the ids of those that are tribes
 */
export function tribeIds(polities: readonly Pick<YearPolity, 'id' | 'rank'>[]): Set<string> {
  return new Set(polities.filter(isTribe).map((polity) => polity.id))
}

/**
 * Whether a derived border has a tribe on either side — and so is drawn by that tribe's outline instead.
 * @param border - the border, who it separates at least
 * @param tribes - the ids of the year's tribes
 * @returns `true` when one of the polities it separates is a tribe
 */
export function touchesTribe(
  border: Pick<DerivedBorder, 'between'>,
  tribes: ReadonlySet<string>
): boolean {
  return border.between.some((id) => tribes.has(id))
}
