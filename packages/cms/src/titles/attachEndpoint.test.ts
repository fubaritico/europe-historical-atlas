import { describe, expect, it, vi } from 'vitest'

import { AttachRefusal } from './attachCities'
import { attachHandler, titleEndpoints } from './attachEndpoint'

import type { AttachPort, AttachResult, attachCities } from './attachCities'
import type { AttachRequest } from './attachEndpoint'

/** Payload is never reached: the operation is a stand-in. */
const PAYLOAD = {} as AttachPort

/** What the stand-in answers. */
const RESULTS: AttachResult[] = [{ place: 1, name: 'Nîmes', result: 'created', sheet: 5 }]

/**
 * A request of a signed-in contributor.
 * @param body - what it sends
 * @param id - the title in the route, or `null` for none
 * @returns the request
 */
function signedIn(body: unknown, id: string | null = '7'): AttachRequest {
  return {
    user: { id: 1 },
    routeParams: id === null ? {} : { id },
    json: () => Promise.resolve(body),
  } as unknown as AttachRequest
}

describe('attachHandler', () => {
  describe('happy path', () => {
    it('hands the title, the year and the places to the operation, and answers its results', async () => {
      const attach = vi.fn<typeof attachCities>().mockResolvedValue(RESULTS)
      const response = await attachHandler(signedIn({ year: 1100, places: [1] }), PAYLOAD, attach)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ results: RESULTS })
      expect(attach).toHaveBeenCalledWith(PAYLOAD, '7', 1100, [1])
    })
  })

  describe('variants', () => {
    it('is the route POST /:id/cities of the titles', () => {
      expect(titleEndpoints.map(({ method, path }) => [method, path])).toEqual([
        ['post', '/:id/cities'],
      ])
    })
  })

  describe('managed errors', () => {
    it('refuses a caller not signed in, touching nothing', async () => {
      const attach = vi.fn<typeof attachCities>()
      const response = await attachHandler({ user: null }, PAYLOAD, attach)
      expect(response.status).toBe(401)
      expect(attach).not.toHaveBeenCalled()
    })

    it('refuses a body without a whole year or without a place', async () => {
      const attach = vi.fn<typeof attachCities>()
      for (const body of [{ year: 1100.5, places: [1] }, { year: 1100, places: [] }, 'x']) {
        const response = await attachHandler(signedIn(body), PAYLOAD, attach)
        expect(response.status).toBe(400)
      }
      expect(attach).not.toHaveBeenCalled()
    })

    it('says the operation’s refusal with its own sentence', async () => {
      const attach = vi
        .fn<typeof attachCities>()
        .mockRejectedValue(new AttachRefusal('L’année 1110 sort des années du titre (1094–1105).'))
      const response = await attachHandler(signedIn({ year: 1110, places: [1] }), PAYLOAD, attach)
      expect(response.status).toBe(422)
      expect(await response.json()).toEqual({
        error: 'L’année 1110 sort des années du titre (1094–1105).',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('lets any other failure through, for Payload to answer', async () => {
      const attach = vi.fn<typeof attachCities>().mockRejectedValue(new Error('disk'))
      await expect(
        attachHandler(signedIn({ year: 1100, places: [1] }), PAYLOAD, attach)
      ).rejects.toThrow('disk')
    })
  })

  describe('edge cases', () => {
    it('refuses a route with no title in it', async () => {
      const response = await attachHandler(signedIn({ year: 1100, places: [1] }, null), PAYLOAD)
      expect(response.status).toBe(400)
    })
  })
})
