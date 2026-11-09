/**
 * A year's overlaps computed at the site's build rather than at each visit (ATLAS-399): the common ground of polities
 * whose outlines overlap costs ~1.3 s a year, and what comes out is a few dozen small pieces — a small file. The build
 * writes it beside the year's files, and the atlas's settling takes it **only when its key is the year's own**
 * (`overlapsKey`: what the year's polities hold and who they are): a year retouched since the build is computed live, as
 * the dev server always does — the names' rule (`bakedNames`, the dev, 2026-11-08).
 *
 * Read from the network, so checked here before it is trusted. **No geometry here** (review ARCH-001): the page reads this
 * module, and computing overlaps belongs to the worker and the build (`bake/bakeYearOverlaps`).
 */

import { z } from 'zod/mini'

import { fingerprint } from '../utils/fingerprint'

import type { AuthoredYear } from '../data/yearFormat'
import type { YearOverlaps } from '../data/yearOverlaps'

/** The file's name, in a year's folder. */
export const BAKED_OVERLAPS_FILE = 'overlaps.json'

/** The format's version: a file of another one is not read. */
export const BAKED_OVERLAPS_VERSION = 1

/**
 * Where a year's baked overlaps live under a folder of years — the one path the build writes and the page reads.
 * @param yearsBase - the folder of the years, e.g. `/years` for the page, `years` for the build's output
 * @param year - the year
 * @returns the file's path
 */
export function bakedOverlapsPath(yearsBase: string, year: number): string {
  return `${yearsBase.replace(/\/$/, '')}/${String(year)}/${BAKED_OVERLAPS_FILE}`
}

/**
 * The key a year's overlaps are computed under: what they read — the polities' outlines and their registry (who is
 * whose suzerain). Not the borders' file, which dresses lines and moves no ground.
 * @param year - the authored year, as read from its files
 * @returns the key
 */
export function overlapsKey(year: Pick<AuthoredYear, 'registry' | 'polities'>): string {
  return fingerprint(JSON.stringify({ registry: year.registry, polities: year.polities }))
}

/** A year's overlaps as the build writes them. */
export interface BakedOverlaps {
  /** The format's version, {@link BAKED_OVERLAPS_VERSION}. */
  readonly version: typeof BAKED_OVERLAPS_VERSION
  /** The key they were computed under — {@link overlapsKey} of the year the build read. */
  readonly key: string
  /** The pieces and the refusals, in longitude and latitude. */
  readonly overlaps: YearOverlaps
}

const point = z.tuple([z.number(), z.number()])

const bakedOverlaps = z.object({
  version: z.literal(BAKED_OVERLAPS_VERSION),
  key: z.string().check(z.minLength(1)),
  overlaps: z.object({
    pieces: z.array(
      z.object({
        polities: z.array(z.string()).check(z.minLength(2)),
        area: z.array(z.array(z.array(point))),
      })
    ),
    refused: z.array(z.object({ a: z.string(), b: z.nullable(z.string()), reason: z.string() })),
  }),
})

/**
 * Read a year's baked overlaps.
 * @param value - the file's parsed JSON, of no known shape
 * @param where - the file, for the message
 * @returns the overlaps and their key
 * @throws when the file is not a year's baked overlaps of this version — never used half-read; the page says so as an
 *   error in its console and computes them itself, as for the names (the dev, 2026-11-08)
 */
export function readBakedOverlaps(value: unknown, where: string): BakedOverlaps {
  const read = bakedOverlaps.safeParse(value)
  if (read.success) return read.data
  const [first] = read.error.issues
  const path = first === undefined ? '' : first.path.join('.')
  throw new Error(
    `${where} is not a year's baked overlaps: ${path === '' ? 'payload' : path}: ${first?.message ?? 'did not match its schema'}`
  )
}
