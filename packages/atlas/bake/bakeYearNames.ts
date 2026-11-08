/**
 * A year's names placed at the site's build (ATLAS-333): read from the year's files by the page's own chain
 * (`authoredYearRegions`), measured on the page's own list of letters (`charactersToMeasure`), placed from the page's own
 * request (`yearNamesRequest`), under the key the page computes — so the page lays them only when they are what it would
 * have placed itself. Pure: the files' parsed JSON and the letters' measures come in, the baked names go out; the
 * build's plugin reads the disk and the face (`namesBake.ts`).
 */

import { parseHeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'
import {
  authoredYearRegions,
  parseYearManifest,
} from '@europe-historical-atlas/core/data/yearManifest'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
} from '@europe-historical-atlas/core/data/yearSource'
import { BAKED_NAMES_VERSION } from '@europe-historical-atlas/core/pipeline/bakedNames'
import { placeYearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

import { namesKey } from '../src/loading/nameCache'
import { charactersToMeasure, writtenNames, yearNamesRequest } from '../src/loading/namesRequest'

import type { NameDevParams } from '../src/tunables/params'
import type { BakedNames } from '@europe-historical-atlas/core/pipeline/bakedNames'
import type { GlyphMetric } from '@europe-historical-atlas/core/pipeline/yearNames'

/** One year's files, parsed, of no known shape yet — the build reads them off the disk. */
export interface YearFilesJson {
  /** `registry.json`. */
  readonly registry: unknown
  /** `polities.json`. */
  readonly polities: unknown
  /** `borders.json`. */
  readonly borders: unknown
}

/** What a year's names are baked from. */
export interface BakeInputs {
  /** The year. */
  readonly year: number
  /** Its three files. */
  readonly files: YearFilesJson
  /** `years/index.json`, the frame the years are projected in. */
  readonly manifest: unknown
  /** The relief's `.json`, whose proportions the names' grid keeps — the one the page reads. */
  readonly heightmapMeta: unknown
  /**
   * Measure characters in the names' face, at a font size of one — the build reads the face's own file.
   * @param characters - every character the year's names hold, the leader's dot with them
   * @returns their measures
   */
  readonly measure: (characters: readonly string[]) => Readonly<Record<string, GlyphMetric>>
  /** The names' settings the page opens with. */
  readonly params: NameDevParams
}

/**
 * Place one year's names as the page would.
 * @param inputs - the year's files, the manifest, the relief's frame, how to measure letters and the names' settings
 * @returns the names and their key
 * @throws when a file does not read — the page would refuse the year too; the build stops on it
 */
export function bakeYearNames(inputs: BakeInputs): BakedNames {
  const { year, files, params } = inputs
  const folder = `/years/${String(year)}`
  const manifest = parseYearManifest(inputs.manifest, '/years/index.json')
  const meta = parseHeightmapMeta(inputs.heightmapMeta, 'heightmap')
  const regions = authoredYearRegions(
    {
      registry: parseYearRegistry(files.registry, `${folder}/registry.json`),
      polities: parseYearPolities(files.polities, `${folder}/polities.json`),
      borders: parseYearBorders(files.borders, `${folder}/borders.json`),
    },
    folder,
    manifest.bbox
  )
  const names = writtenNames(regions.authored.year.registry.polities, params)
  const glyphs = inputs.measure(charactersToMeasure(names))
  return {
    version: BAKED_NAMES_VERSION,
    key: namesKey(regions.authored.year, { names: params, bbox: manifest.bbox, grid: meta }),
    names: placeYearNames(yearNamesRequest({ loaded: regions, names, glyphs, meta, params })),
  }
}
