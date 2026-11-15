import { formatHistoricalDate } from '@europe-historical-atlas/core/time/formatHistoricalDate'
import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from './dateReading'

import type { EventDateFields } from './historicalDate'

/** The words a link to no one is read by, in a link's title. */
const NO_ONE = 'personne'

/**
 * A title's name in the admin's lists and choices — « Mathias II — comté de Nantes, 1084–1103 » — so two titles of
 * one person, or of one land, never read as a duplicate. Never typed: written at every save.
 * @param person - the holder's French name
 * @param territory - the territory's French name
 * @param date - the title's date group
 * @returns the name, or `null` when the date cannot be read — the date field's own rule refuses the save then
 */
export function titleLabel(
  person: string,
  territory: string,
  date: EventDateFields
): string | null {
  const read = toHistoricalDate(date)
  if (isDateRefusal(read)) return null
  return `${person} — ${territory}, ${formatHistoricalDate(read, 'fr')}`
}

/**
 * A link's name in the admin's lists — « Mathias II — comté de Nantes, 1084–1103 → Alain IV — duché de Bretagne, 1084–1112 »,
 * or « … → personne » for a title that answers to no one.
 * @param vassal - the vassal title's name
 * @param suzerain - the suzerain title's name, or `null` when the link says it answers to no one
 * @returns the name
 */
export function linkLabel(vassal: string, suzerain: string | null): string {
  return `${vassal} → ${suzerain ?? NO_ONE}`
}
