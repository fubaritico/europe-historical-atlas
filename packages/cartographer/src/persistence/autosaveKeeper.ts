import { autosaveName } from '@europe-historical-atlas/core/data/mapName'
import { ANSWER_TIMEOUT_MS } from '@europe-historical-atlas/core/utils/fetchWithin'

import { awaitConfirmation } from './awaitConfirmation'

import type { Report } from './notice'
import type { PersistenceWords } from './persistenceWords'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The automatic save (the dev, 2026-11-02: *"the autosaves are named <name of the current map>.autosave.<date +
 * time> […] what is saved automatically is in the years folder and nowhere else — no draft, no snapshot"*).
 *
 * **A map like any other, in `years/`**: two seconds after the last gesture, the page is written as
 * `<map>.autosave.<the time the page started saving it>` — **one folder per opening**, rewritten after each pause,
 * never one per gesture. It is never removed: the dev keeps them (*"for now we keep them"*). After a crash, *Open…*
 * lists it like every map (`s19`).
 *
 * **After each gesture, not on a clock**: written {@link AUTOSAVE_DELAY_MS} after the last change, it loses at most that
 * much when the page dies, and writes nothing while the author is not drawing.
 *
 * **Silent when it works, said when it fails** (`rules/error-handling.md`): a failed write is reported once in the
 * alarm dialogue and logged as an error — the author's protection has stopped, and they must know to press ‹ctrl+S› —
 * then said again when writes resume. Never per write. **One write at a time, in order**: a slow one cannot land after
 * a newer one and put an older page back on disk.
 */

/** How long after the last change the autosave is written, in milliseconds. */
export const AUTOSAVE_DELAY_MS = 2000

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/** The store, reduced to what the keeper reads. Structural, so a test hands in a literal. */
export interface AutosaveStore {
  /** The edition's current state. */
  getState: () => {
    /** The working document. */
    document: YearDocument
    /** Bumped by every action. */
    version: number
  }
  /**
   * Listen to every change of the store.
   * @param listener - called after each change
   * @returns a function that stops listening
   */
  subscribe: (listener: () => void) => () => void
}

/** The timer the keeper waits with — the window's in the application, a fake in tests. */
export interface AutosaveTimers {
  /**
   * Run a function after a delay.
   * @param run - what to run
   * @param delayMs - the delay
   * @returns a handle to cancel it with
   */
  set: (run: () => void, delayMs: number) => number
  /**
   * Cancel a pending run.
   * @param handle - what `set` returned
   */
  clear: (handle: number) => void
}

/** What the keeper needs. */
export interface AutosaveKeeperDeps {
  /** The store whose document is saved. */
  store: AutosaveStore
  /**
   * Write the page as a map of `years/` — the copy, over whatever an earlier write left there, and since 2026-11-02 the
   * map open after it (`autosaveWrite.ts`): a failure of either is said once, as the automatic save not kept.
   * @param document - the page
   * @param map - the autosave's name
   * @returns once written
   */
  write: (document: YearDocument, map: string) => Promise<unknown>
  /**
   * The map the page is — asked at each write: *Save as…* changes it, and its autosave follows.
   * @returns the map's name
   */
  map: () => string
  /** How long after the last change to write. */
  delayMs: number
  /** The clock: the autosave's name takes the time the keeper started. */
  now: () => Date
  /** The timer. */
  timers: AutosaveTimers
  /** Where a notice for the author goes — a toast, or the alarm dialogue. */
  report: Report
  /** What it says — asked at each sentence, so it follows a change of language. */
  words: () => PersistenceWords
}

/** The keeper. */
export interface AutosaveKeeper {
  /** Start saving automatically: every change from now on is written a moment later. */
  start: () => void
  /** Stop listening and cancel a pending write. */
  stop: () => void
}

/** What the keeper remembers between two changes. */
interface AutosaveCell {
  /** Stops listening to the store; `null` before `start`. */
  unsubscribe: (() => void) | null
  /** The write waiting for its delay, or `null`. */
  pending: number | null
  /** The writes, in order — each starts when the previous one has finished. */
  queue: Promise<void>
  /** The last write failed: said once, then said again when one succeeds. */
  failing: boolean
  /** When the keeper started — the time in every autosave's name of this opening. */
  startedAt: Date
}

/**
 * Write the page as its autosave, reporting a failure once and the recovery after it.
 * @param deps - the store, the write, the map, where to report
 * @param cell - the keeper's memory
 */
async function writeAutosave(deps: AutosaveKeeperDeps, cell: AutosaveCell): Promise<void> {
  const name = autosaveName(deps.map(), cell.startedAt)
  try {
    // Never cut, since it may land; said once when the server has not confirmed it in time (REPO-275).
    await awaitConfirmation(deps.write(deps.store.getState().document, name), {
      timers: deps.timers,
      delayMs: ANSWER_TIMEOUT_MS,
      late: () => {
        if (cell.failing) return
        cell.failing = true
        console.error(`${LOG_TAG} the autosave ${name}: no confirmation yet`)
        deps.report({
          tone: 'alarm',
          topic: 'autosave',
          text: deps.words().t('autosaveUnconfirmed'),
        })
      },
    })
    if (cell.failing) {
      cell.failing = false
      deps.report({
        tone: 'success',
        topic: 'autosave',
        text: deps.words().t('autosaveKeptAgain', { name }),
      })
    }
  } catch (error: unknown) {
    if (cell.failing) return
    cell.failing = true
    console.error(`${LOG_TAG} the autosave ${name} could not be written`, error)
    deps.report({ tone: 'alarm', topic: 'autosave', text: deps.words().t('autosaveNotKept') })
  }
}

/**
 * Write the autosave once the author has paused for the delay — each change restarts the wait.
 * @param deps - the timer and the delay
 * @param cell - the keeper's memory
 */
function schedule(deps: AutosaveKeeperDeps, cell: AutosaveCell): void {
  if (cell.pending !== null) deps.timers.clear(cell.pending)
  cell.pending = deps.timers.set(() => {
    cell.pending = null
    cell.queue = cell.queue.then(() => writeAutosave(deps, cell))
  }, deps.delayMs)
}

/**
 * Build the keeper.
 * @param deps - the store, the write, the map, the delay, the clock, the timer, where to report
 * @returns the keeper
 */
export function createAutosaveKeeper(deps: AutosaveKeeperDeps): AutosaveKeeper {
  const cell: AutosaveCell = {
    unsubscribe: null,
    pending: null,
    queue: Promise.resolve(),
    failing: false,
    startedAt: deps.now(),
  }
  return {
    start: () => {
      if (cell.unsubscribe !== null) return
      cell.startedAt = deps.now()
      let seen = deps.store.getState().version
      cell.unsubscribe = deps.store.subscribe(() => {
        const { version } = deps.store.getState()
        if (version === seen) return
        seen = version
        schedule(deps, cell)
      })
    },
    stop: () => {
      cell.unsubscribe?.()
      cell.unsubscribe = null
      if (cell.pending !== null) deps.timers.clear(cell.pending)
      cell.pending = null
    },
  }
}
