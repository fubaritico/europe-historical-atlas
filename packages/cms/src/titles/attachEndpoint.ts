import { AttachRefusal, attachCities } from './attachCities'

import type { AttachPort, AttachResult } from './attachCities'
import type { Endpoint, PayloadRequest } from 'payload'

/** What the handler reads of Payload's request — structural, so a test hands it a literal. */
export type AttachRequest = Pick<PayloadRequest, 'user' | 'routeParams'> & {
  /** The body, read as JSON. */
  readonly json?: () => Promise<unknown>
}

/** What the body must hold: the year, and the cities' places by id. */
interface AttachBody {
  /** The year — the map's. */
  readonly year: number
  /** The places, by id. */
  readonly places: readonly number[]
}

/** The most cities one call attaches — a district, not the base (review SEC-003). */
export const MOST_PLACES = 500

/**
 * A record's id as sent — a positive whole number, or its digits as text, as a script reading JSON may send it.
 * @param value - what was sent
 * @returns the id, or `null` when it is not one
 */
function idOf(value: unknown): number | null {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : null
}

/**
 * The body, when it is one.
 * @param value - what was sent
 * @returns the body, or `null` when it is not one
 */
function bodyOf(value: unknown): AttachBody | null {
  if (typeof value !== 'object' || value === null) return null
  const { year, places } = value as { year?: unknown; places?: unknown }
  if (typeof year !== 'number' || !Number.isInteger(year)) return null
  if (!Array.isArray(places) || places.length === 0 || places.length > MOST_PLACES) return null
  const ids = places.map(idOf)
  if (ids.some((id) => id === null)) return null
  return { year, places: ids as number[] }
}

/**
 * Attach cities to a title at a year (CMS-507): `POST /api/titles/:id/cities` with `{ year, places }`. Signed-in
 * contributors only, one attachment at a time. Answers what became of each city; a year outside the title's years, or
 * a title with no source line, refuses the whole of it with its sentence.
 * @param request - the request
 * @param payload - Payload, or a stand-in for its four calls
 * @param attach - the operation
 * @returns `{ results }`, or `{ error }` with its status
 */
export async function attachHandler(
  request: AttachRequest,
  payload: AttachPort,
  attach: typeof attachCities = attachCities
): Promise<Response> {
  if (!request.user) return Response.json({ error: 'Non connecté.' }, { status: 401 })
  const id = idOf(request.routeParams?.id)
  const body = bodyOf(await request.json?.().catch(() => null))
  if (id === null || body === null) {
    return Response.json(
      {
        error: `Demande illisible : il faut le numéro du titre, une année entière et de 1 à ${String(MOST_PLACES)} lieux, par leur numéro.`,
      },
      { status: 400 }
    )
  }
  // One attachment at a time in this server — the page's and the script's alike — so two never read a city then
  // write it over each other (review QUAL-001)
  const turn = queue.then(() => attach(payload, id, body.year, body.places))
  queue = turn.then(
    () => undefined,
    () => undefined
  )
  try {
    const results: AttachResult[] = await turn
    return Response.json({ results })
  } catch (error: unknown) {
    if (error instanceof AttachRefusal)
      return Response.json({ error: error.message }, { status: 422 })
    throw error
  }
}

/** The attachments of this server, one after the other: each waits for the one before it to end, well or not. */
let queue: Promise<unknown> = Promise.resolve()

/** The route of a title's cities: `POST /api/titles/:id/cities`. */
export const titleEndpoints: Endpoint[] = [
  {
    path: '/:id/cities',
    method: 'post',
    handler: (request) => attachHandler(request, request.payload),
  },
]
