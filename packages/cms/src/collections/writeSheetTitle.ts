import { relationId } from '../fields/relationId'
import { sheetTitle } from '../fields/sheetTitle'

import type { EventDateFields } from '../fields/historicalDate'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Write a city sheet's title from its place's French name and its date, at every save — the title is never typed.
 *
 * A sheet with no place, or with a date that cannot be read, is left to those fields' own rules, which refuse the
 * save — as `refuseOverlap` leaves them; no title is written for a sheet that is not saved.
 * @param args - Payload's hook arguments
 * @param args.data - the sheet as it will be saved, every field filled from the saved one on an update
 * @param args.req - the request, whose Payload reads the place
 * @returns the data, with its title
 */
export const writeSheetTitle: CollectionBeforeChangeHook = async ({ data, req }) => {
  const place = relationId(data.place)
  const date = data.date as EventDateFields | undefined
  if (place === null || date === undefined) return data
  const { name } = await req.payload.findByID({
    collection: 'places',
    id: place,
    depth: 0,
    locale: 'fr',
    req,
  })
  const title = sheetTitle(name, date)
  return title === null ? data : { ...data, title }
}
