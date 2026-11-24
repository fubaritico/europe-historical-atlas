import {
  APIError,
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
} from 'payload'

import { schemaCiters } from '../collections/schemaCiters'

import { repointed } from './repoint'

import type { Field, Payload, PayloadRequest } from 'payload'

/**
 * Merge two duplicates (CMS-509, the Ponthieu merged by hand on 2026-11-23): every record that cites the one merged
 * away is made to cite the one kept, then the one merged away goes to the bin — one transaction, so a refusal on the
 * way (two titles become one) leaves the base as it was. The base is copied first, by the caller. What the record
 * merged away held of its own — its source lines, its names in other languages — is not merged: it is listed, and the
 * record stays readable in the bin.
 */

/** What is asked: in which collection, which record kept, which merged away. */
export interface MergeAsked {
  /** The collection of the two records — one with a bin. */
  readonly collection: string
  /** The record kept. */
  readonly keep: number
  /** The record merged away, then put in the bin. */
  readonly remove: number
}

/** One record whose citation was moved. */
export interface MovedCitation {
  /** Its collection. */
  readonly collection: string
  /** Its id. */
  readonly id: number | string
  /** The fields moved. */
  readonly fields: readonly string[]
}

/** What the merge did. */
export interface MergeReport {
  /** Every record whose citation was moved. */
  readonly moved: readonly MovedCitation[]
  /** The fields the record merged away held that the record kept holds otherwise — to carry by hand if they matter. */
  readonly leftBehind: readonly string[]
}

/** The fields every record has, never compared: its id and its dates. */
const OWN_OF_EVERY_RECORD = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt'])

/**
 * The names the server writes itself — a title's label, a sheet's title, read only in the admin — never compared: they
 * differ between two duplicates by construction. A source's title, typed by hand, is compared (review QUAL-001).
 * @param fields - the collection's fields
 * @returns the names of its top-level fields read only
 */
function serverWritten(fields: readonly Field[]): Set<string> {
  const names = new Set<string>()
  for (const field of fields) {
    if ('name' in field && (field.admin as { readOnly?: boolean } | undefined)?.readOnly === true)
      names.add(field.name)
    // A row or a collapsible lays its fields at the top level
    if (!('name' in field) && 'fields' in field)
      for (const name of serverWritten(field.fields)) names.add(name)
  }
  return names
}

/**
 * Whether a value says something — not absent, not empty.
 * @param value - a field's value
 * @returns `true` when it holds something
 */
function holds(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false
  return !Array.isArray(value) || value.length > 0
}

/**
 * The fields the record merged away holds that the record kept holds otherwise.
 * @param fields - the collection's fields, for the names the server writes
 * @param kept - the record kept, at depth 0
 * @param removed - the record merged away, at depth 0
 * @returns the fields' names, sorted
 */
export function leftBehindOf(
  fields: readonly Field[],
  kept: Record<string, unknown>,
  removed: Record<string, unknown>
): string[] {
  const written = serverWritten(fields)
  return Object.keys(removed)
    .filter((name) => !OWN_OF_EVERY_RECORD.has(name) && !written.has(name) && holds(removed[name]))
    .filter((name) => JSON.stringify(removed[name]) !== JSON.stringify(kept[name]))
    .sort()
}

/**
 * Refuse what cannot be merged, said in the historian's words — asked by the command before it copies the base
 * (review QUAL-003), and by the merge again.
 * @param payload - Payload
 * @param asked - what is asked
 * @returns the two records, at depth 0
 * @throws {APIError} a collection with no bin, a record merged with itself, a record missing or already in the bin
 */
export async function mergeableRecords(
  payload: Payload,
  asked: MergeAsked
): Promise<{ kept: Record<string, unknown>; removed: Record<string, unknown> }> {
  const config = (payload.collections as Partial<Record<string, { config: { trash?: boolean } }>>)[
    asked.collection
  ]?.config
  if (config === undefined)
    throw new APIError(`« ${asked.collection} » n’est pas une collection du CMS.`, 400)
  if (config.trash !== true)
    throw new APIError(`« ${asked.collection} » n’a pas de corbeille : rien n’y est fusionné.`, 400)
  if (asked.keep === asked.remove)
    throw new APIError('La fiche gardée et la fiche retirée sont la même.', 400)
  const read = async (id: number): Promise<Record<string, unknown>> => {
    const { docs } = await payload.find({
      collection: asked.collection as 'places',
      where: { id: { equals: id } },
      depth: 0,
      trash: true,
    })
    const found = docs[0] as (Record<string, unknown> & { deletedAt?: unknown }) | undefined
    if (found === undefined)
      throw new APIError(`La fiche ${String(id)} n’existe pas dans « ${asked.collection} ».`, 404)
    if (found.deletedAt !== null && found.deletedAt !== undefined)
      throw new APIError(
        `La fiche ${String(id)} de « ${asked.collection} » est dans la corbeille.`,
        409
      )
    return found
  }
  return { kept: await read(asked.keep), removed: await read(asked.remove) }
}

