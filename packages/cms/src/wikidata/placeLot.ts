/**
 * Reading Wikidata for a place's geographic lot — the country it lies in today and its region, the first-level division
 * of that country (CMS-414, the dev, 2026-11-10: *"le lot, c'est … le pays d'aujourd'hui, puisque c'est d'où on vient et
 * vers où on va"*). The research of the cities is done by lots; a place carrying its lot lets the same lots be searched
 * again for every century.
 *
 * One SPARQL query answers both: the country is the item's P17, the region the first item up its P131 chain that is a
 * first-level administrative division (Q10864048) — Île-de-France for Paris, the Aosta Valley for Aosta, Sicily for
 * Palermo (read on the live query service, 2026-11-10). Several answers are kept, never one picked: the dev's call, the
 * same day — *"s'il y a plusieurs pays, ne rien mettre, mais … un menu déroulant pour qu'on puisse choisir"*.
 *
 * Pure — the URL out, the answer in — so it is exercised with literals; the route (`placeEndpoints.ts`) fetches.
 */

import { z } from 'zod/mini'

/** A Wikidata item with its name. */
export interface NamedItem {
  /** Its id, `Q38`. */
  wikidata: string
  /**
   * Its French label, else its English one — the query service's own fallback chain, which ends on the id itself when
   * the item has neither: an id shown where a name was expected is visibly not a name.
   */
  name: string
}

/** What Wikidata says of a place's lot: every country and every region it gives, possibly none, possibly several. */
export interface PlaceLot {
  /** The countries (P17), in the query's order, without repeats. */
  countries: NamedItem[]
  /** The first-level divisions above it, in the query's order, without repeats. */
  regions: NamedItem[]
}

/** Wikidata's class of the first-level divisions of a country: a region of Italy, a Spanish community, a French region. */
export const FIRST_LEVEL_DIVISION = 'Q10864048'

/**
 * The query for one item's lot.
 * @param id - the item, already checked in shape by the route
 * @returns the query service's URL, asking for JSON
 */
export function lotUrl(id: string): string {
  const query =
    `SELECT ?country ?countryLabel ?region ?regionLabel WHERE {` +
    ` OPTIONAL { wd:${id} wdt:P17 ?country . }` +
    ` OPTIONAL { wd:${id} wdt:P131* ?region . ?region wdt:P31/wdt:P279* wd:${FIRST_LEVEL_DIVISION} . }` +
    ` SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }`
  return `https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: 'json' }).toString()}`
}

/** One cell of the answer. */
const cell = z.optional(z.object({ value: z.string() }))

/** What the query service answers — only the fields read. */
const lotAnswer = z.object({
  results: z.object({
    bindings: z.array(
      z.object({ country: cell, countryLabel: cell, region: cell, regionLabel: cell })
    ),
  }),
})

/**
 * The item an entity URI names, with its label.
 * @param uri - `http://www.wikidata.org/entity/Q38`, or nothing
 * @param label - its label, or nothing
 * @returns the item, or `null` when the cell is empty
 */
function named(
  uri: { value: string } | undefined,
  label: { value: string } | undefined
): NamedItem | null {
  if (uri === undefined) return null
  const wikidata = uri.value.slice(uri.value.lastIndexOf('/') + 1)
  return { wikidata, name: label?.value ?? wikidata }
}

/**
 * Add an item once.
 * @param items - the list so far
 * @param item - the item, or `null`
 * @returns nothing; the list grows when the item is new
 */
function addOnce(items: NamedItem[], item: NamedItem | null): void {
  if (item !== null && !items.some((each) => each.wikidata === item.wikidata)) items.push(item)
}

/**
 * The countries and regions of a place. The query's rows cross both — two regions make two rows with the same
 * country — so each list is read without repeats.
 * @param value - the query service's JSON
 * @returns the lot; throws on an answer that is not the query service's
 */
export function readLotAnswer(value: unknown): PlaceLot {
  const countries: NamedItem[] = []
  const regions: NamedItem[] = []
  for (const row of lotAnswer.parse(value).results.bindings) {
    addOnce(countries, named(row.country, row.countryLabel))
    addOnce(regions, named(row.region, row.regionLabel))
  }
  return { countries, regions }
}
