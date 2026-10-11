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
 * The polities, back to front.
 *
 * A suzerain the list does not hold is treated as no suzerain: the polity heads its own group. The
 * readers refuse that case on load; in the editor it is a transient state, and painting the polity is
 * better than dropping it.
 * @param polities - the year's polities, in list order — the order the stack is stored in
 * @returns the ids back to front, and those only reachable through a loop
 */
export function paintOrder(polities: readonly YearPolity[]): PaintOrder {
  const ids = new Set(polities.map((polity) => polity.id))
  const vassalsOf = new Map<string, string[]>()
  const roots: string[] = []
  for (const polity of polities) {
    if (polity.suzerain === null || !ids.has(polity.suzerain)) roots.push(polity.id)
    else vassalsOf.set(polity.suzerain, [...(vassalsOf.get(polity.suzerain) ?? []), polity.id])
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
