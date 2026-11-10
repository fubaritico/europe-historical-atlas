/**
 * **The build's bands** (ATLAS-407, the dev, 2026-11-10): every year of `years/index.json` has its fills cut and measured
 * here, once — each banded vertex's distance to its polity's outline and to its realm's — and written into the site as
 * `years/<year>/bands.bin`, so the page lays them instead of measuring, 0.8 to 1.6 s a map
 * (`files/plans/atlas/band-distances-at-build.md`). **Only at `vite build`**: the dev server has no build and measures.
 * The files go into the site only, never into `public/` or the repository. The overlaps' twin (`overlapsBake.ts`).
 *
 * **The page's own cut**: the year read by its chain (`readYearOnDisk`), its regions flagged by `vassalBandCut`, cut on
 * the relief's grid at its default subdivision (handed in by the config) — what `prepareYear` cuts — so the vertices are the page's.
 *
 * **Gzipped here, by the build**: the host serves a `.bin` as it is, uncompressed (checked on the site, 2026-11-10: the
 * relief's `.bin` leaves at its 6.7 MB), so a year's 0.9 to 1.2 MB would cross the network whole; gzipped, 300 to 400 kB.
 * The page inflates it (`loading/bakedBandsSource`).
 *
 * A year that does not read stops the build: the page would refuse it too.
 */

import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import { parseHeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'
import { parseYearManifest } from '@europe-historical-atlas/core/data/yearManifest'
import { bakedBandsPath, encodeBakedBands } from '@europe-historical-atlas/core/pipeline/bakedBands'
import { cutYearFills, vassalBandCut } from '@europe-historical-atlas/core/pipeline/vassalBands'

import { meshVertexGrid } from '../src/scene/relief/reliefMesh'

import { readJson, readYearOnDisk } from './yearOnDisk'

import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'
import type { FillGrid } from '@europe-historical-atlas/core/pipeline/fillTriangles'
import type { Plugin } from 'vite'

/** The folder of the years in the site's output — the page reads them under `/years`. */
const OUTPUT_YEARS = 'years'

/** Where the build reads. */
export interface BandsBakePaths {
  /** The site's public folder, holding `years/`. */
  readonly publicDir: string
  /** The relief's metadata — its grid's size, which the cut's grid is built from. */
  readonly heightmapMeta: string
  /** The relief's subdivision the page cuts on — its default, `DEFAULT_RELIEF_PARAMS.segments`. */
  readonly segments: number
}

/**
 * A year's distances, as the page's cut would measure them.
 * @param years - the folder holding the year folders
 * @param year - the year
 * @param frame - the manifest's frame and the relief's grid
 * @param frame.bbox - the manifest's frame
 * @param frame.grid - the grid the fills are cut on
 * @returns the file's bytes, before the gzip
 * @throws when the year does not read, or a distance is broken
 */
export function bakeYearBands(
  years: string,
  year: number,
  frame: { bbox: GeoBounds; grid: FillGrid }
): Uint8Array {
  const { regions, authored } = readYearOnDisk(years, year, frame.bbox)
  const cut = vassalBandCut(regions, authored.year.registry.polities, authored.bbox)
  return encodeBakedBands(cutYearFills(cut.regions, frame.grid, cut.band), frame.grid)
}

/**
 * The plugin that writes every year's distances into the site at build.
 * @param paths - where it reads
 * @returns the plugin
 */
export function bandsBake(paths: BandsBakePaths): Plugin {
  return {
    name: 'atlas-bands-bake',
    apply: 'build',
    generateBundle() {
      const years = resolve(paths.publicDir, 'years')
      const manifest = parseYearManifest(
        readJson(resolve(years, 'index.json')),
        '/years/index.json'
      )
      const meta = parseHeightmapMeta(readJson(paths.heightmapMeta), paths.heightmapMeta)
      const { segX, segY } = meshVertexGrid(meta, paths.segments)
      const grid = { segX, segY }
      for (const year of manifest.years) {
        const started = performance.now()
        const source = gzipSync(bakeYearBands(years, year, { bbox: manifest.bbox, grid }))
        this.emitFile({ type: 'asset', fileName: bakedBandsPath(OUTPUT_YEARS, year), source })
        this.info(
          `${String(year)}: bands measured at the build in ${String(Math.round(performance.now() - started))} ms, ${String(Math.round(source.length / 1024))} kB`
        )
      }
    },
  }
}
