import { relationId } from '../fields/relationId'
import { sheetTitle } from '../fields/sheetTitle'

import type { EventDateFields } from '../fields/historicalDate'
import type { CollectionAfterChangeHook, Payload, PayloadRequest, Where } from 'payload'

/** A sheet as `find` reads it here: its place populated in French. */
interface ReadSheet {
  /** Its id. */
  id: number | string
  /** Its title as saved, absent before the title existed. */
  title?: string | null
  /** Its place, populated, or its id when the place could not be read. */
  place: unknown
  /** Its date group. */
  date: EventDateFields
}

/**
 * The title a sheet should carry, from its place's French name — `null` when that name or the date cannot be read.
 * @param sheet - the sheet, its place populated
 * @returns the title
 */
function dueTitle(sheet: ReadSheet): string | null {
  const place = sheet.place as { name?: unknown } | null
  if (relationId(sheet.place) === null || typeof place?.name !== 'string') return null
  return sheetTitle(place.name, sheet.date)
}

/**
 * Save again every selected city sheet whose title is not the one its place's French name and its date give, so
 * `writeSheetTitle` writes it anew — nothing else changes: on an update Payload fills every field the request leaves
 * out from the saved sheet. A sheet already right is not touched, so running it twice saves nothing the second time.
 * @param payload - the base
 * @param where - which sheets
 * @param req - the request to stay in, when there is one: its transaction, and the place it has just saved
 * @returns how many sheets were saved again
 */
export async function retitleSheets(
  payload: Payload,
  where: Where,
  req?: PayloadRequest
): Promise<number> {
  const inRequest = req === undefined ? {} : { req }
  const { docs } = await payload.find({
    collection: 'place-periods',
    where,
    depth: 1,
    locale: 'fr',
    pagination: false,
    ...inRequest,
  })
  const stale = (docs as unknown as ReadSheet[]).filter((sheet) => dueTitle(sheet) !== sheet.title)
  for (const sheet of stale) {
    await payload.update({ collection: 'place-periods', id: sheet.id, data: {}, ...inRequest })
  }
  return stale.length
}

/**
 * A place saved: its sheets whose title no longer matches follow — a renamed place, in whatever language the admin
 * is, or « Paris — 1100 » would stay under the old name with nothing to say so. Comparing the titles rather than the
 * names is what makes the admin's language irrelevant: the title is always written from the French name.
 * @param args - Payload's hook arguments
 * @param args.doc - the place as saved
 * @param args.req - the request
 * @returns the place, unchanged
 */
export const retitlePlaceSheets: CollectionAfterChangeHook = async ({ doc, req }) => {
  const place = doc as { id: number | string }
  await retitleSheets(req.payload, { place: { equals: place.id } }, req)
  return place
}
