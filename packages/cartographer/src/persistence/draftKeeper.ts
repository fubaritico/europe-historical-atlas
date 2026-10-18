import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { reasonOf } from './errorReason'

import type { Draft, DraftStore, SnapshotSink } from './draftStore'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * Keep the work since the last ‹ctrl+S› as a draft, a moment after every gesture (CARTO-238, the dev's call
 * of 2026-10-17: *« on ne peut pas se permettre de perdre quelque chose »*).
 *
 * **After each gesture, not on a clock.** A draft written {@link DRAFT_DELAY_MS} after the last change loses
 * at most that much when the page dies, and writes nothing while the author is not drawing; a 30-second
 * clock would lose up to 30 seconds and write the same document over and over.
 *
 * **Silent when it works, said when it fails** (`rules/error-handling.md`): a failed draft is reported once
 * in the status bar and logged as an error — the author's protection has stopped, and they must know to
 * press ‹ctrl+S› — then said again when drafts resume. Never per write.
 *
 * **One write at a time, in order**: writes are queued, so a slow one cannot land after a newer one and put
 * an older document back on disk.
 *
 * **It starts only when told to** (`start`), after the opening has offered the previous draft: a draft
 * written before that offer would overwrite the very work the offer exists to give back.
 *
 * **And an hourly snapshot rides on it** (rung 2a): a draft written an hour of drawing after the last snapshot
 * is kept as one too, through its own port. Sent beside the queue, not on it — a slow snapshot must not hold
 * a save's draft removal — and a failure is said and logged, the next try an hour later.
 */

/** How long after the last change the draft is written, in milliseconds. */
export const DRAFT_DELAY_MS = 2000

