/**
 * A map prepared in the background and set aside, never shown (ATLAS-333, the dev, 2026-11-08 evening: *"next,
 * previous, a bit like a video player's buffer"*) — so that when the reader reaches it, it comes back in a frame.
 *
 * **Everything slow happens off the map**: the year read, its countries cut and its lines settled in the worker, its
 * names placed into their cache. **Then one block, with no wait in it**: the map shown set aside, the prepared one laid
 * where it was, set aside in turn, and the map shown put back — the screen never draws between two lines of it, so the
 * reader never sees the prepared map. The block costs the page what laying a year does (~100 ms, its countries and
 * borders) and what sending it to the GPU unseen does (ATLAS-396 — what its first showing paid before, 43 ms).
 *
 * **Computed at once, laid when quiet** (ATLAS-396, the dev, 2026-11-10: _"it should start at once"_): the read and the
 * worker's compute start when the map is shown, and register in `context.computed` — a click on that map joins them
 * there (`political.drawYear`); only the block waits for the map to be quiet, a press, a wheel or a key holding it off.
 *
 * **What it refuses, and why**: a map not to be laid now — a change of year being drawn, or the shown map's names not
 * landed yet, which setting it aside would give up — answers `later`; a year the texture carries, or a map shown through
 * the grid, cannot be set aside and answers `skipped`. A failed read answers `failed`, qualified recoverable or not
 * (`isRecoverableLoadFailure`); a failed compute is irreversible — a defect of the code, never helped by a retry.
 */

import { isRecoverableLoadFailure } from '@europe-historical-atlas/core/data/assetError'

import { yearPaintsExactFills } from '../../scene/political/paintsExactFills'
import { AheadReadFailure } from '../workerCut'
import { installSettledYear } from '../yearBorders'
import { startStep, timedStep } from '../yearTiming'

import { layWarmNames, warmYearNames } from './names'
import { prepareYear, primeWorkerCut, setShownYearAside, shownYearToShelve } from './political'

import type { PipelineContext } from '../pipelineContext'
import type { AheadYear, WorkerCut } from '../workerCut'
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
    primeWorkerCut(context, loaded, cut)
    layers.rebuildFills()
    layers.rebuildBorders()
    // Its events are its own, pinned for its year.
    sources.askedYear = year
    layers.rebuildEvents()
    // Its names too, placed ahead: set aside with them, it shows whole in a frame (their layer cost ~150 ms on a first
    // showing). Not in the cache — their placement failed — it places them when shown, as any year.
    layWarmNames(context, loaded)
    layers.shelveYear(year)
    // And to the GPU, unseen: its first showing then uploads nothing (43 ms on the built site, ATLAS-396), and the page's
    // copy of its buffers is let go now rather than when it is shown.
    layers.uploadYear(year)
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
 * A year read and computed in the worker, registered so that a click on it joins it (ATLAS-396). Nothing of the map shown
 * is touched: the worker cuts, the page waits.
 * @param context - the pipeline's world
 * @param year - the year
 * @returns its polities and the worker's cut — the one in flight when there is one
 * @throws an {@link AheadReadFailure} when the year cannot be read, what the compute throws otherwise
 */
export function computeAhead(context: PipelineContext, year: number): Promise<AheadYear> {
  const stamp = context.layers.yearStamp()
  return context.computed.start(year, stamp, () =>
    timedStep(context.clock, year, 'ahead', async () => {
      const loaded = await context.assets.regions.load(year).catch((error: unknown) => {
        throw new AheadReadFailure(error)
      })
      // A year the texture carries, or a map shown that cannot take one aside: nothing to cut ahead — no bake started
      // for a map nobody asked for (`prepareYear` would tint the texture).
      if (cannotSetAside(context, loaded) !== null) return { loaded, cut: null, stamp }
      return { loaded, cut: await prepareYear(context, loaded, () => undefined), stamp }
    })
  )
}

/**
 * Start a year's compute ahead, unless its map is at hand — a map the window will try, started with the others (review
 * ARCH-001). Its failure leaves the register on its own and is said by the try that meets it.
 * @param context - the pipeline's world
 * @param year - the year
 */
