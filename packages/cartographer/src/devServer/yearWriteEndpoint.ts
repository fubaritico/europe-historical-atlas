import { LOG_TAG, answer, createBodyMiddleware, isSameMachineRequest } from './httpEndpoint'
import { planYearWrite } from './yearWritePlan'

import type { DiskFolder } from './diskFolder'
import type { BodyStream, EndpointRequest, EndpointResponse, ResponseSink } from './httpEndpoint'
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
function writeAll(folder: DiskFolder, files: readonly PlannedFile[]): void {
  for (const file of files) folder.write(`${file.relativePath}.tmp`, file.text)
  for (const file of files) folder.rename(`${file.relativePath}.tmp`, file.relativePath)
}

/**
 * Answer one request to the year endpoint.
 * @param request - the request, its body already read
 * @param folder - where the years live
 * @returns the response to send
 */
export function handleYearWrite(request: EndpointRequest, folder: DiskFolder): EndpointResponse {
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

/**
 * The middleware Vite mounts on `YEAR_WRITE_ROUTE` (`yearWriteRoute.ts`): read the body, cap its size, answer.
 * @param folder - where the years live
 * @returns a Connect middleware
 */
export function createYearWriteMiddleware(
  folder: DiskFolder
): (req: BodyStream, res: ResponseSink) => void {
  return createBodyMiddleware({
    handle: (request) => handleYearWrite(request, folder),
    what: 'the save',
  })
}
