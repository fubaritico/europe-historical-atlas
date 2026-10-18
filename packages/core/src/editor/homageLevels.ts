/**
 * Homage as a level of detail — what the atlas shows of a year's vassals at each zoom (ATLAS-253,
 * `files/plans/atlas/vassal-lod.md`, the dev's idea of 2026-10-18).
 *
 * **The level of a polity** is its depth in the homage chain: 0 owes nobody, 1 owes a level-0 polity, and
 * so on. **A display level L** is what the zoom shows: a polity of depth `d` wears the colour of its
 * ancestor at depth `min(L, d)` — so a sub-vassal goes through its direct suzerain's colour before its own,
 * never straight from the root's. **A border's split level** is the first L at which its two sides wear
 * different colours, which is the length of the chains' common prefix: 0 between two independent realms,
 * `k + 1` between two polities whose deepest shared ancestor sits at depth `k` — a vassal and its own
 * suzerain included, the suzerain being that shared ancestor.
 *
 * **Every suzerain is in the registry**: `assembleAuthoredYear` (`data/yearConsistency`, `checkRegistry`)
 * refuses a year whose polity owes an id no entry holds, so nothing here substitutes for one. Asked
 * anyway, the chain walk asks for that id's own chain and throws — a defect said, never a root guessed.
 *
 * **A loop of homage** is refused at input too, by the same check and by the Cartographer's form; a file
 * edited by hand is the one way to meet one here. It is broken where it repeats: each polity on the loop
 * is read as its own root, the polities hanging under it keep their chain down to it, and the loop is said
 * once per derivation — a hang has no message, and a guessed suzerain would paint one realm in another's
 * colour.
 */

import type { YearPolity } from '../data/yearFormat'

/** A year's homage, read once, answering by polity id. */
export interface HomageLevels {
  /**
   * A polity's chain, its root first and itself last.
   * @param id - the polity
   * @returns the ids from the root down to it
   * @throws when the id names no polity of the year — every id the atlas asks about comes from a claim or
   *   a region the reader matched against the registry, so a miss is a defect
   */
  chainOf: (id: string) => readonly string[]
  /**
   * The polity whose colour a polity wears at a display level.
   * @param id - the polity
   * @param level - the display level, `0` and up
   * @returns its ancestor at depth `min(level, depth)` — itself at or past its own depth
   */
  ancestorAt: (id: string, level: number) => string
  /**
   * The first display level at which two polities wear different colours.
   * @param a - one side of the border
   * @param b - the other side
   * @returns `0` for two roots apart, `k + 1` when their deepest shared ancestor sits at depth `k`
   */
  splitLevel: (a: string, b: string) => number
  /** The deepest depth of the year — the last display level that changes anything. */
  deepest: number
}

/**
 * The polities that sit on a loop of homage.
 * @param suzerainOf - each polity's declared suzerain
 * @returns the ids on a loop; empty for any year the reader accepted
 */
function loopMembers(suzerainOf: ReadonlyMap<string, string | null>): Set<string> {
  const onLoop = new Set<string>()
  const settled = new Set<string>()
  for (const start of suzerainOf.keys()) {
    const path: string[] = []
    const onPath = new Map<string, number>()
    let current: string | null | undefined = start
    while (current !== null && current !== undefined && !settled.has(current)) {
      const seenAt = onPath.get(current)
      if (seenAt !== undefined) {
        for (const id of path.slice(seenAt)) onLoop.add(id)
        break
      }
      onPath.set(current, path.length)
      path.push(current)
      current = suzerainOf.get(current)
    }
    for (const id of path) settled.add(id)
  }
  return onLoop
}

/**
 * Climb from a polity to the first polity whose chain is already read, or to a root — a loop member being
 * one. Iterative, so a long chain cannot overflow the stack.
 * @param id - where to start
 * @param suzerainOf - each polity's declared suzerain
 * @param onLoop - the polities on a loop, each read as its own root
 * @param chains - the chains already read
 * @returns the polities climbed, the start first, and the chain they hang from (empty under a root)
 * @throws when a suzerain names no polity of the year — refused by the reader, so a defect
 */
function climb(
  id: string,
  suzerainOf: ReadonlyMap<string, string | null>,
  onLoop: ReadonlySet<string>,
  chains: ReadonlyMap<string, readonly string[]>
): { climbed: string[]; base: readonly string[] } {
  const climbed: string[] = []
  let current = id
  for (;;) {
    climbed.push(current)
    const suzerain = onLoop.has(current) ? null : (suzerainOf.get(current) ?? null)
    if (suzerain === null) return { climbed, base: [] }
    const above = chains.get(suzerain)
    if (above !== undefined) return { climbed, base: above }
    if (!suzerainOf.has(suzerain))
      throw new Error(`[atlas] "${current}" owes "${suzerain}", which names no polity of the year`)
    current = suzerain
  }
}

/**
 * A memoised reader of chains, root first.
 * @param suzerainOf - each polity's declared suzerain
 * @param onLoop - the polities on a loop, each read as its own root
 * @returns the chain of a polity, by id
 */
function chainReader(
  suzerainOf: ReadonlyMap<string, string | null>,
  onLoop: ReadonlySet<string>
): (id: string) => readonly string[] {
  const chains = new Map<string, readonly string[]>()
  return (id: string): readonly string[] => {
    const known = chains.get(id)
    if (known !== undefined) return known
    if (!suzerainOf.has(id)) throw new Error(`[atlas] "${id}" names no polity of the year`)
    const { climbed, base } = climb(id, suzerainOf, onLoop, chains)
    // Built back down, so every polity climbed past is read once and kept.
    let chain = base
    for (let at = climbed.length - 1; at >= 0; at -= 1) {
      const polity = climbed[at]
      if (polity === undefined) continue
      chain = [...chain, polity]
      chains.set(polity, chain)
    }
    return chain
  }
}

/**
 * Read a year's homage as levels of detail.
 * @param polities - the year's polities, each with its suzerain
 * @param report - where a loop of homage is said; the console, as an error, in the application
 * @returns the chains, the colour-bearer at a level, the split level of a pair and the deepest level
 */
export function homageLevels(
  polities: readonly Pick<YearPolity, 'id' | 'suzerain'>[],
  report: (message: string) => void = (message) => {
    console.error(message)
  }
): HomageLevels {
  const suzerainOf = new Map(polities.map((polity) => [polity.id, polity.suzerain]))
  const onLoop = loopMembers(suzerainOf)
  if (onLoop.size > 0)
    report(
      `[atlas] homage forms a loop through ${[...onLoop].map((id) => `"${id}"`).join(', ')}; each is read as its own root.`
    )

  const chainOf = chainReader(suzerainOf, onLoop)

  let deepest = 0
  for (const polity of polities) deepest = Math.max(deepest, chainOf(polity.id).length - 1)

  return {
    chainOf,
    deepest,
    ancestorAt(id: string, level: number): string {
      const chain = chainOf(id)
      const at = Math.max(0, Math.min(Math.floor(level), chain.length - 1))
      // `at` is inside the chain, which holds the polity itself at least.
      return chain[at] ?? id
    },
    splitLevel(a: string, b: string): number {
      const one = chainOf(a)
      const other = chainOf(b)
      const shorter = Math.min(one.length, other.length)
      let prefix = 0
      while (prefix < shorter && one[prefix] === other[prefix]) prefix += 1
      return prefix
    },
  }
}