/**
 * Move every citation of the record merged away to the record kept, in a transaction already open.
 * @param payload - Payload
 * @param req - the request holding the transaction
 * @param asked - what is asked
 * @returns the records whose citation was moved
 */
async function moveCitations(
  payload: Payload,
  req: PayloadRequest,
  asked: MergeAsked
): Promise<MovedCitation[]> {
  const move = { target: asked.collection, from: asked.remove, to: asked.keep }
  const citers = schemaCiters(payload.config.collections, asked.collection)
  const moved: MovedCitation[] = []
  for (const collection of new Set(citers.map((citer) => citer.collection))) {
    const paths = citers.filter((citer) => citer.collection === collection).map(({ path }) => path)
    const fields = payload.config.collections.find((each) => each.slug === collection)?.fields ?? []
    const { docs } = await payload.find({
      collection: collection as 'titles',
      where: { or: paths.map((path) => ({ [path]: { in: [asked.remove] } })) },
      depth: 0,
      pagination: false,
      trash: true,
      req,
    })
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      const id = doc.id as number | string
      // The record merged away goes to the bin as it is: its own citations are not moved
      if (collection === asked.collection && String(id) === String(asked.remove)) continue
      const data = repointed(fields, doc, move)
      if (Object.keys(data).length === 0) continue
      // The record kept citing the one merged away — a person's father his own duplicate — would cite itself: said,
      // for the dev to settle (review ARCH-002), never written
      if (collection === asked.collection && String(id) === String(asked.keep))
        throw new APIError(
          `La fiche gardée ${String(asked.keep)} cite la fiche retirée ${String(asked.remove)} (${Object.keys(data).join(', ')}) : fusionnées, elle se citerait elle-même. Corrigez ce champ d’abord.`,
          409
        )
      await payload.update({
        collection: collection as 'titles',
        id,
        data,
        depth: 0,
        trash: true,
        req,
      })
      moved.push({ collection, id, fields: Object.keys(data) })
    }
  }
  return moved
}

/**
 * Merge two duplicates: every citation moved, then the record merged away put in the bin — all in one transaction.
 * @param payload - Payload, its base copied by the caller beforehand
 * @param asked - in which collection, which record kept, which merged away
 * @returns what was moved, and what the record merged away held of its own
 * @throws {APIError} when the merge is refused before it starts, or by a guard on the way — then nothing is written
 */
export async function mergeRecords(payload: Payload, asked: MergeAsked): Promise<MergeReport> {
  const { kept, removed } = await mergeableRecords(payload, asked)
  const req = await createLocalReq({}, payload)
  // Without one, a refusal on the way would leave half the citations moved: the base must be built with transactions
  // (`cmsConfig({ transactions: true })`), which Payload's SQLite adapter does not run otherwise. Read from what
  // `initTransaction` answers — true only when it opened one —, never from `req.transactionID`, which it leaves holding
  // a promise of `null` when the adapter has none (Payload 3.92, `utilities/initTransaction.ts`)
  const opened = await initTransaction(req)
  if (!opened)
    throw new APIError(
      'La fusion demande une base en transaction : lancez-la par pnpm cms:merge, jamais depuis le serveur.',
      500
    )
  try {
    const moved = await moveCitations(payload, req, asked)
    // The bin's own guards run here: nothing may still cite it
    await payload.update({
      collection: asked.collection as 'places',
      id: asked.remove,
      data: { deletedAt: new Date().toISOString() },
      depth: 0,
      req,
    })
    await commitTransaction(req)
    const fields =
      payload.config.collections.find((each) => each.slug === asked.collection)?.fields ?? []
    return { moved, leftBehind: leftBehindOf(fields, kept, removed) }
  } catch (error: unknown) {
    // Nothing of the merge stays: the error goes on to the command, which says it
    await killTransaction(req)
    throw error
  }
}
