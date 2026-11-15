import { APIError } from 'payload'

import { relationId } from '../fields/relationId'

import type { CollectionBeforeChangeHook, Where } from 'payload'

/** What makes a claim the same as another: its relations, and the years of its date. */
interface ClaimIdentity {
  /** The collection the claims are in. */
  readonly collection: 'titles' | 'vassal-links'
  /**
   * The relation fields a twin holds the same: a title's person and territory, a link's vassal and suzerain — a link's
   * « no one » is its suzerain emptied, once its label's hook has run before this one.
   */
  readonly relations: readonly string[]
  /** The sentence's subject: « Ce titre », « Ce maillon ». */
  readonly subject: string
}

/**
 * A field of the claim as `where` asks for it: equal to it, or absent like it — a date with no end and another with no
 * end are the same date, a link to no one and another to no one have the same suzerain; a unique index of SQLite would
 * not see it (it holds two `NULL`s apart).
 * @param path - the field's path
 * @param value - its value, or nothing
 * @returns the condition
 */
function same(path: string, value: unknown): Where {
  return value === null || value === undefined
    ? { [path]: { exists: false } }
    : { [path]: { equals: value } }
}

/**
 * Refuse a claim that repeats one already entered (the dev, 2026-11-15: *"there must never again be duplicates"* —
 * three titles were entered twice): the same person holding the same territory over the same years, the same vassal
 * answering to the same suzerain over the same years. A claim has no Wikidata id to be unique by; what makes it itself
 * is these fields. A second source saying it is a second line of the claim, never a second claim — a divergent reading
 * differs in a relation or a year, and passes; a reading precise to the month is a line of the year's claim. Held by
 * Payload alone — a hand-written SQL on the base goes round it, as the refusal to delete a cited record
 * (`claimDependants`) — and **not atomic**: two creations sent at once can both pass the look-up (`known-issues/cms.md`).
 * Runs after the hooks that put the claim in order, so it compares what will be stored.
 * @param identity - the collection and the fields that make a claim itself
 * @returns the hook — it throws when a twin exists, naming it; Payload says it in the admin and to the MCP
 */
export function refuseDuplicateClaim(identity: ClaimIdentity): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, req }) => {
    const claim: Record<string, unknown> = {
      ...(originalDoc as Record<string, unknown> | undefined),
      ...(data as Record<string, unknown>),
    }
    const date = (claim.date ?? {}) as { start?: { year?: unknown }; end?: { year?: unknown } }
    const conditions: Where[] = [
      ...identity.relations.map((field) => same(field, relationId(claim[field]))),
      same('date.start.year', date.start?.year),
      same('date.end.year', date.end?.year),
    ]
    const own = relationId((originalDoc as { id?: unknown } | undefined)?.id)
    if (own !== null) conditions.push({ id: { not_equals: own } })
    const { docs } = await req.payload.find({
      collection: identity.collection,
      where: { and: conditions },
      depth: 0,
      limit: 1,
      req,
    })
    const twin = docs[0]
    if (twin === undefined) return data
    console.warn(
      `[CMS] ${identity.collection}: a claim repeating ${String(twin.id)} refused — add a line to it instead`
    )
    throw new APIError(
      `${identity.subject} existe déjà : « ${twin.label ?? String(twin.id)} » (n° ${String(twin.id)}). Ajoutez-lui une ligne de source plutôt que d’en créer un second.`,
      409,
      undefined,
      true
    )
  }
}
