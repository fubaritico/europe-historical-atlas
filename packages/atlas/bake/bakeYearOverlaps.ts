/**
 * A year's overlaps computed for the site's build (ATLAS-399) — the computation the worker would run, under the key the
 * worker checks (`overlapsKey`). Build-only: the page never imports the geometry.
 */

import { openYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import { yearOverlaps } from '@europe-historical-atlas/core/data/yearOverlaps'
import {
  BAKED_OVERLAPS_VERSION,
  overlapsKey,
} from '@europe-historical-atlas/core/pipeline/bakedOverlaps'

import type { AuthoredYear } from '@europe-historical-atlas/core/data/yearFormat'
import type { BakedOverlaps } from '@europe-historical-atlas/core/pipeline/bakedOverlaps'

/**
 * A year's overlaps, computed for the build.
 * @param year - the authored year, as read from its files
 * @returns the file's content
 */
export function bakeYearOverlaps(year: AuthoredYear): BakedOverlaps {
  return {
    version: BAKED_OVERLAPS_VERSION,
    key: overlapsKey(year),
    overlaps: yearOverlaps(openYearDocument(year)),
  }
}
