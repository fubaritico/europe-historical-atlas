/**
 * Reading one authored year off disk: three files, three readers, one shared failure shape.
 *
 * Each reader takes an `unknown` and gives back a typed value or throws an {@link AssetError} naming the
 * field that is wrong. A cast is not a check — the same rule the four original assets follow, arrived at
 * through a schema here rather than through hand-written guards
 * (`packages/core/src/data/yearFormat.ts` says why).
 *
 * **What this layer does NOT do**: the checks that need two files at once — a claim naming a polity the
 * registry has never heard of, a ring index past the end of the anchor table. Those are `consistency`
 * failures and they live in `yearConsistency.ts`, because the taxonomy is only useful if a reader can tell
 * "this file is malformed" from "these files disagree".
 */

import { fetchWithin } from '../utils/fetchWithin'

import { assetError } from './assetError'
import { yearBordersSchema, yearPolitiesSchema, yearRegistrySchema } from './yearFormat'

import type { AssetKind } from './assetError'
import type { YearBorders, YearPolities, YearRegistry } from './yearFormat'

/** Where the three files of one year are fetched from. */
export interface YearPaths {
  /** The registry's URL. */
  registry: string
  /** The territory file's URL. */
  polities: string
  /** The borders file's URL. */
  borders: string
}

/** A schema able to check an unknown value, which is all these readers need of one. */
interface Checker<T> {
  /**
   * Check a value without throwing.
   * @param value - the value of no known shape
   * @returns the parsed value, or the issues that stopped it
   */
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: SchemaError }
}

/** What a failed check reports. Structural, so nothing here depends on Zod's class hierarchy. */
interface SchemaError {
  /** Every problem found, not only the first — a schema checks the whole value. */
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[]
}

/**
 * Render an issue's path the way a person reads it: `polities[0].colour`.
 * @param path - the issue's path segments, numbers for array indices
 * @returns the path as one string, `payload` when the problem is the value itself
 */
function describePath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return 'payload'
  let out = ''
  for (const segment of path) {
    if (typeof segment === 'number') out += `[${String(segment)}]`
    else out += out === '' ? String(segment) : `.${String(segment)}`
  }
  return out
}

/**
 * Check a payload against a schema, or throw an {@link AssetError} naming the first field that is wrong.
 *
 * **Reports the first issue and counts the rest.** A schema finds every problem at once, which is more
 * than the hand-written readers could do — but `detail` is one clause by contract, and a reader fixing a
 * file wants somewhere to start rather than a wall. The count is what says the wall exists.
 * @param asset - which of the three files is being read
 * @param source - where it came from, for the message
 * @param schema - the schema to check against
 * @param value - the parsed JSON, of no known shape
 * @returns the typed payload
 */
function checkPayload<T>(asset: AssetKind, source: string, schema: Checker<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (result.success) return result.data
  const [first] = result.error.issues
  if (first === undefined) throw assetError(asset, 'schema', source, 'did not match its schema')
  const rest = result.error.issues.length - 1
  const more = rest > 0 ? ` (and ${String(rest)} more)` : ''
  throw assetError(asset, 'schema', source, `${describePath(first.path)}: ${first.message}${more}`)
}

/**
 * Read a fetched value as a year's registry.
 * @param value - the parsed JSON, of no known shape
 * @param source - where it came from, for the message
 * @returns the registry
 */
export function parseYearRegistry(value: unknown, source: string): YearRegistry {
  return checkPayload('yearRegistry', source, yearRegistrySchema, value)
}

/**
 * Read a fetched value as a year's territory.
 * @param value - the parsed JSON, of no known shape
 * @param source - where it came from, for the message
 * @returns the territory
 */
export function parseYearPolities(value: unknown, source: string): YearPolities {
  return checkPayload('yearPolities', source, yearPolitiesSchema, value)
}

/**
 * Read a fetched value as a year's border dressing.
 * @param value - the parsed JSON, of no known shape
 * @param source - where it came from, for the message
 * @returns the border table
 */
export function parseYearBorders(value: unknown, source: string): YearBorders {
  return checkPayload('yearBorders', source, yearBordersSchema, value)
}

/**
 * Fetch one file and read it, turning a transport failure into an {@link AssetError} of its own kind.
 *
 * `transport` and `schema` stay separate all the way to the notice, because they call for different
 * answers: a 404 is a deployment problem, a bad field is an authoring one.
 * @param asset - which of the three files this is
 * @param path - where to fetch it from
 * @param parse - the reader for that file
 * @returns the typed payload
 */
async function fetchAndRead<T>(
  asset: AssetKind,
  path: string,
  parse: (value: unknown, source: string) => T
): Promise<T> {
  const response = await fetchWithin(path)
  if (!response.ok) throw assetError(asset, 'transport', path, `HTTP ${String(response.status)}`)
  return parse(await response.json(), path)
}

/**
 * Fetch and read all three files of one year, in parallel.
 *
 * **Parallel on purpose, and the first failure wins.** The three are independent files; fetching them in
 * sequence would pay three round trips to learn the same thing. Nothing is cross-checked here — that is
 * `assembleAuthoredYear` in `yearConsistency.ts`, which is where the files first meet.
 * @param paths - where the three files live
 * @returns the three payloads, each already checked against its own schema
 */
export async function fetchYearFiles(
  paths: YearPaths
): Promise<{ registry: YearRegistry; polities: YearPolities; borders: YearBorders }> {
  const [registry, polities, borders] = await Promise.all([
    fetchAndRead('yearRegistry', paths.registry, parseYearRegistry),
    fetchAndRead('yearPolities', paths.polities, parseYearPolities),
    fetchAndRead('yearBorders', paths.borders, parseYearBorders),
  ])
  return { registry, polities, borders }
}

/**
 * Build the three paths of a year's folder from a base URL.
 * @param base - the folder holding the years, e.g. `/years`
 * @param forYear - the year to read
 * @returns the three file paths
 */
export function yearPaths(base: string, forYear: number): YearPaths {
  const folder = `${base.replace(/\/$/, '')}/${String(forYear)}`
  return {
    registry: `${folder}/registry.json`,
    polities: `${folder}/polities.json`,
    borders: `${folder}/borders.json`,
  }
}
