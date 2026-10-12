import { planYearWrite } from './yearWritePlan'

import type { PlannedFile } from './yearWritePlan'

/**
 * The dev server's year endpoint — `PUT /__years/<year>` writes a year into `packages/atlas/public/years/`.
 *
 * **Why the dev server, and why only it.** The dev's call, 2026-10-12: save and reopen *in local mode*,
 * from the Cartographer running on his machine. The browser cannot write into the repository by itself; the
 * Vite server running beside it can, and it already serves that very folder (the Cartographer's `publicDir`
 * *is* the atlas's), so a year saved here is read back by both applications with no file moved by hand. The
 * built site has no such server, so it cannot save — which is honest: online saving is `s15`'s Netlify
 * Function, a later tier behind the same gesture.
 *
 * **What it refuses, because a writing endpoint is a door.** Explicitly authorised by the dev on that
 * condition. Any page open in the browser can send a request to `localhost`, so:
 *   · only a request from the same machine — the `Host` is a loopback name and the `Origin` is that same
 *     host, which shuts out another site and a DNS-rebound name alike;
 *   · only `PUT`, only a body under {@link MAX_BODY_BYTES};
 *   · only a whole-number year, so the path is built from digits and fixed names and cannot climb out of
 *     `years/`;
 *   · only three files that `core` reads back and cross-checks without complaint (`yearWritePlan.ts`).
 *
 * **Every refusal is said** (`rules/error-handling.md`, *no refusal is silent*): a refused save answers with
 * its reason, which the editor shows, and logs a `console.warn` in the server's terminal; a failure of the
 * disk itself logs a `console.error`.
 */

/**
 * The largest body accepted, in bytes. A drawn year of the whole continent is a few megabytes; this
 * is ten times the worst measured, and small enough that a runaway request cannot fill the disk.
 */
export const MAX_BODY_BYTES = 32 * 1024 * 1024

/** The tag every line this endpoint logs starts with, so the dev server's terminal says who spoke. */
const LOG_TAG = '[Cartographer dev server]'

/**
 * The folder the years live in, as the endpoint needs it — paths relative to `years/`.
 *
 * Injected so the endpoint runs against a map in memory under test, and against `node:fs` in
 * `vite.config.ts`. That is also why there is no Node type in this file: it compiles with the browser
 * application and runs in the server.
 */
export interface YearsFolder {
  /**
   * Read a file.
   * @param relativePath - e.g. `index.json`
   * @returns its text, or `null` when there is no such file
   */
  read: (relativePath: string) => string | null
  /**
   * Write a file whole, creating its folder when needed.
   * @param relativePath - e.g. `1100/registry.json.tmp`
   * @param text - its full content
   */
  write: (relativePath: string, text: string) => void
  /**
   * Move a file over another, replacing it — atomic on one disk.
   * @param fromPath - the file written
   * @param toPath - where it ends up
   */
  rename: (fromPath: string, toPath: string) => void
}

/** A request, reduced to what the endpoint reads. */
export interface YearWriteHttpRequest {
  /** The HTTP method. */
  method: string | undefined
  /** The path **after** the route — `/1100` for `PUT /__years/1100`. */
  path: string | undefined
  /** The `Host` header. */
  host: string | undefined
  /** The `Origin` header. */
  origin: string | undefined
  /** The body, as text. */
  body: string
}

/** What the endpoint answers. */
export interface YearWriteHttpResponse {
  /** The HTTP status. */
  status: number
  /** A JSON body: `{ year, written }` on success, `{ reason }` otherwise. */
  body: string
}

/** The loopback names a request from this machine carries in its `Host`. */
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

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
function answer(status: number, payload: object): YearWriteHttpResponse {
  return { status, body: JSON.stringify(payload) }
}

/**
 * Write the planned files: each one beside its target first, then all of them renamed into place.
 *
 * **Why the two passes.** A save interrupted half-way — a full disk, a killed server — must not leave a
 * year with a new `polities.json` beside an old `registry.json`: that pair would be refused at the next
 * open, and the work of both saves lost to the author. Writing everything to `.tmp` first means a failure
 * leaves the previous year whole; only the renames can be interrupted, and each of those is atomic. The
 * manifest is the last file of the plan, so it is renamed last.
 * @param folder - the years folder
 * @param files - the files, in plan order
 */
