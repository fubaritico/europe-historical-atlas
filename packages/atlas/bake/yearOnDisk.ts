/**
 * A year read from the public folder as the page reads it — the same chain, so what the build computes from it is what
 * the page would compute: its three files parsed, assembled and projected against the manifest's frame. Shared by the
 * build's overlaps (`overlapsBake`) and its bands (`bandsBake`).
 *
 * A year that does not read throws: the build stops, as the page would refuse it.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { authoredYearRegions } from '@europe-historical-atlas/core/data/yearManifest'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
} from '@europe-historical-atlas/core/data/yearSource'

import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/**
 * Read a JSON file.
 * @param path - the file
 * @returns its parsed content
 */
export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/**
 * Read a year from the years' folder on disk.
 * @param years - the folder holding the year folders
 * @param year - the year
 * @param bbox - the manifest's frame
 * @returns the year's regions and its authored files, as the page's source gives them
 * @throws when a file is missing or is not a year's file
 */
export function readYearOnDisk(
  years: string,
  year: number,
  bbox: GeoBounds
): ReturnType<typeof authoredYearRegions> {
  const folder = `/years/${String(year)}`
  const disk = resolve(years, String(year))
  return authoredYearRegions(
    {
      registry: parseYearRegistry(
        readJson(resolve(disk, 'registry.json')),
        `${folder}/registry.json`
      ),
      polities: parseYearPolities(
        readJson(resolve(disk, 'polities.json')),
        `${folder}/polities.json`
      ),
      borders: parseYearBorders(readJson(resolve(disk, 'borders.json')), `${folder}/borders.json`),
    },
    folder,
    bbox
  )
}
