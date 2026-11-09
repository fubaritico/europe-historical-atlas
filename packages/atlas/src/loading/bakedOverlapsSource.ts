/**
 * Where a year's overlaps computed at the build are read from (ATLAS-399) — `years/<year>/overlaps.json`, written by the
 * build into the site, never into the repository. **None is not a failure**: the dev server has none, and a year added
 * since the build has none; the year's settling then computes them, ~1.3 s in the worker.
 */

import {
  bakedOverlapsPath,
  readBakedOverlaps,
} from '@europe-historical-atlas/core/pipeline/bakedOverlaps'
import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import { fetchBakedFile } from './bakedFile'

import type { BakedOverlaps } from '@europe-historical-atlas/core/pipeline/bakedOverlaps'
import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** A year's baked overlaps, if the site has them. */
export interface BakedOverlapsSource {
  /**
   * Read a year's baked overlaps.
   * @param year - the year
   * @returns its overlaps and their key, or `null` when the site holds none for it
   * @throws when the file is there but cannot be read — the transport failed, or the file is not baked overlaps
   */
  load: (year: number) => Promise<BakedOverlaps | null>
}

/**
 * The baked overlaps under a folder of years.
 * @param yearsBase - the folder holding the year folders, e.g. `/years`
 * @param fetchFile - the transport; `fetchWithin` in the page
 * @returns the source
 */
export function createFetchBakedOverlapsSource(
  yearsBase: string,
  fetchFile: FetchLike = fetchWithin
): BakedOverlapsSource {
  return {
    load: (year) =>
      fetchBakedFile(bakedOverlapsPath(yearsBase, year), readBakedOverlaps, fetchFile),
  }
}
