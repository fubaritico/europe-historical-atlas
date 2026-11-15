import { chainPaths, vassalChain } from '@europe-historical-atlas/core/data/vassalChain'

import { vassalLinkOf } from '../../../fields/vassalLinkOf'

import { readDocs } from './readDocs'

import type { RecordChoice } from './sheetValues'
import type { StoredLink } from '../../../fields/vassalLinkOf'
import type { ChainEnd, VassalLink } from '@europe-historical-atlas/core/data/vassalChain'

/** One reading of the chain: the titles from the holder's up, named, and why it stops. */
export interface ChainReading {
  /** The titles, the holder's first. */
  titles: RecordChoice[]
  /** Why it stops where it does: a sovereign, « we do not know », or links that contradict one another. */
  end: ChainEnd
}

/**
 * Every link of vassalage the base holds, as `core`'s chain reads them — a link that cannot say whom it answers to
 * is left out by `vassalLinkOf`, so the chain says « we do not know » above it, never a sovereign.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root
 * @returns the links
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses, or answers a link without its id
 */
export async function fetchVassalLinks(fetcher: typeof fetch, api: string): Promise<VassalLink[]> {
  const params = new URLSearchParams({
    depth: '0',
    pagination: 'false',
    'select[vassal]': 'true',
    'select[answersTo]': 'true',
    'select[suzerain]': 'true',
    'select[date]': 'true',
  })
  const response = await fetcher(`${api}/vassal-links?${params.toString()}`, {
    credentials: 'include',
  })
  const docs = await readDocs(response, 'the links of vassalage', 'could not be read')
  return docs
    .map((doc) => {
      const link = (doc ?? {}) as StoredLink
      if (typeof link.id !== 'number' && typeof link.id !== 'string') {
        throw new Error('[CMS] a link of vassalage came without its id')
      }
      return vassalLinkOf(link)
    })
    .filter((link): link is VassalLink => link !== null)
}

/**
 * The names of titles, by id — written by the server at each save of a title, so a title without one, or one asked
 * for and not answered, is a defect said loudly rather than a chain shown with a hole.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root
 * @param ids - the titles
 * @returns their names, by id as text
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses, or a title is missing or has no name
 */
export async function fetchTitleNames(
  fetcher: typeof fetch,
  api: string,
  ids: readonly string[]
): Promise<Map<string, string>> {
  const params = new URLSearchParams({
    'where[id][in]': ids.join(','),
    depth: '0',
    pagination: 'false',
    'select[label]': 'true',
  })
  const response = await fetcher(`${api}/titles?${params.toString()}`, { credentials: 'include' })
  const docs = await readDocs(response, 'the titles of the chain', 'could not be read')
  const names = new Map<string, string>()
  for (const doc of docs) {
    const { id, label } = (doc ?? {}) as { id?: unknown; label?: unknown }
    if ((typeof id === 'number' || typeof id === 'string') && typeof label === 'string') {
      names.set(String(id), label)
    }
  }
  const missing = ids.filter((id) => !names.has(id))
  if (missing.length > 0) {
    throw new Error(`[CMS] the chain names titles the base does not name: ${missing.join(', ')}`)
  }
  return names
}

/**
 * The chain of vassalage of a holder's title at a year (CMS-422 step 2c): the links read, the chain computed by
 * `core` (`vassalChain`), each reading named — one when the sources agree, one per branch when they diverge.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root
 * @param title - the holder's title
 * @param year - the sheet's year
 * @returns each reading, its titles named from the holder's up
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses, or answers what the chain cannot be read from
 */
export async function readVassalChain(
  fetcher: typeof fetch,
  api: string,
  title: number | string,
  year: number
): Promise<ChainReading[]> {
  const links = await fetchVassalLinks(fetcher, api)
  const paths = chainPaths(vassalChain(String(title), year, links))
  const ids = [...new Set(paths.flatMap((path) => path.titles))]
  const names = await fetchTitleNames(fetcher, api, ids)
  return distinct(paths).map((path) => ({
    titles: path.titles.map((id) => ({ id, name: nameOf(names, id) })),
    end: path.end,
  }))
}

/**
 * The readings that differ — two links entered alike (the same vassal to the same suzerain, the same year) give the
 * same path twice, which would count as a divergence of the sources where there is none. Their agreement is the
 * lines' to count, by concordance, never this list's.
 * @param paths - the chain's paths, as `chainPaths` gives them
 * @returns each path once, in the order first met
 */
function distinct(paths: readonly { titles: string[]; end: ChainEnd }[]) {
  const seen = new Set<string>()
  return paths.filter((path) => {
    const key = `${path.titles.join('>')}|${path.end}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * A title's name from those read — `fetchTitleNames` refuses an answer missing one, so none is missing here.
 * @param names - the names read, by id
 * @param id - the title
 * @returns its name
 * @throws {Error} when it is missing, which `fetchTitleNames` was to refuse
 */
function nameOf(names: ReadonlyMap<string, string>, id: string): string {
  const name = names.get(id)
  if (name === undefined) throw new Error(`[CMS] the title ${id} of the chain was read unnamed`)
  return name
}
