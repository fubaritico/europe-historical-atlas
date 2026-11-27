import { ANSWER_TIMEOUT_MS } from '@europe-historical-atlas/core/utils/fetchWithin'

import { CmsUnreachableError } from './cmsSession'
import { territoriesOf } from './territoryList'

import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'
import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/**
 * The CMS's territories, as the dev server reaches them (CARTO-498, the flow offline): through Payload's REST API on the
 * dev's machine, **with the session of whoever is signed in to the Cartographer** — the token of Payload's cookie,
 * handed as `Authorization: JWT <token>`, as the session's own routes do (`cmsSession.ts`). A key of the MCP plugin
 * cannot do it: Payload 3.92 opens its REST API to no such key (`rules/known-issues/cms.md`, 2026-11-25). So a territory
 * is created in the name of the person signed in, and never by a key kept on disk.
 */
export interface CmsTerritories {
  /**
   * The territory a Wikidata item already has in the CMS.
   * @param token - the session's token
   * @param wikidata - the item
   * @returns its number, or `null` when the CMS has none
   */
  findByWikidata(token: string, wikidata: string): Promise<number | null>
  /**
   * Create a territory.
   * @param token - the session's token
   * @param body - the territory, as the REST API takes it
   * @returns its number
   */
  create(token: string, body: Record<string, unknown>): Promise<number>
  /**
   * Every territory, the bin left out — what [Check this year] confronts the map with (CARTO-568).
   * @param token - the session's token
   * @returns the territories, as the Cartographer holds them
   */
  list(token: string): Promise<ContentTerritory[]>
}

/** The CMS answered, and refused — its own sentence, a validation's. */
export class CmsRefusalError extends Error {
  /**
   * @param message - the CMS's sentence
   */
  constructor(message: string) {
    super(message)
    this.name = 'CmsRefusalError'
  }
}

/**
 * The CMS refused the session: it no longer knows it, or it never opened this to it. Payload answers 403 to a request
 * whose token it does not know (3.92: such a request is nobody, and the default access refuses nobody), 401 to some of
 * its routes — both mean « sign in again ». **Only while every signed-in user may create a territory** (the CMS's
 * `Territories` sets no access, so Payload's default lets anyone signed in): once accounts have roles (CMS-228), a 403
 * may be a right refused, and it must be told apart — `rules/known-issues/cartographer.md`.
 */
export class CmsSessionRefusedError extends Error {
  /**
   * @param message - the CMS's sentence
   */
  constructor(message: string) {
    super(message)
    this.name = 'CmsSessionRefusedError'
  }
}

/**
 * The CMS's own sentence in a refusal: Payload answers `{ errors: [{ message }] }`.
 * @param status - the HTTP status
 * @param body - the answer, read as JSON when it is
 * @returns the sentence
 */
function refusalOf(status: number, body: unknown): string {
  const errors = (body as { errors?: { message?: unknown }[] } | null)?.errors
  const first = Array.isArray(errors) ? errors[0]?.message : undefined
  return typeof first === 'string' ? first : `the CMS answered HTTP ${String(status)}`
}

/**
 * Ask the CMS, turning a failure into what the endpoint tells apart: no answer, the session refused, or a refusal.
 * Every call is bounded, the POST too, as the session's are: a CMS that never answers is the CMS not answering. A
 * creation cut after the CMS accepted it is found by its Wikidata item at the next « Ajouter au CMS », never made twice.
 * @param fetchFile - how to fetch
 * @param url - the request's address
 * @param init - the request
 * @returns the answer's JSON
 * @throws {CmsUnreachableError} when the CMS does not answer
 * @throws {CmsSessionRefusedError} when it refuses the session
 * @throws {CmsRefusalError} when it refuses otherwise
 */
async function ask(fetchFile: FetchLike, url: string, init: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetchFile(url, { ...init, signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS) })
  } catch (error: unknown) {
    throw new CmsUnreachableError(error)
  }
  const body: unknown = await response.json().catch(() => null)
  if (response.status === 401 || response.status === 403)
    throw new CmsSessionRefusedError(refusalOf(response.status, body))
  if (!response.ok) throw new CmsRefusalError(refusalOf(response.status, body))
  return body
}

/**
 * The record's number in an answer, refused loudly when there is none: a creation that answers no number cannot be
 * written on the polity.
 * @param value - the number found
 * @returns it
 * @throws {CmsRefusalError} when it is not a number
 */
function idOf(value: unknown): number {
  if (typeof value !== 'number') throw new CmsRefusalError('the CMS answered without a number')
  return value
}

const headers = (token: string) => ({
  Authorization: `JWT ${token}`,
  'Content-Type': 'application/json',
})

/**
 * The CMS's territories over its REST API.
 * @param url - the CMS's address, `http://127.0.0.1:3100`
 * @param fetchFile - how to fetch
 * @returns the territories
 */
export function createCmsTerritories(url: string, fetchFile: FetchLike): CmsTerritories {
  const base = `${url.replace(/\/+$/, '')}/api/territories`
  return {
    async findByWikidata(token, wikidata) {
      const query = new URLSearchParams({
        'where[wikidata][equals]': wikidata,
        limit: '1',
        depth: '0',
      })
      const body = (await ask(fetchFile, `${base}?${query.toString()}`, {
        headers: headers(token),
      })) as { docs?: { id?: unknown }[] } | null
      const first = body?.docs?.[0]
      return first === undefined ? null : idOf(first.id)
    },
    async create(token, territory) {
      const body = (await ask(fetchFile, base, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify(territory),
      })) as { doc?: { id?: unknown } } | null
      return idOf(body?.doc?.id)
    },
    async list(token) {
      // One page holding them all: a thousand territories, a few hundred kB; the bin is left out by Payload's default
      const query = new URLSearchParams({ pagination: 'false', depth: '0' })
      const body = await ask(fetchFile, `${base}?${query.toString()}`, { headers: headers(token) })
      try {
        return territoriesOf(body)
      } catch (error: unknown) {
        throw new CmsRefusalError(error instanceof Error ? error.message : String(error))
      }
    },
  }
}
