/**
 * A gate that lets only the most recent of several overlapping calls write its result back.
 *
 * The problem it solves is not speed but *order*. Once work is asynchronous — a worker round trip, a
 * fetch — a slider dragged twice starts two calls, and nothing guarantees the first to finish is the
 * first that was asked for. Whichever resolves last wins, so the map can settle on a position the reader
 * has already moved away from, with no error anywhere to say so.
 *
 * It is here rather than as a counter inside a closure because the rule is data in, data out, and a rule
 * that governs what reaches the screen deserves a test rather than a comment.
 */

/** Hands out claims on a shared result, newest wins. */
export interface LatestOnly {
  /**
   * Start a call.
   * @returns a predicate answering whether this call is still the newest — call it after every `await`,
   * before every side effect, since a later call may have started in between
   */
  begin(): () => boolean
}

/**
 * Build a {@link LatestOnly} gate. One gate per thing being written: two independent results racing
 * through the same gate would cancel each other for no reason.
 * @returns the gate
 */
export function createLatestOnly(): LatestOnly {
  let latest = 0
  return {
    begin(): () => boolean {
      const mine = ++latest
      return () => mine === latest
    },
  }
}
