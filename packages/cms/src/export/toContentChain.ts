import {
  chainPaths,
  distinctPaths,
  vassalChain,
} from '@europe-historical-atlas/core/data/vassalChain'

import { relationId } from '../fields/relationId'
import { sovereignLinkOf } from '../fields/sovereignLinkOf'
import { vassalLinkOf } from '../fields/vassalLinkOf'

import { resolved } from './docRecords'

import type { DocId } from './docRecords'
import type { EventDateFields } from '../fields/historicalDate'
import type { StoredLink } from '../fields/vassalLinkOf'
import type {
  ContentChainReading,
  ContentChainTitle,
} from '@europe-historical-atlas/core/data/contentFormat'
import type { VassalLink } from '@europe-historical-atlas/core/data/vassalChain'

/** A territory as the export reads it, through its title: only its Wikidata id matters to the chain. */
export interface DocTerritory {
  /** Its id. */
  id: DocId
  /** Its Wikidata id, or nothing for one that has none. */
  wikidata?: string | null
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
  /** Every link the base holds, as `core`'s chain reads them. */
  readonly links: readonly VassalLink[]
}

/**
 * The register the chains are computed from (CARTO-435). A title without its name, or whose territory is not
 * resolved, stops the export and names it — a chain written with a hole would read as a chain.
 * @param titles - every title, its territory resolved
 * @param links - every link of vassalage
 * @returns the register
 * @throws {Error} when a title has no name or its territory is not resolved
 */
export function chainRegister(
  titles: readonly DocTitle[],
  links: readonly StoredLink[]
): ChainRegister {
  const named = new Map<string, ContentChainTitle>()
  for (const title of titles) {
    const where = `title ${String(title.id)}`
    if (typeof title.label !== 'string' || title.label === '') {
      throw new Error(`[CMS] ${where}: no name — save it once so the server writes it`)
    }
    if (title.territory === null || title.territory === undefined) {
      throw new Error(`[CMS] ${where}: no territory`)
    }
    const territory = resolved<DocTerritory>(title.territory, `${where}, territory`)
    named.set(String(title.id), { name: title.label, wikidata: territory.wikidata ?? null })
  }
  return {
    titles: named,
    links: [...links.map(vassalLinkOf), ...titles.map(sovereignLinkOf)].filter(
      (link): link is VassalLink => link !== null
    ),
  }
}

/**
 * A city's chain of vassalage at its sheet's year — every reading kept, each once (`distinctPaths`) — or `null` when
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
  return distinctPaths(chainPaths(vassalChain(String(id), year, register.links))).map((path) => ({
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
  }))
}
