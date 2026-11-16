import {
  chainPaths,
  distinctPaths,
  vassalChain,
} from '@europe-historical-atlas/core/data/vassalChain'
import { dateCoversYear } from '@europe-historical-atlas/core/time/dateOverlap'

import { relationId } from '../../../fields/relationId'
import { sovereignLinkOf } from '../../../fields/sovereignLinkOf'
import { vassalLinkOf } from '../../../fields/vassalLinkOf'

import { readDocs } from './readDocs'

import type { RecordChoice } from './sheetValues'
import type { StoredTitle } from '../../../fields/sovereignLinkOf'
import type { StoredLink } from '../../../fields/vassalLinkOf'
import type { ChainEnd, VassalLink } from '@europe-historical-atlas/core/data/vassalChain'

/** One step of a reading above the holder: the link it came by, and that link's source. */
export interface ChainStep {
  /** The link's id, for the sheet to change or remove it. */
  link: string
  /** The source of its first line, `null` for a link entered without one. */
  source: number | string | null
}

/** One reading of the chain: the titles from the holder's up, named, and why it stops. */
export interface ChainReading {
  /** The titles, the holder's first, each with its id as the base gives it. */
  titles: RecordChoice[]
  /** The link of each title above the holder's — `steps[i]` brought `titles[i + 1]` — so the sheet can edit it. */
  steps: ChainStep[]
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
 * The titles ticked « souverain », as the ends of the chain they stop (the dev, 2026-11-16) — `core` reads each as a
 * link to no one over the title's dates.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root
 * @returns their links
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses
 */
export async function fetchSovereignLinks(
  fetcher: typeof fetch,
  api: string
): Promise<VassalLink[]> {
  const params = new URLSearchParams({
    'where[sovereign][equals]': 'true',
    depth: '0',
    pagination: 'false',
    'select[sovereign]': 'true',
    'select[date]': 'true',
  })
  const response = await fetcher(`${api}/titles?${params.toString()}`, { credentials: 'include' })
  const docs = await readDocs(response, 'the sovereign titles', 'could not be read')
  return docs
    .map((doc) => sovereignLinkOf((doc ?? {}) as StoredTitle))
    .filter((link): link is VassalLink => link !== null)
}

/**
 * The titles of a chain, by id as `core` names them — each with its id as the base gives it, for a drawer to name it
 * again, and its name, written by the server at each save of a title: a title without one, or one asked for and not
 * answered, is a defect said loudly rather than a chain shown with a hole.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root
 * @param ids - the titles
 * @returns each title, its id and its name, by id as text
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses, or a title is missing or has no name
 */
export async function fetchTitleNames(
  fetcher: typeof fetch,
  api: string,
  ids: readonly string[]
): Promise<Map<string, RecordChoice>> {
  const params = new URLSearchParams({
    'where[id][in]': ids.join(','),
    depth: '0',
    pagination: 'false',
    'select[label]': 'true',
  })
  const response = await fetcher(`${api}/titles?${params.toString()}`, { credentials: 'include' })
  const docs = await readDocs(response, 'the titles of the chain', 'could not be read')
  const names = new Map<string, RecordChoice>()
  for (const doc of docs) {
    const { id, label } = (doc ?? {}) as { id?: unknown; label?: unknown }
    if ((typeof id === 'number' || typeof id === 'string') && typeof label === 'string') {
      names.set(String(id), { id, name: label })
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
  const links = [
    ...(await fetchVassalLinks(fetcher, api)),
    ...(await fetchSovereignLinks(fetcher, api)),
  ]
  const paths = distinctPaths(chainPaths(vassalChain(String(title), year, links)))
  const ids = [...new Set(paths.flatMap((path) => path.titles))]
  const names = await fetchTitleNames(fetcher, api, ids)
  const steps = paths.map((path) => stepsOf(path.titles, links, year))
  const sources = await fetchLinkSources(fetcher, api, [
    ...new Set(steps.flat().filter((link): link is string => link !== null)),
  ])
  return paths.map((path, index) => ({
    titles: path.titles.map((id) => titleOf(names, id)),
    steps: (steps[index] ?? []).flatMap((link) =>
      link === null ? [] : [{ link, source: sources.get(link) ?? null }]
    ),
    end: path.end,
  }))
}

/**
 * The link each title of a path came by, from the second up — the one valid in the year, from the title below to it;
 * `null` where none is found, which `vassalChain`, having climbed by them, never leaves.
 * @param titles - the path's titles, the holder's first
 * @param links - the links read
 * @param year - the sheet's year
 * @returns each step's link id
 */
function stepsOf(
  titles: readonly string[],
  links: readonly VassalLink[],
  year: number
): (string | null)[] {
  return titles.slice(1).map((suzerain, index) => {
    const vassal = titles[index]
    const link = links.find(
      (one) => one.vassal === vassal && one.suzerain === suzerain && dateCoversYear(one.date, year)
    )
    return link?.id ?? null
  })
}

/**
 * The source of each link's first line, by its id — what the sheet shows on the link's block.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root
 * @param ids - the links
 * @returns each link's first source, by id; a link without one absent
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server refuses
 */
export async function fetchLinkSources(
  fetcher: typeof fetch,
  api: string,
  ids: readonly string[]
): Promise<Map<string, number | string>> {
  const sources = new Map<string, number | string>()
  if (ids.length === 0) return sources
  const params = new URLSearchParams({
    'where[id][in]': ids.join(','),
    depth: '0',
    pagination: 'false',
    'select[lines]': 'true',
  })
  const response = await fetcher(`${api}/vassal-links?${params.toString()}`, {
    credentials: 'include',
  })
  const docs = await readDocs(response, 'the sources of the chain', 'could not be read')
  for (const doc of docs) {
    const { id, lines } = (doc ?? {}) as { id?: unknown; lines?: { source?: unknown }[] }
    const source = relationId(lines?.[0]?.source)
    if ((typeof id === 'number' || typeof id === 'string') && source !== null)
      sources.set(String(id), source)
  }
  return sources
}

/**
 * A title from those read — `fetchTitleNames` refuses an answer missing one, so none is missing here.
 * @param titles - the titles read, by id as text
 * @param id - the title
 * @returns its id as the base gives it, and its name
 * @throws {Error} when it is missing, which `fetchTitleNames` was to refuse
 */
function titleOf(titles: ReadonlyMap<string, RecordChoice>, id: string): RecordChoice {
  const title = titles.get(id)
  if (title === undefined) throw new Error(`[CMS] the title ${id} of the chain was read unnamed`)
  return title
}
