/**
 * The maps kept ready around the one shown — the dev's video buffer (ATLAS-333, 2026-11-08 evening: *"next, previous,
 * a bit like a video player's buffer"*). **Three maps at most**: the one shown, the one before and the one after, in
 * the order of the maps (`mapsToPrepare`, reach one) — the one the reader is heading for prepared first. Every other
 * map set aside is freed, so the page and the GPU hold three maps between them whatever the reader does: the atlas must
 * run on as many machines as it can, and WebGL never says how much memory is left. **Where a map's weight lies**: one
 * shown has its buffers on the GPU only (`releaseAfterUpload`); one prepared and not yet shown was never drawn, so its
 * buffers are still the page's — they go to the GPU, and leave the page, the first time it is shown (review ARCH-003).
 *
 * The maps are tried in turn, one laid at a time; one waiting to be tried again lets the next go first. **A try starts at
 * once** (the dev, 2026-11-10: _"it should start at once"_): its compute runs in the worker whatever the reader does, and
 * only its laying waits for the map to be quiet (`prepareAside`).
 *
 * **A preparation that fails is qualified before anything is decided** (the dev, same evening): recoverable — the
 * network — is tried again until it works, waiting longer each time (1 s doubling to 30 s), at once when the browser is
 * back online; irreversible — a file absent or unreadable, a defect of the compute — is not, and is said in the console
 * only: nobody asked for that map yet; asked, its ordinary loading meets the same failure and tells it on screen.
 *
 * Holds no clock, no event and no map of its own: what prepares, what waits for quiet and what sleeps are handed in, so
 * every branch runs under a test with literals.
 */

import { mapsToPrepare } from '@europe-historical-atlas/core/data/mapOfDate'

import type { PrepareOutcome } from './stages/prepareAside'
import type { SliderDirection } from '@europe-historical-atlas/core/data/mapOfDate'

/** The longest wait between two tries of a recoverable failure. */
export const RETRY_CEILING_MS = 30_000

/** The first wait after a recoverable failure; it doubles at each failure after. */
export const RETRY_FIRST_MS = 1_000

/** How long a map is left before being tried again when the map was busy. */
export const LATER_MS = 1_000

/** What the buffer needs. */
export interface MapBufferDeps {
  /** The years having a map, in any order. */
  readonly years: readonly number[]
  /**
   * Prepare a map and set it aside.
   * @param year - the map
   * @param isCurrent - whether it is still wanted
   * @returns how it ended
   */
  readonly prepare: (year: number, isCurrent: () => boolean) => Promise<PrepareOutcome>
  /**
   * Start a map's read and compute at once, without laying it — every map of the window together, so the second does
   * not wait for the first to be laid (ATLAS-396, review ARCH-001). Its failure is the try's to say, which meets it.
   * @param year - the map
   * @returns nothing to wait for
   */
  readonly compute: (year: number) => void
  /**
   * Free every map set aside but these.
   * @param years - the window
   */
  readonly keepOnly: (years: readonly number[]) => void
  /**
   * Resolves after a while — sooner when the network comes back.
   * @param ms - the wait
   */
  readonly sleep: (ms: number) => Promise<void>
}

/** The buffer. */
export interface MapBuffer {
  /**
   * A map is now the one shown: the window moves around it, and what it lacks is prepared.
   * @param year - the map shown
   */
  shown: (year: number) => void
  /** Stop preparing — at teardown. */
  dispose: () => void
}

/**
 * The wait before the try after a recoverable failure.
 * @param failures - how many tries failed so far, at least one
 * @returns the wait in milliseconds
 */
export function retryDelayMs(failures: number): number {
  return Math.min(RETRY_FIRST_MS * 2 ** (failures - 1), RETRY_CEILING_MS)
}

/** A map of the window still to prepare. */
interface Pending {
  /** Its year. */
  readonly year: number
  /** How many tries failed for the network so far. */
  failures: number
  /** How long to wait before its next try. */
  wait: number
}

/** What the buffer remembers across windows, so a refusal is said once and an irreversible failure tried once. */
interface Memory {
  /** What was said already, by its key — the reason and the year. */
  readonly said: Set<string>
  /** The years given up for good — told when the reader asks for them. */
  readonly givenUp: Set<number>
}

/**
 * Say something about a map once in the page's life.
 * @param memory - what was said already
 * @param key - what is said, and of which map
 * @param say - the saying
 */
