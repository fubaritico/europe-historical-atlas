/**
 * How a map's polity and a title of the contribution are found to be one territory (CARTO-450, the dev's rule of
 * 2026-11-16: *« Wikidata, c'est notre première base. S'il n'y a pas Wikidata, c'est l'ID pour aller chercher la
 * province »*): by their Wikidata ids when both carry one; otherwise by the number of the CMS's territory — the
 * Thuringia of 1100 has no fair Wikidata item, its territory in the CMS has a number.
 */

/** What a territory is recognised by: its Wikidata id, and the number of its territory in the CMS. */
export interface TerritoryIds {
  /** Its Wikidata id, or `null` when it has none. */
  readonly wikidata: string | null
  /** The number of its territory in the CMS, absent when none is known. */
  readonly territory?: number
}

/**
 * Whether two territories are one: by Wikidata when both carry an id — two different ids are two territories, whatever
 * their numbers —, otherwise by the CMS's territory number when both carry one. Neither shared, they cannot be told
 * one.
 * @param a - one
 * @param b - the other
 * @returns whether they are the same territory
 */
export function sameTerritory(a: TerritoryIds, b: TerritoryIds): boolean {
  if (a.wikidata !== null && b.wikidata !== null) return a.wikidata === b.wikidata
  return a.territory !== undefined && a.territory === b.territory
}

/**
 * Whether a territory carries anything to be recognised by.
 * @param ids - its ids
 * @returns whether it has a Wikidata id or a CMS territory number
 */
export function isIdentified(ids: TerritoryIds): boolean {
  return ids.wikidata !== null || ids.territory !== undefined
}
