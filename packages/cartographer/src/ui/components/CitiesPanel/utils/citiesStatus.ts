import type { CitiesLoad } from '../../../../state/citiesSlice'
import type { CitiesPanelMessageKey } from '../i18n'

/** What the panel says in place of the list, as a message and its values. */
export interface CitiesStatus {
  /** The message. */
  readonly key: CitiesPanelMessageKey
  /** Its values. */
  readonly values: Record<string, string>
}

/**
 * What the panel says in place of the list — while the cities are read, when they could not be, when the year open
 * has none — or `null` when there is a list to show.
 * @param load - where the load stands
 * @param count - how many cities the year open has
 * @param year - the year open
 * @returns the message, or `null`
 */
export function citiesStatus(load: CitiesLoad, count: number, year: number): CitiesStatus | null {
  if (load.state === 'loading') return { key: 'loading', values: {} }
  if (load.state === 'failed') return { key: 'failed', values: { reason: load.reason } }
  return count === 0 ? { key: 'none', values: { year: String(year) } } : null
}
