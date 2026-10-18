import {
  LOG_TAG,
  LOOPBACK_HOST,
  answer,
  createBodyMiddleware,
  isSameMachineRequest,
} from './httpEndpoint'
import { YEAR_DIGITS } from './yearWritePlan'

import type { DiskFolder } from './diskFolder'
import type { BodyStream, EndpointRequest, EndpointResponse, ResponseSink } from './httpEndpoint'

/**
 * The dev server's draft endpoint — the work since the last ‹ctrl+S›, kept on disk (CARTO-238, the dev's
 * call of 2026-10-17: *« on ne peut pas se permettre de perdre quelque chose »*).
 *
 * | request | answer |
 * | --- | --- |
 * | `PUT /__drafts/<year>` | write the draft, atomically |
 * | `GET /__drafts/<year>` | the draft, or 404 when there is none |
 * | `DELETE /__drafts/<year>` | remove it — after a save, it holds nothing the year does not |
 * | `POST /__drafts/<year>/set-aside` | keep it under a dated name, out of the way of the next one |
 * | `POST /__drafts/<year>/snapshot` | keep the body as an hourly snapshot, under a dated name (rung 2a) |
 *
 * **Not in `public/`.** The drafts live in `packages/cartographer/.autosave/drafts/`, git-ignored: under
 * `public/years/` the dev server would serve them and every build would publish them.
 *
 * **The same door as the year endpoint, with the same locks**: only a page this machine served (a write
 * must carry the matching `Origin`; a read, which a browser sends without one, still needs a loopback
 * `Host`, and no CORS header lets another site read the answer), a body capped by the shared middleware,
 * and a year made of digits, so a path cannot climb out of the folder. Every refusal answers its reason and
 * logs a `console.warn`.
 *
 * **What it does not check**: the draft's contents. A draft is the editor's own copy of work in progress,
 * read back by the editor alone — refusing one that `core` would not accept as a year would leave exactly
 * the work most at risk unprotected. It is checked when it is reopened, by the same readers as a year.
 */

/** The folder the drafts live in, as the endpoint needs it — the year folder's calls, plus removal. */
export interface DraftFolder extends DiskFolder {
  /**
   * Remove a file.
   * @param relativePath - e.g. `1100.json`
   */
  remove: (relativePath: string) => void
}

/** `/1100`, `/1100/set-aside` or `/1100/snapshot`. */
const DRAFT_PATH = new RegExp(`^/(${YEAR_DIGITS})(/set-aside|/snapshot)?$`)

/**
 * Refuse, saying why, and log it.
 * @param status - the HTTP status
 * @param reason - the sentence the page shows
 * @returns the response
 */
function refuse(status: number, reason: string): EndpointResponse {
  console.warn(`${LOG_TAG} refused a draft request: ${reason}`)
  return answer(status, { reason })
}

/**
 * The file name a set-aside draft takes — sortable, and safe on every disk (no colon).
 * @param year - the draft's year
 * @param at - when it was set aside
 * @returns e.g. `1100.set-aside-2026-10-17T15-42-07Z.json`
 */
export function setAsideName(year: string, at: Date): string {
  return `${year}.set-aside-${fileTime(at)}.json`
}

/**
 * A time as it goes into a file name — sortable, and safe on every disk (no colon).
 * @param at - the time
 * @returns e.g. `2026-10-17T15-42-07Z`
 */
function fileTime(at: Date): string {
  return at
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replaceAll(':', '-')
}

/**
 * The file name an hourly snapshot takes (CARTO-238, rung 2a).
 * @param year - its year
 * @param at - when it was taken
 * @returns e.g. `1100.2026-10-18T15-01-02Z.json`
 */
export function snapshotName(year: string, at: Date): string {
  return `${year}.${fileTime(at)}.json`
}

/**
 * `POST /<year>/snapshot`: keep the body as a snapshot — every one is kept, under its own name (the dev,
 * 2026-10-18).
 * @param request - the request
 * @param year - the year in the path
 * @param snapshots - where the snapshots live
 * @param now - the clock
 * @returns the response
 */
function keepSnapshot(
  request: EndpointRequest,
  year: string,
  snapshots: DiskFolder,
  now: () => Date
): EndpointResponse {
  if (request.method !== 'POST') return refuse(405, 'a snapshot is kept with POST')
  const refusal = whyNotADraft(request.body, year)
  if (refusal !== null) return refuse(400, refusal)
  const name = snapshotName(year, now())
  // Beside the target first, then renamed: a write cut short leaves no half snapshot under its name.
  snapshots.write(`${name}.tmp`, request.body)
  snapshots.rename(`${name}.tmp`, name)
  return answer(200, { year: Number(year), snapshot: name })
}

