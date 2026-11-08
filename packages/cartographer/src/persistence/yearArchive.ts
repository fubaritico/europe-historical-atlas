import { assetError } from '@europe-historical-atlas/core/data/assetError'
import { assembleAuthoredYear } from '@europe-historical-atlas/core/data/yearConsistency'
import { openYearDocument, saveYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
  yearPaths,
} from '@europe-historical-atlas/core/data/yearSource'
import { ABSENT_YEAR, yearStamp } from '@europe-historical-atlas/core/data/yearStamp'

import type { AssetKind } from '@europe-historical-atlas/core/data/assetError'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * Where the Cartographer's maps are kept, seen from the browser — open one, save one, list them. A map is a folder of
 * `years/`, and its name is the folder's (`s19`, the dev, 2026-11-02).
 *
 * **A port, because the destination will change and the gesture will not** (`s15`): today the dev server
 * writes into the repository; later a Netlify Function will commit the same three files. The session that
 * drives ‹ctrl+s› talks to this interface only, so the online tier is a second implementation, not a
 * rewrite — and every test of the session runs against a stub archive in memory.
 *
 * **Reading goes through `core`, exactly as the atlas reads a year**: the three schemas, then the
 * cross-checks, then the working document. A year the Cartographer opens is a year the atlas renders.
 */

/** What a save reports back, for the status bar's *"saved · 52 polities · 17 104 vertices"* (`s04`). */
export interface SavedYearSummary {
  /** The map written. */
  map: string
  /** How many polities the registry holds. */
  polities: number
  /** How many anchors the saved file holds — after the save dropped the ones nothing referenced. */
  vertices: number
}

/** How a save may be made. */
export interface SaveOptions {
  /**
   * Write even over a year changed on disk since it was opened — the author answered [Overwrite]. Without
   * it, a save over such a year is refused with {@link YearChangedOnDisk} (CARTO-238, rung 3).
   */
  overwrite?: boolean
}

/**
 * A save refused because the map's files changed on disk since the page opened them — a write by something
 * else, which the page would otherwise have written over (CARTO-238, rung 3).
 */
export class YearChangedOnDisk extends Error {
  /**
   * @param map - the map refused
   * @param changedAt - when its files were last written, in milliseconds since the epoch, or `null` when
   *   they are gone
   */
  constructor(
    readonly map: string,
    readonly changedAt: number | null
  ) {
    super(`${map} was changed on disk since it was opened`)
    this.name = 'YearChangedOnDisk'
  }
}

/** The maps, as the editor reaches them. */
export interface YearArchive {
  /**
   * The maps there are — every folder of `years/` holding one, in the order of their names.
   * @returns the maps' names
   * @throws an `Error` when the list cannot be fetched or read
   */
  listMaps: () => Promise<readonly string[]>
  /**
   * Read a map off disk and open it as a working document.
   * @param map - the map's name
   * @returns the document, ready to edit
   * @throws an `AssetError` naming the file and the field when any of the three is wrong
   */
  open: (map: string) => Promise<YearDocument>
  /**
   * Write a document as a map's three files — only over the files it opened, unless told to overwrite. A map never
   * opened by this page is expected absent from disk: one that is there is asked about too.
   * @param document - the working document
   * @param map - the map to write it as — the page's own, or a new one for *Save as…* and *Save a copy*
   * @param options - whether to overwrite a map changed on disk
   * @returns what was written
   * @throws {@link YearChangedOnDisk} when the files changed on disk since they were opened; an `Error`
   *   carrying the reason the save was refused, or the network failure
   */
  save: (document: YearDocument, map: string, options?: SaveOptions) => Promise<SavedYearSummary>
}

/** What the dev-server archive needs. */
export interface DevServerYearArchiveDeps {
  /** The fetch to use — the window's in the application, a stub in tests. */
  fetch: typeof fetch
  /** Where the years are served from, e.g. `/years`. Read with a plain GET, like every other asset. */
  yearsBase: string
  /** Where a save is sent and the maps are listed, e.g. `/__years` — the dev server's endpoint. */
  writeRoute: string
}

/**
 * Fetch one JSON file and read it, a transport failure becoming an `AssetError` of the file's own kind.
 *
 * **`cache: 'no-store'`, and it is not a detail**: a year is read again right after it was saved over, and
 * a cached copy would reopen the previous save — the round trip of `s04` failing with nothing on screen to
 * say so.
 * @param fetchFile - the fetch to use
 * @param asset - which file this is, for the error
 * @param url - where it lives
 * @param parse - the reader for it
 * @returns the parsed payload
 */
async function readJson<T>(
  fetchFile: typeof fetch,
  asset: AssetKind,
  url: string,
  parse: (value: unknown, source: string) => T
): Promise<T> {
  const response = await fetchFile(url, { cache: 'no-store' })
  if (!response.ok) throw assetError(asset, 'transport', url, `HTTP ${String(response.status)}`)
  return parse(await response.json(), url)
}

/**
 * Fetch one of a year's files, keeping its text beside what it says — the text is what the year's
 * fingerprint is made of (CARTO-238, rung 3).
 * @param fetchFile - the fetch to use
 * @param asset - which file this is, for the error
 * @param url - where it lives
 * @param parse - the reader for it
 * @returns the parsed payload and the text it was read from
 */
