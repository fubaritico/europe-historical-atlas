/**
 * The page's two waits for the maps prepared in the background (ATLAS-333): **quiet** — the reader has not acted on the
 * map for a moment and the page is idle — so preparing never freezes a drag or a zoom; and **a sleep the network
 * shortens** — a map that failed for the network is tried again as soon as the browser says it is back online.
 *
 * The window is handed in, the slice it reads named, so both run under a test with a stand-in.
 */

/** How long after the reader's last gesture the map counts as quiet. */
export const QUIET_AFTER_MS = 800

/** The gestures that act on the map. */
const GESTURES = ['pointerdown', 'pointermove', 'wheel', 'keydown'] as const

/** The slice of `window` the waits read. */
export interface QuietWindow {
  addEventListener: (type: string, listener: () => void, options?: { passive?: boolean }) => void
  removeEventListener: (type: string, listener: () => void) => void
  setTimeout: (handler: () => void, ms: number) => number
  clearTimeout: (id: number) => void
  /** Absent in some browsers (Safari): a short timeout stands in for it, the page's idle time then unknown. */
  requestIdleCallback?: (callback: () => void) => number
}

/** The two waits, and their teardown. */
export interface QuietTime {
  /** Resolves once the reader has not acted for {@link QUIET_AFTER_MS} and the page is idle. */
  whenQuiet: () => Promise<void>
  /**
   * Resolves after `ms`, or as soon as the browser says the network is back.
   * @param ms - the wait
   */
  sleep: (ms: number) => Promise<void>
  /** Stop listening to the reader's gestures. */
  dispose: () => void
}

/**
 * Build the waits over a window.
 * @param win - the window
 * @param now - the clock, in milliseconds
 * @returns the waits
 */
export function createQuietTime(win: QuietWindow, now: () => number): QuietTime {
  let lastGesture = Number.NEGATIVE_INFINITY
  const mark = (): void => {
    lastGesture = now()
  }
  for (const type of GESTURES) win.addEventListener(type, mark, { passive: true })
  const idle = (callback: () => void): void => {
    if (win.requestIdleCallback) win.requestIdleCallback(callback)
    else win.setTimeout(callback, 50)
  }
  return {
    whenQuiet() {
      return new Promise((resolve) => {
        const check = (): void => {
          const left = lastGesture + QUIET_AFTER_MS - now()
          if (left > 0) win.setTimeout(check, left)
          else idle(resolve)
        }
        check()
      })
    },
    sleep(ms) {
      return new Promise((resolve) => {
        const done = (): void => {
          win.clearTimeout(timer)
          win.removeEventListener('online', done)
          resolve()
        }
        const timer = win.setTimeout(done, ms)
        win.addEventListener('online', done)
      })
    },
    dispose() {
      for (const type of GESTURES) win.removeEventListener(type, mark)
    },
  }
}
