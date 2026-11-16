import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from './dateReading'

import type { EventDateFields } from './historicalDate'
import type { VassalLink } from '@europe-historical-atlas/core/data/vassalChain'

/** A title as the CMS stores it, as much as its sovereignty needs. */
export interface StoredTitle {
  /** Its id. */
  readonly id: number | string
  /** Whether it is ticked « souverain »: it answers to no one over its dates. */
  readonly sovereign?: boolean | null
  /** Its date group: when it is held. */
  readonly date?: EventDateFields | null
}

/**
 * A title ticked « souverain » as the end of a chain (the dev, 2026-11-16: *"the sovereign, you mark it as the
 * sovereign"* — never a link saying it answers to no one): over the title's own dates, `core`'s chain stops at it as at
 * a sovereign. A title not ticked, or whose date cannot be read, ends nothing.
 * @param title - the title as stored
 * @returns the link that ends the chain at it, or `null`
 */
export function sovereignLinkOf(title: StoredTitle): VassalLink | null {
  if (title.sovereign !== true) return null
  const date = title.date === undefined || title.date === null ? null : toHistoricalDate(title.date)
  if (date === null || isDateRefusal(date)) {
    // No refusal is silent: ticked, it ends nothing — said, so the chain's « we do not know » can be traced to it
    console.warn(
      `[CMS] the title ${String(title.id)} is ticked « souverain » but its date cannot be read`
    )
    return null
  }
  return { id: `sovereign:${String(title.id)}`, vassal: String(title.id), suzerain: null, date }
}
