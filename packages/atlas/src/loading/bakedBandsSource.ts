/**
 * Where a year's band distances measured at the build are read from (ATLAS-407) — `years/<year>/bands.bin`, written by
 * the build into the site, never into the repository.
 *
 * **Two sources, chosen by the composition root, no fallback between them** (the dev, 2026-11-10: _"why would the file be
 * missing?"_): the built site always has the file, so it reads it, and a file that does not arrive is the year's failure
 * like any of its files; the dev server has no build, so it reads none and the worker measures, as before.
 *
 * **The file is gzipped by the build** (`bake/bandsBake`): the host serves a `.bin` uncompressed, so the page inflates it
 * itself, with the browser's `DecompressionStream`.
 */

import { bakedBandsPath, readBakedBands } from '@europe-historical-atlas/core/pipeline/bakedBands'
import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import type { BakedBands } from '@europe-historical-atlas/core/pipeline/bakedBands'
import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** A year's band distances, as the build measured them. */
export interface BakedBandsSource {
  /**
   * Read a year's distances.
   * @param year - the year
   * @returns its distances, or `null` where nothing is baked and the worker measures (the dev server)
   * @throws when the file cannot be fetched or read — on the built site, the year's failure
   */
  load: (year: number) => Promise<BakedBands | null>
}

/** The dev server's source: no build, so nothing baked — the worker measures every year. */
export const MEASURED_BANDS: BakedBandsSource = { load: () => Promise.resolve(null) }

/**
 * The built site's source: every year's file, fetched under a folder of years.
 * @param yearsBase - the folder holding the year folders, e.g. `/years`
 * @param fetchFile - the transport; `fetchWithin` in the page
 * @returns the source
 */
export function createFetchBakedBandsSource(
  yearsBase: string,
  fetchFile: FetchLike = fetchWithin
): BakedBandsSource {
  return {
    async load(year) {
      const url = bakedBandsPath(yearsBase, year)
      const response = await fetchFile(url)
      if (!response.ok) throw new Error(`${url}: HTTP ${String(response.status)}`)
      if (response.body === null) throw new Error(`${url}: no body`)
      const inflated = response.body.pipeThrough(new DecompressionStream('gzip'))
      return readBakedBands(await new Response(inflated).arrayBuffer(), url)
    },
  }
}
