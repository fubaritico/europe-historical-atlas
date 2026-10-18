/**
 * The HTTP plumbing every dev-server endpoint of the Cartographer shares — the year save
 * (`yearWriteEndpoint.ts`) and the draft (`draftEndpoint.ts`): the request and response a handler sees, the
 * same-machine lock, the body read whole under a cap, and the 500 a failing disk answers.
 *
 * **No Node type here**, as in the endpoints: it compiles with the browser application and runs in the
 * server, the streams reduced to what is read and written.
 */

/**
 * The largest body accepted, in bytes. A drawn year of the whole continent is a few megabytes; this
 * is ten times the worst measured, and small enough that a runaway request cannot fill the disk.
 */
export const MAX_BODY_BYTES = 32 * 1024 * 1024

/** The tag every line an endpoint logs starts with, so the dev server's terminal says who spoke. */
export const LOG_TAG = '[Cartographer dev server]'

/** A request, reduced to what an endpoint reads. */
export interface EndpointRequest {
  /** The HTTP method. */
  method: string | undefined
  /** The path **after** the route — `/1100` for `PUT /__years/1100`. */
  path: string | undefined
  /** The `Host` header. */
  host: string | undefined
  /** The `Origin` header. */
  origin: string | undefined
  /**
   * The `If-Match` header: the fingerprint of the year the page opened, when a save asks to write only over
   * that very year (CARTO-238, rung 3). Absent, the write is unconditional.
   */
  ifMatch?: string | undefined
  /** The body, as text. */
  body: string
}

/** What an endpoint answers. */
export interface EndpointResponse {
  /** The HTTP status. */
  status: number
  /** A JSON body — `{ reason }` when refused. */
  body: string
}

/** The loopback names a request from this machine carries in its `Host`. */
export const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

/**
 * Whether a request comes from a page served by this very server, on this very machine.
 *
 * Both halves are needed. `Origin` alone would let a DNS-rebound name through — the attacker's page *is*
 * same-origin with its own name; `Host` alone would let any site's page through, its `Origin` being its
 * own. Requiring a loopback `Host` **and** an `Origin` equal to it leaves only a page this server served.
 * @param host - the `Host` header
 * @param origin - the `Origin` header
 * @returns `true` when both match
 */
export function isSameMachineRequest(
  host: string | undefined,
  origin: string | undefined
): boolean {
  if (host === undefined || origin === undefined) return false
  return LOOPBACK_HOST.test(host) && origin === `http://${host}`
}

/**
 * Build a response with a JSON body.
 * @param status - the HTTP status
 * @param payload - what to put in the body
 * @returns the response
 */
export function answer(status: number, payload: object): EndpointResponse {
  return { status, body: JSON.stringify(payload) }
}

/** A Node request stream, reduced to the events the body is read from. */
export interface BodyStream {
  /** The HTTP method. */
  method?: string | undefined
  /** The URL, after the route the middleware is mounted on. */
  url?: string | undefined
  /** The headers. */
  headers: Record<string, string | string[] | undefined>
  /** Subscribe to the stream. */
  on: (event: string, listener: (chunk?: Uint8Array) => void) => unknown
}

/** A Node response, reduced to what the endpoint writes. */
export interface ResponseSink {
  /** The status to send. */
  statusCode: number
  /** Set a header. */
  setHeader: (name: string, value: string) => unknown
  /** Send the body and close. */
  end: (body?: string) => unknown
}

/**
 * Read one header as a single string, the way Node may hand it over as an array.
 * @param value - the header
 * @returns its first value, or `undefined`
 */
function headerOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Send a response.
 * @param res - the Node response
 * @param response - what to send
 */
function send(res: ResponseSink, response: EndpointResponse): void {
  res.statusCode = response.status
  res.setHeader('content-type', 'application/json')
  res.end(response.body)
}

/**
 * Node's error code, as a suffix for the author's message — `" (ENOSPC)"`, or nothing when there is none.
 * @param error - what the disk threw
 * @returns the suffix
 */
function diskCodeOf(error: unknown): string {
  if (error instanceof Error && 'code' in error && typeof error.code === 'string')
    return ` (${error.code})`
  return ''
}

/** One endpoint's answer to a request whose body has been read whole. */
export type RequestHandler = (request: EndpointRequest) => EndpointResponse

/** What a body-reading middleware needs to know about the endpoint it serves. */
export interface EndpointWiring {
  /** Answer the request. */
  handle: RequestHandler
  /** What a disk failure is called, for the log and the page — *"the save"*, *"the draft"*. */
  what: string
}

/**
 * Answer a request whose body has been read whole, sending 500 when the disk itself fails.
 *
 * **The `catch` answers and logs, it never continues**: a write that threw has written nothing the plan
 * did not already allow for (`writeAll`'s two passes), and the author must learn that the save failed
 * rather than believe it happened.
 * @param req - the request
 * @param res - the response
 * @param body - the body, as text
 * @param wiring - the endpoint's handler and the name of what it writes
 */
function respond(req: BodyStream, res: ResponseSink, body: string, wiring: EndpointWiring): void {
  try {
    send(
      res,
      wiring.handle({
        method: req.method,
        path: req.url,
        host: headerOf(req.headers.host),
        origin: headerOf(req.headers.origin),
        ifMatch: headerOf(req.headers['if-match']),
        body,
      })
    )
  } catch (error: unknown) {
    // The full error, absolute paths and all, goes to the server's terminal; the page gets a fixed
    // sentence and Node's code (`ENOSPC`, `EACCES`), enough to tell a full disk from a permission (SEC-001).
    console.error(`${LOG_TAG} ${wiring.what} failed on disk`, error)
    send(res, answer(500, { reason: `${wiring.what} failed on disk${diskCodeOf(error)}` }))
  }
}

/**
 * A Connect middleware that reads a request's body whole, caps its size at {@link MAX_BODY_BYTES}, and
 * hands it to the endpoint — the part every dev-server endpoint of the Cartographer shares (the year save,
 * the draft).
 * @param wiring - the endpoint's handler and the name of what it writes
 * @returns the middleware
 */
export function createBodyMiddleware(
  wiring: EndpointWiring
): (req: BodyStream, res: ResponseSink) => void {
  return (req, res) => {
    const decoder = new TextDecoder()
    let body = ''
    let size = 0
    let refused = false
    req.on('data', (chunk) => {
      if (refused || chunk === undefined) return
      size += chunk.byteLength
      if (size > MAX_BODY_BYTES) {
        refused = true
        console.warn(`${LOG_TAG} refused a request larger than ${String(MAX_BODY_BYTES)} bytes`)
        // The rest of the body is dropped as it arrives, never kept — and the connection is left open,
        // because destroying it now could cut the 413 off before it reaches the page (QUAL-003).
        send(res, answer(413, { reason: 'the request is larger than the dev server accepts' }))
        return
      }
      body += decoder.decode(chunk, { stream: true })
    })
    req.on('end', () => {
      if (refused) return
      respond(req, res, body + decoder.decode(), wiring)
    })
    // A connection cut mid-body: nothing was written, and the page — if it is still there — is told so.
    req.on('error', () => {
      if (refused) return
      refused = true
      console.error(`${LOG_TAG} a request was cut off before its body arrived`)
      send(res, answer(400, { reason: 'the request was cut off before it arrived' }))
    })
  }
}
