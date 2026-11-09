/**
 * The loading's test fixtures: a small frame, a year of one polity covering it, and the same frame as the
 * Cartographer authored it.
 */

import { projectRegions } from '@europe-historical-atlas/core/data/regionSource'
import { toRegionPayload } from '@europe-historical-atlas/core/data/toRegionPayload'
import { saveYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

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

/**
 * The same year with the Empire a tribe — so its ground fades rather than fills (ATLAS-258).
 * @returns the year, read as the atlas reads it
 */
function tribeYear(): RegionSet {
  const doc = sharedBorderDocument()
  const hre = doc.polities.find((polity) => polity.id === 'hre')
  if (hre === undefined) throw new Error('fixture: no Empire in the shared-border document')
  hre.rank = 'tribe'
  const files = { year: 1100, ...saveYearDocument(doc) }
  return {
    ...projectRegions(toRegionPayload(files, META.bbox)),
    authored: { year: files, bbox: META.bbox },
  }
}

/** An authored year with one tribe, the Empire. */
export const TRIBE_YEAR: RegionSet = tribeYear()

/**
 * The same year with the Empire a vassal of France — so it wears the vassals' band (ATLAS-398).
 * @returns the year, read as the atlas reads it
 */
function vassalYear(): RegionSet {
  const doc = sharedBorderDocument()
  const hre = doc.polities.find((polity) => polity.id === 'hre')
  if (hre === undefined) throw new Error('fixture: no Empire in the shared-border document')
  hre.suzerain = 'fr-couronne'
  const files = { year: 1100, ...saveYearDocument(doc) }
  return {
    ...projectRegions(toRegionPayload(files, META.bbox)),
    authored: { year: files, bbox: META.bbox },
  }
}

/** An authored year with one vassal, the Empire under France. */
export const VASSAL_YEAR: RegionSet = vassalYear()
