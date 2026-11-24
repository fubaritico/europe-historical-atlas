import { APIError } from 'payload'

import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Refuse to enter a place again while its twin — the same Wikidata id — is in the bin (CMS-508, review ARCH-002). The
 * id is unique in the base, the bin included, and every search leaves the bin out: an agent that searched, found
 * nothing and created the place again would meet the base's bare refusal of a duplicate. Said first, with the record
 * to restore instead.
 * @param args - Payload's hook arguments
 * @param args.data - what is saved
 * @param args.operation - create or update
 * @param args.originalDoc - the place as stored, on an update
 * @param args.req - the request, so the search runs in its transaction
 * @returns the data, unchanged
 * @throws {APIError} 409, naming the place in the bin
 */
export const refuseBinnedTwin: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const wikidata = (data as { wikidata?: unknown }).wikidata
  const own = originalDoc as { id: number | string; wikidata?: unknown } | undefined
  if (typeof wikidata !== 'string' || wikidata === '') return data
  if (operation === 'update' && own?.wikidata === wikidata) return data
  const { docs } = await req.payload.find({
    collection: 'places',
    where: { and: [{ wikidata: { equals: wikidata } }, { deletedAt: { exists: true } }] },
    depth: 0,
    limit: 1,
    trash: true,
    req,
  })
  const twin = docs[0]
  if (twin === undefined) return data
  console.warn(`[CMS] a place ${wikidata} refused: its twin ${String(twin.id)} is in the bin`)
  throw new APIError(
    `Le lieu ${wikidata} est dans la corbeille : « ${twin.name} ». Restaurez-le plutôt que de le saisir à nouveau.`,
    409,
    undefined,
    true
  )
}
