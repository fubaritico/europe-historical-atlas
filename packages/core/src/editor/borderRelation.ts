/**
 * What two polities are to each other, read off the chain of homage.
 *
 * **Two axes, never mixed** ([s08](../../../files/plans/cartographer/scenarii/s08-vassalage.md)). *Across*
 * the hierarchy — a vassal facing its own lord — is the **hand**, dotted. *Within* one lordship — two
 * things at the same depth under one crown — is the **weight**, which lightens as it goes deeper. Aquitaine
 * has both at once on different stretches of its own outline.
 *
 * The weight following the depth of the lowest common suzerain is what closes H-23 — *"does the hand weaken
 * by degree?"* — with the same arithmetic that answers two co-vassals, instead of a second convention. It is
 * also what a printed atlas does: a subdivision line gets lighter the deeper it goes.
 *
 * **Personal union is deliberately absent.** It is a link between peers, and the format records
 * `status: 'personal_union'` on each crown separately — two independent fields cannot say *which* union, so
 * nothing here could derive it without inventing. It stays an explicit pair override.
 */

import type { YearPolity } from '../data/yearFormat'

/** What a derived border is, before anyone dresses it. */
export type BorderRelation = 'sovereign' | 'vassal' | 'co-vassal' | 'unclaimed' | 'coastline'

/** A derived border's nature, and how deep in a hierarchy it sits. */
export interface RelationVerdict {
  /** What the two are to each other. */
  relation: BorderRelation
  /**
   * How deep the line sits: 0 for a limit between two polities owing nobody in common.
   *
   * For `vassal` it is the number of links between them — a rear-vassal facing its overlord is 2. For
   * `co-vassal` it is the depth of their lowest common suzerain, which is what the weight follows.
   */
  degree: number
}

/**
 * The chain of suzerains above a polity, nearest first, ending at one owing nobody.
 * @param id - the polity whose overlords are wanted
 * @param byId - the year's polities, by id
 * @returns the suzerain ids, nearest first; empty for a polity owing nobody. A loop of homage stops the
 * walk at the first polity seen twice
 */
function chainAbove(id: string, byId: ReadonlyMap<string, YearPolity>): string[] {
  const chain: string[] = []
  const seen = new Set<string>([id])
  let current = byId.get(id)?.suzerain ?? null
  while (current !== null && !seen.has(current)) {
    chain.push(current)
    seen.add(current)
    current = byId.get(current)?.suzerain ?? null
  }
  return chain
}

/**
 * What one polity is to another.
 *
 * Terminates on a loop of homage rather than spinning, but a loop is refused when the files are read
 * (`assembleAuthoredYear`) — the guard here is for a document being edited, where a loop can exist for the
 * moment between two gestures.
 * @param a - one polity's id
 * @param b - the other's
 * @param byId - every polity of the year, by id
 * @returns what they are to each other, and how deep
 */
export function relationBetween(
  a: string,
  b: string,
  byId: ReadonlyMap<string, YearPolity>
): RelationVerdict {
  if (a === b) return { relation: 'sovereign', degree: 0 }

  const aboveA = chainAbove(a, byId)
  const aboveB = chainAbove(b, byId)

  // One owes the other, directly or through a chain: across the hierarchy, so the vassal hand.
  const aUnderB = aboveA.indexOf(b)
  if (aUnderB !== -1) return { relation: 'vassal', degree: aUnderB + 1 }
  const bUnderA = aboveB.indexOf(a)
  if (bUnderA !== -1) return { relation: 'vassal', degree: bUnderA + 1 }

  // Neither owes the other. If they answer to the same crown, the line sits *inside* that lordship, and
  // its weight follows how deep. Both wrong answers are otherwise available: solid says they are
  // sovereigns, dotted says one owes the other.
  //
  // The degree is **the common suzerain's own depth**, plus one — not the number of links up to it from
  // one side. That distinction is not cosmetic: counting from one side makes the answer depend on which
  // polity was passed first, so the same border came out at two different weights depending on the order
  // the caller happened to use. Found by a test disagreeing with this code on 2026-09-28.
  for (const suzerain of aboveA)
    if (aboveB.includes(suzerain))
      return { relation: 'co-vassal', degree: chainAbove(suzerain, byId).length + 1 }

  // The dev's own ruling, 2026-09-27: two vassals of different suzerains are not in the same country, so
  // it is an ordinary border at full weight.
  return { relation: 'sovereign', degree: 0 }
}
