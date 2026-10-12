/**
 * Why an asset could not be used, stated in a form the app can act on rather than only log.
 *
 * Four kinds, because they deserve four answers, and because "source invalide" on its own is exactly the
 * message this exists to replace. A cast is not a check: everything fetched arrives as `unknown` and has
 * to earn its type.
 */

import type { GeoBounds } from '../geo/mercator'

/**
 * Every asset family the taxonomy knows, as a value rather than only as a type.
 *
 * **The list is the source of truth and {@link AssetKind} is derived from it**, so nothing downstream has to
 * keep a second copy in step. That copy existed: `assetMessages.test.ts` held a hand-written array of the
 * same names to prove the policy table covered them all, and on 2026-09-27 it drifted the moment the three
 * `year*` kinds were added — a test guarding against drift, drifting. Exhaustiveness of the policy table is
 * already held by `Record<AssetKind, …>` at compile time; what was missing was a way to *enumerate* the
 * union at runtime, which is this.
 *
 * The three `year*` kinds are the Cartographer's format, one per file of a year's folder. Separate kinds
 * rather than one because a reader has to be told *which* file broke: losing the registry loses every name,
 * losing the polities loses the territory, losing the borders loses only the hand-set strokes.
 */
export const ASSET_KINDS = [
  'heightmap',
  'landMask',
  'rivers',
  'regions',
  'yearRegistry',
  'yearPolities',
  'yearBorders',
] as const

/** Which asset family failed. An identifier, not a sentence — the wording belongs to whoever shows it. */
export type AssetKind = (typeof ASSET_KINDS)[number]

/**
 * How it failed.
 *
 * - `transport` — HTTP status, network, CORS. The file never arrived.
 * - `schema` — it parses as JSON but holds the wrong shape. Names the field.
 * - `consistency` — the payload disagrees with itself: a byte count that does not match the grid it
 *   declares.
 * - `semantic` — internally valid, wrong for us: a mask cropped to a different part of the world than
 *   the relief it is meant to sit on. The class that bites once files are imported by hand.
 */
export type AssetFailure = 'transport' | 'schema' | 'consistency' | 'semantic'

/** An asset failure, carrying enough to tell a reader which file broke and where. */
export interface AssetError extends Error {
  /** Which asset family. */
  readonly asset: AssetKind
  /** How it failed. */
  readonly failure: AssetFailure
  /** Where it was loaded from. */
  readonly source: string
  /** What went wrong, in one clause — a field path, a byte count, a mismatched box. */
  readonly detail: string
}

/**
 * Build an {@link AssetError}.
 *
 * A plain `Error` with extra fields rather than a subclass: the codebase builds everything through
 * factories, and `instanceof` on a subclass is the kind of thing that stops working the day an error
 * crosses a realm boundary.
 * @param asset - which asset family failed
 * @param failure - how it failed
 * @param source - where it was loaded from
 * @param detail - what went wrong, in one clause
 * @returns the error, ready to throw
 */
export function assetError(
  asset: AssetKind,
  failure: AssetFailure,
  source: string,
  detail: string
): AssetError {
  return Object.assign(new Error(`${asset} (${failure}) ${source}: ${detail}`), {
    asset,
    failure,
    source,
    detail,
  })
}

/**
 * Whether a caught value is an {@link AssetError} rather than any other failure.
 * @param value - the caught value
 * @returns `true` when it carries the asset fields
 */
export function isAssetError(value: unknown): value is AssetError {
  if (!(value instanceof Error)) return false
  const candidate = value as Partial<AssetError>
  return typeof candidate.asset === 'string' && typeof candidate.failure === 'string'
}

/**
 * Thrown by the field readers below and caught by each parser, which knows the asset and the source the
 * readers do not.
 */
class FieldError extends Error {}

/**
 * Run a payload parser, turning any field complaint into a fully-described {@link AssetError}.
 *
 * The readers stay ignorant of *which* asset they are reading so they can be shared by all four; this is
 * where that context is put back.
 * @param asset - which asset family is being parsed
 * @param source - where it was loaded from
 * @param parse - reads the payload, throwing a field complaint on the first thing that is wrong
 * @returns the parsed payload
 */
export function parseAsset<T>(asset: AssetKind, source: string, parse: () => T): T {
  try {
    return parse()
  } catch (error: unknown) {
    if (error instanceof FieldError) throw assetError(asset, 'schema', source, error.message)
    throw error
  }
}

/** Fail the current parse, naming the field. */
function fail(path: string, expected: string, value: unknown): never {
  throw new FieldError(`${path} should be ${expected}, got ${describe(value)}`)
}

/** A short, safe rendering of whatever turned up — never the value itself, which may be enormous. */
function describe(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `an array of ${String(value.length)}`
  if (typeof value === 'object') return 'an object'
  if (typeof value === 'string') return value.length > 20 ? 'a long string' : `"${value}"`
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value)
  // A function or a symbol — nothing useful to print, and stringifying it would say `[object Object]`.
  return typeof value
}

