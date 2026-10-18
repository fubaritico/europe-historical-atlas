import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { answer, createBodyMiddleware } from './httpEndpoint'

import type { BodyStream, EndpointRequest, RequestHandler, ResponseSink } from './httpEndpoint'

/** A request stream carrying the headers given and a short body, replayed by `emit`. */
function streamOf(headers: Record<string, string | string[] | undefined>) {
  const listeners = new Map<string, ((chunk?: Uint8Array) => void)[]>()
  const stream: BodyStream & { emit: () => void } = {
    method: 'PUT',
    url: '/1100',
    headers: { host: 'localhost:5174', origin: 'http://localhost:5174', ...headers },
    on: (event, listener) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
      return stream
    },
    emit: () => {
      for (const listener of listeners.get('data') ?? []) listener(new TextEncoder().encode('{}'))
      for (const listener of listeners.get('end') ?? []) listener()
    },
  }
  return stream
}

/** A response that drops what is sent. */
function sink(): ResponseSink {
  const res: ResponseSink = { statusCode: 0, setHeader: () => res, end: () => res }
  return res
}

/** Run a request with the given headers through the middleware, and return what the endpoint saw. */
function requestSeenWith(
  headers: Record<string, string | string[] | undefined>
): EndpointRequest | undefined {
  const handle = vi.fn<RequestHandler>(() => answer(200, {}))
  const req = streamOf(headers)
  createBodyMiddleware({ handle, what: 'the test' })(req, sink())
  req.emit()
  return handle.mock.calls[0]?.[0]
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createBodyMiddleware', () => {
  describe('happy path', () => {
    it('hands the If-Match header to the endpoint as ifMatch', () => {
      expect(requestSeenWith({ 'if-match': '1a2b3c4d' })?.ifMatch).toBe('1a2b3c4d')
    })
  })

  describe('variants', () => {
    it('hands the first value of an If-Match header Node gives as an array', () => {
      expect(requestSeenWith({ 'if-match': ['1a2b3c4d', 'ffffffff'] })?.ifMatch).toBe('1a2b3c4d')
    })

    it('hands ifMatch undefined when no If-Match header is sent', () => {
      expect(requestSeenWith({})?.ifMatch).toBeUndefined()
    })
  })

  // L3: N/A — the header is passed on as it is; refusing a stale one is the year endpoint's (yearWriteEndpoint.test).
  // L4: N/A — a throwing endpoint answering 500 is tested in yearWriteEndpoint.test.

  describe('edge cases', () => {
    it('hands an empty If-Match header on as an empty string, not as absent', () => {
      expect(requestSeenWith({ 'if-match': '' })?.ifMatch).toBe('')
    })
  })
})
