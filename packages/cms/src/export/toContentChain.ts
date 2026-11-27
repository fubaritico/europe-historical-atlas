import {
  chainPaths,
  distinctPaths,
  hierarchyChain,
} from '@europe-historical-atlas/core/data/hierarchyChain'

import { hierarchyLinkOf } from '../fields/hierarchyLinkOf'
import { relationId } from '../fields/relationId'
import { sovereignLinkOf } from '../fields/sovereignLinkOf'

import { resolved } from './docRecords'
import { territoryNumberOf } from './toContentTerritory'

import type { DocId } from './docRecords'
import type { StoredLink } from '../fields/hierarchyLinkOf'
import type { EventDateFields } from '../fields/historicalDate'
import type {
  ContentChainReading,
  ContentChainTitle,
  ContentHolder,
} from '@europe-historical-atlas/core/data/contentFormat'
import type { HierarchyLink } from '@europe-historical-atlas/core/data/hierarchyChain'

/** A territory as the export reads it, through its title: its number and its Wikidata id, what the map matches it by. */
export interface DocTerritory {
  /** Its id. */
  id: DocId
  /** Its name, French: what a city it holds is said to be held by. */
  name?: string | null
  /** Its Wikidata id, or nothing for one that has none. */
  wikidata?: string | null
  /** Its kind, as the register stores it — the rank of the title that holds it (CARTO-491). */
  kind?: string | null
}

/** A title as the export reads it, its territory resolved. */
export interface DocTitle {
  /** Its id. */
  id: DocId
  /** Its name, written by the server at each save. */
  label?: string | null
  /** The territory it holds. */
  territory?: DocTerritory | DocId | null
  /** Whether it is ticked « souverain »: the chain stops at it over its dates. */
  sovereign?: boolean | null
  /** Its date group. */
  date?: EventDateFields | null
}

/** What every city's chain is computed from: the titles, named, and the links — read once for the whole export. */
export interface ChainRegister {
  /** Each title as the map compares it, by its id as text. */
  readonly titles: ReadonlyMap<string, ContentChainTitle>
  /** The territory each title holds, as a city held by that title is said to be held: by its title's id as text. */
  readonly holders: ReadonlyMap<string, ContentHolder>
  /** Every link the base holds, as `core`'s chain reads them. */
  readonly links: readonly HierarchyLink[]
}

/**
 * The territory a title holds, resolved and named.
 * @param title - the title
 * @param where - which title, for the error
 * @returns the territory, its name sure
 * @throws {Error} when the title has no territory, or its territory is not resolved or has no name
 */
function namedTerritory(title: DocTitle, where: string): DocTerritory & { name: string } {
  if (title.territory === null || title.territory === undefined) {
    throw new Error(`[CMS] ${where}: no territory`)
  }
  const territory = resolved<DocTerritory>(title.territory, `${where}, territory`)
  if (typeof territory.name !== 'string' || territory.name === '') {
    throw new Error(`[CMS] ${where}: its territory has no name`)
  }
  return { ...territory, name: territory.name }
}

/**
 * The register the chains are computed from (CARTO-435). A title without its name, or whose territory is not
 * resolved, stops the export and names it — a chain written with a hole would read as a chain.
 * @param titles - every title, its territory resolved
 * @param links - every hierarchical link
 * @returns the register
 * @throws {Error} when a title has no name, or its territory is not resolved or has no name
 */
export function chainRegister(
  titles: readonly DocTitle[],
  links: readonly StoredLink[]
): ChainRegister {
  const named = new Map<string, ContentChainTitle>()
  const holders = new Map<string, ContentHolder>()
  for (const title of titles) {
    const where = `title ${String(title.id)}`
    if (typeof title.label !== 'string' || title.label === '') {
      throw new Error(`[CMS] ${where}: no name — save it once so the server writes it`)
    }
    const territory = namedTerritory(title, where)
    holders.set(String(title.id), { name: territory.name, wikidata: territory.wikidata ?? null })
    named.set(String(title.id), {
      name: title.label,
      wikidata: territory.wikidata ?? null,
      territory: territoryNumberOf(territory.id, `${where}, territory`),
      // The register requires a kind; a territory read without one is written without, and its step is not checked.
      ...(typeof territory.kind === 'string' && territory.kind !== ''
        ? { kind: territory.kind }
        : {}),
    })
  }
  return {
    titles: named,
    holders,
    links: [...links.map(hierarchyLinkOf), ...titles.map(sovereignLinkOf)].filter(
      (link): link is HierarchyLink => link !== null
    ),
  }
}

/**
 * The holder of a city whose sheet names a title: the territory that title holds (2026-11-23, the dev's « plein de
 * villes sans détenteur »). Since CMS-422 a sheet's holder is a title; the holder typed as text (CMS-335) is older, often
 * a person rather than a country, and the mass entries of 17–19/11 left it empty — so the title's territory is the
 * city's holder, the one a map's polity is compared by.
 * @param register - the titles and the territories they hold
 * @param title - the title the sheet names as its holder, bare or resolved
 * @param where - which sheet, for the error
 * @returns the holder, or `null` when the sheet names no title
 * @throws {Error} when the sheet names a title the register lacks
 */
export function titleHolder(
  register: ChainRegister,
  title: unknown,
  where: string
): ContentHolder | null {
  const id = relationId(title)
  if (id === null) return null
  const holder = register.holders.get(String(id))
  if (holder === undefined) {
    throw new Error(
      `[CMS] ${where}: its holder is title ${String(id)}, which the export did not read`
    )
  }
  return holder
}

/**
 * A city's hierarchical chain at its sheet's year — every reading kept, each once (`distinctPaths`) — or `null` when
 * its sheet names no title.
 * @param register - the titles and the links
 * @param title - the title the sheet names as its holder, bare or resolved
 * @param year - the sheet's first year
 * @param where - the sheet, for the error
 * @returns the readings, or `null`
 * @throws {Error} when the chain names a title the register lacks
 */
export function contentChain(
  register: ChainRegister,
  title: unknown,
  year: number,
  where: string
): ContentChainReading[] | null {
  const id = relationId(title)
  if (id === null) return null
  return distinctPaths(chainPaths(hierarchyChain(String(id), year, register.links))).map(
    (path) => ({
      titles: path.titles.map((titleId) => {
        const named = register.titles.get(titleId)
        if (named === undefined) {
          throw new Error(
            `[CMS] ${where}: its chain names title ${titleId}, which the export did not read`
          )
        }
        return named
      }),
      end: path.end,
    })
  )
}