/**
 * Read a field off an unknown value, or fail naming it.
 * @param value - the object to read from
 * @param path - how to name it in a message
 * @returns the field's value, still unknown
 */
export function field(value: unknown, path: string): (key: string) => unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    fail(path, 'an object', value)
  const record = value as Record<string, unknown>
  return (key) => record[key]
}

/**
 * Require a finite number.
 * @param value - the value read
 * @param path - how to name it in a message
 * @returns the number
 */
export function expectNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'a finite number', value)
  return value
}

/**
 * Require a whole number of at least `min` — a grid width, a count.
 * @param value - the value read
 * @param path - how to name it in a message
 * @param min - the smallest acceptable value
 * @returns the integer
 */
export function expectInteger(value: unknown, path: string, min = 0): number {
  const number = expectNumber(value, path)
  if (!Number.isInteger(number) || number < min)
    fail(path, `a whole number of at least ${String(min)}`, value)
  return number
}

/**
 * Require a string.
 * @param value - the value read
 * @param path - how to name it in a message
 * @returns the string
 */
export function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'a string', value)
  return value
}

/**
 * Require a string or an explicit `null` — a name the dataset may genuinely not have.
 * @param value - the value read
 * @param path - how to name it in a message
 * @returns the string, or `null`
 */
export function expectNullableString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null
  return expectString(value, path)
}

/**
 * Require an array.
 * @param value - the value read
 * @param path - how to name it in a message
 * @returns the array, its items still unknown
 */
export function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'an array', value)
  return value
}

/**
 * Require a geographic box whose edges are the right way round.
 *
 * The ordering check is what catches a north/south swap, which otherwise flips the whole map upside down
 * with no error anywhere.
 * @param value - the value read
 * @param path - how to name it in a message
 * @returns the bounds
 */
export function expectBounds(value: unknown, path: string): GeoBounds {
  const at = field(value, path)
  const bounds = {
    west: expectNumber(at('west'), `${path}.west`),
    south: expectNumber(at('south'), `${path}.south`),
    east: expectNumber(at('east'), `${path}.east`),
    north: expectNumber(at('north'), `${path}.north`),
  }
  if (bounds.east <= bounds.west) fail(`${path}.east`, 'east of west', bounds.east)
  if (bounds.north <= bounds.south) fail(`${path}.north`, 'north of south', bounds.north)
  return bounds
}

/**
 * Require a `[longitude, latitude]` pair.
 * @param value - the value read
 * @param path - how to name it in a message
 * @returns the pair
 */
export function expectLonLat(value: unknown, path: string): [number, number] {
  const pair = expectArray(value, path)
  if (pair.length < 2) fail(path, 'a [longitude, latitude] pair', value)
  return [expectNumber(pair[0], `${path}[0]`), expectNumber(pair[1], `${path}[1]`)]
}

/**
 * Whether two geographic boxes describe the same frame.
 *
 * The cross-asset check the roadmap calls *semantic*: a land mask cropped to a different part of the
 * world than the relief it dresses is internally valid and completely wrong, and nothing downstream
 * would ever say so — the coastline would simply be in the wrong place.
 * @param a - one box
 * @param b - the other
 * @param toleranceDeg - how far the edges may differ, in degrees
 * @returns `true` when they agree
 */
export function boundsMatch(a: GeoBounds, b: GeoBounds, toleranceDeg = 1e-6): boolean {
  return (
    Math.abs(a.west - b.west) <= toleranceDeg &&
    Math.abs(a.south - b.south) <= toleranceDeg &&
    Math.abs(a.east - b.east) <= toleranceDeg &&
    Math.abs(a.north - b.north) <= toleranceDeg
  )
}

/**
 * Write a bounding box for a message, west to north.
 * @param b - the box
 * @returns `W… S… E… N…`
 */
const box = (b: GeoBounds): string =>
  `W${String(b.west)} S${String(b.south)} E${String(b.east)} N${String(b.north)}`

/**
 * Check that an asset laid over the relief covers the same ground as the relief, and say how it does
 * not when it does not.
 *
 * **The `semantic` class of the taxonomy, as an error rather than a boolean** — {@link boundsMatch}
 * answers *whether*, this names both boxes and the file, so the reader is told which asset slid where.
 * It is the failure nothing else can see: a mask cropped to a different box still samples and simply
 * puts the coastline somewhere else; rivers projected against another box slide off the valleys they
 * run in. An author would read either as their own bad tracing.
 * @param relief - the box the relief covers
 * @param other - the box the other asset declares
 * @param asset - which asset family it is, so the error names the right file
 * @param source - where the other asset was loaded from, for the message
 * @returns the error to throw, or `null` when the two agree
 */
export function boundsDisagreement(
  relief: GeoBounds,
  other: GeoBounds,
  asset: AssetKind,
  source: string
): AssetError | null {
  if (boundsMatch(relief, other)) return null
  return assetError(
    asset,
    'semantic',
    source,
    `covers ${box(other)} while the relief covers ${box(relief)} — the two must share one coordinate space`
  )
}
