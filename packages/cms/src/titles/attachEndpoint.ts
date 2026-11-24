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
  readonly places: readonly (number | string)[]
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
  if (!Array.isArray(places) || places.length === 0) return null
  if (!places.every((place) => typeof place === 'number' || typeof place === 'string')) return null
  return { year, places: places }
}

/**
 * Attach cities to a title at a year (CMS-507): `POST /api/titles/:id/cities` with `{ year, places }`. Signed-in
 * contributors only. Answers what became of each city; a year outside the title's years, or a title with no source
 * line, refuses the whole of it with its sentence.
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
  if (request.user === null) return Response.json({ error: 'Non connecté.' }, { status: 401 })
  const id = request.routeParams?.id
  const body = bodyOf(await request.json?.().catch(() => null))
  if (typeof id !== 'string' || body === null) {
    return Response.json(
      { error: 'Demande illisible : il faut une année entière et au moins un lieu.' },
      { status: 400 }
    )
  }
  try {
    const results: AttachResult[] = await attach(payload, id, body.year, body.places)
    return Response.json({ results })
  } catch (error: unknown) {
    if (error instanceof AttachRefusal)
      return Response.json({ error: error.message }, { status: 422 })
    throw error
  }
}

/** The route of a title's cities: `POST /api/titles/:id/cities`. */
export const titleEndpoints: Endpoint[] = [
  {
    path: '/:id/cities',
    method: 'post',
    handler: (request) => attachHandler(request, request.payload),
  },
]
