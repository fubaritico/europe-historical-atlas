/**
 * The order the polities are painted in — **one function, read by the Cartographer and the atlas**, so
 * the two cannot show a different map (`s16`).
 *
 * The dev's model, 2026-10-11, from Illustrator's layers: **a polity and its vassals form a group**, the
 * suzerain at the back of it, its vassals painted over it. The stack is the tree walked depth first —
 * the top-level groups in the order of the polities list, and within a group the suzerain, then each
 * vassal's own group, in list order. So a group moves with all its vassals, and a vassal is never under
 * its suzerain.
 *
 * Replaces the atlas's former rule, every vassal over every polity owing nobody: with it, an Empire
 * brought over France still sat under France's vassals.
 */

import type { YearPolity } from './yearFormat'

/** What {@link paintOrder} answers. */
export interface PaintOrder {
  /** Every polity's id, back to front. */
  order: string[]
  /**
   * The polities caught in a loop of homage, which no walk from a polity owing nobody can reach. They
   * are painted last, in list order, rather than lost or walked for ever — and named here so the caller
   * can say so. Always empty for a year `assembleAuthoredYear` accepted: it refuses a loop.
   */
  looped: string[]
}

/**
 * Each polity's group: the suzerain it is painted over — **the one definition of a sibling**, read by
 * `paintOrder` and by the stacking commands alike, so a Bring to Front cannot move what the map does not
 * paint as one block (review ARCH-001). A suzerain the list does not hold counts as none: the polity
 * heads its own group.
 * @param polities - the year's polities
 * @returns each id's effective suzerain, `null` for a top-level group
 */
export function effectiveSuzerains(polities: readonly YearPolity[]): Map<string, string | null> {
  const ids = new Set(polities.map((polity) => polity.id))
  return new Map(
    polities.map((polity) => [
      polity.id,
      polity.suzerain !== null && ids.has(polity.suzerain) ? polity.suzerain : null,
    ])
  )
}

/**
 * The polities, back to front.
 *
 * A suzerain the list does not hold is treated as no suzerain: the polity heads its own group. The
 * readers refuse that case on load; in the editor it is a transient state, and painting the polity is
 * better than dropping it.
 * @param polities - the year's polities, in list order — the order the stack is stored in
 * @returns the ids back to front, and those only reachable through a loop
 */
export function paintOrder(polities: readonly YearPolity[]): PaintOrder {
  const suzerains = effectiveSuzerains(polities)
  const vassalsOf = new Map<string, string[]>()
  const roots: string[] = []
  for (const polity of polities) {
    const suzerain = suzerains.get(polity.id) ?? null
    if (suzerain === null) roots.push(polity.id)
    else {
      const vassals = vassalsOf.get(suzerain)
      if (vassals === undefined) vassalsOf.set(suzerain, [polity.id])
      else vassals.push(polity.id)
    }
  }
  const order: string[] = []
  const placed = new Set<string>()
  const walk = (id: string): void => {
    if (placed.has(id)) return
    placed.add(id)
    order.push(id)
    for (const vassal of vassalsOf.get(id) ?? []) walk(vassal)
  }
  roots.forEach(walk)
  const looped = polities.map((polity) => polity.id).filter((id) => !placed.has(id))
  looped.forEach(walk)
  return { order, looped }
}

/**
 * Each polity's place in the paint order, 0 at the back — what a caller sorts its own items by. What to
 * do with an item naming no polity of the list stays the caller's: the atlas keeps such a claim and
 * skips it later, the Cartographer leaves it out.
 * @param polities - the year's polities, in list order
 * @returns each id's rank, back to front
 */
export function paintRanks(polities: readonly YearPolity[]): Map<string, number> {
  return new Map(paintOrder(polities).order.map((id, index) => [id, index]))
}

/**
 * A polity's vassals at any depth — its whole group below it. **The one definition of "below"**: the
 * document refuses a suzerain from it (`updatePolity`), and the form leaves it out of the suzerain list
 * (`suzerainChoices`), so the form never offers what the document refuses (review ARCH-001, 2026-10-12).
 *
 * Read on the declared suzerains, not the effective ones: a loop already in the list stops the walk
 * rather than spinning it.
 * @param polities - the year's polities
 * @param id - whose vassals
 * @returns their ids, the polity itself not included
 */