/**
 * Whether a body is a draft of that year: JSON, an object, whose `year` is the year of the path.
 * @param body - the request's body
 * @param year - the year in the path
 * @returns the reason it is not, or `null`
 */
function whyNotADraft(body: string, year: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return 'the draft is not JSON'
  }
  if (parsed === null || typeof parsed !== 'object' || !('year' in parsed))
    return 'the draft does not say its year'
  if (String(parsed.year) !== year)
    return `the draft is of year ${String(parsed.year)}, not ${year}`
  return null
}

/**
 * Whether a request comes from a page this machine served. A write must carry the matching `Origin`
 * (`isSameMachineRequest`); a read, which a browser sends without one, needs a loopback `Host` — and no
 * CORS header lets another site read the answer.
 * @param request - the request
 * @returns `true` when it may be served
 */
function isFromHere(request: EndpointRequest): boolean {
  if (request.method === 'GET')
    return request.host !== undefined && LOOPBACK_HOST.test(request.host)
  return isSameMachineRequest(request.host, request.origin)
}

/**
 * `POST /<year>/set-aside`: keep the draft under a dated name.
 * @param request - the request
 * @param year - the year in the path
 * @param folder - where the drafts live
 * @param now - the clock
 * @returns the response
 */
function setAside(
  request: EndpointRequest,
  year: string,
  folder: DraftFolder,
  now: () => Date
): EndpointResponse {
  if (request.method !== 'POST') return refuse(405, 'a draft is set aside with POST')
  const file = `${year}.json`
  if (folder.read(file) === null) return refuse(404, `there is no draft of ${year} to set aside`)
  const name = setAsideName(year, now())
  folder.rename(file, name)
  return answer(200, { year: Number(year), setAside: name })
}

/**
 * `GET`, `PUT` or `DELETE /<year>`: read, write or remove the draft.
 * @param request - the request
 * @param year - the year in the path
 * @param folder - where the drafts live
 * @returns the response
 */
function onDraft(request: EndpointRequest, year: string, folder: DraftFolder): EndpointResponse {
  const file = `${year}.json`
  if (request.method === 'GET') {
    const text = folder.read(file)
    return text === null
      ? answer(404, { reason: `there is no draft of ${year}` })
      : { status: 200, body: text }
  }
  if (request.method === 'PUT') {
    const refusal = whyNotADraft(request.body, year)
    if (refusal !== null) return refuse(400, refusal)
    // Beside the target first, then renamed over it: a write cut short leaves the previous draft whole.
    folder.write(`${file}.tmp`, request.body)
    folder.rename(`${file}.tmp`, file)
    return answer(200, { year: Number(year), written: file })
  }
  if (request.method === 'DELETE') {
    // Removing a draft that is not there is not a fault: the save it follows has nothing left to clear.
    const exists = folder.read(file) !== null
    if (exists) folder.remove(file)
    return answer(200, { year: Number(year), removed: exists })
  }
  return refuse(405, `${String(request.method)} is not a draft request`)
}

/**
 * Answer one request to the draft endpoint.
 * @param request - the request, its body already read
 * @param folder - where the drafts live
 * @param snapshots - where the hourly snapshots live
 * @param now - the clock, for a set-aside draft's or a snapshot's name
 * @returns the response to send
 */
export function handleDraftRequest(
  request: EndpointRequest,
  folder: DraftFolder,
  snapshots: DiskFolder,
  now: () => Date
): EndpointResponse {
  if (!isFromHere(request))
    return refuse(403, 'only the Cartographer served by this machine may keep drafts')
  const match = DRAFT_PATH.exec(request.path ?? '')
  if (match === null)
    return refuse(404, `"${String(request.path)}" is not a draft — expected /<year>`)
  const year = match[1] ?? ''
  if (match[2] === '/snapshot') return keepSnapshot(request, year, snapshots, now)
  return match[2] === undefined
    ? onDraft(request, year, folder)
    : setAside(request, year, folder, now)
}

/**
 * The middleware Vite mounts on `DRAFT_ROUTE` (`draftRoute.ts`).
 * @param folder - where the drafts live
 * @param snapshots - where the hourly snapshots live
 * @param now - the clock
 * @returns a Connect middleware
 */
export function createDraftMiddleware(
  folder: DraftFolder,
  snapshots: DiskFolder,
  now: () => Date
): (req: BodyStream, res: ResponseSink) => void {
  return createBodyMiddleware({
    handle: (request) => handleDraftRequest(request, folder, snapshots, now),
    what: 'the draft',
  })
}
