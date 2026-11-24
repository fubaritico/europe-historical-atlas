import { APIError } from 'payload'

import { mapRelations } from '../fields/mapRelations'

import { isSet } from './claimDependants'

import type { CollectionBeforeChangeHook, Field, PayloadRequest } from 'payload'

/**
 * Refuse to take a record out of the bin while a record it cites is still in it (CMS-508, review SEC-001 · ARCH-001 ·
 * QUAL-001). A record goes into the bin before what it stands on — the sheet, then its place, then its source — so it
 * comes back after: restored first, the sheet would stand on a place nobody sees, and Payload, which populates a
 * relation into the bin as a live record (3.92, `collections/dataloader.ts`), would carry that place into the export.
 * The record still in the bin is named, to be restored first.
 *
 * Read from the collection's own fields, so a relation added later is checked without a list to keep: every
 * relationship, in a list, a group, a row or a tab, towards a collection with a bin.
 */

/** A record a field points at. */
interface Pointer {
  /** The collection pointed at. */
  readonly collection: string
  /** The record's id. */
  readonly id: number | string
}

/**
 * The id a relationship's value holds: an id, a populated record, or a polymorphic `{ relationTo, value }`.
 * @param value - one value of the field
 * @param relationTo - the collections the field points at
 * @returns the record pointed at, or `null` for an empty value
 */
function pointerOf(value: unknown, relationTo: string | string[]): Pointer | null {
  if (value === null || typeof value !== 'object') return idPointer(value, relationTo)
  const shaped = value as { id?: unknown; relationTo?: unknown; value?: unknown }
  // A polymorphic value names its own collection
  if (typeof shaped.relationTo === 'string') return pointerOf(shaped.value, shaped.relationTo)
  return idPointer(shaped.id, relationTo)
}

/**
 * A bare id, read as a record of the field's one collection — a field pointing at two cannot tell which.
 * @param id - the id, or anything else
 * @param relationTo - the collections the field points at
 * @returns the record pointed at, or `null`
 */
function idPointer(id: unknown, relationTo: string | string[]): Pointer | null {
  const isId = typeof id === 'number' || typeof id === 'string'
  return isId && typeof relationTo === 'string' ? { collection: relationTo, id } : null
}

/**
 * Every record a record's fields point at.
 * @param fields - the fields
 * @param doc - the record, or a row of a list, or a group's value
 * @returns the records pointed at
 */
export function pointersOf(fields: readonly Field[], doc: unknown): Pointer[] {
  const pointers: Pointer[] = []
  // The one walk over a record's relations (CMS-509, review ARCH-001), read only: every value is given back as it was
  mapRelations(fields, doc, (value, relationTo) => {
    const pointer = pointerOf(value, relationTo)
    if (pointer !== null) pointers.push(pointer)
    return value
  })
  return pointers
}

/**
 * The records among those pointed at that are in the bin, by their name.
 * @param pointers - the records pointed at
 * @param req - the request, so the search runs in its transaction
 * @returns their names, « name (collection) »
 */
async function binnedAmong(pointers: readonly Pointer[], req: PayloadRequest): Promise<string[]> {
  const byCollection = new Map<string, (number | string)[]>()
  // Read by a name the fields give: Payload's type knows only its own slugs
  const collections = req.payload.collections as Partial<
    Record<string, { config: { trash?: boolean } }>
  >
  for (const { collection, id } of pointers) {
    if (collections[collection]?.config.trash !== true) continue
    byCollection.set(collection, [...(byCollection.get(collection) ?? []), id])
  }
  const names: string[] = []
  for (const [collection, ids] of byCollection) {
    const { docs } = await req.payload.find({
      collection: collection as 'places',
      where: { and: [{ id: { in: ids } }, { deletedAt: { exists: true } }] },
      depth: 0,
      pagination: false,
      trash: true,
      req,
    })
    for (const doc of docs as {
      id: number | string
      label?: unknown
      title?: unknown
      name?: unknown
    }[]) {
      const said = [doc.label, doc.title, doc.name].find((each) => typeof each === 'string')
      names.push(`« ${typeof said === 'string' ? said : String(doc.id)} » (${collection})`)
    }
  }
  return names
}

/**
 * The hook: a restore — `deletedAt` emptied on a record that held one — is refused while a record it points at is in
 * the bin.
 * @param args - Payload's hook arguments
 * @param args.collection - the collection the record is in, for its fields
 * @param args.data - what is saved
 * @param args.operation - create or update
 * @param args.originalDoc - the record as stored
 * @param args.req - the request
 * @returns the data, unchanged
 * @throws {APIError} 409, naming what is still in the bin
 */
export const refuseRestoringOverBin: CollectionBeforeChangeHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  const before = originalDoc as { id: number | string; deletedAt?: unknown } | undefined
  const changing = data as { deletedAt?: unknown }
  const restoring =
    operation === 'update' &&
    before !== undefined &&
    isSet(before.deletedAt) &&
    'deletedAt' in changing &&
    !isSet(changing.deletedAt)
  if (!restoring) return data
  const binned = await binnedAmong(pointersOf(collection.fields, { ...before, ...data }), req)
  if (binned.length === 0) return data
  console.warn(
    `[CMS] restoring ${String(before.id)} of ${collection.slug} refused: ${String(binned.length)} record(s) it cites are in the bin`
  )
  throw new APIError(
    `Cette fiche cite ce qui est encore dans la corbeille : ${binned.join(', ')}. Restaurez-le d’abord.`,
    409,
    undefined,
    true
  )
}