/** How much drawing between two snapshots: an hour (CARTO-238, rung 2a, the dev's « un snapshot complet toutes les heures »). */
export const SNAPSHOT_EVERY_MS = 60 * 60 * 1000

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/** The store, reduced to what the keeper reads. Structural, so a test hands in a literal. */
export interface KeeperStore {
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
export interface KeeperTimers {
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
export interface DraftKeeperDeps {
  /** The store whose document is kept. */
  store: KeeperStore
  /** Where drafts go. */
  drafts: DraftStore
  /** The year being edited. */
  year: number
  /** How long after the last change to write. */
  delayMs: number
  /** The least time between two snapshots, in milliseconds (rung 2a). */
  snapshotEveryMs: number
  /** Where the snapshots go. */
  snapshots: SnapshotSink
  /** The clock, for the draft's time. */
  now: () => Date
  /** The timer. */
  timers: KeeperTimers
  /** Where a message for the author goes — the status bar's result zone. */
  report: (message: string) => void
}

/** The keeper. */
export interface DraftKeeper {
  /** Start keeping drafts: every change from now on is written a moment later. */
  start: () => void
  /**
   * A save has written the document as it stood at `version`: the draft is removed — unless the author
   * drew since, in which case it is kept, since it holds work the save did not.
   * @param version - the store's version when the save took the document
   * @returns once the draft is removed, or kept
   */
  saved: (version: number) => Promise<void>
  /** Stop listening and cancel a pending write. */
  stop: () => void
}

/** What the keeper remembers between two changes. One object, so the gestures can live outside it. */
interface KeeperCell {
  /** Stops listening to the store; `null` before `start`. */
  unsubscribe: (() => void) | null
  /** The write waiting for its delay, or `null`. */
  pending: number | null
  /** The writes and removals, in order — each starts when the previous one has finished. */
  queue: Promise<void>
  /** The last write failed: said once, then said again when one succeeds. */
  failing: boolean
  /** When the last snapshot was taken or tried, in milliseconds — when drafting started, before the first. */
  lastSnapshotAt: number
}

/**
 * Write the document as it stands now, reporting a failure once and the recovery after it.
 * @param deps - the store, the drafts, the year, the clock, where to report
 * @param cell - the keeper's memory
 */
async function writeDraft(deps: DraftKeeperDeps, cell: KeeperCell): Promise<void> {
  const yearName = String(deps.year)
  try {
    const draft = {
      year: deps.year,
      savedAt: deps.now().toISOString(),
      files: saveYearDocument(deps.store.getState().document),
    }
    await deps.drafts.write(draft)
    if (cell.failing) {
      cell.failing = false
      deps.report(`the draft of ${yearName} is kept again`)
    }
    // Beside the queue: its own failures are caught inside, and it must not hold the next write.
    void snapshotIfDue(deps, cell, draft)
  } catch (error: unknown) {
    if (cell.failing) return
    cell.failing = true
    console.error(`${LOG_TAG} the draft of ${yearName} could not be kept`, error)
    deps.report(
      `the draft is not kept (${reasonOf(error)}) — save with ‹ctrl+S› not to lose your work`
    )
  }
}

/**
 * Keep the draft just written as a snapshot too, when an hour of drawing has passed since the last one
 * (rung 2a). Grafted on the draft rather than on a clock: nothing is taken while nobody draws. A failure is
 * said and logged, and the next try waits another hour — the draft itself is already kept.
 * @param deps - the drafts, the year, the clock, where to report
 * @param cell - the keeper's memory
 * @param draft - the draft just written
 */
async function snapshotIfDue(deps: DraftKeeperDeps, cell: KeeperCell, draft: Draft): Promise<void> {
  const now = deps.now().getTime()
  if (now - cell.lastSnapshotAt < deps.snapshotEveryMs) return
  cell.lastSnapshotAt = now
  try {
    await deps.snapshots.snapshot(draft)
  } catch (error: unknown) {
    console.error(`${LOG_TAG} the hourly snapshot of ${String(deps.year)} was not kept`, error)
    deps.report(`the hourly snapshot of ${String(deps.year)} was not kept (${reasonOf(error)})`)
  }
}

/**
 * Write the draft once the author has paused for the delay — each change restarts the wait.
 * @param deps - the timer and the delay
 * @param cell - the keeper's memory
 */
function schedule(deps: DraftKeeperDeps, cell: KeeperCell): void {
  if (cell.pending !== null) deps.timers.clear(cell.pending)
  cell.pending = deps.timers.set(() => {
    cell.pending = null
    cell.queue = cell.queue.then(() => writeDraft(deps, cell))
  }, deps.delayMs)
}

/**
 * After a save: remove the draft, unless the author drew since the save took the document.
 * @param deps - the store, the drafts, the year, the timer, where to report
 * @param cell - the keeper's memory
 * @param version - the store's version when the save took the document
 */
async function removeAfterSave(
  deps: DraftKeeperDeps,
  cell: KeeperCell,
  version: number
): Promise<void> {
  // Drawn since: the draft holds work the save did not — keep it; the pending write brings it up to date.
  if (deps.store.getState().version !== version) return
  if (cell.pending !== null) {
    deps.timers.clear(cell.pending)
    cell.pending = null
  }
  try {
    await deps.drafts.remove(deps.year)
  } catch (error: unknown) {
    console.error(
      `${LOG_TAG} the draft of ${String(deps.year)} could not be removed after the save`,
      error
    )
    deps.report(
      `saved, but the old draft could not be removed (${reasonOf(error)}) — it may be offered at the next opening`
    )
  }
}

/**
 * Build the keeper.
 * @param deps - the store, the drafts, the year, the delay, the clock, the timer, where to report
 * @returns the keeper
 */
export function createDraftKeeper(deps: DraftKeeperDeps): DraftKeeper {
  const cell: KeeperCell = {
    unsubscribe: null,
    pending: null,
    queue: Promise.resolve(),
    failing: false,
    lastSnapshotAt: 0,
  }
  return {
    start: () => {
      if (cell.unsubscribe !== null) return
      // The year on disk is the one just opened: the first snapshot is an hour of drawing away.
      cell.lastSnapshotAt = deps.now().getTime()
      let seen = deps.store.getState().version
      cell.unsubscribe = deps.store.subscribe(() => {
        const { version } = deps.store.getState()
        if (version === seen) return
        seen = version
        schedule(deps, cell)
      })
    },
    saved: (version) => {
      cell.queue = cell.queue.then(() => removeAfterSave(deps, cell, version))
      return cell.queue
    },
    stop: () => {
      cell.unsubscribe?.()
      cell.unsubscribe = null
      if (cell.pending !== null) deps.timers.clear(cell.pending)
      cell.pending = null
    },
  }
}
