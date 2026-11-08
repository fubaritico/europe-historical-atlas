/**
 * A year's country names placed at the site's build rather than at each visit (ATLAS-333, the dev, 2026-11-08: a year
 * in under a second). Placing them costs ~2.5 s for 1100; what comes out is a few hundred names and their letters'
 * places — a small file. The build writes it beside the year's files, and the atlas lays it **only when its key is the
 * one the atlas computes** for the year it shows (`namesKey`: the year's content and every setting of the placement):
 * a year retouched since the build, or a setting moved in the dev panel, is placed live, as before.
 *
 * Read from the network, so checked here before it is trusted.
 */

import { z } from 'zod/mini'

import type { YearNames } from './yearNames'

/** The file's name, in a year's folder. */
export const BAKED_NAMES_FILE = 'names.json'

/**
 * Where a year's baked names live under a folder of years — the one path the build writes and the page reads, so the
 * two cannot drift apart.
 * @param yearsBase - the folder of the years, e.g. `/years` for the page, `years` for the build's output
 * @param year - the year
 * @returns the file's path
 */
export function bakedNamesPath(yearsBase: string, year: number): string {
  return `${yearsBase.replace(/\/$/, '')}/${String(year)}/${BAKED_NAMES_FILE}`
}

/** The format's version: a file of another one is not read. */
export const BAKED_NAMES_VERSION = 1

/** A year's names as the build writes them. */
export interface BakedNames {
  /** The format's version, {@link BAKED_NAMES_VERSION}. */
  readonly version: typeof BAKED_NAMES_VERSION
  /** The key the names were placed under — the atlas's `namesKey` for the year and the settings of the build. */
  readonly key: string
  /** The names, every level placed. */
  readonly names: YearNames
}

const glyph = z.object({ x: z.number(), y: z.number(), angle: z.number() })

const placed = z.object({
  polity: z.string(),
  text: z.string(),
  form: z.enum(['short', 'full']),
  piece: z.int().check(z.gte(0)),
  size: z.number().check(z.gt(0)),
  glyphs: z.array(glyph),
  leader: z.optional(z.array(glyph)),
})

const bakedNames = z.object({
  version: z.literal(BAKED_NAMES_VERSION),
  key: z.string().check(z.minLength(1)),
  names: z.object({
    levels: z.array(z.object({ placed: z.array(placed), tooSmall: z.array(z.string()) })),
    gridWidth: z.int().check(z.gt(0)),
    gridHeight: z.int().check(z.gt(0)),
    unnamed: z.array(z.string()),
  }),
})

/**
 * Read a year's baked names.
 * @param value - the file's parsed JSON, of no known shape
 * @param where - the file, for the message
 * @returns the names and their key
 * @throws when the file is not a year's baked names of this version — never laid half-read; the page says so as an
 *   error in its console, not on screen, and places the names itself (the dev, 2026-11-08)
 */
export function readBakedNames(value: unknown, where: string): BakedNames {
  const read = bakedNames.safeParse(value)
  if (read.success) return read.data as BakedNames
  const [first] = read.error.issues
  const path = first === undefined ? '' : first.path.join('.')
  throw new Error(
    `${where} is not a year's baked names: ${path === '' ? 'payload' : path}: ${first?.message ?? 'did not match its schema'}`
  )
}
