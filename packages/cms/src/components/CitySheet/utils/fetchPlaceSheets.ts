import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from '../../../fields/dateReading'

import type { EventDateFields } from '../../../fields/dateReading'
import type { SavedSheet } from '../../../fields/sheetOverlap'

/**
 * A place's sheets already saved, read from the base — what the overlap rule is played against while the contributor
 * types (decision 7), the same rule the server plays at save.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root: `/api`
 * @param place - the place's id
 * @returns every sheet of the place, its id and its date
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses, answers something that is not a list of sheets, or a sheet whose date
 *   does not read — the overlap cannot be played against it, so the read fails as a whole and the form says so
 */
export async function fetchPlaceSheets(
  fetcher: typeof fetch,
  api: string,
  place: number | string
): Promise<SavedSheet[]> {
  const params = new URLSearchParams({
    'where[place][equals]': String(place),
    depth: '0',
    pagination: 'false',
    'select[date]': 'true',
  })
  const response = await fetcher(`${api}/place-periods?${params.toString()}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`[CMS] the place's sheets could not be read (${String(response.status)})`)
  }
  const answer = (await response.json()) as { docs?: unknown }
  if (!Array.isArray(answer.docs)) throw new Error("[CMS] the place's sheets answered no list")
  return answer.docs.map((doc: unknown) => {
    const { id, date } = (doc ?? {}) as { id?: unknown; date?: unknown }
    if (
      (typeof id !== 'number' && typeof id !== 'string') ||
      typeof date !== 'object' ||
      date === null
    ) {
      throw new Error("[CMS] a place's sheet came without its id or its date")
    }
    const sheet = { id, date: date as EventDateFields }
    if (isDateRefusal(toHistoricalDate(sheet.date))) {
      throw new Error(`[CMS] the place's sheet ${String(id)} holds a date that does not read`)
    }
    return sheet
  })
}
