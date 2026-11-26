import { POLITY_RANKS } from '@europe-historical-atlas/core/data/ranks'
import { WIKIDATA_ID } from '@europe-historical-atlas/core/data/wikidataId'

import type { PolityRank } from '@europe-historical-atlas/core/data/ranks'

/**
 * What the page sends to create a polity's territory in the CMS (CARTO-498, « Ajouter au CMS »): the names Wikidata
 * gave and the author kept, the polity's rank as the territory's kind, its Wikidata item and its years.
 */
export interface TerritoryRequest {
  /** Its French name — the CMS's « Nom », required there. */
  name: string
  /** Its English name — required in the CMS too (CMS-495: a translation field is never left empty). */
  nameEn: string
  /** The polity's rank, which is a kind of territory: the ranks are the head of the CMS's list of kinds. */
  kind: PolityRank
  /** Its Wikidata item, `Q1234`: how a territory already in the CMS is found instead of created twice. */
  wikidata: string
  /** The year it began, or `null` when nothing says. */
  existsFrom: number | null
  /** The year it ended, or `null` when nothing says or it still exists. */
  existsTo: number | null
}

/** The ranks, for a kind to be checked among them. */
const RANKS: ReadonlySet<string> = new Set(POLITY_RANKS)

/**
 * A text field of the request, trimmed.
 * @param value - the field
 * @returns the text, or `null` when it is no text or blank
 */
function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * A year of the request.
 * @param value - the field
 * @returns the year, `null` for none, or `undefined` when it is something else than a whole year or nothing
 */
function yearOf(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null
  return Number.isInteger(value) && value !== 0 ? (value as number) : undefined
}

/**
 * Read the page's request. Everything is checked here, on the server, because a page can send anything: a request
 * that is not one is refused with the reason the page shows.
 * @param body - the request's body, as text
 * @returns the request, or the reason it is refused
 */
export function readTerritoryRequest(body: string): TerritoryRequest | { refused: string } {
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    return { refused: 'the request is not JSON' }
  }
  if (typeof value !== 'object' || value === null)
    return { refused: 'the request is not an object' }
  const fields = value as Record<string, unknown>
  const read = {
    name: textOf(fields.name),
    nameEn: textOf(fields.nameEn),
    kind: textOf(fields.kind),
    wikidata: textOf(fields.wikidata),
    existsFrom: yearOf(fields.existsFrom),
    existsTo: yearOf(fields.existsTo),
  }
  const refused = namesRefusal(read) ?? yearsRefusal(read)
  return refused === null ? (read as TerritoryRequest) : { refused }
}

/** The fields as read, before they are checked. */
interface ReadFields {
  /** The French name, or `null`. */
  name: string | null
  /** The English name, or `null`. */
  nameEn: string | null
  /** The rank, or `null`. */
  kind: string | null
  /** The Wikidata item, or `null`. */
  wikidata: string | null
  /** The first year, `null` for none, `undefined` when it is no year. */
  existsFrom: number | null | undefined
  /** The last year, likewise. */
  existsTo: number | null | undefined
}

/**
 * Why the names, the rank or the item of a request are refused.
 * @param read - the fields as read
 * @returns the reason, or `null` when they hold
 */
function namesRefusal(read: ReadFields): string | null {
  if (read.name === null) return 'the French name is missing'
  if (read.nameEn === null) return 'the English name is missing'
  if (read.kind === null || !RANKS.has(read.kind)) return 'the rank is not one of the ranks'
  if (read.wikidata === null || !WIKIDATA_ID.test(read.wikidata))
    return 'the Wikidata item is missing or malformed'
  return null
}

/**
 * Why the years of a request are refused.
 * @param read - the fields as read
 * @returns the reason, or `null` when they hold
 */
function yearsRefusal(read: ReadFields): string | null {
  const { existsFrom, existsTo } = read
  if (existsFrom === undefined || existsTo === undefined) return 'a year is not a whole year'
  if (existsFrom !== null && existsTo !== null && existsTo < existsFrom)
    return 'the end comes before the beginning'
  return null
}

/**
 * The territory as the CMS's REST API takes it: its French name, its kind, its English name in « Autres noms », its
 * Wikidata item and its years — a year alone, the CMS's estimate left as its default.
 * @param request - what the page asked
 * @returns the body of the creation
 */
export function territoryBody(request: TerritoryRequest): Record<string, unknown> {
  return {
    name: request.name,
    kind: request.kind,
    otherNames: [{ language: 'en', form: request.nameEn }],
    wikidata: request.wikidata,
    ...(request.existsFrom === null ? {} : { existsFrom: { year: request.existsFrom } }),
    ...(request.existsTo === null ? {} : { existsTo: { year: request.existsTo } }),
  }
}
