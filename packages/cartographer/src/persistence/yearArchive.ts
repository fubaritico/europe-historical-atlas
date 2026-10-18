import { assetError } from '@europe-historical-atlas/core/data/assetError'
import { assembleAuthoredYear } from '@europe-historical-atlas/core/data/yearConsistency'
import { parseYearManifest } from '@europe-historical-atlas/core/data/yearManifest'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
  yearPaths,
} from '@europe-historical-atlas/core/data/yearSource'
import { ABSENT_YEAR, yearStamp } from '@europe-historical-atlas/core/data/yearStamp'
import {
  openYearDocument,
  saveYearDocument,
} from '@europe-historical-atlas/core/editor/yearDocument'

import type { AssetKind } from '@europe-historical-atlas/core/data/assetError'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * Where the Cartographer's years are kept, seen from the browser — open one, save one, list them.
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
  /** The year written. */
  year: number
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
 * A save refused because the year's files changed on disk since the page opened them — a write by something
 * else, which the page would otherwise have written over (CARTO-238, rung 3).
 */
export class YearChangedOnDisk extends Error {
  /**
   * @param year - the year refused
   * @param changedAt - when its files were last written, in milliseconds since the epoch, or `null` when
   *   they are gone
   */
  constructor(
    readonly year: number,
    readonly changedAt: number | null
  ) {
    super(`${String(year)} was changed on disk since it was opened`)
    this.name = 'YearChangedOnDisk'
  }
}

/** The years, as the editor reaches them. */
export interface YearArchive {
  /**
   * The years that have been saved, read from the manifest.
   * @returns every listed year
   * @throws an `AssetError` when the manifest cannot be fetched or read
   */
  listedYears: () => Promise<readonly number[]>
  /**
   * Read a year off disk and open it as a working document.
   * @param year - the year to open
   * @returns the document, ready to edit
   * @throws an `AssetError` naming the file and the field when any of the three is wrong
   */
  open: (year: number) => Promise<YearDocument>
  /**
   * Write a document as its year's three files — only over the files it opened, unless told to overwrite.
   * @param document - the working document
   * @param options - whether to overwrite a year changed on disk
   * @returns what was written
   * @throws {@link YearChangedOnDisk} when the files changed on disk since they were opened; an `Error`
   *   carrying the reason the save was refused, or the network failure
   */
  save: (document: YearDocument, options?: SaveOptions) => Promise<SavedYearSummary>
}

/** What the dev-server archive needs. */
export interface DevServerYearArchiveDeps {
  /** The fetch to use — the window's in the application, a stub in tests. */
  fetch: typeof fetch
  /** Where the years are served from, e.g. `/years`. Read with a plain GET, like every other asset. */
  yearsBase: string
  /** Where a save is sent, e.g. `/__years` — the dev server's write endpoint. */
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
 * Open a year's three files, already in hand, as a working document — through the same readers and
 * cross-checks as a year read off disk. How a draft (CARTO-238) is reopened: a draft the atlas could not
 * read is refused here exactly as a year would be.
 * @param files - an object holding `registry`, `polities` and `borders`
 * @param source - where they came from, for the error
 * @returns the document
 * @throws an `AssetError` naming the file and the field when any of the three is wrong
 */
export function documentFromFiles(files: unknown, source: string): YearDocument {
  const held = new Map<string, unknown>(
    files !== null && typeof files === 'object' ? Object.entries(files) : []
  )
  return openYearDocument(
    assembleAuthoredYear(
      {
        registry: parseYearRegistry(held.get('registry'), source),
        polities: parseYearPolities(held.get('polities'), source),
        borders: parseYearBorders(held.get('borders'), source),
      },
      source
    )
  )
}

/**
 * Write a document through the dev server, conditional on the fingerprint the page holds for its year —
 * and keep the new fingerprint the server answers with (CARTO-238, rung 3).
 * @param deps - the fetch and the write route
 * @param stamps - the fingerprint of each year as this page last read or wrote it
 * @param document - the working document
 * @param options - whether to overwrite a year changed on disk
 * @returns what was written
 */
async function saveThroughDevServer(
  deps: DevServerYearArchiveDeps,
  stamps: Map<number, string | null>,
  document: YearDocument,
  options: SaveOptions
): Promise<SavedYearSummary> {
  const files = saveYearDocument(document)
  // A year this page never read is expected absent: files that appeared meanwhile are asked about too
  // (ARCH-002). `null` is a fingerprint lost to a defect — the save goes unconditional, as decided.
  const held = stamps.get(document.year)
  const opened = held === undefined ? yearStamp(ABSENT_YEAR) : held
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opened !== null && options.overwrite !== true) headers['if-match'] = opened
  const response = await deps.fetch(`${deps.writeRoute}/${String(document.year)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(files),
  })
  if (response.status === 412) {
    const changedAt = await bodyField(response, 'changedAt')
    throw new YearChangedOnDisk(document.year, typeof changedAt === 'number' ? changedAt : null)
  }
  if (!response.ok) throw new Error(await refusalReason(response))
  const stamp = await bodyField(response, 'stamp')
  if (typeof stamp === 'string') stamps.set(document.year, stamp)
  else {
    // The year was written, so the save is not failed — but our own server always sends the
    // fingerprint, so its absence is a defect: said loudly, and the next save goes unconditional.
    console.error(
      `[Cartographer] the save of ${String(document.year)} came back with no fingerprint`
    )
    stamps.set(document.year, null)
  }
  return {
    year: document.year,
    polities: files.registry.polities.length,
    vertices: files.polities.anchors.length,
  }
}

/**
 * An archive kept by the Cartographer's dev server: reads are plain GETs on `years/`, writes go to the
 * endpoint `devServer/yearWriteEndpoint.ts` serves.
 * @param deps - the fetch, and the two places
 * @returns the archive
 */
export function createDevServerYearArchive(deps: DevServerYearArchiveDeps): YearArchive {
  const base = deps.yearsBase.replace(/\/$/, '')
  // The fingerprint of each year as this page last read or wrote it (CARTO-238, rung 3). A year with none —
  // never opened, never saved — is expected absent from disk; `null` is a fingerprint lost to a defect.
  const stamps = new Map<number, string | null>()
  return {
    listedYears: async () => {
      const manifest = await readJson(
        deps.fetch,
        'yearRegistry',
        `${base}/index.json`,
        parseYearManifest
      )
      return manifest.years
    },

    open: async (year) => {
      const paths = yearPaths(base, year)
      const [registry, polities, borders] = await Promise.all([
        readYearFile(deps.fetch, 'yearRegistry', paths.registry, parseYearRegistry),
        readYearFile(deps.fetch, 'yearPolities', paths.polities, parseYearPolities),
        readYearFile(deps.fetch, 'yearBorders', paths.borders, parseYearBorders),
      ])
      const folder = `${base}/${String(year)}`
      const document = openYearDocument(
        assembleAuthoredYear(
          { registry: registry.value, polities: polities.value, borders: borders.value },
          folder
        )
      )
      stamps.set(
        year,
        yearStamp({ registry: registry.text, polities: polities.text, borders: borders.text })
      )
      return document
    },

    save: (document, options = {}) => saveThroughDevServer(deps, stamps, document, options),
  }
}