export function startAhead(context: PipelineContext, year: number): void {
  if (atHand(context, year)) return
  // The register's own handler takes the failure off it; the try that awaits the compute says it.
  void computeAhead(context, year)
}

/**
 * A year computed ahead, its failure qualified: a read the network broke is tried again, a compute that broke is not.
 * @param context - the pipeline's world
 * @param year - the year
 * @returns the year and its cut, or the failed outcome
 */
async function computed(
  context: PipelineContext,
  year: number
): Promise<{ ahead: AheadYear } | PrepareOutcome> {
  try {
    return { ahead: await computeAhead(context, year) }
  } catch (error: unknown) {
    if (error instanceof AheadReadFailure)
      return {
        kind: 'failed',
        recoverable: isRecoverableLoadFailure(error.cause),
        error: error.cause,
      }
    return { kind: 'failed', recoverable: false, error }
  }
}

/**
 * Lay a year computed ahead aside, the map quiet — when nothing has moved since: read at the last moment, a change of
 * year may have started during the waits, or the panel changed what the map shown is drawn with — passing states both,
 * so tried again later, never given up (review QUAL-001).
 * @param context - the pipeline's world
 * @param year - the year
 * @param ahead - its polities, its cut and the stamp it was computed under
 * @returns `ready` once laid, or `later`
 * @throws what laying it throws — a defect
 */
function layWhenFree(
  context: PipelineContext,
  year: number,
  ahead: AheadYear & { cut: WorkerCut }
): PrepareOutcome {
  const { loaded, cut, stamp } = ahead
  // The compute stays registered, so a try again lays it without computing it twice.
  const busy = busyBecause(context) ?? cannotSetAside(context, loaded)
  if (busy !== null) return { kind: 'later', why: busy }
  if (atHand(context, year)) return READY
  // Computed under settings or a relief that changed during the wait: never laid as the map's own — computed again
  // (reviews ARCH-004, QUAL-001).
  if (stamp !== context.layers.yearStamp()) {
    context.computed.forget(year)
    return { kind: 'later', why: 'the map changed while it was computed' }
  }
  // Set aside, the year is the shelf's: the register lets its arrays go, or the page would hold them twice.
  context.computed.forget(year)
  const endAside = startStep(context.clock, year, 'aside')
  layAside(context, year, loaded, cut)
  endAside()
  return READY
}

/**
 * Prepare a map and set it aside, without showing it.
 * @param context - the pipeline's world
 * @param year - the year to prepare
 * @param wait - whether it is still wanted — the window of maps moves with the reader — and when the map is quiet
 * @param wait.isCurrent - whether it is still wanted
 * @param wait.whenQuiet - resolves when the reader is not acting on the map
 * @returns how it ended
 */
export async function prepareAside(
  context: PipelineContext,
  year: number,
  wait: { isCurrent: () => boolean; whenQuiet: () => Promise<void> }
): Promise<PrepareOutcome> {
  const { isCurrent } = wait
  const gone = (): boolean => context.isDisposed() || !isCurrent()
  if (atHand(context, year)) return READY
  // At once, never waiting for quiet: the worker's part touches nothing of the page.
  const result = await computed(context, year)
  if ('kind' in result) return result
  const { loaded, cut, stamp } = result.ahead
  if (cut === null) {
    context.computed.forget(year)
    // A year the texture carries never will be set aside; the map shown, or a relief not in yet, may let it later
    // (review QUAL-002) — computed again then.
    return yearPaintsExactFills(context.dev, loaded)
      ? { kind: 'later', why: cannotSetAside(context, loaded) ?? 'no relief to cut it on yet' }
      : { kind: 'skipped', why: 'its countries are painted in the texture' }
  }
  await warmNames(context, loaded, isCurrent)
  if (gone()) return DROPPED
  // The block alone waits for the map to be quiet.
  await wait.whenQuiet()
  if (gone()) return DROPPED
  return layWhenFree(context, year, { loaded, cut, stamp })
}
