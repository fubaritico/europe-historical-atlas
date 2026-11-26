import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/**
 * « Ajouter au CMS » from the page (CARTO-498, the flow offline): the request goes to the Cartographer's own dev
 * server (`devServer/cmsTerritoryEndpoint.ts`), which speaks to the CMS of the dev's machine with the session of whoever
 * is signed in — its cookie, which the browser sends and the page never reads.
 */

/** What the page asks the CMS to create — the fields `devServer/territoryRequest.ts` checks again on the server. */
export interface TerritoryToAdd {
  /** Its French name. */
  name: string
  /** Its English name. */
  nameEn: string
  /** The polity's rank, which is the territory's kind. */
  kind: string
  /** Its Wikidata item. */
  wikidata: string
  /** The year it began, or `null`. */
  existsFrom: number | null
  /** The year it ended, or `null`. */
  existsTo: number | null
}

/** How the creation ended. */
export type TerritoryAdded =
  /** The polity's territory: created now, or found by its Wikidata item. */
  | { kind: 'linked'; id: number; created: boolean }
  /** The CMS did not answer — not started. */
  | { kind: 'offline' }
  /** Nobody is signed in, or the CMS no longer knows the session: sign in again. */
  | { kind: 'signedOut' }
  /** Refused — by the CMS in its words, or by the dev server. */
  | { kind: 'refused'; reason: string }

/** The port the polity's dialogue adds a territory through. */
export interface CmsTerritoryPort {
  /**
   * Create a polity's territory in the CMS, or find the one its Wikidata item already has.
   * @param territory - what to create
   * @returns how it ended; never throws for an answer of the server — only when the server itself is gone
   */
  add(territory: TerritoryToAdd): Promise<TerritoryAdded>
}

/**
 * Read the dev server's answer.
 * @param status - its HTTP status
 * @param body - its JSON, or `null` when it is not JSON
 * @returns how the creation ended
 */
export function territoryAddedOf(status: number, body: unknown): TerritoryAdded {
  const fields = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  if (status === 200 && typeof fields.id === 'number' && typeof fields.created === 'boolean')
    return { kind: 'linked', id: fields.id, created: fields.created }
  if (status === 503) return { kind: 'offline' }
  if (status === 401) return { kind: 'signedOut' }
  return {
    kind: 'refused',
    reason:
      typeof fields.reason === 'string'
        ? fields.reason
        : `the dev server answered HTTP ${String(status)}`,
  }
}

/**
 * The port over the dev server's endpoint.
 * @param route - the endpoint's route, `CMS_TERRITORY_ROUTE`
 * @param fetchFile - how to fetch
 * @returns the port
 */
export function createCmsTerritoryClient(route: string, fetchFile: FetchLike): CmsTerritoryPort {
  return {
    async add(territory) {
      const response = await fetchFile(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(territory),
      })
      const body: unknown = await response.json().catch(() => null)
      return territoryAddedOf(response.status, body)
    },
  }
}
