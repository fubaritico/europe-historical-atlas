/**
 * The name a map writes for a drawn country, in the reader's language (CMS-495, ATLAS-448) — read from the
 * contribution, where names are entered, never from the map's own file. A drawn country is tied to a territory of the
 * CMS by its Wikidata id, else by the territory's number (`territoryMatch`); the territory bears its French name and
 * its names in the other languages.
 *
 * The dev's rule, 2026-11-22: *"what is available by default, but everything will have to be translated — there can
 * be no missing name"*. So a name is always written — the territory's in the reader's language, else its French one,
 * else the map's own — and **where it comes from is said**, for a control to list everything still to translate.
 */

import { formIn } from './periodName'
import { sameTerritory } from './territoryMatch'

import type { ContentTerritory } from './contentFormat'
import type { NameLanguage } from './periodName'
import type { YearPolity } from './yearFormat'

/** Where a written name comes from, best first. */
export type NameOrigin =
  /** The territory's name in the reader's language: nothing to do. */
  | 'territory'
  /** The territory's French name, for want of one in the reader's language: to translate. */
  | 'territory-french'
  /** The map's own name: the country is tied to no territory of the CMS. */
  | 'map'

/** A country's formal name as a map writes it, and where it comes from. */
export interface PolityNaming {
  /** The name. */
  readonly name: string
  /** Where it comes from. */
  readonly origin: NameOrigin
}

/** What a drawn country is named from: its ids, and the name its map bears. */
export type NamedPolity = Pick<YearPolity, 'id' | 'name' | 'wikidata' | 'territory'>

/**
 * The territory of the CMS a drawn country is.
 * @param polity - the country, its Wikidata id and its territory's number
 * @param territories - every territory of the export
 * @returns the territory, or `null` when none is the same
 */
export function territoryOf(
  polity: Pick<YearPolity, 'wikidata' | 'territory'>,
  territories: readonly ContentTerritory[]
): ContentTerritory | null {
  const ids =
    polity.territory === undefined
      ? { wikidata: polity.wikidata }
      : { wikidata: polity.wikidata, territory: polity.territory }
  return (
    territories.find((territory) =>
      sameTerritory(ids, { wikidata: territory.wikidata, territory: territory.id })
    ) ?? null
  )
}

/**
 * A territory's name in a language, when it has one: its French name is the register's own, the others are
 * contributed beside it.
 * @param territory - the territory
 * @param language - the reader's language
 * @returns the name, or `null` when none is entered in that language
 */
export function territoryNameIn(
  territory: Pick<ContentTerritory, 'name' | 'names'>,
  language: NameLanguage
): string | null {
  if (language === 'fr') return territory.name
  return territory.names === undefined ? null : formIn(territory.names, language)
}

/**
 * The formal name a map writes for a drawn country, and where it comes from.
 * @param polity - the country
 * @param territories - every territory of the export
 * @param language - the reader's language
 * @returns the name — always one — and its origin
 */
export function polityNaming(
  polity: NamedPolity,
  territories: readonly ContentTerritory[],
  language: NameLanguage
): PolityNaming {
  const territory = territoryOf(polity, territories)
  if (territory === null) return { name: polity.name, origin: 'map' }
  const named = territoryNameIn(territory, language)
  return named === null
    ? { name: territory.name, origin: 'territory-french' }
    : { name: named, origin: 'territory' }
}

/** A country whose name a reader does not get from the contribution in their language. */
export interface NameToFill {
  /** The country's id on its map. */
  readonly id: string
  /** The name written for want of better. */
  readonly written: string
  /** Why: no territory of the CMS is tied to it, or its territory has no name in the language. */
  readonly origin: Exclude<NameOrigin, 'territory'>
}

/**
 * The control of a map's names in a language (the dev, 2026-11-22: *"there can be no missing name"*): every country
 * the contribution does not name in that language, in the map's order.
 * @param polities - the map's countries
 * @param territories - every territory of the export
 * @param language - the language controlled
 * @returns the countries still to tie to a territory or to translate — empty when the map is wholly named
 */
export function namesToFill(
  polities: readonly NamedPolity[],
  territories: readonly ContentTerritory[],
  language: NameLanguage
): NameToFill[] {
  return polities.flatMap((polity): NameToFill[] => {
    const { name, origin } = polityNaming(polity, territories, language)
    return origin === 'territory' ? [] : [{ id: polity.id, written: name, origin }]
  })
}
