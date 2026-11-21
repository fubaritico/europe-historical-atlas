import { APIError } from 'payload'

import { relationId } from '../fields/relationId'

import type { CollectionBeforeChangeHook } from 'payload'

/** The HTTP status of a refused save: the request is wrong, not the server. */
const BAD_REQUEST = 400

/** The sheet's field the refusal is said under. */
export const PERIOD_NAME_PATH = 'periodName'

/**
 * A sheet's name of the time is a name **of its own place** (CMS-495): the sheet of Ankara in 1100 pointing at a name
 * entered for Smyrna would write « Smyrne » over Ankara on the map, with a source that never said so. Refused at
 * save, whatever reaches the API — the form filters its choices by the place, the MCP does not.
 * @param args - Payload's hook arguments
 * @param args.data - the sheet as it will be saved, every field filled from the saved one on an update
 * @param args.req - the request, whose Payload reads the name
 * @returns the data, unchanged
 * @throws {APIError} when the name chosen belongs to another place — said under the field, kept in the console
 */
export const refuseForeignPeriodName: CollectionBeforeChangeHook = async ({ data, req }) => {
  const name = relationId(data.periodName)
  const place = relationId(data.place)
  if (name === null || place === null) return data
  const chosen = await req.payload.findByID({
    collection: 'period-names',
    id: name,
    depth: 0,
    req,
  })
  const owner = relationId(chosen.place)
  if (String(owner) === String(place)) return data
  console.warn(
    `[CMS] the sheet of place ${String(place)} was refused the name ${String(name)}, which is place ${String(owner)}'s`
  )
  const message = `Le nom d’époque « ${chosen.label ?? String(name)} » est celui d’un autre lieu : choisissez un nom de ce lieu, ou créez-le.`
  throw new APIError(message, BAD_REQUEST, { errors: [{ path: PERIOD_NAME_PATH, message }] }, true)
}