function sayOnce(memory: Memory, key: string, say: () => void): void {
  if (memory.said.has(key)) return
  memory.said.add(key)
  say()
}

/**
 * What a preparation's outcome leaves to do for its map.
 * @param outcome - how the try ended
 * @param item - the map, its failures counted here
 * @param memory - what was said and given up
 * @returns the wait before its next try; `null` when nothing is left to do for it
 */
function afterTry(outcome: PrepareOutcome, item: Pending, memory: Memory): number | null {
  const { year } = item
  switch (outcome.kind) {
    case 'ready':
    case 'dropped':
      return null
    case 'skipped':
      sayOnce(memory, `skipped ${String(year)}`, () => {
        console.warn(`[atlas] the map of ${String(year)} is not prepared ahead: ${outcome.why}.`)
      })
      return null
    case 'later':
      // No refusal is silent (rules/error-handling.md): said once per reason and map, then tried again quietly.
      sayOnce(memory, `later ${String(year)} ${outcome.why}`, () => {
        console.warn(`[atlas] the map of ${String(year)} is prepared later: ${outcome.why}.`)
      })
      return LATER_MS
    case 'failed':
      if (!outcome.recoverable) {
        memory.givenUp.add(year)
        console.error(
          `[atlas] the map of ${String(year)} could not be prepared ahead, and is not tried again — told when it is asked.`,
          outcome.error
        )
        return null
      }
      item.failures += 1
      console.error(
        `[atlas] the map of ${String(year)} could not be prepared ahead (try ${String(item.failures)}) — tried again in ${String(retryDelayMs(item.failures) / 1000)} s.`,
        outcome.error
      )
      return retryDelayMs(item.failures)
  }
}

/**
 * Try one map of the window: wait what it must, then prepare it at once — the preparation itself waits for quiet before
 * laying it, never before computing it (ATLAS-396).
 * @param deps - what prepares and sleeps
 * @param item - the map
 * @param isCurrent - whether the window still wants it
 * @returns how the try ended; `dropped` when the window moved meanwhile
 */
async function tryOne(
  deps: MapBufferDeps,
  item: Pending,
  isCurrent: () => boolean
): Promise<PrepareOutcome> {
  if (item.wait > 0) await deps.sleep(item.wait)
  if (!isCurrent()) return { kind: 'dropped' }
  try {
    return await deps.prepare(item.year, isCurrent)
  } catch (error: unknown) {
    // Thrown, not answered: a defect of laying it, never helped by a retry.
    return { kind: 'failed', recoverable: false, error }
  }
}

/**
 * Prepare the maps of a window in turn — one laid at a time, each block of the page alone — until each is ready, given
 * up, or the window moves. A map waiting to be tried again lets the next one go first (review QUAL-003).
 * @param deps - what prepares and sleeps
 * @param window - the maps, the one the reader heads for first
 * @param isCurrent - whether the window still stands
 * @param memory - what was said and given up
 * @returns once the window is done with
 */
async function prepareWindow(
  deps: MapBufferDeps,
  window: readonly number[],
  isCurrent: () => boolean,
  memory: Memory
): Promise<void> {
  const pending: Pending[] = window
    .filter((year) => !memory.givenUp.has(year))
    .map((year) => ({ year, failures: 0, wait: 0 }))
  for (let item = pending.shift(); item !== undefined && isCurrent(); item = pending.shift()) {
    const wait = afterTry(await tryOne(deps, item, isCurrent), item, memory)
    if (wait === null) continue
    item.wait = wait
    pending.push(item)
  }
}

/**
 * Build the buffer.
 * @param deps - the years, what prepares, what frees, and the waits
 * @returns the buffer
 */
export function createMapBuffer(deps: MapBufferDeps): MapBuffer {
  let generation = 0
  let last: number | null = null
  const memory: Memory = { said: new Set(), givenUp: new Set() }
  return {
    shown(year) {
      // Which way the reader goes: toward later maps unless the last move went back.
      const direction: SliderDirection = last !== null && year < last ? 'back' : 'forward'
      last = year
      const window = mapsToPrepare(year, direction, deps.years, 1)
      deps.keepOnly([year, ...window])
      for (const ahead of window) if (!memory.givenUp.has(ahead)) deps.compute(ahead)
      const mine = ++generation
      void prepareWindow(deps, window, () => mine === generation, memory)
    },
    dispose() {
      generation += 1
    },
  }
}