export function vassalsOf(polities: readonly YearPolity[], id: string): Set<string> {
  const below = new Set<string>()
  const frontier = [id]
  for (let at = frontier.pop(); at !== undefined; at = frontier.pop()) {
    for (const polity of polities) {
      if (polity.suzerain === at && polity.id !== id && !below.has(polity.id)) {
        below.add(polity.id)
        frontier.push(polity.id)
      }
    }
  }
  return below
}

/**
 * How deep a chain of homage may go: a polity owing nobody is at depth 0, its vassal at 1, and so on —
 * depth 8 is allowed, 9 refused (the dev's call, 2026-10-18, review QUAL-005 of ATLAS-253).
 *
 * **Why a limit at all**: the atlas spends one vertex attribute per homage level on the fills
 * (`atlas/src/scene/fillLayer.ts`), and WebGL guarantees only 16 of them. A chain deeper than the shader
 * can carry would make the fills vanish with no error. The dev expects one or two levels in practice; 8
 * leaves room and stays clear of the hardware floor. **Enforced wherever a chain can be made** — the reader
 * (`checkRegistry`), the document (`addPolity`, `updatePolity`) and the form's suzerain list — so an author
 * can never save a year the reader then refuses.
 */
export const MAX_HOMAGE_DEPTH = 8

/**
 * A polity's depth in its chain of homage: 0 when it owes nobody, 1 for a vassal of such a polity, and so on.
 *
 * Walks the declared suzerains. A suzerain the list does not hold ends the chain, as in
 * {@link effectiveSuzerains}; a loop already in the list stops the walk rather than spinning it, as in
 * {@link vassalsOf} — both are refused elsewhere (the readers, `updatePolity`).
 * @param polities - the year's polities
 * @param id - whose depth; an id the list does not hold is at depth 0
 * @returns the number of suzerains above it
 */
export function homageDepth(polities: readonly YearPolity[], id: string): number {
  const suzerainOf = new Map(polities.map((polity) => [polity.id, polity.suzerain]))
  const walked = new Set<string>([id])
  let depth = 0
  for (let at = suzerainOf.get(id) ?? null; at !== null; at = suzerainOf.get(at) ?? null) {
    if (!suzerainOf.has(at) || walked.has(at)) break
    walked.add(at)
    depth += 1
  }
  return depth
}

/**
 * How many levels of vassals hang below a polity: 0 with none, 1 with vassals only, 2 when one of them has
 * its own, and so on. Read on the declared suzerains, like {@link vassalsOf}; a loop stops the walk.
 * @param polities - the year's polities
 * @param id - whose vassals
 * @returns the depth of its deepest vassal, counted from it
 */
export function deepestVassalBelow(polities: readonly YearPolity[], id: string): number {
  const seen = new Set<string>([id])
  let level = [id]
  let depth = 0
  for (;;) {
    const lords = new Set(level)
    const next = polities
      .filter((polity) => polity.suzerain !== null && lords.has(polity.suzerain))
      .map((polity) => polity.id)
      .filter((vassal) => !seen.has(vassal))
    if (next.length === 0) return depth
    next.forEach((vassal) => seen.add(vassal))
    level = next
    depth += 1
  }
}

/**
 * Whether making `suzerain` the lord of `polityId` would push a chain of homage past
 * {@link MAX_HOMAGE_DEPTH} — **the polity itself or any vassal below it**, which goes down with it:
 * `homageDepth(suzerain) + 1 + deepestVassalBelow(polityId)`. The one definition read by the document
 * (`addPolity`, `updatePolity`) and the form's suzerain list (`suzerainChoices`), so the form never offers
 * what the document refuses.
 * @param polities - the year's polities
 * @param polityId - the polity whose suzerain is set, or `null` for one not created yet (no vassals)
 * @param suzerain - the suzerain proposed, or `null`
 * @returns `true` when the deepest polity of the moved group would sit deeper than the limit
 */
export function wouldExceedHomageDepth(
  polities: readonly YearPolity[],
  polityId: string | null,
  suzerain: string | null
): boolean {
  if (suzerain === null) return false
  const below = polityId === null ? 0 : deepestVassalBelow(polities, polityId)
  return homageDepth(polities, suzerain) + 1 + below > MAX_HOMAGE_DEPTH
}
