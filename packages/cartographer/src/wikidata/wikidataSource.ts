import { readEntity } from './wikidataFacts'

import type { WikidataFacts } from './wikidataFacts'

/**
 * Where the editor reads Wikidata from (CARTO-243) — a port, so the form and the year check run against a
 * stub in tests, and against the public API in the application.
 *
 * **The API answers a batch of ids, and one unknown id fails the whole batch** — measured on 2026-10-17:
 * `wbgetentities` returns `{ error: { code: 'no-such-entity', id } }` rather than marking that id missing.
 * So the source drops the id the error names and asks again, reporting it as unknown rather than letting a
 * typo hide every other answer.
 *
 * **What is sent**: the ids, nothing else — no account, no address. CORS is opened by `origin=*`, the
 * anonymous mode Wikidata documents for browsers.
 */

/** The ids the API accepts in one request. */
export const WIKIDATA_BATCH = 50

/** A Wikidata id: Q followed by digits. */
export const WIKIDATA_ID = /^Q\d+$/

/** What a read answers. */
export interface WikidataAnswer {
  /** The facts of every id found, by id. */
  found: Map<string, WikidataFacts>
  /** The ids Wikidata does not know. */
  unknown: string[]
}

/** The port. */
export interface WikidataSource {
  /**
   * Read the facts of several items.
   * @param ids - `Q…` ids; anything else is reported unknown without being sent
   * @returns what was found, and what Wikidata does not know
   * @throws an `Error` when the API cannot be reached or answers something unreadable
   */
  read: (ids: readonly string[]) => Promise<WikidataAnswer>
}

/** What the API source needs. */
export interface WikidataApiSourceDeps {
  /** The fetch to use — the window's in the application, a stub in tests. */
  fetch: typeof fetch
  /** The API's address — `https://www.wikidata.org/w/api.php`. */
  endpoint: string
}

/** The public API. */
export const WIKIDATA_ENDPOINT = 'https://www.wikidata.org/w/api.php'

/**
 * The URL of one `wbgetentities` request.
 * @param endpoint - the API
 * @param ids - up to {@link WIKIDATA_BATCH} ids
 * @returns the URL
 */
function requestUrl(endpoint: string, ids: readonly string[]): string {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels|claims|sitelinks',
    languages: 'en|fr',
    sitefilter: 'enwiki|frwiki',
    format: 'json',
    origin: '*',
  })
  return `${endpoint}?${params.toString()}`
}

/** What one answer of the API means: the entities, or the one id it does not know. */
type BatchAnswer = { entities: Record<string, unknown> } | { unknownId: string }

/**
 * Read a field of an object the API sent.
 * @param value - the object, or anything
 * @param key - the field
 * @returns its value, or `undefined`
 */
function fieldOf(value: unknown, key: string): unknown {
  return value !== null && typeof value === 'object' && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined
}

/**
 * Make sense of one answer of `wbgetentities`.
 * @param body - the parsed JSON
 * @param asked - the ids of the request
 * @returns the entities, or the id an unknown-entity error names
 * @throws an `Error` on any other answer
 */
function readBatchAnswer(body: unknown, asked: readonly string[]): BatchAnswer {
  const error = fieldOf(body, 'error')
  if (error !== undefined) {
    const id = fieldOf(error, 'id')
    const code = fieldOf(error, 'code')
    if (code === 'no-such-entity' && typeof id === 'string' && asked.includes(id))
      return { unknownId: id }
    throw new Error(`Wikidata refused the request (${String(code)})`)
  }
  const entities = fieldOf(body, 'entities')
  if (entities === null || typeof entities !== 'object' || Array.isArray(entities))
    throw new Error('Wikidata answered without entities')
  return { entities: { ...entities } }
}

/**
 * One request, retried without the id an unknown-entity error names, until it answers.
 * @param deps - the fetch and the endpoint
 * @param ids - the ids of the batch
 * @param unknown - where the unknown ids are collected
 * @returns the API's `entities`
 * @throws an `Error` on a transport failure or an unreadable answer
 */
async function fetchBatch(
  deps: WikidataApiSourceDeps,
  ids: string[],
  unknown: string[]
): Promise<Record<string, unknown>> {
  let asked = ids
  while (asked.length > 0) {
    const response = await deps.fetch(requestUrl(deps.endpoint, asked))
    if (!response.ok) throw new Error(`Wikidata answered HTTP ${String(response.status)}`)
    const answer = readBatchAnswer(await response.json(), asked)
    if ('entities' in answer) return answer.entities
    unknown.push(answer.unknownId)
    asked = asked.filter((held) => held !== answer.unknownId)
  }
  return {}
}

/**
 * A source reading the public Wikidata API.
 * @param deps - the fetch and the endpoint
 * @returns the source
 */
export function createWikidataApiSource(deps: WikidataApiSourceDeps): WikidataSource {
  return {
    read: async (ids) => {
      const unique = [...new Set(ids)]
      const unknown = unique.filter((id) => !WIKIDATA_ID.test(id))
      const valid = unique.filter((id) => WIKIDATA_ID.test(id))
      const found = new Map<string, WikidataFacts>()
      for (let start = 0; start < valid.length; start += WIKIDATA_BATCH) {
        const entities = await fetchBatch(deps, valid.slice(start, start + WIKIDATA_BATCH), unknown)
        for (const [id, entity] of Object.entries(entities)) {
          const facts = readEntity(entity)
          if (facts === null) unknown.push(id)
          else found.set(id, facts)
        }
      }
      return { found, unknown }
    },
  }
}
