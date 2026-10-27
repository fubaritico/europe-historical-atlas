/**
 * Where the map's files live, and the ports that fetch them — the real ones, which a test replaces one at a time.
 */

import { createFetchContentSource } from '@europe-historical-atlas/core/data/contentSource'
import { createFetchHeightmapSource } from '@europe-historical-atlas/core/data/heightmap'
import { createFetchLandMaskSource } from '@europe-historical-atlas/core/data/landMask'
import { createFetchRegionSource } from '@europe-historical-atlas/core/data/regionSource'
import { createFetchRiverSource } from '@europe-historical-atlas/core/data/riverSource'
import { createAuthoredYearSource } from '@europe-historical-atlas/core/data/yearManifest'

import type { ContentSource } from '@europe-historical-atlas/core/data/contentSource'
import type { HeightmapSource } from '@europe-historical-atlas/core/data/heightmap'
import type { LandMaskSource } from '@europe-historical-atlas/core/data/landMask'
import type { RegionSource } from '@europe-historical-atlas/core/data/regionSource'
import type { RiverSource } from '@europe-historical-atlas/core/data/riverSource'

/** The elevation grid. */
const HEIGHTMAP_URL = '/heightmaps/europe-dem-z6-1920'
/** Which cells are land — named in a refusal when its frame is not the relief's. */
export const LAND_MASK_URL = '/masks/europe-land'
/** The river centrelines — named in a refusal when they cover other ground. */
export const RIVERS_URL = '/rivers/europe-rivers.json'

/** The contribution's export: the events pinned on the map (CMS-223, CMS-224). */
const CONTENT_URL = '/content/events.json'
/** Where the years drawn in the Cartographer are, one folder each. */
const YEARS_BASE = '/years'
/** The list of the years drawn in the Cartographer, which decides how a year is read. */
const YEAR_MANIFEST_URL = '/years/index.json'

/** Where the map's five payloads come from. */
export interface MapAssetSources {
  /** The elevation grid. */
  heightmap: HeightmapSource
  /** Which cells are land. */
  landMask: LandMaskSource
  /** The river centrelines. */
  rivers: RiverSource
  /** The polities of a year. */
  regions: RegionSource
  /** The contribution's events. */
  content: ContentSource
}

/**
 * The real sources, fetched from the public directory.
 *
 * A function rather than a constant so nothing is created until a pipeline asks, and so a test that
 * replaces one port still gets working implementations of the other four.
 *
 * **Years are read from the Cartographer's format where one has been authored**, and from the
 * per-century payloads everywhere else. The manifest decides which, rather than a 404 — a year nobody has
 * drawn yet is a fact about the corpus, while a year that is listed and fails to load is a failure, and
 * letting one stand in for the other is how last century's borders would be shown with nothing said.
 * @returns the five ports
 */
export function createFetchAssets(): MapAssetSources {
  return {
    heightmap: createFetchHeightmapSource(HEIGHTMAP_URL),
    landMask: createFetchLandMaskSource(LAND_MASK_URL),
    rivers: createFetchRiverSource(RIVERS_URL),
    content: createFetchContentSource(CONTENT_URL),
    regions: createAuthoredYearSource({
      manifestUrl: YEAR_MANIFEST_URL,
      yearsBase: YEARS_BASE,
      unauthored: createFetchRegionSource((year) => `/borders/europe-${String(year)}.json`),
    }),
  }
}
