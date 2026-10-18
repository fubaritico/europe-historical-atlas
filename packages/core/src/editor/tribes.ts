import type { DerivedBorder } from './derivedBorders'
import type { YearPolity } from '../data/yearFormat'

/**
 * A **tribe** is a people not yet sovereign — the Prussians, the Cumans, the Obotrites — and it is drawn as
 * one: **no fill and no border, its colour full at the heart of its ground and vanishing toward its limit**
 * (`tribeFeather`, ATLAS-258, the dev's option A of 2026-10-18: a people's limit is vague). It replaced the
 * dashed outline of 2026-10-15, which he judged *« ça fonctionne pas. C'est pas beau »*; the colour is still
 * the one a fill would have had (*« la couleur de remplissage sera plutôt la couleur des traits en
 * pointillés »*).
 *
 * **Read off the rank, a free text of the registry**: `tribe`, exactly. The rank is the author's word for
 * what a polity is, so it is also what decides how it is drawn; nothing else in the registry says it.
 *
 * **Its fading colour is its limit, except against a state**: a derived border between two tribes, or between
 * a tribe and the sea or unclaimed ground, is not drawn — a hard line along a limit drawn as vague would
 * contradict it. A border between a tribe and a polity that is not one **is** drawn, as that polity's border
 * in its hand (the dev, 2026-10-18: the state's border stays a solid line where a tribe touches it).
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
 * Whether a derived border is a tribe's edge alone — tribes on every side it has, so no state's border runs
 * there and nothing is drawn: two tribes side by side, or a tribe against the sea or unclaimed ground.
 * @param border - the border, who it separates at least
 * @param tribes - the ids of the year's tribes
 * @returns `true` when one of the polities it separates is a tribe and none is anything else
 */
export function isTribeEdge(
  border: Pick<DerivedBorder, 'between'>,
  tribes: ReadonlySet<string>
): boolean {
  return border.between.length > 0 && border.between.every((id) => tribes.has(id))
}
