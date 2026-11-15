/**
 * The chain of vassalage of a place at a year — never entered, computed from the links (CMS-422, step 2;
 * `files/plans/contribution/vassal-chain.md`, layer 3). The sheet of a place names its holder as a **title** — a person
 * holding a territory over a period (Mathias II, count of Nantes); a **link** says that a title answers to another over
 * a period (the count of Nantes to the duke of Brittany), entered once and read by every place under it. From the
 * sheet's title, the links valid in the year are followed, title after title, up to a title that answers to no one.
 *
 * Pure: the CMS shows the chain under a sheet's holder, the Cartographer will compare a city with the polity drawn
 * under it through it (CARTO-435), the atlas will read it on a click.
 */

import { dateCoversYear } from '../time/dateOverlap'

import type { HistoricalDate } from '../time/historicalDate'

/** A link of vassalage: a title answering to another over a period, as a source states it. */
export interface VassalLink {
  /** The link's id, so the chain can name the link each step came by. */
  readonly id: string
  /** The title that answers — the vassal's. */
  readonly vassal: string
  /** The title it answers to — the suzerain's — or `null` when the source states it answers to no one. */
  readonly suzerain: string | null
  /** When it holds: a year alone covers its year, an interval its years, both included (`dateCoversYear`). */
  readonly date: HistoricalDate
}

/** Why a branch of the chain ends where it does. */
export type ChainEnd =
  /** A link valid in the year says the title answers to no one: a sovereign, as a source states it. */
  | 'sovereign'
  /** No link valid in the year says whom the title answers to: beyond it, we do not know. */
  | 'unknown'
  /** The links lead back to a title already in this branch: the entries contradict one another. */
  | 'loop'

/** One title of the chain, and what lies above it. */
export interface ChainNode {
  /** The title. */
  readonly title: string
  /** The link this title was reached by, from the one below; `null` for the sheet's own title. */
  readonly via: string | null
  /**
   * The titles it answers to in the year, one per link valid then — **two or more when the sources diverge**, each
   * kept with its own branch (the hatching); empty when the branch ends here.
   */
  readonly above: readonly ChainNode[]
  /** Why the branch ends here, when `above` is empty; `null` while it goes on. */
  readonly end: ChainEnd | null
}

/**
 * The chain of vassalage of a title at a year: every link valid in the year followed, branch by branch.
 *
 * A link saying « answers to no one » ends its branch as sovereign; no link at all ends it as unknown — *beyond, we
 * do not know*, the third cause of uncertainty, never a silent gap. A title reached twice in one branch ends it as a
 * loop rather than climbing forever.
 * @param title - the title the place's sheet names as its holder
 * @param year - the year of the sheet, a historical year
 * @param links - the links entered, whatever their dates
 * @returns the chain, its root the sheet's title
 */
export function vassalChain(title: string, year: number, links: readonly VassalLink[]): ChainNode {
  const valid = links.filter((link) => dateCoversYear(link.date, year))
  return climb(title, null, valid, new Set())
}

/**
 * One title and its branches above, the titles already met on the way up kept for the loop.
 * @param title - the title
 * @param via - the link it was reached by
 * @param valid - the links valid in the year
 * @param below - the titles of this branch under it
 * @returns its node
 */
function climb(
  title: string,
  via: string | null,
  valid: readonly VassalLink[],
  below: ReadonlySet<string>
): ChainNode {
  if (below.has(title)) return { title, via, above: [], end: 'loop' }
  const out = valid.filter((link) => link.vassal === title)
  if (out.length === 0) return { title, via, above: [], end: 'unknown' }
  const met = new Set([...below, title])
  const above = out
    .filter((link): link is VassalLink & { suzerain: string } => link.suzerain !== null)
    .map((link) => climb(link.suzerain, link.id, valid, met))
  // Every valid link names a suzerain → the chain goes on; only « no one » links → sovereign. When the sources
  // diverge between « no one » and a suzerain, the suzerain's branch is kept and the « no one » reading with it.
  const sovereign = out.some((link) => link.suzerain === null)
  if (above.length === 0) return { title, via, above, end: 'sovereign' }
  return { title, via, above, end: sovereign ? 'sovereign' : null }
}

/**
 * Every path of a chain from the sheet's title to the end of a branch — one path when the sources agree, one per
 * branch when they diverge. What a screen lists: « count of Nantes → duke of Brittany → king of France ».
 * @param chain - the chain
 * @returns each path, its titles from the sheet's up, and how it ends
 */
export function chainPaths(chain: ChainNode): { titles: string[]; end: ChainEnd }[] {
  if (chain.above.length === 0) {
    // `vassalChain` ends every branch with its reason; a node without one is not a chain it built
    if (chain.end === null)
      throw new Error(`[core] a chain's branch ends at ${chain.title} with no reason`)
    return [{ titles: [chain.title], end: chain.end }]
  }
  const paths = chain.above.flatMap((node) =>
    chainPaths(node).map((path) => ({ titles: [chain.title, ...path.titles], end: path.end }))
  )
  // A title read as sovereign by one source and as a vassal by another: its « no one » reading is a path of its own
  return chain.end === 'sovereign' ? [{ titles: [chain.title], end: 'sovereign' }, ...paths] : paths
}
