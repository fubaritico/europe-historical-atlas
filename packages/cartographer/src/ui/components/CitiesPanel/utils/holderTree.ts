import type { MapHolderChoice } from './holderChoices'

/**
 * A suzerain's box covers its whole descent (CARTO-388, the dev, 2026-11-08: *"si je coche le royaume de France, ça
 * devrait inclure ses vassaux aussi"*). The map's « Royaume de France » is what is left once its vassals are carved out —
 * the royal domain — and a city is filtered by who holds it directly; so ticking France ticks the keys of France **and
 * of every polity under it**, its vassals and theirs. The tree is {Polities}' (`polityRows`): a polity is followed by
 * its descent, each one deeper.
 */

/** A box's state: all its keys ticked, some of them (the design system's mixed state), or none. */
export type TreeBoxState = 'checked' | 'mixed' | 'unchecked'

/**
 * Each polity's keys in the filter — its own and its whole descent's, the polities without a Wikidata id having none.
 * @param onMap - the map's polities as the dialogue lists them, in the tree's order, the whole list (never one a filter
 *   narrowed: a vassal hidden by what is typed is still under its suzerain)
 * @returns the keys each polity's box stands for, by the polity's id
 */
export function treeKeys(
  onMap: readonly MapHolderChoice[]
): ReadonlyMap<string, readonly string[]> {
  return new Map(
    onMap.map((choice, index) => {
      const keys = choice.key === null ? [] : [choice.key]
      for (const below of onMap.slice(index + 1)) {
        if (below.depth <= choice.depth) break
        if (below.key !== null) keys.push(below.key)
      }
      return [choice.id, keys]
    })
  )
}

/**
 * The keys one polity's box stands for.
 * @param keys - every polity's keys, from {@link treeKeys} over the whole list
 * @param id - the polity's id
 * @returns its keys
 * @throws when the polity is not in the list the keys were built from — a defect: the rows shown are always drawn from
 *   that list, so a box standing for nothing would silently filter nothing; the zone's error boundary shows it instead
 */
export function keysOf(
  keys: ReadonlyMap<string, readonly string[]>,
  id: string
): readonly string[] {
  const found = keys.get(id)
  if (found === undefined)
    throw new Error(`[Cartographer] ${id} is not in the advanced filters' tree`)
  return found
}

/**
 * The state of a box that stands for several keys.
 * @param keys - the keys it stands for
 * @param ticked - the keys ticked
 * @returns `checked` when all are, `mixed` when some are, `unchecked` when none is — or when it stands for none
 */
export function treeBoxState(keys: readonly string[], ticked: ReadonlySet<string>): TreeBoxState {
  const on = keys.filter((key) => ticked.has(key)).length
  if (on === 0) return 'unchecked'
  return on === keys.length ? 'checked' : 'mixed'
}
