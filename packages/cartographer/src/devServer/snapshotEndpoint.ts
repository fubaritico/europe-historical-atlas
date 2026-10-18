import { fileTime, whyNotADraft } from './draftBody'
import { LOG_TAG, answer } from './httpEndpoint'
import { YEAR_DIGITS } from './yearWritePlan'

import type { SnapshotFolder } from './diskFolder'
import type { EndpointRequest, EndpointResponse } from './httpEndpoint'

/**
 * The hourly snapshots (CARTO-238, rungs 2a and 2b), served under the draft route and behind its locks — the
 * draft endpoint checks where a request comes from, then hands a snapshot path here.
 *
 * | request | answer |
 * | --- | --- |
 * | `POST /__drafts/<year>/snapshot` | keep the body under a dated name — every one is kept |
 * | `GET /__drafts/<year>/snapshots` | the year's snapshots, newest first — `[{ name, takenAt }]` |
 * | `GET /__drafts/<year>/snapshots/<name>` | one snapshot, byte for byte |
 */

/** `/1100/snapshot`, `/1100/snapshots` or `/1100/snapshots/<name>` — the name checked apart, by {@link takenAtOf}. */
const SNAPSHOT_PATH = new RegExp(`^/(${YEAR_DIGITS})/(snapshots?)(?:/([^/]+))?$`)

/** The time part of a snapshot's name, as {@link snapshotName} writes it — digits, dashes, a `T` and a `Z`. */
const SNAPSHOT_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z$/

/** A snapshot path, read. */
export interface SnapshotPath {
  /** The year, as the path spells it. */
  year: string
  /** `snapshot` to keep one, `snapshots` to list them or read one. */
  verb: 'snapshot' | 'snapshots'
  /** The snapshot named, when one is. */
  name: string | undefined
}

/**
 * Read a path as a snapshot request, or say it is not one.
 * @param path - the path after the route
 * @returns the path read, or `null`
 */
export function snapshotPath(path: string | undefined): SnapshotPath | null {
  const match = SNAPSHOT_PATH.exec(path ?? '')
  if (match === null) return null
  return {
    year: match[1] ?? '',
    verb: match[2] === 'snapshot' ? 'snapshot' : 'snapshots',
    name: match[3],
  }
}

/**
 * Refuse, saying why, and log it.
 * @param status - the HTTP status
 * @param reason - the sentence the page shows
 * @returns the response
 */
function refuse(status: number, reason: string): EndpointResponse {
  console.warn(`${LOG_TAG} refused a snapshot request: ${reason}`)
  return answer(status, { reason })
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
 * When a snapshot of a year was taken, read off its name — or `null` when the name is not one of that year's
 * snapshots, which is also what keeps a requested name from climbing out of the folder.
 * @param year - the year
 * @param name - a file name
 * @returns the ISO time, or `null`
 */
function takenAtOf(year: string, name: string): string | null {
  const prefix = `${year}.`
  if (!name.startsWith(prefix) || !name.endsWith('.json')) return null
  const time = SNAPSHOT_TIME.exec(name.slice(prefix.length, -'.json'.length))
  return time === null
    ? null
    : `${time[1] ?? ''}T${time[2] ?? ''}:${time[3] ?? ''}:${time[4] ?? ''}Z`
}

/**
 * `GET /<year>/snapshots` and `GET /<year>/snapshots/<name>`: the list, newest first, or one snapshot.
 * @param request - the request
 * @param year - the year in the path
 * @param name - the snapshot asked for, or `undefined` for the list
 * @param snapshots - where the snapshots live
 * @returns the response
 */
function readSnapshots(
  request: EndpointRequest,
  year: string,
  name: string | undefined,
  snapshots: SnapshotFolder
): EndpointResponse {
  if (request.method !== 'GET') return refuse(405, 'snapshots are read with GET')
  if (name === undefined) {
    const listed = snapshots
      .list()
      .map((file) => ({ name: file, takenAt: takenAtOf(year, file) }))
      .filter((entry): entry is { name: string; takenAt: string } => entry.takenAt !== null)
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
    return answer(200, { year: Number(year), snapshots: listed })
  }
  if (takenAtOf(year, name) === null) return refuse(404, `"${name}" is not a snapshot of ${year}`)
  const text = snapshots.read(name)
  return text === null
    ? refuse(404, `there is no snapshot "${name}" of ${year}`)
    : { status: 200, body: text }
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
  snapshots: SnapshotFolder,
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
 * Answer one snapshot request — its origin already checked by the draft endpoint.
 * @param request - the request, its body already read
 * @param path - the snapshot path, read
 * @param snapshots - where the snapshots live
 * @param now - the clock, for a new snapshot's name
 * @returns the response to send
 */
export function handleSnapshotRequest(
  request: EndpointRequest,
  path: SnapshotPath,
  snapshots: SnapshotFolder,
  now: () => Date
): EndpointResponse {
  if (path.verb === 'snapshot')
    return path.name === undefined
      ? keepSnapshot(request, path.year, snapshots, now)
      : refuse(404, `"${path.name}" cannot follow /snapshot`)
  return readSnapshots(request, path.year, path.name, snapshots)
}
