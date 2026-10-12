import { assetError } from '@europe-historical-atlas/core/data/assetError'
import { assembleAuthoredYear } from '@europe-historical-atlas/core/data/yearConsistency'
import { parseYearManifest } from '@europe-historical-atlas/core/data/yearManifest'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
  yearPaths,
} from '@europe-historical-atlas/core/data/yearSource'
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
   * Write a document as its year's three files.
   * @param document - the working document
   * @returns what was written
   * @throws an `Error` carrying the reason the save was refused, or the network failure
   */
  save: (document: YearDocument) => Promise<SavedYearSummary>
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
 * Read why the server refused a save, from its `{ reason }` body.
 * @param response - the refusal
 * @returns the reason, or the status when the body says nothing usable
 */
async function refusalReason(response: Response): Promise<string> {
  const fallback = `HTTP ${String(response.status)}`
  try {
    const body: unknown = await response.json()
    if (
      body !== null &&
      typeof body === 'object' &&
      'reason' in body &&
      typeof body.reason === 'string'
    )
      return body.reason
    return fallback
  } catch {
    // The body was not JSON — a proxy's error page, a dev server that is not ours. The status is the
    // most honest thing left to show, and the save is reported failed either way.
    return fallback
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
        readJson(deps.fetch, 'yearRegistry', paths.registry, parseYearRegistry),
        readJson(deps.fetch, 'yearPolities', paths.polities, parseYearPolities),
        readJson(deps.fetch, 'yearBorders', paths.borders, parseYearBorders),
      ])
      const folder = `${base}/${String(year)}`
      return openYearDocument(assembleAuthoredYear({ registry, polities, borders }, folder))
    },

    save: async (document) => {
      const files = saveYearDocument(document)
      const response = await deps.fetch(`${deps.writeRoute}/${String(document.year)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(files),
      })
      if (!response.ok) throw new Error(await refusalReason(response))
      return {
        year: document.year,
        polities: files.registry.polities.length,
        vertices: files.polities.anchors.length,
      }
    },
  }
}
