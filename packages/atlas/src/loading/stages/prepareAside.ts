/**
 * A map prepared in the background and set aside, never shown (ATLAS-333, the dev, 2026-11-08 evening: *"next,
 * previous, a bit like a video player's buffer"*) — so that when the reader reaches it, it comes back in a frame.
 *
 * **Everything slow happens off the map**: the year read, its countries cut and its lines settled in the worker, its
 * names placed into their cache. **Then one block, with no wait in it**: the map shown set aside, the prepared one laid
 * where it was, set aside in turn, and the map shown put back — the screen never draws between two lines of it, so the
 * reader never sees the prepared map. The block costs the page what laying a year does (~100 ms, its countries and
 * borders): it runs only when the map is quiet (`mapBuffer`).
 *
 * **What it refuses, and why**: a map not to be laid now — a change of year being drawn, or the shown map's names not
 * landed yet, which setting it aside would give up — answers `later`; a year the texture carries, or a map shown through
 * the grid, cannot be set aside and answers `skipped`. A failed read answers `failed`, qualified recoverable or not
 * (`isRecoverableLoadFailure`); a failed compute is irreversible — a defect of the code, never helped by a retry.
 */

import { isRecoverableLoadFailure } from '@europe-historical-atlas/core/data/assetError'

import { yearPaintsExactFills } from '../../scene/political/paintsExactFills'
import { installSettledYear } from '../yearBorders'

import { layWarmNames, warmYearNames } from './names'
import { prepareYear, setShownYearAside, shownYearToShelve } from './political'

import type { PipelineContext } from '../pipelineContext'
import type { WorkerCut } from './political'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'

/** How a preparation ended. */
export type PrepareOutcome =
  /** Set aside, or it already was, or it is the map shown. */
  | { readonly kind: 'ready' }
  /** Not laid now — the map is busy; to be tried again once it is quiet. */
  | { readonly kind: 'later'; readonly why: string }
  /** It cannot be set aside at all. */
  | { readonly kind: 'skipped'; readonly why: string }
  /** No longer wanted, or the map torn down, before it was laid. */
  | { readonly kind: 'dropped' }
  /** Its reading or its compute failed. */
  | { readonly kind: 'failed'; readonly recoverable: boolean; readonly error: unknown }

/** The outcome of a map already at hand. */
const READY: PrepareOutcome = { kind: 'ready' }

/** The outcome of a preparation no longer wanted. */
const DROPPED: PrepareOutcome = { kind: 'dropped' }

/**
 * Why the map cannot take a prepared year now, if it cannot.
 * @param context - the pipeline's world
 * @returns the reason, or `null` when the block may run
 */
function busyBecause(context: PipelineContext): string | null {
  if (context.held.drawing > 0) return 'a change of year is being drawn'
  if (context.sources.yearNames === null) return 'the names of the map shown are not laid yet'
  return null
}

/**
 * Lay a prepared year where the shown one was, set it aside, and put the shown one back — one block, no wait in it.
 * @param context - the pipeline's world
 * @param year - the year prepared
 * @param loaded - its polities
 * @param cut - what the worker prepared for it
 * @throws what laying it throws — a defect — once the half-laid map is freed and the shown one put back (review
 *   ARCH-004); or when the shown map does not come back, a defect said as such
 */
function layAside(context: PipelineContext, year: number, loaded: RegionSet, cut: WorkerCut): void {
  const { sources, layers } = context
  const shown = sources.askedYear
  if (shown === null) throw new Error(`[atlas] ${String(year)} prepared with no map shown`)
  setShownYearAside(context)
  let failure: { error: unknown } | null = null
  try {
    sources.regionSet = loaded
    installSettledYear(sources, cut.settled)
    layers.primeFillCut(loaded.regions, cut.grid, cut.fills)
    if (cut.tribes !== null) layers.primeTribeCut(cut.grid, cut.tribes)
    layers.rebuildFills()
    layers.rebuildBorders()
    // Its events are its own, pinned for its year.
    sources.askedYear = year
    layers.rebuildEvents()
    // Its names too, placed ahead: set aside with them, it shows whole in a frame (their layer cost ~150 ms on a first
    // showing). Not in the cache — their placement failed — it places them when shown, as any year.
    layWarmNames(context, loaded)
    layers.shelveYear(year)
  } catch (error: unknown) {
    // Never a background task leaving the reader a half-made map: what was laid goes, the map shown comes back, and
    // the failure is thrown on after.
    layers.discardYear()
    failure = { error }
  }
  sources.askedYear = shown
  if (!layers.restoreYear(shown)) {
    throw new Error(`[atlas] ${String(shown)} did not come back after ${String(year)} was prepared`)
  }
  if (failure !== null) throw failure.error
}