async function readYearFile<T>(
  fetchFile: typeof fetch,
  asset: AssetKind,
  url: string,
  parse: (value: unknown, source: string) => T
): Promise<{ value: T; text: string }> {
  const response = await fetchFile(url, { cache: 'no-store' })
  if (!response.ok) throw assetError(asset, 'transport', url, `HTTP ${String(response.status)}`)
  const text = await response.text()
  // A text that is not JSON throws here exactly as `response.json()` did before the text was kept.
  return { value: parse(JSON.parse(text), url), text }
}

/**
 * A field of a server answer's JSON body, or `undefined` when the body or the field is not there.
 * @param response - the answer
 * @param field - the field's name
 * @returns its value
 */
async function bodyField(response: Response, field: string): Promise<unknown> {
  try {
    const body: unknown = await response.json()
    return body !== null && typeof body === 'object' && field in body
      ? (body as Record<string, unknown>)[field]
      : undefined
  } catch {
    // Not JSON: the field is simply not there, and each caller says what that means for it.
    return undefined
  }
}

/**
 * Read why the server refused a save, from its `{ reason }` body.
 * @param response - the refusal
 * @returns the reason, or the status when the body says nothing usable
 */
export async function refusalReason(response: Response): Promise<string> {
  // A body that is not JSON — a proxy's error page, a dev server that is not ours — leaves the status as the
  // most honest thing to show, and the save is reported failed either way.
  const reason = await bodyField(response, 'reason')
  return typeof reason === 'string' ? reason : `HTTP ${String(response.status)}`
}

/**
 * Write a document through the dev server, conditional on the fingerprint the page holds for that map —
 * and keep the new fingerprint the server answers with (CARTO-238, rung 3).
 * @param deps - the fetch and the write route
 * @param stamps - the fingerprint of each map as this page last read or wrote it
 * @param document - the working document
 * @param map - the map to write
 * @param options - whether to overwrite a map changed on disk
 * @returns what was written
 */
async function saveThroughDevServer(
  deps: DevServerYearArchiveDeps,
  stamps: Map<string, string | null>,
  document: YearDocument,
  map: string,
  options: SaveOptions
): Promise<SavedYearSummary> {
  const files = saveYearDocument(document)
  // A year this page never read is expected absent: files that appeared meanwhile are asked about too
  // (ARCH-002). `null` is a fingerprint lost to a defect — the save goes unconditional, as decided.
  const held = stamps.get(map)
  const opened = held === undefined ? yearStamp(ABSENT_YEAR) : held
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opened !== null && options.overwrite !== true) headers['if-match'] = opened
  const response = await deps.fetch(`${deps.writeRoute}/${encodeURIComponent(map)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(files),
  })
  if (response.status === 412) {
    const changedAt = await bodyField(response, 'changedAt')
    throw new YearChangedOnDisk(map, typeof changedAt === 'number' ? changedAt : null)
  }
  if (!response.ok) throw new Error(await refusalReason(response))
  const stamp = await bodyField(response, 'stamp')
  if (typeof stamp === 'string') stamps.set(map, stamp)
  else {
    // The map was written, so the save is not failed — but our own server always sends the
    // fingerprint, so its absence is a defect: said loudly, and the next save goes unconditional.
    console.error(`[Cartographer] the save of ${map} came back with no fingerprint`)
    stamps.set(map, null)
  }
  return {
    map,
    polities: files.registry.polities.length,
    vertices: files.polities.anchors.length,
  }
}

/**
 * Read the list of maps the dev server answered, refusing what is not one.
 * @param value - the parsed body, `{ maps: [...] }`
 * @param source - where it came from, for the error
 * @returns the maps' names
 * @throws an `AssetError` saying the answer is not a list of names
 */
function readMapList(value: unknown, source: string): readonly string[] {
  const maps =
    value !== null && typeof value === 'object' && 'maps' in value ? value.maps : undefined
  if (!Array.isArray(maps) || !maps.every((name: unknown) => typeof name === 'string'))
    throw assetError('yearRegistry', 'schema', source, 'the list of maps is not a list of names')
  return maps
}

/**
 * An archive kept by the Cartographer's dev server: reads are plain GETs on `years/`, writes go to the
 * endpoint `devServer/yearWriteEndpoint.ts` serves.
 * @param deps - the fetch, and the two places
 * @returns the archive
 */
export function createDevServerYearArchive(deps: DevServerYearArchiveDeps): YearArchive {
  const base = deps.yearsBase.replace(/\/$/, '')
  // The fingerprint of each map as this page last read or wrote it (CARTO-238, rung 3). A map with none —
  // never opened, never saved — is expected absent from disk; `null` is a fingerprint lost to a defect.
  const stamps = new Map<string, string | null>()
  return {
    listMaps: () => readJson(deps.fetch, 'yearRegistry', deps.writeRoute, readMapList),

    open: async (map) => {
      const paths = yearPaths(base, map)
      const [registry, polities, borders] = await Promise.all([
        readYearFile(deps.fetch, 'yearRegistry', paths.registry, parseYearRegistry),
        readYearFile(deps.fetch, 'yearPolities', paths.polities, parseYearPolities),
        readYearFile(deps.fetch, 'yearBorders', paths.borders, parseYearBorders),
      ])
      const folder = `${base}/${map}`
      const document = openYearDocument(
        assembleAuthoredYear(
          { registry: registry.value, polities: polities.value, borders: borders.value },
          folder
        )
      )
      stamps.set(
        map,
        yearStamp({ registry: registry.text, polities: polities.text, borders: borders.text })
      )
      return document
    },

    save: (document, map, options = {}) =>
      saveThroughDevServer(deps, stamps, document, map, options),
  }
}
