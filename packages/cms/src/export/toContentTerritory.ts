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
 * its Wikidata id.
 * @param docs - the territories, in French
 * @returns the territories
 * @throws {Error} when one has no name or no number — a territory the Cartographer could not name
 */
export function toContentTerritories(docs: readonly DocTerritoryEntry[]): ContentTerritory[] {
  return docs.map((doc) => {
    const where = `territory ${String(doc.id)}`
    if (typeof doc.name !== 'string' || doc.name === '') {
      throw new Error(`[CMS] ${where}: no French name`)
    }
    return { id: territoryNumberOf(doc.id, where), name: doc.name, wikidata: doc.wikidata ?? null }
  })
}
