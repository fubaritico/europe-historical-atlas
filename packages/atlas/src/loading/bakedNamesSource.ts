/**
 * Where a year's names placed at the build are read from (ATLAS-333) — `years/<year>/names.json`, written by the
 * build into the site, never into the repository. **None is not a failure**: the dev server has none, and a year added
 * since the build has none; the page then places the names itself, as it always did.
 */

import { bakedNamesPath, readBakedNames } from '@europe-historical-atlas/core/pipeline/bakedNames'
import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import type { BakedNames } from '@europe-historical-atlas/core/pipeline/bakedNames'
import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** A year's baked names, if the site has them. */
export interface BakedNamesSource {
  /**
   * Read a year's baked names.
   * @param year - the year
   * @returns its names and their key, or `null` when the site holds none for it
   * @throws when the file is there but cannot be read — the transport failed, or the file is not baked names
   */
  load: (year: number) => Promise<BakedNames | null>
}

/**
 * The baked names under a folder of years.
 * @param yearsBase - the folder holding the year folders, e.g. `/years`
 * @param fetchFile - the transport; `fetchWithin` in the page
 * @returns the source
 */
export function createFetchBakedNamesSource(
  yearsBase: string,
  fetchFile: FetchLike = fetchWithin
): BakedNamesSource {
  return {
    async load(year) {
      const url = bakedNamesPath(yearsBase, year)
      const response = await fetchFile(url)
      // No file: the names are placed in the page.
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`${url}: HTTP ${String(response.status)}`)
      // Vite's dev server may answer a path it does not hold with its own page, as HTML: no file either.
      const type = response.headers.get('content-type')
      if (!type?.includes('json')) return null
      return readBakedNames(await response.json(), url)
    },
  }
}
