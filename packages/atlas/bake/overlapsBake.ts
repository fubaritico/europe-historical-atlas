/**
 * The build's overlaps (ATLAS-399): every year of `years/index.json` has the common ground of its overlapping polities
 * computed here, once, and written into the site as `years/<year>/overlaps.json` — the year's settling takes it instead
 * of spending ~1.3 s in the worker. **Only at `vite build`**: the dev server computes them live, since the years are
 * being drawn; the files go into the site only, never into `public/` or the repository. The names' twin
 * (`namesBake.ts`).
 *
 * A year that does not read stops the build: the page would refuse it too.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  authoredYearRegions,
  parseYearManifest,
} from '@europe-historical-atlas/core/data/yearManifest'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
} from '@europe-historical-atlas/core/data/yearSource'
import { bakedOverlapsPath } from '@europe-historical-atlas/core/pipeline/bakedOverlaps'

import { bakeYearOverlaps } from './bakeYearOverlaps'

import type { Plugin } from 'vite'

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
 * The plugin that writes every year's overlaps into the site at build.
 * @param publicDir - the site's public folder, holding `years/`
 * @returns the plugin
 */
export function overlapsBake(publicDir: string): Plugin {
  return {
    name: 'atlas-overlaps-bake',
    apply: 'build',
    generateBundle() {
      const years = resolve(publicDir, 'years')
      const manifest = parseYearManifest(
        readJson(resolve(years, 'index.json')),
        '/years/index.json'
      )
      for (const year of manifest.years) {
        const folder = `/years/${String(year)}`
        const disk = resolve(years, String(year))
        const started = performance.now()
        // The page's own reading chain, so the key the build writes is the one the page computes.
        const { authored } = authoredYearRegions(
          {
            registry: parseYearRegistry(
              readJson(resolve(disk, 'registry.json')),
              `${folder}/registry.json`
            ),
            polities: parseYearPolities(
              readJson(resolve(disk, 'polities.json')),
              `${folder}/polities.json`
            ),
            borders: parseYearBorders(
              readJson(resolve(disk, 'borders.json')),
              `${folder}/borders.json`
            ),
          },
          folder,
          manifest.bbox
        )
        const baked = bakeYearOverlaps(authored.year)
        this.emitFile({
          type: 'asset',
          fileName: bakedOverlapsPath(OUTPUT_YEARS, year),
          source: JSON.stringify(baked),
        })
        // A refusal is the page's to say too: the build says it, so the site is not shipped with it unseen.
        for (const { a, b, reason } of baked.overlaps.refused)
          this.warn(
            `${String(year)}: the overlap of "${a}"${b === null ? '' : ` and "${b}"`} could not be computed: ${reason}`
          )
        this.info(
          `${String(year)}: ${String(baked.overlaps.pieces.length)} overlaps computed at the build in ${String(Math.round(performance.now() - started))} ms`
        )
      }
    },
  }
}
