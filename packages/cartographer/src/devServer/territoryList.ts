import { isNameLanguage } from '@europe-historical-atlas/core/data/periodName'
import { WIKIDATA_ID } from '@europe-historical-atlas/core/data/wikidataId'

import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'
import type { NameForm } from '@europe-historical-atlas/core/data/periodName'

/**
 * The CMS's territories as its REST API lists them, read into the shape the Cartographer holds (CARTO-568, [Check this
 * year]): the export's `ContentTerritory`, so the live reading and the export's are one list in the store.
 *
 * **A territory the CMS requires a field of and answers without it refuses the whole reading** — a number, a French
 * name, a kind: a list with a hole would tell the check « tied to nothing » of a polity that is tied. The same rule as
 * the export's (`packages/cms/src/export/toContentTerritory.ts`).
 */

/** A territory as Payload's REST API answers it, depth 0. */
interface TerritoryDoc {
  /** Its number. */
  id?: unknown
  /** Its French name. */
  name?: unknown
  /** Its kind. */
  kind?: unknown
  /** Its Wikidata item. */
  wikidata?: unknown
  /** The moment it exists from. */
  existsFrom?: unknown
  /** The moment it exists to. */
  existsTo?: unknown
  /** Its names in the other languages. */
  otherNames?: unknown
}

/**
 * A moment's year.
 * @param moment - the moment, `{ year }` or nothing
 * @param where - what it is, for the error
 * @returns the year, or `null` when none is given
 * @throws {Error} when a year is there and is no whole number
 */
function yearOf(moment: unknown, where: string): number | null {
  const year = (moment as { year?: unknown } | null | undefined)?.year
  if (year === null || year === undefined) return null
  if (typeof year !== 'number' || !Number.isInteger(year))
    throw new Error(`${where}: its year is not a whole number (${JSON.stringify(year)})`)
  return year
}

/**
 * The names in the other languages, a line with no language or no form left out — as the export reads them.
 * @param value - the table
 * @returns the forms
 */
function namesOf(value: unknown): NameForm[] {
  if (!Array.isArray(value)) return []
  return (value as { language?: unknown; form?: unknown }[]).flatMap(({ language, form }) =>
    isNameLanguage(language) && typeof form === 'string' && form.trim() !== ''
      ? [{ language, form: form.trim() }]
      : []
  )
}

/**
 * A territory's Wikidata item, checked here as the page will check it (`contentTerritoriesIn`), so a malformed one is
 * said with its territory rather than as « a malformed list ».
 * @param value - the item, as the API answers it
 * @param where - what it is, for the error
 * @returns the item, or `null` when none is given
 * @throws {Error} when it is no Wikidata item
 */
function wikidataOf(value: unknown, where: string): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !WIKIDATA_ID.test(value))
    throw new Error(`${where}: its Wikidata item is malformed (${JSON.stringify(value)})`)
  return value
}

/**
 * One territory.
 * @param doc - as the API answers it
 * @returns it, as the Cartographer holds it
 * @throws {Error} when its number, its French name or its kind is missing
 */
function territoryOf(doc: TerritoryDoc): ContentTerritory {
  const { id } = doc
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1)
    throw new Error(`a territory has no number (${JSON.stringify(id)})`)
  const where = `territory ${String(id)}`
  if (typeof doc.name !== 'string' || doc.name === '') throw new Error(`${where}: no French name`)
  if (typeof doc.kind !== 'string' || doc.kind === '') throw new Error(`${where}: no kind`)
  return {
    id,
    name: doc.name,
    wikidata: wikidataOf(doc.wikidata, where),
    kind: doc.kind,
    existsFrom: yearOf(doc.existsFrom, `${where}, exists from`),
    existsTo: yearOf(doc.existsTo, `${where}, exists to`),
    names: namesOf(doc.otherNames),
  }
}

/**
 * Every territory of an answer of `GET /api/territories?pagination=false`.
 * @param body - the answer's JSON
 * @returns the territories
 * @throws {Error} when the answer holds no list of documents, or one is missing what the CMS requires
 */
export function territoriesOf(body: unknown): ContentTerritory[] {
  const docs = (body as { docs?: unknown } | null)?.docs
  if (!Array.isArray(docs)) throw new Error('the answer holds no list of territories')
  return (docs as TerritoryDoc[]).map(territoryOf)
}
