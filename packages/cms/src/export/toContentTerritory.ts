import type { DocId } from './docRecords'
import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'

/** A territory as the export reads it, in French: its number, its name, its Wikidata id. */
export interface DocTerritoryEntry {
  /** Its id. */
  id: DocId
  /** Its name, in French. */
  name?: string | null
  /** Its Wikidata id, or nothing for one that has none. */
  wikidata?: string | null
  /** Its kind, as the register stores it. */
  kind?: string | null
  /** The moment it exists from, as the form holds it: its year at least. */
  existsFrom?: { year?: number | null } | null
  /** The moment it exists to. */
  existsTo?: { year?: number | null } | null
}

/**
 * The year of a moment of the register.
 * @param moment - the moment as the form holds it, or nothing
 * @param where - what it is, for the error
 * @returns its year, or `null` when the register gives none
 * @throws {Error} when the year is there and is no whole number — a base written outside the form, said rather than
 *   exported as « no year »
 */
function yearOf(moment: { year?: unknown } | null | undefined, where: string): number | null {
  const year = moment?.year
  if (year === null || year === undefined) return null
  if (typeof year !== 'number' || !Number.isInteger(year)) {
    throw new Error(`[CMS] ${where}: its year is not a whole number (${JSON.stringify(year)})`)
  }
  return year
}

/**
 * A territory's id as the content carries it (CARTO-450): the SQLite base numbers them.
 * @param id - the id, as Payload gives it
 * @param where - what it is, for the error
 * @returns the number
 * @throws {Error} when the id is not a whole number from one — a base that is not the SQLite one
 */
export function territoryNumberOf(id: DocId, where: string): number {
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
    throw new Error(`[CMS] ${where}: the territory's id is not a number (${String(id)})`)
  }
  return id
}

/**
 * Every territory of the CMS, as the Cartographer offers them to a polity of the map (CARTO-450): its number, its name,
 * its Wikidata id — and its kind and the years it exists between, which the polity's form proposes (CARTO-488).
 * @param docs - the territories, in French
 * @returns the territories
 * @throws {Error} when one has no name, no number or no kind — the register requires the three
 */
export function toContentTerritories(docs: readonly DocTerritoryEntry[]): ContentTerritory[] {
  return docs.map((doc) => {
    const where = `territory ${String(doc.id)}`
    if (typeof doc.name !== 'string' || doc.name === '') {
      throw new Error(`[CMS] ${where}: no French name`)
    }
    if (typeof doc.kind !== 'string' || doc.kind === '') {
      throw new Error(`[CMS] ${where}: no kind`)
    }
    return {
      id: territoryNumberOf(doc.id, where),
      name: doc.name,
      wikidata: doc.wikidata ?? null,
      kind: doc.kind,
      existsFrom: yearOf(doc.existsFrom, `${where}, exists from`),
      existsTo: yearOf(doc.existsTo, `${where}, exists to`),
    }
  })
}