/**
 * Its names placed into their cache; a failure said, never the preparation's — the year, once shown, places them as
 * any year does.
 * @param context - the pipeline's world
 * @param loaded - the year prepared
 * @param isCurrent - whether the preparation is still wanted
 * @returns once they are placed, or given up
 */
async function warmNames(
  context: PipelineContext,
  loaded: RegionSet,
  isCurrent: () => boolean
): Promise<void> {
  try {
    await warmYearNames(context, loaded, isCurrent)
  } catch (error: unknown) {
    console.error(
      `[atlas] ${String(loaded.year)}: its names could not be placed ahead — placed when it is shown.`,
      error
    )
  }
}

/**
 * Whether a map is already at hand: the one shown, or set aside under the settings of now.
 * @param context - the pipeline's world
 * @param year - the map
 * @returns whether nothing is to prepare
 */
function atHand(context: PipelineContext, year: number): boolean {
  return year === context.sources.askedYear || context.layers.holdsYear(year)
}

/**
 * What ends a preparation before any work: the map at hand already, or the map busy now — put off rather than computed
 * and thrown away (review ARCH-002); busy is read again at the end, a change of year may start during the waits.
 * @param context - the pipeline's world
 * @param year - the map
 * @returns the outcome, or `null` to go on
 */
function beforeAnyWork(context: PipelineContext, year: number): PrepareOutcome | null {
  if (atHand(context, year)) return READY
  const busy = busyBecause(context)
  return busy === null ? null : { kind: 'later', why: busy }
}

/**
 * Why a year read cannot be set aside, if it cannot.
 * @param context - the pipeline's world
 * @param loaded - the year read
 * @returns the reason, or `null` when it can
 */
function cannotSetAside(context: PipelineContext, loaded: RegionSet): string | null {
  if (!yearPaintsExactFills(context.dev, loaded)) return 'its countries are painted in the texture'
  // The prepared year lies on the bare terrain: a texture tinted for the map shown would need a bake of its own.
  const { held } = context
  if (!held.bareTexture || held.grid || shownYearToShelve(context) === null)
    return 'the map shown cannot be set aside'
  return null
}

/**
 * Read a year, its failure qualified.
 * @param context - the pipeline's world
 * @param year - the year
 * @returns its polities, or the failed outcome
 */
async function readYear(
  context: PipelineContext,
  year: number
): Promise<{ loaded: RegionSet } | PrepareOutcome> {
  try {
    return { loaded: await context.assets.regions.load(year) }
  } catch (error: unknown) {
    return { kind: 'failed', recoverable: isRecoverableLoadFailure(error), error }
  }
}

/**
 * Its countries cut and its lines settled in the worker, its names placed ahead.
 * @param context - the pipeline's world
 * @param loaded - the year read
 * @param isCurrent - whether it is still wanted
 * @returns the worker's cut, or the outcome that ends the preparation
 */
async function computeYear(
  context: PipelineContext,
  loaded: RegionSet,
  isCurrent: () => boolean
): Promise<{ cut: WorkerCut } | PrepareOutcome> {
  let cut: WorkerCut | null
  try {
    cut = await prepareYear(context, loaded, () => undefined)
  } catch (error: unknown) {
    return { kind: 'failed', recoverable: false, error }
  }
  if (cut === null) return { kind: 'skipped', why: 'no relief to cut it on' }
  await warmNames(context, loaded, isCurrent)
  return { cut }
}

/**
 * Prepare a map and set it aside, without showing it.
 * @param context - the pipeline's world
 * @param year - the year to prepare
 * @param isCurrent - whether it is still wanted — the window of maps moves with the reader
 * @returns how it ended
 */
export async function prepareAside(
  context: PipelineContext,
  year: number,
  isCurrent: () => boolean
): Promise<PrepareOutcome> {
  const gone = (): boolean => context.isDisposed() || !isCurrent()
  const first = beforeAnyWork(context, year)
  if (first !== null) return first
  const read = await readYear(context, year)
  if ('kind' in read) return read
  if (gone()) return DROPPED
  const why = cannotSetAside(context, read.loaded)
  if (why !== null) return { kind: 'skipped', why }
  const computed = await computeYear(context, read.loaded, isCurrent)
  if ('kind' in computed) return computed
  if (gone()) return DROPPED
  // Read at the last moment: a change of year may have started during the waits, or the panel changed what the map
  // shown is drawn with — passing states both, so tried again later, never given up (review QUAL-001).
  const busy = busyBecause(context) ?? cannotSetAside(context, read.loaded)
  if (busy !== null) return { kind: 'later', why: busy }
  if (atHand(context, year)) return READY
  layAside(context, year, read.loaded, computed.cut)
  return READY
}
