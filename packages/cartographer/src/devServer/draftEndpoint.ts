import { fileTime, whyNotADraft } from './draftBody'
import {
  LOG_TAG,
  LOOPBACK_HOST,
  answer,
  createBodyMiddleware,
  isSameMachineRequest,
} from './httpEndpoint'
import { handleSnapshotRequest, snapshotPath } from './snapshotEndpoint'
import { YEAR_DIGITS } from './yearWritePlan'

import type { DiskFolder, SnapshotFolder } from './diskFolder'
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
 * | `GET /__drafts/<year>/snapshots` | the year's snapshots, newest first — `[{ name, takenAt }]` (rung 2b) |
 * | `GET /__drafts/<year>/snapshots/<name>` | one snapshot, byte for byte (rung 2b) |
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

/** `/1100` or `/1100/set-aside`. */
const DRAFT_PATH = new RegExp(`^/(${YEAR_DIGITS})(/set-aside)?$`)

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
  snapshots: SnapshotFolder,
  now: () => Date
): EndpointResponse {
  if (!isFromHere(request))
    return refuse(403, 'only the Cartographer served by this machine may keep drafts')
  // A snapshot path is the snapshot endpoint's, behind the same lock (`snapshotEndpoint.ts`).
  const snapshot = snapshotPath(request.path)
  if (snapshot !== null) return handleSnapshotRequest(request, snapshot, snapshots, now)
  const match = DRAFT_PATH.exec(request.path ?? '')
  if (match === null)
    return refuse(404, `"${String(request.path)}" is not a draft — expected /<year>`)
  const year = match[1] ?? ''
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
  snapshots: SnapshotFolder,
  now: () => Date
): (req: BodyStream, res: ResponseSink) => void {
  return createBodyMiddleware({
    handle: (request) => handleDraftRequest(request, folder, snapshots, now),
    what: 'the draft',
  })
}
