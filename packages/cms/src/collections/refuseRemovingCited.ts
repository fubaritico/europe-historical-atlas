import { APIError } from 'payload'

import { MCP_API } from '../mcp/refuseBulkRemoval'

import { isSet } from './claimDependants'
import { schemaCiters } from './schemaCiters'

import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  PayloadRequest,
} from 'payload'

/**
 * The refusals of a register — a person, a territory, a confession, an importance reason (CMS-509): a record another
 * record cites is neither put in the bin nor erased from under it, the citers read from the schema (`schemaCiters`),
 * so a citation added later is held without a list to keep. The same rule as the six collections of CMS-508, whose
 * own lists name what cites them in their words.
 */

/** How many citing records a refusal names before it counts the rest. */
const NAMED = 10

/** How the refusal says the record: « Ce territoire est cité », « Cette personne est citée ». */
export interface RegisterWords {
  /** The sentence's subject: « Ce territoire », « Cette personne ». */
  readonly subject: string
  /** « cité » or « citée », agreed with the subject. */
  readonly cited: string
}

/**
 * The records that cite one, by their name — over every citer the schema knows.
 * @param req - the request, so the searches run in its transaction
 * @param target - the collection of the record cited
 * @param id - the record cited
 * @param includeBin - whether a record in the bin counts as citing it
 * @returns the names, « name (collection) »
 */
export async function citingRecords(
  req: PayloadRequest,
  target: string,
  id: number | string,
  includeBin: boolean
): Promise<string[]> {
  const names: string[] = []
  for (const { collection, path } of schemaCiters(req.payload.config.collections, target)) {
    const { docs } = await req.payload.find({
      collection: collection as 'titles',
      // `in` holds a field of one value and a field of many alike
      where: { [path]: { in: [id] } },
      depth: 0,
      pagination: false,
      trash: includeBin,
      req,
    })
    for (const doc of docs as {
      id: number | string
      label?: unknown
      title?: unknown
      name?: unknown
    }[]) {
      // A record citing itself — a house its own founder — never holds back its own removal (review QUAL-004)
      if (collection === target && String(doc.id) === String(id)) continue
      const said = [doc.label, doc.title, doc.name].find((each) => typeof each === 'string')
      names.push(`« ${typeof said === 'string' ? said : String(doc.id)} » (${collection})`)
    }
  }
  return names
}

/**
 * Throw when a record is cited: the refusal names the first citers and counts the rest.
 * @param words - how the record is said
 * @param names - the citers' names
 * @param gesture - what is refused, for the console and the sentence
 * @param id - the record, for the console
 * @throws {APIError} 409 when a record cites it
 */
function refuseWhenCited(
  words: RegisterWords,
  names: readonly string[],
  gesture: 'deleting' | 'trashing',
  id: number | string
): void {
  if (names.length === 0) return
  console.warn(`[CMS] ${gesture} ${String(id)} refused: ${String(names.length)} record(s) cite it`)
  const listed = names.slice(0, NAMED).join(', ')
  const rest = names.length > NAMED ? ` et ${String(names.length - NAMED)} autre(s)` : ''
  const first = gesture === 'deleting' ? 'supprimez-les' : 'mettez-les à la corbeille'
  throw new APIError(
    `${words.subject} est ${words.cited} par ${String(names.length)} fiche(s) : ${listed}${rest}. Modifiez-les ou ${first} d’abord.`,
    409,
    undefined,
    true
  )
}

/**
 * A register's refusals: into the bin while a live record cites it; erased for good while any record cites it, the bin
 * included — erased from under a record in the bin, that record would come back from it with an empty field.
 * @param words - how the record is said
 * @returns the two hooks, for the collection's `beforeChange` and `beforeDelete`
 */
export function registerRefusals(words: RegisterWords): {
  readonly beforeChange: CollectionBeforeChangeHook
  readonly beforeDelete: CollectionBeforeDeleteHook
} {
  return {
    beforeChange: async ({ collection, data, operation, originalDoc, req }) => {
      const before = originalDoc as { id: number | string; deletedAt?: unknown } | undefined
      const trashing =
        operation === 'update' &&
        before !== undefined &&
        isSet((data as { deletedAt?: unknown }).deletedAt) &&
        !isSet(before.deletedAt)
      if (!trashing) return data
      // A register is the dev's to clear (2026-11-02), opening it to the historian is his decision still to take
      // (`files/plans/historian/autonomy-and-1200.md` § 7 d): over MCP, its records never go to the bin
      if ((req.payloadAPI as string) === MCP_API) {
        console.warn(`[CMS] trashing ${String(before.id)} of ${collection.slug} over MCP refused`)
        throw new APIError(
          `Par MCP, ${words.subject.toLowerCase()} ne se met pas à la corbeille : un doublon se fusionne (pnpm cms:merge), le reste se fait dans l’admin.`,
          403,
          undefined,
          true
        )
      }
      refuseWhenCited(
        words,
        await citingRecords(req, collection.slug, before.id, false),
        'trashing',
        before.id
      )
      return data
    },
    beforeDelete: async ({ collection, id, req }) => {
      refuseWhenCited(words, await citingRecords(req, collection.slug, id, true), 'deleting', id)
    },
  }
}
