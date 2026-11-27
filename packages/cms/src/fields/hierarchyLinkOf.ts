import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from './dateReading'
import { relationId } from './relationId'

import type { EventDateFields } from './historicalDate'
import type { HierarchyLink } from '@europe-historical-atlas/core/data/hierarchyChain'

/** A hierarchical link as the CMS stores it — its relations bare or populated. */
export interface StoredLink {
  /** Its id. */
  readonly id: number | string
  /** The vassal's title. */
  readonly vassal?: unknown
  /** Whom it answers to: `suzerain` or `no-one`. */
  readonly answersTo?: unknown
  /** The suzerain's title, when it names one. */
  readonly suzerain?: unknown
  /** Its date group. */
  readonly date?: EventDateFields | null
}

/**
 * A stored link as `core`'s chain reads it (`hierarchyChain`): « no one » becomes a sovereign link, a suzerain becomes
 * the title it answers to.
 *
 * A link that cannot say whom it answers to — its suzerain gone, its vassal gone, its date unreadable — is left out:
 * the chain then says « we do not know » above that title, never a sovereign, so nothing broken reads as certain.
 * @param link - the link as stored
 * @returns the link for the chain, or `null` when it is left out
 */
export function hierarchyLinkOf(link: StoredLink): HierarchyLink | null {
  const vassal = relationId(link.vassal)
  if (vassal === null || link.date === undefined || link.date === null) return null
  const date = toHistoricalDate(link.date)
  if (isDateRefusal(date)) return null
  const base = { id: String(link.id), vassal: String(vassal), date }
  if (link.answersTo === 'no-one') return { ...base, suzerain: null }
  const suzerain = relationId(link.suzerain)
  return suzerain === null ? null : { ...base, suzerain: String(suzerain) }
}
