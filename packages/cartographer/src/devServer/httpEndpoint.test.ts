import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { answer, createBodyMiddleware } from './httpEndpoint'

import type {
  BodyStream,
  EndpointRequest,
  EndpointResponse,
  RequestHandler,
  ResponseSink,
} from './httpEndpoint'

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
  createBodyMiddleware({ handle, failure: 'the test failed' })(req, sink())
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
    it('hands each request to the endpoint once, and answers once', () => {
      const handle = vi.fn<RequestHandler>(() => answer(200, {}))
      const end = vi.fn()
      const res: ResponseSink = {
        statusCode: 0,
        setHeader: () => res,
        end: (body) => {
          end(body)
          return res
        },
      }
      const req = streamOf({ cookie: 'payload-token=t' })
      createBodyMiddleware({ handle, failure: 'the test failed' })(req, res)
      req.emit()
      expect(handle).toHaveBeenCalledTimes(1)
      expect(handle.mock.calls[0]?.[0].cookie).toBe('payload-token=t')
      expect(end).toHaveBeenCalledTimes(1)
    })

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

/**
 * An endpoint that sets two cookies, as the CMS can.
 * @returns its answer
 */
const setsTwoCookies = (): EndpointResponse => ({
  ...answer(200, {}),
  setCookie: ['a=1; Path=/', 'b=2; Path=/'],
})

describe('createBodyMiddleware, the session’s cookie (CARTO-535)', () => {
  it('hands the request’s Cookie header to the endpoint', () => {
    expect(requestSeenWith({ cookie: 'payload-token=t; theme=dark' })?.cookie).toBe(
      'payload-token=t; theme=dark'
    )
  })

  it('sends every cookie the endpoint sets as its own Set-Cookie header — an array, never joined', () => {
    const headers = new Map<string, unknown>()
    const res: ResponseSink = {
      statusCode: 0,
      setHeader: (name, value) => {
        headers.set(name.toLowerCase(), value)
        return res
      },
      end: () => res,
    }
    const req = streamOf({})
    createBodyMiddleware({ handle: setsTwoCookies, failure: 'the test failed' })(req, res)
    req.emit()
    expect(headers.get('set-cookie')).toEqual(['a=1; Path=/', 'b=2; Path=/'])
  })
})

/**
 * Run one request through the middleware with an endpoint that answers by a promise.
 * @param handle - the endpoint
 * @returns what was sent, once the promise has settled
 */
async function sentBy(handle: RequestHandler): Promise<{ status: number; body: string }> {
  const sent = { status: 0, body: '' }
  const res: ResponseSink = {
    statusCode: 0,
    setHeader: () => res,
    end: (body) => {
      sent.status = res.statusCode
      sent.body = body ?? ''
      return res
    },
  }
  const req = streamOf({})
  createBodyMiddleware({ handle, failure: 'the test failed' })(req, res)
  req.emit()
  await new Promise((settle) => setTimeout(settle, 0))
  return sent
}

describe('createBodyMiddleware, an endpoint that answers later (CARTO-498)', () => {
  describe('happy path', () => {
    it('sends the answer once it arrives', async () => {
      expect(await sentBy(() => Promise.resolve(answer(200, { id: 7 })))).toEqual({
        status: 200,
        body: '{"id":7}',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('answers 500 when the answer fails, and says so on the console', async () => {
      const sent = await sentBy(() => Promise.reject(new Error('boom')))
      expect(sent.status).toBe(500)
      expect(console.error).toHaveBeenCalled()
    })
  })
})
