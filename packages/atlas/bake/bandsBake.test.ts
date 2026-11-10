// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { authoredYearRegions } from '@europe-historical-atlas/core/data/yearManifest'
import {
  BAND_STEPS_PER_KM,
  readBakedBands,
} from '@europe-historical-atlas/core/pipeline/bakedBands'
import { cutYearFills, vassalBandCut } from '@europe-historical-atlas/core/pipeline/vassalBands'

import { AUTHORED_FILES, META } from '../src/loading/testing/yearFixtures'

import { bandsBake } from './bandsBake'

const folders: string[] = []

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true })
})

/** The subdivision the fixture is cut at — coarse, the fixture is a few polities. */
const SEGMENTS = 64

/**
 * A public folder on disk holding the fixture's year, listed under the given years, and the relief's metadata.
 * @param years - the years the manifest lists
 * @param polities - the year's polities file, the fixture's unless given
 * @returns the folder and the metadata's path
 */
function publicFolder(
  years: number[],
  polities: unknown = AUTHORED_FILES.polities
): { publicDir: string; heightmapMeta: string } {
  const root = mkdtempSync(join(tmpdir(), 'bands-bake-'))
  folders.push(root)
  mkdirSync(join(root, 'years', '1100'), { recursive: true })
  writeFileSync(
    join(root, 'years', 'index.json'),
    JSON.stringify({ version: 1, bbox: META.bbox, years })
  )
  writeFileSync(
    join(root, 'years', '1100', 'registry.json'),
    JSON.stringify(AUTHORED_FILES.registry)
  )
  writeFileSync(join(root, 'years', '1100', 'polities.json'), JSON.stringify(polities))
  writeFileSync(join(root, 'years', '1100', 'borders.json'), JSON.stringify(AUTHORED_FILES.borders))
  writeFileSync(join(root, 'meta.json'), JSON.stringify(META))
  return { publicDir: root, heightmapMeta: join(root, 'meta.json') }
}

/**
 * Run the plugin's bundle hook as the build would, on a context that records what it emits and says.
 * @param paths - where the plugin reads
 * @param paths.publicDir - the public folder
 * @param paths.heightmapMeta - the relief's metadata
 * @returns the context, its spies
 */
function build(paths: { publicDir: string; heightmapMeta: string }) {
  const hook = bandsBake({ ...paths, segments: SEGMENTS }).generateBundle
  if (typeof hook !== 'function') throw new Error('test: the bundle hook is not a function')
  const context = { emitFile: vi.fn(), info: vi.fn(), warn: vi.fn() }
  void hook.call(
    context as unknown as ThisParameterType<typeof hook>,
    ...([{}, {}, false] as unknown as Parameters<typeof hook>)
  )
  return context
}

// ATLAS-407: the build measures each year's bands where the page fetches them, `years/<year>/bands.bin`.
describe('bandsBake', () => {
  describe('happy path', () => {
    it('writes 1100’s distances at years/1100/bands.bin, the page’s cut laying them whole', () => {
      const { emitFile } = build(publicFolder([1100]))
      const [asset] = emitFile.mock.calls[0] as [
        { type: string; fileName: string; source: Uint8Array },
      ]
      // Gzipped by the build, inflated by the page.
      const read = readBakedBands(new Uint8Array(gunzipSync(asset.source)).buffer, asset.fileName)
      // The page's cut of the same year, on the same grid: the file must fit it vertex for vertex.
      const { regions, authored } = authoredYearRegions(AUTHORED_FILES, '/years/1100', META.bbox)
      const cut = vassalBandCut(regions, authored.year.registry.polities, authored.bbox)
      const laid = cutYearFills(cut.regions, read.grid, cut.band, read)
      const measured = cutYearFills(cut.regions, read.grid, cut.band)
      // Every vertex's distances within half a step of what the page measures — the right polity's, not a neighbour's.
      const gaps = measured.flatMap((fill, index) =>
        (['bandKm', 'realmKm'] as const).flatMap((key) =>
          Array.from(fill[key] ?? fill.bandKm ?? [], (km, i) =>
            Math.abs(km - (laid[index]?.[key]?.[i] ?? Number.NaN))
          )
        )
      )
      expect([
        asset.type,
        asset.fileName,
        read.grid,
        gaps.length > 0 && gaps.every((gap) => gap <= 0.5 / BAND_STEPS_PER_KM + 1e-6),
      ]).toEqual(['asset', 'years/1100/bands.bin', { segX: SEGMENTS, segY: SEGMENTS }, true])
    })
  })

  describe('variants', () => {
    it('runs at the build only, never on the dev server', () => {
      expect(bandsBake({ ...publicFolder([1100]), segments: SEGMENTS }).apply).toBe('build')
    })

    it('emits nothing for a manifest with no year', () => {
      const { emitFile, info } = build(publicFolder([]))
      expect([emitFile.mock.calls.length, info.mock.calls.length]).toEqual([0, 0])
    })
  })

  describe('managed errors', () => {
    it('stops the build on a year that does not read', () => {
      expect(() => build(publicFolder([1100], { not: 'polities' }))).toThrow(/polities\.json/)
    })
  })

  // L4: N/A — a broken distance is refused by core's writer (bakedBands.test.ts).
  // L5: N/A — a year with no banded polity writes an empty file, core's case.
})
