import { APIError } from 'payload'

import type {
  CollectionAfterChangeHook,
  CollectionBeforeDeleteHook,
  PayloadRequest,
  Where,
} from 'payload'

/**
 * Save again every record a query finds, so its `beforeChange` hook rewrites the name it copies from what changed.
 * @param req - the request, so the saves run in its transaction
 * @param collection - where the dependants are
 * @param where - which of them depend on the record changed
 */
async function resave(
  req: PayloadRequest,
  collection: 'titles' | 'vassal-links',
  where: Where
): Promise<void> {
  const { docs } = await req.payload.find({ collection, where, depth: 0, pagination: false, req })
  for (const doc of docs) {
    await req.payload.update({ collection, id: doc.id, data: {}, depth: 0, req })
  }
}

/**
 * After a person or a territory is changed, its titles are saved again, so their names follow it (a renamed count, a
 * corrected territory); each title saved then refreshes its links (`refreshLinksOfTitle`). A new record has none.
 * @param field - the title's field that points at the collection changed: `person` or `territory`
 * @returns the hook
 */
export function refreshTitlesOf(field: 'person' | 'territory'): CollectionAfterChangeHook {
  return async ({ doc, operation, req }) => {
    const saved = doc as { id: number | string }
    if (operation === 'update') await resave(req, 'titles', { [field]: { equals: saved.id } })
    return saved
  }
}

/**
 * After a title is changed, the links that name it are saved again, so their names follow it.
 * @param args - Payload's hook arguments
 * @param args.doc - the title saved
 * @param args.operation - create or update — a new title has no link yet
 * @param args.req - the request
 * @returns the title
 */
export const refreshLinksOfTitle: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  const saved = doc as { id: number | string }
  if (operation === 'update') {
    await resave(req, 'vassal-links', {
      or: [{ vassal: { equals: saved.id } }, { suzerain: { equals: saved.id } }],
    })
  }
  return saved
}

/** Where a record is cited, for the refusal of its deletion: the collection that cites it, by which fields. */
interface Citers {
  /**
   * The collection whose records cite it — a claim, a city's sheet naming its holder (CMS-422 step 2c), and since
   * CMS-454 whatever names a place or a source: an event, a siege engine, another source.
   */
  readonly collection:
    | 'titles'
    | 'vassal-links'
    | 'place-periods'
    | 'period-names'
    | 'events'
    | 'siege-engines'
    | 'sources'
  /** The fields that point at it — a path for a field inside a list: `lines.source`. */
  readonly fields: readonly string[]
  /** The sentence's subject: « Ce titre », « Cette personne », « Ce territoire ». */
  readonly subject: string
  /** « cité » or « citée », agreed with the subject. */
  readonly cited: string
  /** What cites it, plural: « maillon(s) », « titre(s) ». */
  readonly what: string
}

/**
 * Refuse to delete a record another record still cites (the dev's « vas-y », 2026-11-15; a place and a source too since CMS-454): the base would empty the claim's
 * field under it (`ON DELETE set null`), and a sourced claim would change its meaning — a link turned sovereign, a
 * title holding nothing — with no one deciding. The citing records are named, to be changed or deleted first, by hand.
 * @param citers - where the record is cited, and how the refusal says it
 * @returns the hook — it throws when a record cites it; Payload says it in the admin, the console keeps it
 */
export function refuseDeletingCited(citers: Citers): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const { docs } = await req.payload.find({
      collection: citers.collection,
      where: { or: citers.fields.map((field) => ({ [field]: { equals: id } })) },
      depth: 0,
      pagination: false,
      req,
    })
    if (docs.length === 0) return
    const names = docs.map((cited) => `« ${nameOf(cited)} »`).join(', ')
    console.warn(
      `[CMS] deleting ${String(id)} refused: ${String(docs.length)} record(s) of ${citers.collection} cite it`
    )
    throw new APIError(
      `${citers.subject} est ${citers.cited} par ${String(docs.length)} ${citers.what} : ${names}. Modifiez-les ou supprimez-les d’abord.`,
      409,
      undefined,
      true
    )
  }
}

/**
 * The name a citing record is said by in a refusal: a claim's label, a sheet's title — written by the server, so
 * missing only on a record saved before it wrote them; its id then.
 * @param cited - the citing record
 * @param cited.id - its id
 * @param cited.label - a claim's name
 * @param cited.title - a sheet's or a source's name; an event's, a text per language, is not read
 * @returns its name
 */
function nameOf(cited: { id: number | string; label?: string | null; title?: unknown }): string {
  // An event's title is one text per language: only a plain text is a name.
  return cited.label ?? (typeof cited.title === 'string' ? cited.title : String(cited.id))
}
