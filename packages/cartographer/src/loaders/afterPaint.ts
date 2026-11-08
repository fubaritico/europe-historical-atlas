/** What {@link createAfterPaint} reads of the page — `window` and `document` in the application, literals in a test. */
export interface PaintClock {
  /** Whether the page can be painted at all: a hidden tab paints nothing until it is shown. */
  hidden: () => boolean
  /**
   * Run a callback before the next paint.
   * @param callback - what to run
   */
  requestFrame: (callback: () => void) => void
  /**
   * Queue a task.
   * @param callback - what to run once the current task and its paint are done
   */
  queueTask: (callback: () => void) => void
}

/**
 * Wait for the page to paint what was last written to it (CARTO-393).
 *
 * A frame's callback runs before its paint, so a task queued from it runs after: the bar's last step is on screen
 * before the canvas's start holds the thread. **A hidden tab resolves at once** (review QUAL-001): a browser runs no
 * frame there, so the wait would hold the opening until the tab is shown — and there is nothing to see anyway.
 * @param clock - the page's visibility, its frames and its tasks
 * @returns a function resolving once painted, or at once when the page is hidden
 */
export function createAfterPaint(clock: PaintClock): () => Promise<void> {
  return () =>
    new Promise((painted) => {
      if (clock.hidden()) {
        painted()
        return
      }
      clock.requestFrame(() => {
        clock.queueTask(painted)
      })
    })
}
