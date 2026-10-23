/**
 * Wait for a write's confirmation, and say so when it is late (REPO-275).
 *
 * The dev's call, 2026-10-23: a write is never cut by a delay — the server may still be writing — but *« si on
 * n'a pas la confirmation, c'est qu'il y a un truc qui va pas »*: a write the server has not confirmed within the
 * delay is said, once, while the wait goes on. The confirmation that comes later is said by the caller, as
 * usual; one that never comes leaves the warning on screen, which is the point.
 */

/** A timer, so tests can run it by hand. */
export interface ConfirmationTimers {
  /**
   * Run `run` after `delayMs`.
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

/** What the wait needs. */
export interface ConfirmationWait {
  /** The timer. */
  timers: ConfirmationTimers
  /** How long a write may go unconfirmed before it is said. */
  delayMs: number
  /** Say that the write is still unconfirmed — called at most once, and never once the write has settled. */
  late: () => void
}

/**
 * Wait for a write, calling `late` if it has not settled within the delay. The write is never cut: its result,
 * or its failure, is returned as it comes.
 * @param write - the write in flight
 * @param wait - the timer, the delay, and what to say when it runs out
 * @returns what the write resolves to
 */
export async function awaitConfirmation<T>(write: Promise<T>, wait: ConfirmationWait): Promise<T> {
  const handle = wait.timers.set(wait.late, wait.delayMs)
  try {
    return await write
  } finally {
    wait.timers.clear(handle)
  }
}
