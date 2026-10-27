/**
 * The loading's test fixtures: a small frame, a year of one polity covering it, and the same frame as the
 * Cartographer authored it.
 */

import { projectRegions } from '@europe-historical-atlas/core/data/regionSource'
import { toRegionPayload } from '@europe-historical-atlas/core/data/toRegionPayload'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import type { HeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'

/** A four-by-four frame over western Europe. */
export const META: HeightmapMeta = {
  width: 4,
  height: 4,
  zoom: 5,
  bbox: { west: -10, south: 35, east: 10, north: 60 },
  min: 0,
  max: 1000,
  encoding: 'int16-le-metres',
}

/** One polity covering the whole frame. */
export const YEAR: RegionSet = {
  year: 1500,
  regions: [
    {
      name: 'Somewhere',
      subjectTo: null,
      rings: [
        [
          { u: 0, v: 0 },
          { u: 1, v: 0 },
          { u: 1, v: 1 },
          { u: 0, v: 1 },
        ],
      ],
    },
  ],
} as unknown as RegionSet

/** A year as the Cartographer saves it: France and the Empire sharing one limit. */
export const AUTHORED_FILES = { year: 1100, ...saveYearDocument(sharedBorderDocument()) }
/** That authored year, read as the atlas reads it: projected on the frame, its files kept beside it. */
export const AUTHORED_YEAR: RegionSet = {
  ...projectRegions(toRegionPayload(AUTHORED_FILES, META.bbox)),
  authored: { year: AUTHORED_FILES, bbox: META.bbox },
}
