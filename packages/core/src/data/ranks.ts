/**
 * The ranks a polity can have — **one list, read by the Cartographer's form and by the CMS's register of territories**
 * (the dev, 2026-11-20, CARTO-487: *"in the CMS, in the Cartographer"* — the form lacked the caliphate and the
 * lordship, the register the peoples and the republic). In the order of their importance, the greatest first, as the
 * dev scored them the same day (CORE-489); the despotate, not scored yet, stands with the ranks it is nearest.
 *
 * A year's file still takes any text for a rank — the vocabulary is open (`yearFormat`), and a value read from a file
 * stays valid; this is what the forms **offer**.
 */

import {
  CONFEDERATION_RANK,
  DISTANT_RANK,
  PEOPLE_RANK,
  TRIBE_OUTLINED_RANK,
  TRIBE_RANK,
} from './tribes'

/** The ranks offered, as stored in a year's file and in the CMS, the greatest first. */
export const POLITY_RANKS = [
  'empire',
  'caliphate',
  'kingdom',
  'sultanate',
  'duchy',
  'republic',
  'imamate',
  // A cleric's temporal power over a land — « archevêché souverain » in the dev's words.
  'archiepiscopal_lordship',
  'khanate',
  'despotate',
  'principality',
  'county',
  'emirate',
  'lordship',
  'march',
  'viscounty',
  // The peoples, drawn with no fill (`tribes`): a confederation of tribes, a tribe, a tribe drawn by its rim.
  CONFEDERATION_RANK,
  TRIBE_RANK,
  TRIBE_OUTLINED_RANK,
  // A people known by its name alone, and a country whose history is not told.
  PEOPLE_RANK,
  DISTANT_RANK,
] as const

/** One of {@link POLITY_RANKS}. */
export type PolityRank = (typeof POLITY_RANKS)[number]

/**
 * Each rank's **score of importance**, given by the dev (2026-11-20, CORE-489): what the hierarchical ladder is checked
 * against — a vassal never outranks its suzerain. `null` for a rank he has not scored yet: the despotate, which does
 * not appear before 1204 (Epirus) — to decide before the map of 1300.
 */
export const RANK_SCORES: Readonly<Record<PolityRank, number | null>> = {
  empire: 6,
  caliphate: 6,
  kingdom: 5,
  sultanate: 5,
  duchy: 4,
  republic: 4,
  imamate: 4,
  archiepiscopal_lordship: 4,
  khanate: 4,
  despotate: null,
  principality: 3,
  county: 3,
  emirate: 3,
  lordship: 3,
  // 2 at first, then 3 the same day (the dev, 2026-11-20): a margrave stands above a count and below a duke, and nine
  // counts under the marches of Tuscany, Verona and Styria were said at fault. Equal to the county: nothing is said.
  march: 3,
  viscounty: 2,
  [CONFEDERATION_RANK]: 2,
  [TRIBE_RANK]: 1,
  [TRIBE_OUTLINED_RANK]: 1,
  [PEOPLE_RANK]: 0,
  [DISTANT_RANK]: 0,
}

/**
 * A rank's score.
 * @param rank - the rank as stored, `null` for none — any text: a year's file and the CMS hold ranks outside the list
 * @returns its score, or `null` when it has none: no rank, a rank outside the list (a city, an abbey, an office), or
 *   one the dev has not scored
 */
export function rankScore(rank: string | null): number | null {
  if (rank === null || !Object.hasOwn(RANK_SCORES, rank)) return null
  return RANK_SCORES[rank as PolityRank]
}

/**
 * Whether a vassal **outranks its suzerain** — its score the higher of the two, which the hierarchical ladder does not
 * allow (the dev, 2026-11-20): a kingdom (5) under a county (3). Equal scores are fine, and **nothing is said of a
 * rank with no score**: the check speaks only of what the dev scored.
 * @param vassal - the vassal's rank, as stored
 * @param suzerain - its suzerain's rank, as stored
 * @returns `true` when both have a score and the vassal's is the higher
 */
export function outranks(vassal: string | null, suzerain: string | null): boolean {
  const below = rankScore(vassal)
  const above = rankScore(suzerain)
  return below !== null && above !== null && below > above
}
