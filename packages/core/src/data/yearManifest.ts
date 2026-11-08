/**
 * Which years have been authored in the Cartographer's format, and the source that reads them.
 *
 * **Why a manifest rather than trying a folder and seeing.** A `fetch` that 404s would be the obvious
 * signal, and it is the wrong one: a 404 is also what a hiccupping server returns, so the atlas would
 * quietly fall back to the old payload and show last century's borders with nothing said. Reading a list
 * first keeps the two cases apart — **a year absent from the manifest is a fact, a year present that fails
 * to load is a failure** — and no error is ever swallowed to stand in for the other.
 *
 * **The manifest declares the frame.** `projectRegions` maps lon/lat onto the grid using a bounding box,
 * and it has to be the render frame the terrain uses. Taking it from the loaded relief would make this
 * source depend on load order, which is the latent dependency `mapSources` warns about — so the authored
 * years say which frame they were drawn for, and the source is order-free. Checking that claim against the
 * DEM's own box is a `semantic` cross-check, and it belongs where both are in hand.
 */

import { z } from 'zod/mini'

import { fetchWithin } from '../utils/fetchWithin'

import { assetError } from './assetError'
import { projectRegions } from './regionSource'
import { toRegionPayload } from './toRegionPayload'
import { assembleAuthoredYear } from './yearConsistency'
import { fetchYearFiles, yearPaths } from './yearSource'

import type { RegionSet, RegionSource } from './regionSource'
import type { GeoBounds } from '../geo/mercator'

/** `years/index.json` — the list of authored years and the frame they were drawn for. */
export interface YearManifest {
  /** Format version. */
  version: number
  /** The render frame the years were drawn against — the DEM's box. */
  bbox: GeoBounds
  /** Every year with a folder, in no particular order. */
  years: number[]
}

/** {@link YearManifest}. */
const yearManifestSchema: z.ZodMiniType<YearManifest> = z.strictObject({
  version: z.int().check(z.gte(1)),
  bbox: z
    .strictObject({
      west: z.number(),
      south: z.number(),
      east: z.number(),
      north: z.number(),
    })
    .check(
      z.refine((box) => box.east > box.west, 'east should be east of west'),
      z.refine((box) => box.north > box.south, 'north should be north of south')
    ),
  years: z.array(z.int()),
})

/**
 * Read a fetched value as the year manifest.
 *
 * Reported under `yearRegistry`, which is the kind whose notice says identity is missing: a manifest that
 * cannot be read means no authored year can be opened at all.
 * @param value - the parsed JSON, of no known shape
 * @param source - where it came from, for the message
 * @returns the manifest
 */
export function parseYearManifest(value: unknown, source: string): YearManifest {
  const result = yearManifestSchema.safeParse(value)
  if (result.success) return result.data
  const [first] = result.error.issues
  const where = first === undefined ? 'payload' : first.path.join('.')
  const why = first?.message ?? 'did not match its schema'
  throw assetError('yearRegistry', 'schema', source, `${where === '' ? 'payload' : where}: ${why}`)
}

/**
 * Fetch and read the year manifest.
 *
 * One reader for the region source and for anything that lists the years (the atlas's year switch, ATLAS-333), so
 * the two can never disagree on which years exist.
 * @param url - where the manifest lives, e.g. `/years/index.json`
 * @returns the manifest
 * @throws an asset error under `yearRegistry` when the transport fails or the payload does not match
 */
export async function readYearManifest(url: string): Promise<YearManifest> {
  const response = await fetchWithin(url)
  if (!response.ok)
    throw assetError('yearRegistry', 'transport', url, `HTTP ${String(response.status)}`)
  return parseYearManifest(await response.json(), url)
}

/** What {@link createAuthoredYearSource} needs. */
export interface AuthoredYearSourceDeps {
  /** Where the manifest lives, e.g. `/years/index.json`. */
  manifestUrl: string
  /** The folder holding the year folders, e.g. `/years`. */
  yearsBase: string
  /**
   * Where a year with no folder is read from — today's per-century payloads.
   *
   * Not a fallback covering a failure: a year nobody has authored yet is a fact about the corpus, and this
   * is the source that answers for it.
   */
  unauthored: RegionSource
}

/**
 * A {@link RegionSource} that reads authored years from the Cartographer's format and leaves the rest to
 * the source it was given.
 *
 * The manifest is fetched once and kept: it is three fields, it changes when a year is published, and
 * asking for it on every change of year would put a round trip in front of a slider.
 * @param deps - where to read from, and who answers for unauthored years
 * @returns the source
 */
export function createAuthoredYearSource(deps: AuthoredYearSourceDeps): RegionSource {
  let manifest: Promise<YearManifest> | null = null

  return {
    async load(year: number): Promise<RegionSet> {
      manifest ??= readYearManifest(deps.manifestUrl)
      const list = await manifest
      if (!list.years.includes(year)) return deps.unauthored.load(year)
      const folder = `${deps.yearsBase.replace(/\/$/, '')}/${String(year)}`
      const files = await fetchYearFiles(yearPaths(deps.yearsBase, year))
      return authoredYearRegions(files, folder, list.bbox)
    },
  }
}

/**
 * An authored year's three files, read, as the map's regions — the one chain the page loads a year by and the site's
 * build bakes its names from (ATLAS-333), so the two read the same regions.
 * @param files - the year's registry, polities and borders, each read
 * @param folder - the year's folder, for the messages
 * @param bbox - the frame the years are projected in, the manifest's
 * @returns the regions, with the authored year they came from
 * @throws when the three files do not agree with each other
 */
export function authoredYearRegions(
  files: Parameters<typeof assembleAuthoredYear>[0],
  folder: string,
  bbox: GeoBounds
): RegionSet & Required<Pick<RegionSet, 'authored'>> {
  const authored = assembleAuthoredYear(files, folder)
  return { ...projectRegions(toRegionPayload(authored, bbox)), authored: { year: authored, bbox } }
}