function writeAll(folder: YearsFolder, files: readonly PlannedFile[]): void {
  for (const file of files) folder.write(`${file.relativePath}.tmp`, file.text)
  for (const file of files) folder.rename(`${file.relativePath}.tmp`, file.relativePath)
}

/**
 * Answer one request to the year endpoint.
 * @param request - the request, its body already read
 * @param folder - where the years live
 * @returns the response to send
 */
export function handleYearWrite(
  request: YearWriteHttpRequest,
  folder: YearsFolder
): YearWriteHttpResponse {
  if (!isSameMachineRequest(request.host, request.origin)) {
    console.warn(`${LOG_TAG} refused a year write from another origin (${String(request.origin)})`)
    return answer(403, { reason: 'only the Cartographer served by this machine may save' })
  }
  if (request.method !== 'PUT')
    return answer(405, { reason: `${String(request.method)} is not how a year is saved — use PUT` })

  let body: unknown
  try {
    body = JSON.parse(request.body)
  } catch {
    console.warn(`${LOG_TAG} refused a year write whose body is not JSON`)
    return answer(400, { reason: 'the body is not JSON' })
  }

  const decision = planYearWrite({
    yearSegment: (request.path ?? '').replace(/^\//, ''),
    body,
    manifestText: folder.read('index.json'),
  })
  if (!decision.accepted) {
    console.warn(`${LOG_TAG} refused a year write: ${decision.refusal.reason}`)
    return answer(decision.refusal.status, { reason: decision.refusal.reason })
  }

  writeAll(folder, decision.plan.files)
  return answer(200, {
    year: decision.plan.year,
    written: decision.plan.files.map((file) => file.relativePath),
  })
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
function send(res: ResponseSink, response: YearWriteHttpResponse): void {
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

/**
 * Answer a request whose body has been read whole, sending 500 when the disk itself fails.
 *
 * **The `catch` answers and logs, it never continues**: a write that threw has written nothing the plan
 * did not already allow for (`writeAll`'s two passes), and the author must learn that the save failed
 * rather than believe it happened.
 * @param req - the request
 * @param res - the response
 * @param body - the body, as text
 * @param folder - where the years live
 */
function respond(req: BodyStream, res: ResponseSink, body: string, folder: YearsFolder): void {
  try {
    send(
      res,
      handleYearWrite(
        {
          method: req.method,
          path: req.url,
          host: headerOf(req.headers.host),
          origin: headerOf(req.headers.origin),
          body,
        },
        folder
      )
    )
  } catch (error: unknown) {
    // The full error, absolute paths and all, goes to the server's terminal; the page gets a fixed
    // sentence and Node's code (`ENOSPC`, `EACCES`), enough to tell a full disk from a permission (SEC-001).
    console.error(`${LOG_TAG} a year write failed on disk`, error)
    send(res, answer(500, { reason: `the save failed on disk${diskCodeOf(error)}` }))
  }
}

/**
 * The middleware Vite mounts on `YEAR_WRITE_ROUTE` (`yearWriteRoute.ts`): read the body, cap its size, answer.
 * @param folder - where the years live
 * @returns a Connect middleware
 */
export function createYearWriteMiddleware(
  folder: YearsFolder
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
        console.warn(`${LOG_TAG} refused a year write larger than ${String(MAX_BODY_BYTES)} bytes`)
        // The rest of the body is dropped as it arrives, never kept — and the connection is left open,
        // because destroying it now could cut the 413 off before it reaches the page (QUAL-003).
        send(res, answer(413, { reason: 'the year is larger than the dev server accepts' }))
        return
      }
      body += decoder.decode(chunk, { stream: true })
    })
    req.on('end', () => {
      if (refused) return
      respond(req, res, body + decoder.decode(), folder)
    })
    // A connection cut mid-body: nothing was written, and the page — if it is still there — is told so.
    req.on('error', () => {
      if (refused) return
      refused = true
      console.error(`${LOG_TAG} a year write was cut off before its body arrived`)
      send(res, answer(400, { reason: 'the save was cut off before it arrived' }))
    })
  }
}
