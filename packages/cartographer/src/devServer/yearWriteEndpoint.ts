import { isMapName } from '@europe-historical-atlas/core/data/mapName'
import { yearStamp } from '@europe-historical-atlas/core/data/yearStamp'

import {
  LOG_TAG,
  LOOPBACK_HOST,
  answer,
  createBodyMiddleware,
  isSameMachineRequest,
} from './httpEndpoint'
import { planYearWrite } from './yearWritePlan'

import type { DiskFolder, YearFolder } from './diskFolder'
import type { BodyStream, EndpointRequest, EndpointResponse, ResponseSink } from './httpEndpoint'
import type { PlannedFile } from './yearWritePlan'

/**
 * The dev server's map endpoint — `PUT /__years/<map>` writes a map into `packages/atlas/public/years/<map>/`, and
 * `GET /__years` lists the maps there are (`s19`, the dev, 2026-11-02: *"a map exists, there is a folder for that
 * map, I can open that map"*). Reading a map stays a plain GET of its files, like every other asset.
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
 *   · only a map's name of letters, digits, `-`, `_` and `.` (`isMapName`, core/data/mapName), so the path cannot climb out of
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
 * Where a map's three files sit in the years folder.
 * @param folder - the map's name
 * @returns the three relative paths
 */
function yearFilePaths(folder: string): { registry: string; polities: string; borders: string } {
  return {
    registry: `${folder}/registry.json`,
    polities: `${folder}/polities.json`,
    borders: `${folder}/borders.json`,
  }
}

/**
 * The fingerprint of a map's files as some reader sees them.
 * @param map - the map's name
 * @param read - how to get a file's text, `null` when absent
 * @returns the fingerprint
 */
function stampOf(map: string, read: (relativePath: string) => string | null): string {
  const paths = yearFilePaths(map)
  return yearStamp({
    registry: read(paths.registry),
    polities: read(paths.polities),
    borders: read(paths.borders),
  })
}

/**
 * When the most recent of a map's files was written, for the author — or `null` when none is there.
 * @param folder - the years folder
 * @param map - the map's name
 * @returns milliseconds since the epoch, or `null`
 */
function lastChangeOf(folder: YearFolder, map: string): number | null {
  const times = Object.values(yearFilePaths(map))
    .map((path) => folder.modifiedAt(path))
    .filter((time): time is number => time !== null)
  return times.length === 0 ? null : Math.max(...times)
}

/**
 * The maps in the years folder: every folder whose name is a map's and which holds a `registry.json`, in the order of
 * their names. A folder of another name (`.git`, a stray copy with a space) is not one, and is left out.
 * @param folder - the years folder
 * @returns the maps' names
 */
export function listMaps(folder: YearFolder): string[] {
  return folder
    .listFolders()
    .filter((name) => isMapName(name) && folder.modifiedAt(`${name}/registry.json`) !== null)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

/**
 * `GET /__years`: the list of the maps. A read, which a browser sends without an `Origin`: it needs a loopback `Host`,
 * as any read here — and no CORS header lets another site read the answer.
 * @param request - the request
 * @param folder - where the years live
 * @returns the list, or the refusal
 */
function answerTheList(request: EndpointRequest, folder: YearFolder): EndpointResponse {
  if (request.host === undefined || !LOOPBACK_HOST.test(request.host)) {
    console.warn(`${LOG_TAG} refused a list of the maps for the host ${String(request.host)}`)
    return answer(403, { reason: 'only the Cartographer served by this machine may list the maps' })
  }
  return answer(200, { maps: listMaps(folder) })
}

/**
 * The map named by a request's path: what follows the route, without its leading `/` nor its query —
 * `GET /__years?x=1` is still the list (review SEC-003).
 * @param path - the path after the route
 * @returns the segment, empty for the route itself
 */
function segmentOf(path: string | undefined): string {
  const [withoutQuery = ''] = (path ?? '').split('?')
  return withoutQuery.replace(/^\//, '')
}

/**
 * Answer one request to the year endpoint.
 * @param request - the request, its body already read
 * @param folder - where the years live
 * @returns the response to send
 */
export function handleYearWrite(request: EndpointRequest, folder: YearFolder): EndpointResponse {
  const segment = segmentOf(request.path)
  if (request.method === 'GET' && segment === '') return answerTheList(request, folder)
  if (!isSameMachineRequest(request.host, request.origin)) {
    console.warn(`${LOG_TAG} refused a year write from another origin (${String(request.origin)})`)
    return answer(403, { reason: 'only the Cartographer served by this machine may save' })
  }
  if (request.method !== 'PUT')
    return answer(405, {
      reason: `${String(request.method)} is not how a map is saved — use PUT, or GET the list`,
    })

  let body: unknown
  try {
    body = JSON.parse(request.body)
  } catch {
    console.warn(`${LOG_TAG} refused a year write whose body is not JSON`)
    return answer(400, { reason: 'the body is not JSON' })
  }

  const decision = planYearWrite({
    mapSegment: segment,
    body,
    manifestText: folder.read('index.json'),
  })
  if (!decision.accepted) {
    console.warn(`${LOG_TAG} refused a year write: ${decision.refusal.reason}`)
    return answer(decision.refusal.status, { reason: decision.refusal.reason })
  }

  const { map, year, files } = decision.plan
  // CARTO-238 rung 3: compared as the write is about to happen, so nothing can slip in between.
  if (
    request.ifMatch !== undefined &&
    stampOf(map, (path) => folder.read(path)) !== request.ifMatch
  ) {
    console.warn(`${LOG_TAG} refused a map write: ${map} changed on disk since it was opened`)
    return answer(412, {
      reason: `${map} was changed on disk since it was opened`,
      changedAt: lastChangeOf(folder, map),
    })
  }

  writeAll(folder, files)
  const written = new Map(files.map((file) => [file.relativePath, file.text]))
  return answer(200, {
    map,
    year,
    written: files.map((file) => file.relativePath),
    // What the page now holds on disk — its next save is conditional on this.
    stamp: stampOf(map, (path) => written.get(path) ?? null),
  })
}

/**
 * The middleware Vite mounts on `YEAR_WRITE_ROUTE` (`yearWriteRoute.ts`): read the body, cap its size, answer.
 * @param folder - where the years live
 * @returns a Connect middleware
 */
export function createYearWriteMiddleware(
  folder: YearFolder
): (req: BodyStream, res: ResponseSink) => void {
  return createBodyMiddleware({
    handle: (request) => handleYearWrite(request, folder),
    what: 'the save',
  })
}
