import type { BorderRelation } from './borderRelation'
import type { DerivedBorder } from './derivedBorders'

/**
 * How each kind of border is drawn — the hands of `s08` (*the five hands*), as one table.
 *
 * **Geometry of the stroke only, never its colours**: the pattern, whether it is cased, and its weight. Each
 * application inks it in its own palette (the atlas's cream core in a brown casing, the Cartographer's
 * the same), so a change here redraws both alike — the dev's rule for the rivers, applied to the borders.
 *
 * **Claude's proposal for D2, not yet the dev's decision** (`files/plans/borders/plan.md`): one constant
 * read by both apps, a panel to edit it later.
 */

/** A stroke's pattern. `none` draws nothing — a coast is already drawn by the coastline itself. */
export type HandPattern = 'solid' | 'dotted' | 'dashed' | 'double' | 'none'

/** How one kind of border is drawn. */
export interface BorderHand {
  /** The pattern. */
  pattern: HandPattern
  /** Whether it is a light core inside a dark casing — the atlas's border — or one dark stroke. */
  cased: boolean
  /** A multiplier of the application's base width. */
  weight: number
}

/**
 * The hand of each relation (`s08`):
 * - between two sovereigns, solid and cased;
 * - between a vassal and its suzerain, dotted — the relation crosses the hierarchy;
 * - between two vassals of one lord, solid and lighter — a limit within one lordship (*the weight
 *   follows the depth of the lowest common suzerain*);
 * - against ground nobody claims, the frontier: one dark stroke, as the atlas draws it today;
 * - a coastline, nothing.
 */
export const RELATION_HANDS: Readonly<Record<BorderRelation, BorderHand>> = {
  sovereign: { pattern: 'solid', cased: true, weight: 1 },
  vassal: { pattern: 'dotted', cased: true, weight: 1 },
  'co-vassal': { pattern: 'solid', cased: true, weight: 0.6 },
  unclaimed: { pattern: 'solid', cased: false, weight: 1 },
  coastline: { pattern: 'none', cased: false, weight: 1 },
}

/** The patterns an authored hand may name. */
const PATTERNS: readonly HandPattern[] = ['solid', 'dotted', 'dashed', 'double', 'none']

/**
 * Whether an authored hand names a pattern this table knows.
 * @param hand - the hand as the file holds it
 * @returns `true` for one of {@link HandPattern}
 */
function isHandPattern(hand: string): hand is HandPattern {
  return PATTERNS.some((pattern) => pattern === hand)
}

/**
 * The hand a border is drawn in: the one its author set, else its relation's.
 *
 * An authored hand that names no known pattern is drawn by the relation's rule and **said** — the file
 * holds it, so nothing is lost, but a stroke the renderer cannot draw must not pass for one it drew.
 * @param border - the border, its relation and any authored hand
 * @param warn - where an unknown hand is said; the console in the applications
 * @returns how to draw it
 */
export function handFor(
  border: Pick<DerivedBorder, 'relation' | 'hand'>,
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): BorderHand {
  const rule = RELATION_HANDS[border.relation]
  if (border.hand === null) return rule
  if (isHandPattern(border.hand)) return { ...rule, pattern: border.hand }
  warn(`[borders] the hand "${border.hand}" names no pattern; drawn as its relation's.`)
  return rule
}
