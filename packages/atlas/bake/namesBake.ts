/**
 * The build's names (ATLAS-333, the dev, 2026-11-08: *a year in under a second*): every year of `years/index.json` has
 * its countries' names placed here, once, and written into the site as `years/<year>/names.json` — the page lays them
 * instead of spending ~2.5 s placing them. **Only at `vite build`**: the dev server places them live, since the years
 * are being drawn; and the files go into the site only, never into `public/` or the repository.
 *
 * A year that does not read stops the build: the page would refuse it too, and a site shipped with a year it cannot
 * open is worse than no site.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parseYearManifest } from '@europe-historical-atlas/core/data/yearManifest'
import { bakedNamesPath } from '@europe-historical-atlas/core/pipeline/bakedNames'

import { DEFAULT_NAME_PARAMS } from '../src/tunables/params'

import { bakeYearNames } from './bakeYearNames'
import { faceMeasure } from './faceMetrics'

import type { BakeInputs } from './bakeYearNames'
import type { Plugin } from 'vite'

/** Where the plugin reads from, relative to the atlas's package. */
export interface NamesBakePaths {
  /** The site's public folder, holding `years/` and `heightmaps/`. */
  readonly publicDir: string
  /** The names' face, the very file the page loads. */
  readonly face: string
  /** The relief's `.json`, the one the page reads (`loading/assets.ts`). */
  readonly heightmapMeta: string
}

/**
 * How the letters are measured from the face's file — `faceMeasure` at the build, a stand-in in a test.
 * @param bytes - the face's file
 * @returns the measure the names are placed with
 */
export type MeasureFace = (bytes: Uint8Array) => BakeInputs['measure']

/** The folder of the years in the site's output — the page reads them under `/years`. */
const OUTPUT_YEARS = 'years'

/**
 * Read a JSON file.
 * @param path - the file
 * @returns its parsed content
 */
function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/**
 * The plugin that writes every year's names into the site at build.
 * @param paths - where the years, the face and the relief's frame are
 * @param measureFace - how the face's letters are measured; `faceMeasure` (fontkit) at the build
 * @returns the plugin
 */
export function namesBake(paths: NamesBakePaths, measureFace: MeasureFace = faceMeasure): Plugin {
  return {
    name: 'atlas-names-bake',
    apply: 'build',
    generateBundle() {
      const years = resolve(paths.publicDir, 'years')
      const manifest = readJson(resolve(years, 'index.json'))
      const heightmapMeta = readJson(paths.heightmapMeta)
      const measure = measureFace(readFileSync(paths.face))
      for (const year of parseYearManifest(manifest, 'years/index.json').years) {
        const folder = resolve(years, String(year))
        const started = performance.now()
        const baked = bakeYearNames({
          year,
          files: {
            registry: readJson(resolve(folder, 'registry.json')),
            polities: readJson(resolve(folder, 'polities.json')),
            borders: readJson(resolve(folder, 'borders.json')),
          },
          manifest,
          heightmapMeta,
          measure,
          params: { ...DEFAULT_NAME_PARAMS },
        })
        this.emitFile({
          type: 'asset',
          fileName: bakedNamesPath(OUTPUT_YEARS, year),
          source: JSON.stringify(baked),
        })
        this.info(
          `${String(year)}: names placed at the build in ${String(Math.round(performance.now() - started))} ms`
        )
      }
    },
  }
}
